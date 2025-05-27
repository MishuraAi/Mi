/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Конфигурация (config.js)
ВЕРСИЯ: 0.5.0 (Исправлены URL и настройки)
ДАТА ОБНОВЛЕНИЯ: 2025-05-27
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
        appVersion: '0.5.0',
        
        // API URL в зависимости от окружения
        apiUrl: isDevelopment 
            ? 'http://localhost:8000/api/v1'  // Для локальной разработки
            : 'https://style-ai-bot.onrender.com/api/v1',  // Для продакшена
            
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
        retryAttempts: 2,
        endpoints: {
            // Основные эндпоинты
            consultation: '/analyze-outfit',
            compare: '/compare-outfits',
            analyze: '/analyze',
            
            // Дополнительные эндпоинты
            history: '/history',
            balance: '/balance',
            health: '/health',
            wardrobe: '/wardrobe',
            
            // Виртуальная примерка
            virtualFitting: '/virtual-fitting'
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
            generic: 'Произошла ошибка. Попробуйте снова.'
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
            saving: 'Сохранение...'
        }
    };
    
    let userId = null;
    let isConfigInitialized = false;
    
    function init() {
        if (isConfigInitialized) {
            return;
        }
        
        const tempLogger = (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.logger) 
                       ? window.MishuraApp.utils.logger 
                       : console;

        tempLogger.info("Инициализация конфигурации (v0.5.0)...");
        
        // Генерация или получение ID пользователя
        userId = localStorage.getItem('mishura_user_id') || generateUserId();
        localStorage.setItem('mishura_user_id', userId);
        
        // Инициализация темы
        initTheme();
        
        // Логирование конфигурации
        tempLogger.info(`Config: ${appSettings.appName} v${appSettings.appVersion}`);
        tempLogger.info(`Config: API URL: ${appSettings.apiUrl}`);
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
        const baseUrl = apiSettings.baseUrl;
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
        isProduction,
        get userId() { return userId; },
        get isDevelopment() { return isDevelopment; },
        isInitialized: () => isConfigInitialized
    };
})();