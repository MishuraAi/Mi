/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Конфигурация (config.js)
ВЕРСИЯ: 0.4.5 (Акцент на apiUrl, проверка инициализации)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.config = (function() {
    'use strict';
    
    const appSettings = {
        appName: 'МИШУРА',
        appVersion: '0.4.5', 
        // ================================================================================
        // ВАЖНО! ПРОВЕРЬТЕ ЭТОТ URL!
        // ================================================================================
        // Ошибка ERR_NAME_NOT_RESOLVED означает, что браузер НЕ МОЖЕТ найти сервер
        // по указанному здесь адресу.
        //
        // Для ЛОКАЛЬНОЙ РАЗРАБОТКИ:
        //   Если FastAPI и фронтенд на ОДНОМ порту (FastAPI отдает статику):
        //     apiUrl: '/api/v1', 
        //   Если FastAPI на ДРУГОМ порту (например, localhost:8000 для FastAPI):
        //     apiUrl: 'http://localhost:8000/api/v1', // Замените 8000 на ваш порт FastAPI
        //
        // Для ПРОДАКШЕНА:
        //   apiUrl: 'https://ВАШ_РЕАЛЬНЫЙ_ДОМЕН_API/api/v1',
        //
        // ТЕКУЩЕЕ ЗНАЧЕНИЕ (ЗАМЕНИТЕ ПРИ НЕОБХОДИМОСТИ):
        apiUrl: '/api/v1', // Используем относительный путь для локальной разработки
        // ================================================================================
        defaultLanguage: 'ru',
        debugMode: true, 
        maxUploadSize: 5 * 1024 * 1024, // 5MB
        supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxCompareImages: 4 
    };
    
    const themeSettings = {
        defaultTheme: 'light', 
        colorSchemes: { /* ... как было ... */ }
    };
    
    const apiSettings = {
        baseUrl: appSettings.apiUrl, 
        timeout: 30000, 
        retryAttempts: 2,
        endpoints: {
            consultation: '/analyze-outfit',      
            compare: '/compare-outfits',          
            virtualFitting: '/virtual-fitting', 
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
    let isConfigInitialized = false;
    
    function init() {
        const tempLogger = (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.logger) 
                       ? window.MishuraApp.utils.logger 
                       : console;

        if (isConfigInitialized) {
            // tempLogger.warn("Config: Повторная инициализация модуля конфигурации пропущена.");
            return;
        }
        tempLogger.info("Инициализация конфигурации (v0.4.5)...");

        userId = localStorage.getItem('mishura_user_id') || generateUserId();
        localStorage.setItem('mishura_user_id', userId);
        
        initTheme();
        
        tempLogger.info(`Config: AppName: ${appSettings.appName}, Version: ${appSettings.appVersion}, API URL: ${appSettings.apiUrl}`);
        isConfigInitialized = true;
    }
    
    function generateUserId() {
        return 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }
    
    function initTheme() { /* ... как было ... */ }
    function setTheme(theme) { /* ... как было ... */ }
    function getTheme() { /* ... как было ... */ }
    
    return {
        init,
        appSettings,
        themeSettings,
        apiSettings, 
        LIMITS,
        setTheme,
        getTheme,
        get userId() { return userId; },
        isInitialized: () => isConfigInitialized 
    };
})();