/**
 * ==========================================================================================
 * ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
 * КОМПОНЕНТ: API клиент (api.js)
 * ВЕРСИЯ: 2.1.0 (ПОЛНАЯ ВЕРСИЯ С ИСПРАВЛЕНИЯМИ)
 * ДАТА ОБНОВЛЕНИЯ: 2025-05-31
 * 
 * МЕТОДОЛОГИЯ РАБОТЫ И ОБНОВЛЕНИЯ КОДА:
 * 1. Целостность Обновлений: Любые изменения файлов предоставляются целиком.
 * 2. Язык Коммуникации: Комментарии и документация ведутся на русском языке.
 * 3. Стандарт Качества: Данный код является частью проекта "МИШУРА", разработанного
 *    с применением высочайших стандартов программирования и дизайна.
 * 
 * НАЗНАЧЕНИЕ ФАЙЛА:
 * Клиент для взаимодействия с Backend API. Обеспечивает отправку изображений
 * на анализ и получение советов от ИИ-стилиста.
 * 
 * ИСПРАВЛЕНИЯ В ВЕРСИИ 2.1.0:
 * - Добавлена полная обработка ошибок и таймаутов
 * - Исправлены эндпоинты для корректной работы с backend
 * - Добавлена система retry для неустойчивых соединений
 * - Улучшена отладочная информация
 * - Добавлена поддержка legacy API для обратной совместимости
 * ==========================================================================================
 */

class MishuraAPI {
    constructor() {
        // Определяем базовый URL API
        this.baseURL = this.getBaseURL();
        this.logger = new Logger('MishuraAPI');
        
        // Настройки запросов
        this.requestTimeout = 60000; // 60 секунд для анализа изображений
        this.retryAttempts = 3;
        this.retryDelay = 2000; // 2 секунды между повторами
        
        this.logger.info(`🚀 API инициализирован с базовым URL: ${this.baseURL}`);
        this.logger.debug(`Настройки: timeout=${this.requestTimeout}ms, retry=${this.retryAttempts}`);
    }

    getBaseURL() {
        const hostname = window.location.hostname;
        const origin = window.location.origin;
        
        this.logger.debug(`Определение базового URL для hostname: ${hostname}`);
        
        // Для продакшна (Render)
        if (hostname.includes('onrender.com')) {
            this.logger.debug('Режим: Продакшн (Render)');
            return `${origin}/api/v1`;
        }
        
        // Для локальной разработки
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            this.logger.debug('Режим: Локальная разработка');
            return `${origin}/api/v1`;
        }
        
        // Для GitHub Pages или других хостингов
        if (hostname.includes('github.io')) {
            this.logger.debug('Режим: GitHub Pages');
            return `${origin}/api/v1`;
        }
        
        // Fallback для неизвестных окружений
        this.logger.debug('Режим: Fallback');
        return '/api/v1';
    }

    async analyzeSingle(imageFile, occasion, preferences = '') {
        this.logger.info('🔍 Запрос анализа одного образа');
        this.logger.debug(`Файл: ${imageFile.name}, размер: ${this.formatFileSize(imageFile.size)}`);
        this.logger.debug(`Повод: "${occasion}", предпочтения: "${preferences.substring(0, 50)}..."`);
        
        // Валидация входных данных
        if (!imageFile || !(imageFile instanceof File)) {
            throw new Error('Не выбран файл изображения');
        }
        
        if (!occasion || occasion.trim().length === 0) {
            throw new Error('Не указан повод для консультации');
        }
        
        // Подготовка FormData
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('occasion', occasion.trim());
        formData.append('preferences', preferences.trim());
        formData.append('metadata', JSON.stringify({
            timestamp: new Date().toISOString(),
            mode: 'single',
            filename: imageFile.name,
            filesize: imageFile.size,
            filetype: imageFile.type
        }));

        try {
            // Пробуем новый API эндпоинт
            let response;
            try {
                response = await this.makeRequestWithRetry('/analyze/single', {
                    method: 'POST',
                    body: formData
                });
            } catch (newApiError) {
                this.logger.warn('Новый API недоступен, пробуем legacy эндпоинт:', newApiError.message);
                
                // Fallback на старый API
                response = await this.makeRequestWithRetry('/analyze', {
                    method: 'POST',
                    body: formData
                });
            }

            this.logger.info('✅ Анализ одного образа успешно получен');
            this.logger.debug('Ответ получен:', response.status);
            
            return response;
            
        } catch (error) {
            this.logger.error('❌ Ошибка анализа одного образа:', error);
            throw this.enhanceError(error, 'анализ одного образа');
        }
    }

    async analyzeCompare(imageFiles, occasion, preferences = '') {
        this.logger.info(`🔄 Запрос сравнения ${imageFiles.length} образов`);
        
        // Валидация входных данных
        if (!Array.isArray(imageFiles) || imageFiles.length < 2) {
            throw new Error('Для сравнения необходимо минимум 2 изображения');
        }
        
        if (imageFiles.length > 4) {
            throw new Error('Максимальное количество изображений для сравнения: 4');
        }
        
        if (!occasion || occasion.trim().length === 0) {
            throw new Error('Не указан повод для консультации');
        }
        
        // Логирование файлов
        imageFiles.forEach((file, index) => {
            this.logger.debug(`Файл ${index + 1}: ${file.name}, размер: ${this.formatFileSize(file.size)}`);
        });
        
        this.logger.debug(`Повод: "${occasion}", предпочтения: "${preferences.substring(0, 50)}..."`);
        
        // Подготовка FormData
        const formData = new FormData();
        
        // Добавляем изображения с правильными именами полей
        imageFiles.forEach((file, index) => {
            if (!(file instanceof File)) {
                throw new Error(`Элемент ${index + 1} не является файлом`);
            }
            formData.append(`image_${index}`, file);
        });
        
        formData.append('occasion', occasion.trim());
        formData.append('preferences', preferences.trim());
        formData.append('metadata', JSON.stringify({
            timestamp: new Date().toISOString(),
            mode: 'compare',
            imageCount: imageFiles.length,
            files: imageFiles.map((file, index) => ({
                index,
                name: file.name,
                size: file.size,
                type: file.type
            }))
        }));

        try {
            // Пробуем новый API эндпоинт
            let response;
            try {
                response = await this.makeRequestWithRetry('/analyze/compare', {
                    method: 'POST',
                    body: formData
                });
            } catch (newApiError) {
                this.logger.warn('Новый API недоступен, пробуем legacy эндпоинт:', newApiError.message);
                
                // Fallback на старый API
                response = await this.makeRequestWithRetry('/compare', {
                    method: 'POST',
                    body: formData
                });
            }

            this.logger.info('✅ Сравнение образов успешно получено');
            this.logger.debug('Ответ получен:', response.status);
            
            return response;
            
        } catch (error) {
            this.logger.error('❌ Ошибка сравнения образов:', error);
            throw this.enhanceError(error, 'сравнение образов');
        }
    }

    async checkHealth() {
        this.logger.debug('🏥 Проверка состояния API');
        
        try {
            const response = await this.makeRequestWithRetry('/health', {
                method: 'GET'
            }, 1); // Только 1 попытка для health check

            this.logger.info('✅ API работает нормально');
            return response;
            
        } catch (error) {
            this.logger.error('❌ API недоступен:', error);
            throw error;
        }
    }

    async makeRequestWithRetry(endpoint, options = {}, customRetryAttempts = null) {
        const attempts = customRetryAttempts !== null ? customRetryAttempts : this.retryAttempts;
        let lastError;

        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                this.logger.debug(`Попытка ${attempt}/${attempts} для ${endpoint}`);
                return await this.makeRequest(endpoint, options);
                
            } catch (error) {
                lastError = error;
                
                if (attempt < attempts) {
                    const delay = this.retryDelay * attempt; // Экспоненциальная задержка
                    this.logger.warn(`Попытка ${attempt} неудачна: ${error.message}. Повтор через ${delay}ms`);
                    await this.sleep(delay);
                } else {
                    this.logger.error(`Все ${attempts} попыток исчерпаны для ${endpoint}`);
                }
            }
        }

        throw lastError;
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        this.logger.debug(`📡 ${options.method || 'GET'} ${url}`);
        
        // Настройки по умолчанию
        const defaultOptions = {
            method: 'GET',
            headers: {},
            signal: AbortSignal.timeout(this.requestTimeout) // Таймаут для запроса
        };

        // Не устанавливаем Content-Type для FormData - браузер сделает это автоматически
        if (!(options.body instanceof FormData)) {
            defaultOptions.headers['Content-Type'] = 'application/json';
        }

        const requestOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            this.logger.debug('📤 Отправка запроса...');
            const startTime = Date.now();
            
            const response = await fetch(url, requestOptions);
            
            const duration = Date.now() - startTime;
            this.logger.debug(`📥 Ответ получен: ${response.status} ${response.statusText} (${duration}ms)`);
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                let errorDetails = null;
                
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        if (errorData.message) {
                            errorMessage = errorData.message;
                        }
                        if (errorData.details) {
                            errorDetails = errorData.details;
                        }
                    } else {
                        const errorText = await response.text();
                        if (errorText) {
                            errorMessage = errorText;
                        }
                    }
                } catch (parseError) {
                    this.logger.warn('Не удалось распарсить ошибку от сервера:', parseError);
                }
                
                const error = new Error(errorMessage);
                error.status = response.status;
                error.details = errorDetails;
                throw error;
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                this.logger.debug('✅ JSON ответ успешно получен');
                return data;
            } else {
                const text = await response.text();
                this.logger.debug('✅ Текстовый ответ получен');
                return { message: text, status: 'success' };
            }

        } catch (error) {
            // Улучшенная обработка различных типов ошибок
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                throw new Error(`Превышено время ожидания ответа (${this.requestTimeout/1000}с). Попробуйте еще раз.`);
            } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Не удалось подключиться к серверу. Проверьте интернет-соединение и попробуйте еще раз.');
            } else if (error.status) {
                // Ошибка HTTP с кодом статуса
                throw error;
            } else {
                // Неизвестная ошибка
                throw new Error(`Ошибка сети: ${error.message}`);
            }
        }
    }

    // Вспомогательные методы
    enhanceError(error, context) {
        let enhancedMessage = error.message;
        
        // Добавляем контекст к сообщению об ошибке
        if (!enhancedMessage.includes(context)) {
            enhancedMessage = `Ошибка при ${context}: ${enhancedMessage}`;
        }
        
        // Улучшаем сообщения для пользователя
        if (error.status === 413) {
            enhancedMessage = 'Файл изображения слишком большой. Пожалуйста, выберите изображение меньшего размера (до 10MB).';
        } else if (error.status === 415) {
            enhancedMessage = 'Неподдерживаемый формат файла. Пожалуйста, выберите изображение в формате JPG, PNG или WebP.';
        } else if (error.status === 429) {
            enhancedMessage = 'Слишком много запросов. Пожалуйста, подождите немного и попробуйте еще раз.';
        } else if (error.status === 500) {
            enhancedMessage = 'Внутренняя ошибка сервера. Пожалуйста, попробуйте еще раз через несколько минут.';
        } else if (error.status === 503) {
            enhancedMessage = 'Сервис временно недоступен. Пожалуйста, попробуйте еще раз позже.';
        }
        
        const enhancedError = new Error(enhancedMessage);
        enhancedError.status = error.status;
        enhancedError.originalError = error;
        
        return enhancedError;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Методы для отладки и тестирования
    async testConnection() {
        this.logger.info('🧪 Тестирование соединения с API');
        
        try {
            const health = await this.checkHealth();
            this.logger.info('🟢 Соединение с API установлено', health);
            return true;
        } catch (error) {
            this.logger.error('🔴 Ошибка соединения с API:', error);
            return false;
        }
    }

    getEndpointInfo() {
        return {
            baseURL: this.baseURL,
            settings: {
                timeout: this.requestTimeout,
                retryAttempts: this.retryAttempts,
                retryDelay: this.retryDelay
            },
            endpoints: {
                health: `${this.baseURL}/health`,
                analyzeSingle: `${this.baseURL}/analyze/single`,
                analyzeCompare: `${this.baseURL}/analyze/compare`,
                // Legacy endpoints для обратной совместимости
                legacyAnalyze: `${this.baseURL}/../analyze`,
                legacyCompare: `${this.baseURL}/../compare`
            }
        };
    }

    async testSingleAnalysis() {
        this.logger.info('🧪 Тестирование анализа одного образа');
        
        // Создаем тестовое изображение
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        // Рисуем простое тестовое изображение
        ctx.fillStyle = '#4facfe';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('TEST', 80, 100);
        
        return new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
                try {
                    const testFile = new File([blob], 'test-image.png', { type: 'image/png' });
                    const result = await this.analyzeSingle(testFile, 'тестовое мероприятие', 'тестовые предпочтения');
                    this.logger.info('✅ Тест анализа одного образа прошел успешно');
                    resolve(result);
                } catch (error) {
                    this.logger.error('❌ Тест анализа одного образа провален:', error);
                    resolve({ error: error.message });
                }
            }, 'image/png');
        });
    }

    // Экспорт диагностической информации
    getDiagnostics() {
        return {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            location: {
                hostname: window.location.hostname,
                origin: window.location.origin,
                href: window.location.href
            },
            api: this.getEndpointInfo(),
            browser: {
                onLine: navigator.onLine,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled
            }
        };
    }
}

// Глобальные функции для отладки в консоли браузера
window.testMishuraAPI = async function() {
    console.log('🧪 Тестирование МИШУРА API...');
    
    const api = new MishuraAPI();
    console.log('📊 API Info:', api.getEndpointInfo());
    console.log('🔍 Диагностика:', api.getDiagnostics());
    
    const isConnected = await api.testConnection();
    console.log('🌐 Соединение установлено:', isConnected);
    
    if (isConnected) {
        console.log('🧪 Запуск тестового анализа...');
        const testResult = await api.testSingleAnalysis();
        console.log('📋 Результат теста:', testResult);
    }
    
    return api;
};

window.getMishuraDiagnostics = function() {
    const api = new MishuraAPI();
    return api.getDiagnostics();
};