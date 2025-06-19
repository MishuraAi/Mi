/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API клиент (api.js)
ВЕРСИЯ: 1.4.0 (ИСПРАВЛЕНЫ ENDPOINTS)
ДАТА ОБНОВЛЕНИЯ: 2025-06-18

НАЗНАЧЕНИЕ:
JavaScript клиент для взаимодействия с API сервером МИШУРЫ
Обеспечивает отправку изображений и получение анализов от Gemini AI
==========================================================================================
*/

class MishuraAPIService {
    constructor() {
        this.baseURL = null;
        this.timeout = 90000; // 90 секунд для Gemini AI
        this.retryAttempts = 3;
        this.isHealthy = false;
        this.lastHealthCheck = null;
        this.systemInfo = this.getSystemInfo();
        this.telegramCompat = this.checkTelegramCompat();
        
        // Автоопределение базового URL
        this.detectBaseURL();
        
        console.log('✅ MishuraAPIService создан:', this.baseURL);
    }

    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            online: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            timestamp: new Date().toISOString()
        };
    }

    checkTelegramCompat() {
        const tg = window.Telegram?.WebApp;
        return {
            isTelegramWebApp: tg?.initData,
            version: tg?.version || null,
            platform: tg?.platform || navigator.platform,
            colorScheme: tg?.colorScheme || 'light',
            isExpanded: tg?.isExpanded || false,
            viewportHeight: tg?.viewportHeight || window.innerHeight
        };
    }

    detectBaseURL() {
        const currentHost = window.location.hostname;
        const currentProtocol = window.location.protocol;
        
        // Определяем среду и правильный URL
        if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
            // Локальная разработка - ваш api.py на порту 8000
            this.baseURL = `${currentProtocol}//localhost:8000/api/v1`;
            console.log('🏠 Локальная разработка - API на порту 8000');
        } else if (currentHost.includes('onrender.com') || currentHost.includes('render.com')) {
            // Render.com - api.py обслуживает всё на том же домене
            this.baseURL = `${currentProtocol}//${currentHost}/api/v1`;
            console.log('☁️ Render.com - единое приложение');
        } else {
            // Другие продакшн среды
            this.baseURL = `${currentProtocol}//${currentHost}/api/v1`;
            console.log('🌐 Production environment');
        }
        console.log('🔍 Базовый URL API установлен:', this.baseURL);
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            timeout: this.timeout,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                ...options.headers
            }
        };

        const requestOptions = { ...defaultOptions, ...options };

        // Добавляем timeout через AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);

        try {
            const response = await fetch(url, {
                ...requestOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`Timeout: запрос превысил ${requestOptions.timeout}ms`);
            }
            
            throw error;
        }
    }

    async healthCheck() {
        try {
            console.log('🏥 Проверка состояния API...');
            const response = await this.makeRequest('/health', {
                method: 'GET',
                timeout: 5000 // Короткий timeout для health check
            });
            this.isHealthy = response.status === 'healthy';
            this.lastHealthCheck = new Date();
            if (this.isHealthy) {
                console.log('🏥 Статус API:', response);
                return response;
            } else {
                console.warn('⚠️ API вернул не OK статус:', response.status);
                return null;
            }
        } catch (error) {
            console.warn('⚠️ API недоступен:', error.message);
            this.isHealthy = false;
            this.lastHealthCheck = new Date();
            return null;
        }
    }

    // ИСПРАВЛЕНИЕ: Правильный endpoint для анализа одиночного изображения
    async analyzeSingle(imageFile, occasion = '💼 Деловая встреча', preferences = '', userId = null) {
        try {
            console.log('📤 Отправка запроса на анализ:', { 
                filename: imageFile.name, 
                size: imageFile.size, 
                type: imageFile.type, 
                occasion: occasion,
                userId: userId 
            });

            // Получаем userId если не передан
            if (!userId) {
                userId = this.getCurrentUserId();
            }

            // Конвертируем файл в base64
            const imageData = await this.fileToBase64(imageFile);
            
            const requestData = {
                user_id: userId,
                occasion: occasion,
                preferences: preferences,
                image_data: imageData
            };

            // ИСПРАВЛЕНИЕ: Используем правильный endpoint
            const response = await this.makeRequest('/consultations/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            console.log('✅ Анализ получен от API:', response);
            return response;
        } catch (error) {
            console.error('❌ Ошибка анализа:', error);
            throw new Error(`Ошибка анализа: ${error.message}`);
        }
    }

    // ИСПРАВЛЕНИЕ: Правильный endpoint для сравнения изображений
    async analyzeCompare(imageFiles, occasion = '💼 Деловая встреча', preferences = '', userId = null) {
        try {
            if (!Array.isArray(imageFiles) || imageFiles.length < 2) {
                throw new Error('Необходимо минимум 2 изображения для сравнения');
            }
            if (imageFiles.length > 4) {
                throw new Error('Максимум 4 изображения для сравнения');
            }

            console.log('📤 Отправка запроса на сравнение:', { 
                count: imageFiles.length, 
                files: imageFiles.map(f => ({ name: f.name, size: f.size, type: f.type })), 
                occasion: occasion,
                userId: userId 
            });

            // Получаем userId если не передан
            if (!userId) {
                userId = this.getCurrentUserId();
            }

            // Конвертируем все файлы в base64
            const imagesData = await Promise.all(
                imageFiles.map(file => this.fileToBase64(file))
            );
            
            const requestData = {
                user_id: userId,
                occasion: occasion,
                preferences: preferences,
                images_data: imagesData
            };

            // ИСПРАВЛЕНИЕ: Используем правильный endpoint для сравнения
            const response = await this.makeRequest('/consultations/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            console.log('✅ Сравнение получено от API:', response);
            return response;
        } catch (error) {
            console.error('❌ Ошибка сравнения:', error);
            throw new Error(`Ошибка сравнения: ${error.message}`);
        }
    }

    // Вспомогательная функция для конвертации файла в base64
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Убираем префикс "data:image/jpeg;base64," и оставляем только base64 данные
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Получение текущего user_id
    getCurrentUserId() {
        // Пытаемся получить из URL параметров
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get('user_id');
        if (urlUserId && !isNaN(urlUserId)) {
            return parseInt(urlUserId);
        }
        
        // Пытаемся получить из Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
            return window.Telegram.WebApp.initDataUnsafe.user.id;
        }
        
        // Fallback для тестирования
        return 5930269100;
    }

    async getStatus() {
        try {
            const response = await this.makeRequest('/status', {
                method: 'GET',
                timeout: 5000
            });
            console.log('📊 Статус сервера:', response);
            return response;
        } catch (error) {
            console.warn('⚠️ Не удалось получить статус:', error.message);
            return null;
        }
    }

    // Утилитарные методы
    isAvailable() {
        return this.isHealthy && this.lastHealthCheck && 
               (new Date() - this.lastHealthCheck) < 60000; // Кэш на 1 минуту
    }

    getLastHealthCheck() {
        return this.lastHealthCheck;
    }

    getBaseURL() {
        return this.baseURL;
    }

    setTimeout(timeout) {
        this.timeout = Math.max(timeout, 5000); // Минимум 5 секунд
        console.log('⏰ Timeout установлен:', this.timeout + 'ms');
    }

    // Проверка совместимости файлов
    validateImageFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 20 * 1024 * 1024; // 20MB

        if (!allowedTypes.includes(file.type)) {
            throw new Error(`Неподдерживаемый тип файла: ${file.type}. Разрешены: ${allowedTypes.join(', ')}`);
        }

        if (file.size > maxSize) {
            throw new Error(`Файл слишком большой: ${(file.size / 1024 / 1024).toFixed(1)}MB. Максимум: ${maxSize / 1024 / 1024}MB`);
        }

        return true;
    }

    validateImageFiles(files) {
        if (!Array.isArray(files)) {
            files = [files];
        }

        files.forEach((file, index) => {
            try {
                this.validateImageFile(file);
            } catch (error) {
                throw new Error(`Файл ${index + 1}: ${error.message}`);
            }
        });

        return true;
    }
}

// Создаем глобальный экземпляр API сервиса
window.MishuraAPIService = MishuraAPIService;

// Экспортируем для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MishuraAPIService;
}

console.log('✅ Исправленный MishuraAPIService доступен в window');