/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Конфигурация (config.js)
ВЕРСИЯ: 0.4.1
ДАТА ОБНОВЛЕНИЯ: 2025-05-21
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.config = (function() {
    'use strict';
    
    // Общие настройки приложения
    const appSettings = {
        appName: 'МИШУРА',
        appVersion: '0.4.1',
        apiUrl: 'https://api.mishura-stylist.ru/v1',
        defaultLanguage: 'ru',
        debugMode: true, // Включить/отключить режим отладки
        maxUploadSize: 5242880, // 5MB в байтах
        supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxCompareImages: 4 // Максимальное количество изображений для сравнения
    };
    
    // Настройки темы
    const themeSettings = {
        defaultTheme: 'light', // 'light' или 'dark'
        colorSchemes: {
            light: {
                primary: '#7E57C2',
                secondary: '#FF4081',
                background: '#F5F5F5',
                surface: '#FFFFFF',
                text: '#212121',
                error: '#F44336'
            },
            dark: {
                primary: '#B39DDB',
                secondary: '#FF80AB',
                background: '#121212',
                surface: '#1E1E1E',
                text: '#FFFFFF',
                error: '#CF6679'
            }
        }
    };
    
    // Настройки API
    const apiSettings = {
        timeout: 30000, // 30 секунд
        retryAttempts: 3,
        endpoints: {
            consultation: '/consultation',
            compare: '/compare',
            virtualFitting: '/virtual-fitting',
            feedback: '/feedback',
            user: '/user'
        },
        headers: {
            'Content-Type': 'application/json',
            'Accept-Language': 'ru'
        }
    };
    
    // Идентификатор пользователя (может быть загружен из localStorage)
    let userId = localStorage.getItem('mishura_user_id') || null;
    
    /**
     * Инициализация модуля конфигурации
     */
    function init() {
        // Определение и сохранение идентификатора пользователя
        if (!userId) {
            userId = generateUserId();
            localStorage.setItem('mishura_user_id', userId);
        }
        
        // Инициализация темы
        initTheme();
        
        // Другие инициализации...
    }
    
    /**
     * Генерация идентификатора пользователя
     * @private
     * @returns {string} - уникальный идентификатор
     */
    function generateUserId() {
        return 'user_' + Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
    
    /**
     * Инициализация темы
     * @private
     */
    function initTheme() {
        // Получение сохраненной темы или использование дефолтной
        const savedTheme = localStorage.getItem('mishura_theme') || themeSettings.defaultTheme;
        
        // Установка темы
        setTheme(savedTheme);
    }
    
    /**
     * Установка темы
     * @public
     * @param {string} theme - 'light' или 'dark'
     */
    function setTheme(theme) {
        // Проверка валидности темы
        if (!themeSettings.colorSchemes[theme]) {
            theme = themeSettings.defaultTheme;
        }
        
        // Сохранение темы
        localStorage.setItem('mishura_theme', theme);
        
        // Установка атрибута темы на корневом элементе
        document.documentElement.setAttribute('data-theme', theme);
        
        // Установка мета-тега для адаптации цвета темы в мобильных браузерах
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', 
                theme === 'dark' ? themeSettings.colorSchemes.dark.primary : themeSettings.colorSchemes.light.primary);
        }
    }
    
    /**
     * Получение текущей темы
     * @public
     * @returns {string} - 'light' или 'dark'
     */
    function getTheme() {
        return localStorage.getItem('mishura_theme') || themeSettings.defaultTheme;
    }
    
    // Публичный API
    return {
        init,
        appSettings,
        themeSettings,
        apiSettings,
        setTheme,
        getTheme,
        get userId() { return userId; }
    };
})();