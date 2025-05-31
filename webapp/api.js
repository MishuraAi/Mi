// 🚀 ПРЕМИУМ API КЛИЕНТ - webapp/api.js
// Версия: 2.0.0 - Лучший TMA в мире
console.log('🔗 Премиум API клиент загружается...');

class MishuraAPIService {
    constructor() {
        this.baseURL = '/api/v1';
        this.timeout = 30000; // 30 секунд
        this.retryCount = 3;
        this.retryDelay = 1000; // 1 секунда
        
        console.log('✅ MishuraAPIService создан:', this.baseURL);
        this.logSystemInfo();
    }

    logSystemInfo() {
        console.log('📱 Системная информация:', {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            online: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            pixelRatio: window.devicePixelRatio || 1
        });
    }

    // 🔧 Утилиты для работы с запросами
    async makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Превышено время ожидания запроса');
            }
            throw error;
        }
    }

    async retryRequest(requestFn, retries = this.retryCount) {
        try {
            return await requestFn();
        } catch (error) {
            if (retries > 0 && this.isRetryableError(error)) {
                console.warn(`⚠️ Попытка ${this.retryCount - retries + 1}/${this.retryCount} неудачна, повторяем через ${this.retryDelay}мс...`);
                await this.delay(this.retryDelay);
                return this.retryRequest(requestFn, retries - 1);
            }
            throw error;
        }
    }

    isRetryableError(error) {
        // Повторяем запрос только для сетевых ошибок, не для ошибок валидации
        return error.message.includes('NetworkError') || 
               error.message.includes('Failed to fetch') ||
               error.message.includes('timeout');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 📊 Валидация изображений
    validateImage(file) {
        const errors = [];
        
        // Проверка типа файла
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            errors.push(`Неподдерживаемый формат: ${file.type}. Разрешены: JPEG, PNG, WebP`);
        }
        
        // Проверка размера (максимум 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            errors.push(`Файл слишком большой: ${(file.size / 1024 / 1024).toFixed(1)}MB. Максимум: 10MB`);
        }
        
        // Проверка минимального размера
        const minSize = 1024; // 1KB
        if (file.size < minSize) {
            errors.push('Файл слишком маленький или поврежден');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // 🖼️ Оптимизация изображений
    async optimizeImage(file, maxWidth = 1024, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Вычисляем новые размеры с сохранением пропорций
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Рисуем оптимизированное изображение
                ctx.drawImage(img, 0, 0, width, height);
                
                // Конвертируем в blob
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    // 🔄 Сравнение изображений (ИСПРАВЛЕННЫЙ метод)
    async analyzeCompare(imageFiles, occasion, preferences = '') {
        console.log(`📤 Отправка ${imageFiles.length} изображений на сравнение`);
        
        // Валидация входных данных
        if (!Array.isArray(imageFiles) || imageFiles.length < 2) {
            throw new Error('Необходимо минимум 2 изображения для сравнения');
        }
        
        if (imageFiles.length > 4) {
            throw new Error('Максимум 4 изображения для сравнения');
        }
        
        if (!occasion.trim()) {
            throw new Error('Укажите повод для консультации');
        }
        
        // Валидация каждого изображения
        for (let i = 0; i < imageFiles.length; i++) {
            const validation = this.validateImage(imageFiles[i]);
            if (!validation.isValid) {
                throw new Error(`Изображение ${i + 1}: ${validation.errors.join(', ')}`);
            }
        }
        
        const requestFn = async () => {
            const formData = new FormData();
            
            // ПРАВИЛЬНЫЙ формат для сервера - используем имена полей как ожидает сервер
            formData.append('image_0', imageFiles[0]);
            formData.append('image_1', imageFiles[1]);
            
            // Добавляем дополнительные изображения если есть
            if (imageFiles[2]) formData.append('image_2', imageFiles[2]);
            if (imageFiles[3]) formData.append('image_3', imageFiles[3]);
            
            // Заполняем пустые слоты пустыми файлами для совместимости с сервером
            for (let i = imageFiles.length; i < 5; i++) {
                const emptyFile = new File([''], '', { type: 'image/jpeg' });
                formData.append(`image_${i}`, emptyFile);
            }
            
            formData.append('occasion', occasion.trim());
            formData.append('preferences', `${preferences.trim()}. ВАЖНО: Используй короткие названия образов по цветам (например "Синий образ", "Красный образ") вместо подробного описания одежды. Структурируй ответ логически с заголовками разделов.`);
            formData.append('metadata', JSON.stringify({
                count: imageFiles.length,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                formatRequest: 'structured_with_short_titles'
            }));

            console.log('📤 Структура FormData для отправки:');
            for (let [key, value] of formData.entries()) {
                if (value instanceof File) {
                    console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
                } else {
                    console.log(`  ${key}: ${value}`);
                }
            }

            const response = await this.makeRequest(`${this.baseURL}/analyze/compare`, {
                method: 'POST',
                body: formData,
                // НЕ устанавливаем Content-Type - браузер сам установит с boundary
            });

            console.log('📡 Ответ сервера:', response.status, response.statusText);

            if (!response.ok) {
                let errorText;
                try {
                    const errorJson = await response.json();
                    errorText = errorJson.message || errorJson.detail || response.statusText;
                } catch {
                    errorText = await response.text() || response.statusText;
                }
                
                console.error('❌ Детальная ошибка сервера:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText,
                    headers: Object.fromEntries(response.headers.entries())
                });
                
                throw new Error(`Ошибка сервера (${response.status}): ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Результат сравнения успешно получен');
            return result;
        };

        return this.retryRequest(requestFn);
    }

    // 📷 Анализ одного изображения
    async analyzeSingle(imageFile, occasion, preferences = '') {
        console.log('📤 Отправка одного изображения на анализ');
        
        // Валидация входных данных
        if (!imageFile) {
            throw new Error('Изображение не выбрано');
        }
        
        if (!occasion.trim()) {
            throw new Error('Укажите повод для консультации');
        }
        
        const validation = this.validateImage(imageFile);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }
        
        const requestFn = async () => {
            // Оптимизируем изображение для ускорения загрузки
            const optimizedImage = await this.optimizeImage(imageFile);
            
            const formData = new FormData();
            formData.append('image', optimizedImage || imageFile);
            formData.append('occasion', occasion.trim());
            formData.append('preferences', `${preferences.trim()}. ВАЖНО: Используй короткие названия образа по основному цвету (например "Синий образ") вместо подробного описания одежды. Структурируй ответ с четкими разделами и заголовками.`);
            formData.append('metadata', JSON.stringify({
                originalSize: imageFile.size,
                optimizedSize: optimizedImage ? optimizedImage.size : imageFile.size,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                formatRequest: 'structured_with_short_title'
            }));

            console.log('📤 Структура FormData:');
            for (let [key, value] of formData.entries()) {
                if (value instanceof File || value instanceof Blob) {
                    console.log(`  ${key}: ${value.constructor.name}(${value.size} bytes, ${value.type})`);
                } else {
                    console.log(`  ${key}: ${value}`);
                }
            }

            const response = await this.makeRequest(`${this.baseURL}/analyze/single`, {
                method: 'POST',
                body: formData,
            });

            console.log('📡 Ответ сервера:', response.status, response.statusText);

            if (!response.ok) {
                let errorText;
                try {
                    const errorJson = await response.json();
                    errorText = errorJson.message || errorJson.detail || response.statusText;
                } catch {
                    errorText = await response.text() || response.statusText;
                }
                
                console.error('❌ Детальная ошибка сервера:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText,
                    headers: Object.fromEntries(response.headers.entries())
                });
                
                throw new Error(`Ошибка сервера (${response.status}): ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Результат анализа успешно получен');
            return result;
        };

        return this.retryRequest(requestFn);
    }

    // 🏥 Проверка здоровья API
    async healthCheck() {
        try {
            const response = await this.makeRequest('/health', {
                method: 'GET',
            });
            
            if (response.ok) {
                const health = await response.json();
                console.log('🏥 Статус API:', health);
                return {
                    isHealthy: true,
                    data: health
                };
            } else {
                console.warn('⚠️ API вернул не OK статус:', response.status);
                return {
                    isHealthy: false,
                    error: `HTTP ${response.status}`
                };
            }
        } catch (error) {
            console.error('❌ Ошибка проверки здоровья API:', error);
            return {
                isHealthy: false,
                error: error.message
            };
        }
    }

    // 📊 Получение статистики и метрик
    async getStats() {
        try {
            const response = await this.makeRequest(`${this.baseURL}/stats`, {
                method: 'GET',
            });
            
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('❌ Ошибка получения статистики:', error);
            return null;
        }
    }

    // 🔧 Debug информация
    async getDebugInfo() {
        try {
            const response = await this.makeRequest('/debug/info', {
                method: 'GET',
            });
            
            if (response.ok) {
                const debug = await response.json();
                console.log('🔧 Debug информация:', debug);
                return debug;
            }
            return null;
        } catch (error) {
            console.error('❌ Ошибка получения debug информации:', error);
            return null;
        }
    }

    // 📱 Проверка совместимости с Telegram Mini App
    checkTelegramCompatibility() {
        const isTelegram = window.Telegram && window.Telegram.WebApp;
        const compatibility = {
            isTelegramWebApp: isTelegram,
            version: isTelegram ? window.Telegram.WebApp.version : null,
            platform: isTelegram ? window.Telegram.WebApp.platform : navigator.platform,
            colorScheme: isTelegram ? window.Telegram.WebApp.colorScheme : 'light',
            isExpanded: isTelegram ? window.Telegram.WebApp.isExpanded : false,
            viewportHeight: isTelegram ? window.Telegram.WebApp.viewportHeight : window.innerHeight,
            features: {
                hapticFeedback: isTelegram && window.Telegram.WebApp.HapticFeedback,
                mainButton: isTelegram && window.Telegram.WebApp.MainButton,
                backButton: isTelegram && window.Telegram.WebApp.BackButton,
                cloudStorage: isTelegram && window.Telegram.WebApp.CloudStorage
            }
        };
        
        console.log('📱 Совместимость с Telegram:', compatibility);
        return compatibility;
    }
}

// 🚀 Экспорт в глобальную область
window.MishuraAPIService = MishuraAPIService;
console.log('✅ Премиум MishuraAPIService доступен в window');

// 🎯 Автоматическая проверка при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    if (window.MishuraAPIService) {
        const api = new window.MishuraAPIService();
        
        // Проверяем совместимость с Telegram
        api.checkTelegramCompatibility();
        
        // Проверяем здоровье API
        const health = await api.healthCheck();
        if (!health.isHealthy) {
            console.warn('⚠️ API недоступен:', health.error);
        }
        
        console.log('🎉 API клиент полностью инициализирован');
    }
});