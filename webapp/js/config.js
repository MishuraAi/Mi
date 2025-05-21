/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Конфигурация (config.js)
ВЕРСИЯ: 0.4.4 (Усилены комментарии для apiUrl, проверка инициализации)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.config = (function() {
    'use strict';
    
    const appSettings = {
        appName: 'МИШУРА',
        appVersion: '0.4.4', 
        // ================================================================================
        // ВАЖНО! ОБРАТИТЕ ВНИМАНИЕ НА ЭТУ НАСТРОЙКУ!
        // ================================================================================
        // Если вы видите ошибку ERR_NAME_NOT_RESOLVED, это означает, что ваш браузер
        // НЕ МОЖЕТ НАЙТИ СЕРВЕР по указанному здесь адресу.
        //
        // Для ЛОКАЛЬНОЙ РАЗРАБОТКИ (когда FastAPI сервер запущен на вашем компьютере):
        // 1. Если FastAPI и фронтенд на ОДНОМ порту (например, FastAPI отдает статику):
        //    apiUrl: '/api/v1', // Относительный путь
        // 2. Если FastAPI на ДРУГОМ порту (например, localhost:8000):
        //    apiUrl: 'http://localhost:8000/api/v1', // Укажите ваш порт
        //
        // Для ПРОДАКШЕНА (например, на Render):
        //    apiUrl: 'https://your-deployed-api-url.onrender.com/api/v1', // Полный URL вашего развернутого API
        //
        // ТЕКУЩЕЕ ЗНАЧЕНИЕ (замените, если нужно):
        apiUrl: 'https://api.mishura-stylist.ru/v1', 
        // ================================================================================
        defaultLanguage: 'ru',
        debugMode: true, 
        maxUploadSize: 5 * 1024 * 1024, 
        supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'], // Используется в image-upload.js
        maxCompareImages: 4 
    };
    
    const themeSettings = { /* ... как было ... */ };
    
    const apiSettings = {
        baseUrl: appSettings.apiUrl, 
        timeout: 30000, 
        retryAttempts: 2,
        endpoints: {
            consultation: '/analyze-outfit',      
            compare: '/compare-outfits',          
            virtualFitting: '/virtual-fitting', 
            // feedback: '/feedback', // Пока не используются
            // user: '/user'
        },
        headers: { 'Accept-Language': 'ru' }
    };
    
    const LIMITS = {
        TOAST_DURATION: 3500, 
        MAX_FILE_SIZE: appSettings.maxUploadSize, 
        MAX_COMPARE_ITEMS: appSettings.maxCompareImages,
        MAX_TEXT_LENGTH: 500, 
        MIN_PASSWORD_LENGTH: 6
    };
    
    let userId = null; 
    let isConfigInitialized = false; // Флаг инициализации для этого модуля
    
    function init() {
        const tempLogger = (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.logger) 
                       ? window.MishuraApp.utils.logger 
                       : console;

        if (isConfigInitialized) {
            tempLogger.warn("Config: Повторная инициализация модуля конфигурации пропущена.");
            return;
        }
        tempLogger.info("Инициализация конфигурации (v0.4.4)...");

        userId = localStorage.getItem('mishura_user_id') || generateUserId();
        localStorage.setItem('mishura_user_id', userId);
        
        initTheme(); // Инициализация темы
        
        tempLogger.info(`Config: AppName: ${appSettings.appName}, Version: ${appSettings.appVersion}`);
        tempLogger.info(`Config: Используемый API URL: ${appSettings.apiUrl}`);
        tempLogger.debug(`Config: UserID: ${userId}`);
        
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
        localStorage.setItem('mishura_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        // ... (meta theme-color)
    }
    
    function getTheme() {
        return localStorage.getItem('mishura_theme') || themeSettings.defaultTheme;
    }
    
    return {
        init,
        appSettings,
        themeSettings,
        apiSettings, 
        LIMITS,
        setTheme,
        getTheme,
        get userId() { return userId; },
        isInitialized: () => isConfigInitialized // Экспортируем флаг
    };
})();