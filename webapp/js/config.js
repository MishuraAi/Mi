/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Конфигурация (config.js)
ВЕРСИЯ: 1.0.1 (ИСПРАВЛЕН API ПОРТ И ОБРАБОТКА ОШИБОК)
ДАТА ОБНОВЛЕНИЯ: 2025-05-28
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};

window.MishuraApp.config = (function() {
    'use strict';
    
    // Определяем окружение
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    const appSettings = {
        appName: 'МИШУРА',
        appVersion: '1.0.1',
        
        // ИСПРАВЛЕНИЕ: API URL с правильным портом
        apiUrl: isDevelopment 
            ? 'http://localhost:5000/api/v1'  // Стандартный порт Flask
            : 'https://style-ai-bot.onrender.com/api/v1',
            
        // Альтернативные порты для проверки
        fallbackPorts: [5000, 8000, 8001, 3000],
            
        defaultLanguage: 'ru',
        debugMode: isDevelopment,
        maxUploadSize: 10 * 1024 * 1024, // 10MB
        supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxCompareImages: 4
    };
    
    const themeSettings = {
        defaultTheme: 'dark',
        colorSchemes: {
            dark: {
                primary: '#d4af37',
                secondary: '#b8941f',
                background: '#000000',
                surface: '#1a1a1a',
                text: '#ffffff',
                textSecondary: '#cccccc'
            },
            light: {
                primary: '#d4af37',
                secondary: '#b8941f',
                background: '#ffffff',
                surface: '#f5f5f5',
                text: '#000000',
                textSecondary: '#666666'
            }
        }
    };
    
    const apiSettings = {
        baseUrl: appSettings.apiUrl,
        timeout: 30000, // 30 секунд
        retryAttempts: 3, // Увеличено количество попыток
        endpoints: {
            // Основные эндпоинты
            consultation: '/analyze-outfit',
            compare: '/compare-outfits',
            analyze: '/analyze',  // Fallback эндпоинт
            
            // Дополнительные эндпоинты
            history: '/history',
            balance: '/balance',
            health: '/health',
            wardrobe: '/wardrobe'
        },
        headers: {
            'Accept': 'application/json',
            'Accept-Language': 'ru'
        }
    };
    
    const LIMITS = {
        TOAST_DURATION: 3500,
        MAX_FILE_SIZE: appSettings.maxUploadSize,
        MAX_COMPARE_ITEMS: appSettings.maxCompareImages,
        MAX_TEXT_LENGTH: 500,
        MIN_PASSWORD_LENGTH: 6,
        
        // Ограничения для изображений
        MIN_IMAGE_WIDTH: 200,
        MIN_IMAGE_HEIGHT: 200,
        MAX_IMAGE_WIDTH: 4096,
        MAX_IMAGE_HEIGHT: 4096,
        
        // Ограничения для запросов
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000, // 1 секунда
        
        // Кэширование
        CACHE_DURATION: 3600000, // 1 час в миллисекундах
        MAX_CACHE_SIZE: 50 // Максимум 50 записей в кэше
    };
    
    const MESSAGES = {
        errors: {
            network: 'Ошибка сети. Проверьте подключение к интернету.',
            server: 'Ошибка сервера. Попробуйте позже.',
            timeout: 'Превышено время ожидания ответа.',
            fileSize: `Файл слишком большой. Максимальный размер: ${(LIMITS.MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}МБ`,
            imageFormat: 'Неподдерживаемый формат изображения. Используйте JPG, PNG или WEBP.',
            imageSize: 'Изображение слишком маленькое или слишком большое.',
            generic: 'Произошла ошибка. Попробуйте снова.',
            apiNotFound: 'API сервер недоступен (C00). Убедитесь, что сервер запущен.',
            connectionFailed: 'Не удается подключиться к серверу (C01). Проверьте соединение.'
        },
        success: {
            uploaded: 'Изображение успешно загружено',
            analyzed: 'Анализ завершен',
            compared: 'Сравнение выполнено',
            saved: 'Изменения сохранены'
        },
        info: {
            loading: 'Загрузка...',
            analyzing: 'Анализируем ваш образ...',
            comparing: 'Сравниваем образы...',
            saving: 'Сохранение...',
            checkingApi: 'Проверка соединения с сервером...'
        }
    };
    
    let userId = null;
    let isConfigInitialized = false;
    let currentApiUrl = appSettings.apiUrl;
    
    function init() {
        if (isConfigInitialized) {
            return;
        }
        
        const tempLogger = (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.logger) 
                       ? window.MishuraApp.utils.logger 
                       : console;

        tempLogger.info("Инициализация конфигурации (v1.0.1)...");
        
        // Генерация или получение ID пользователя
        userId = localStorage.getItem('mishura_user_id') || generateUserId();
        localStorage.setItem('mishura_user_id', userId);
        
        // Инициализация темы
        initTheme();
        
        // Проверка API при инициализации
        if (isDevelopment) {
            setTimeout(() => {
                autoDetectApiPort();
            }, 1000);
        }
        
        // Логирование конфигурации
        tempLogger.info(`Config: ${appSettings.appName} v${appSettings.appVersion}`);
        tempLogger.info(`Config: API URL: ${currentApiUrl}`);
        tempLogger.info(`Config: Режим: ${isDevelopment ? 'Разработка' : 'Продакшен'}`);
        
        isConfigInitialized = true;
    }
    
    function generateUserId() {
        return 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }
    
    function initTheme() {
        const savedTheme = localStorage.getItem('mishura_theme') || themeSettings.defaultTheme;
        setTheme(savedTheme);
    }
    
    function setTheme(theme) {
        if (!themeSettings.colorSchemes[theme]) {
            theme = themeSettings.defaultTheme;
        }
        
        const colors = themeSettings.colorSchemes[theme];
        const root = document.documentElement;
        
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });
        
        localStorage.setItem('mishura_theme', theme);
        document.body.setAttribute('data-theme', theme);
    }
    
    function getTheme() {
        return localStorage.getItem('mishura_theme') || themeSettings.defaultTheme;
    }
    
    function getApiUrl(endpoint) {
        const baseUrl = currentApiUrl;
        const endpointPath = apiSettings.endpoints[endpoint];
        
        if (!endpointPath) {
            console.warn(`Config: Эндпоинт '${endpoint}' не найден`);
            return baseUrl;
        }
        
        return `${baseUrl}${endpointPath}`;
    }
    
    function isProduction() {
        return !isDevelopment;
    }
    
    // ИСПРАВЛЕНИЕ: автоопределение порта API в режиме разработки
    async function autoDetectApiPort() {
        console.info('Config: Автоопределение порта API...');
        
        for (const port of appSettings.fallbackPorts) {
            const testUrl = `http://localhost:${port}/api/v1`;
            
            try {
                const response = await fetch(`${testUrl}/health`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    timeout: 3000
                });
                
                if (response.ok) {
                    console.info(`Config: API найден на порту ${port}`);
                    currentApiUrl = testUrl;
                    apiSettings.baseUrl = testUrl;
                    
                    // Уведомляем об успешном подключении
                    document.dispatchEvent(new CustomEvent('apiConnected', {
                        detail: { url: testUrl, port: port }
                    }));
                    
                    return true;
                }
            } catch (error) {
                console.debug(`Config: Порт ${port} недоступен`);
            }
        }
        
        console.warn('Config: API сервер не найден ни на одном из портов');
        
        // Уведомляем о проблеме с подключением
        document.dispatchEvent(new CustomEvent('apiConnectionFailed', {
            detail: { 
                message: 'API сервер недоступен (C00)',
                suggestion: 'Запустите сервер командой: python api.py или python bot.py'
            }
        }));
        
        return false;
    }
    
    // Проверка доступности API
    async function checkApiAvailability() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${currentApiUrl}/health`, {
                method: 'GET',
                headers: apiSettings.headers,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                console.info('Config: API сервер доступен', data);
                
                // Уведомляем о восстановлении соединения
                document.dispatchEvent(new CustomEvent('apiConnected', {
                    detail: { url: currentApiUrl, data: data }
                }));
                
                return { available: true, data: data };
            } else {
                console.warn('Config: API сервер вернул ошибку', response.status);
                return { 
                    available: false, 
                    error: `HTTP ${response.status}`,
                    code: 'C01'
                };
            }
        } catch (error) {
            console.error('Config: API сервер недоступен', error);
            
            let errorMessage = 'API сервер недоступен';
            let errorCode = 'C00';
            
            if (error.name === 'AbortError') {
                errorMessage = 'Превышено время ожидания ответа';
                errorCode = 'C02';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Не удается подключиться к серверу';
                errorCode = 'C01';
            }
            
            // Уведомляем о проблеме
            document.dispatchEvent(new CustomEvent('apiConnectionFailed', {
                detail: { 
                    message: `${errorMessage} (${errorCode})`,
                    error: error.message,
                    suggestion: isDevelopment ? 'Запустите API сервер' : 'Сервер временно недоступен'
                }
            }));
            
            return { 
                available: false, 
                error: error.message,
                code: errorCode,
                suggestion: isDevelopment ? 'Запустите API сервер командой: python api.py' : 'Сервер временно недоступен'
            };
        }
    }
    
    // Установка нового URL API
    function setApiUrl(newUrl) {
        currentApiUrl = newUrl;
        apiSettings.baseUrl = newUrl;
        console.info(`Config: API URL изменен на ${newUrl}`);
    }
    
    // Получение текущего URL API
    function getCurrentApiUrl() {
        return currentApiUrl;
    }
    
    return {
        init,
        appSettings,
        themeSettings,
        apiSettings,
        LIMITS,
        MESSAGES,
        setTheme,
        getTheme,
        getApiUrl,
        getCurrentApiUrl,
        setApiUrl,
        isProduction,
        checkApiAvailability,
        autoDetectApiPort,
        get userId() { return userId; },
        get isDevelopment() { return isDevelopment; },
        isInitialized: () => isConfigInitialized
    };
})();