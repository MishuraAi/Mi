/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Конфигурация (config.js)
ВЕРСИЯ: 0.4.3 (Уточнена структура apiUrl, добавлено логгирование)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.config = (function() {
    'use strict';
    
    const appSettings = {
        appName: 'МИШУРА',
        appVersion: '0.4.3', 
        // ВАЖНО: Для локальной разработки этот URL должен указывать на ваш локальный FastAPI сервер.
        // Например: '/api/v1' (если фронтенд и бэкенд на одном порту)
        // или 'http://localhost:ВАШ_ПОРТ_БЭКЕНДА/api/v1'.
        // Убедитесь, что этот URL ПРАВИЛЬНЫЙ для вашей текущей среды.
        // Ошибка ERR_NAME_NOT_RESOLVED означает, что домен НЕ МОЖЕТ БЫТЬ НАЙДЕН.
        apiUrl: 'https://api.mishura-stylist.ru/v1', // ЗАМЕНИТЕ ЭТО, ЕСЛИ ТЕСТИРУЕТЕ ЛОКАЛЬНО!
        defaultLanguage: 'ru',
        debugMode: true, 
        maxUploadSize: 5 * 1024 * 1024, 
        supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxCompareImages: 4 
    };
    
    const themeSettings = {
        defaultTheme: 'light', 
        colorSchemes: {
            light: { primary: '#7E57C2', secondary: '#FF4081', background: '#F5F5F5', surface: '#FFFFFF', text: '#212121', error: '#F44336' },
            dark: { primary: '#B39DDB', secondary: '#FF80AB', background: '#121212', surface: '#1E1E1E', text: '#FFFFFF', error: '#CF6679' }
        }
    };
    
    const apiSettings = {
        baseUrl: appSettings.apiUrl, 
        timeout: 30000, 
        retryAttempts: 2, // Уменьшено для более быстрой диагностики ошибок сети
        endpoints: {
            consultation: '/analyze-outfit',      
            compare: '/compare-outfits',          
            virtualFitting: '/virtual-fitting', 
            // Эндпоинты ниже пока не используются активно в коде FastAPI:
            // feedback: '/feedback',                
            // user: '/user'                         
        },
        headers: { 
            'Accept-Language': 'ru'
        }
    };
    
    const LIMITS = {
        TOAST_DURATION: 3500, 
        MAX_FILE_SIZE: appSettings.maxUploadSize, 
        MAX_COMPARE_ITEMS: appSettings.maxCompareImages,
        MAX_TEXT_LENGTH: 500, 
        MIN_PASSWORD_LENGTH: 6
    };
    
    let userId = null; 
    let isInitialized = false;
    
    function init() {
        if (isInitialized) {
            console.warn("Config: Повторная инициализация пропущена.");
            return;
        }
        const tempLogger = (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.logger) 
                       ? window.MishuraApp.utils.logger 
                       : { info: console.info, debug: console.debug, warn: console.warn, error: console.error };

        tempLogger.info("Инициализация конфигурации (v0.4.3)...");

        userId = localStorage.getItem('mishura_user_id') || generateUserId();
        localStorage.setItem('mishura_user_id', userId);
        
        initTheme();
        
        tempLogger.info(`Config: AppName: ${appSettings.appName}, Version: ${appSettings.appVersion}`);
        tempLogger.info(`Config: API URL используется: ${appSettings.apiUrl}`);
        tempLogger.info(`Config: UserID: ${userId}`);
        tempLogger.debug("Config: LIMITS:", LIMITS);
        tempLogger.debug("Config: API Settings (endpoints):", apiSettings.endpoints);
        isInitialized = true;
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
        
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const activeScheme = themeSettings.colorSchemes[theme] || themeSettings.colorSchemes.light;
            metaThemeColor.setAttribute('content', activeScheme.primary);
        }
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
        get userId() { return userId; }
    };
})();