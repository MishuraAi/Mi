/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Конфигурация (config.js)
ВЕРСИЯ: 1.1.0 (ИСПРАВЛЕНЫ ПОРТЫ И API ENDPOINTS)
ДАТА ОБНОВЛЕНИЯ: 2025-05-31

ИСПРАВЛЕНИЯ:
- Исправлен порт API с 5000 на 8000 (соответствие .env)
- Упрощено автоопределение API
- Убрано дублирование инициализации
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.config = (function() {
    'use strict';
    
    let logger;
    let isInitialized = false;
    
    // ИСПРАВЛЕННАЯ конфигурация
    const CONFIG = {
        // API настройки - СООТВЕТСТВУЮТ .env файлу
        API: {
            // Порты в правильном порядке: 8000 (основной), 8001 (резервный)
            POSSIBLE_PORTS: [8000, 8001], // ✅ ИСПРАВЛЕНО: 8000 первый
            POSSIBLE_HOSTS: [
                'http://localhost',
                'http://127.0.0.1',
                'https://style-ai-bot.onrender.com'
            ],
            VERSION: 'v1',
            TIMEOUT: 30000,
            RETRIES: 3,
            // Текущие значения (будут определены автоматически)
            BASE_URL: null,
            PORT: null
        },
        
        // UI настройки
        UI: {
            TOAST_DURATION: 3000,
            LOADING_MIN_DURATION: 1000,
            ANIMATION_DURATION: 300
        },
        
        // Настройки файлов
        FILES: {
            MAX_SIZE: 20 * 1024 * 1024, // 20MB
            ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
            MAX_COMPARE_IMAGES: 4
        },
        
        // Режимы работы
        MODES: {
            SINGLE: 'single',
            COMPARE: 'compare'
        },
        
        // Отладка
        DEBUG: false
    };
    
    function init() {
        if (isInitialized) {
            logger?.debug("Config уже инициализирован, пропуск");
            return CONFIG;
        }
        
        logger = window.MishuraApp.utils?.logger || createFallbackLogger();
        logger.info("Инициализация конфигурации (v1.1.0)...");
        
        // Определяем API URL автоматически
        detectApiUrl();
        
        isInitialized = true;
        
        logger.info(`Config: МИШУРА v${CONFIG.API.VERSION}`);
        logger.info(`Config: API URL: ${CONFIG.API.BASE_URL}`);
        logger.info(`Config: Режим: ${CONFIG.DEBUG ? 'Отладка' : 'Разработка'}`);
        
        return CONFIG;
    }
    
    function createFallbackLogger() {
        return {
            debug: (...args) => console.debug("Config:", ...args),
            info: (...args) => console.info("Config:", ...args),
            warn: (...args) => console.warn("Config:", ...args),
            error: (...args) => console.error("Config:", ...args)
        };
    }
    
    // УПРОЩЕННОЕ автоопределение API
    function detectApiUrl() {
        logger.info("Config: Автоопределение порта API...");
        
        // Пробуем порты в правильном порядке
        for (const port of CONFIG.API.POSSIBLE_PORTS) {
            const url = `http://localhost:${port}/api/v1`;
            
            // Проверяем доступность порта
            fetch(`http://localhost:${port}/api/v1/health`, {
                method: 'GET',
                timeout: 3000
            }).then(response => {
                if (response.ok) {
                    CONFIG.API.BASE_URL = url;
                    CONFIG.API.PORT = port;
                    logger.info(`Config: API найден на порту ${port}`);
                    return;
                }
            }).catch(error => {
                logger.debug(`Config: Порт ${port} недоступен`);
            });
        }
        
        // Если ничего не найдено, используем значение по умолчанию
        if (!CONFIG.API.BASE_URL) {
            CONFIG.API.BASE_URL = 'http://localhost:8000/api/v1'; // ✅ ИСПРАВЛЕНО
            CONFIG.API.PORT = 8000; // ✅ ИСПРАВЛЕНО
            logger.info(`Config: Используется порт по умолчанию 8000`);
        }
    }
    
    // Утилиты конфигурации
    function getApiUrl(endpoint = '') {
        if (!CONFIG.API.BASE_URL) {
            detectApiUrl();
        }
        return CONFIG.API.BASE_URL + (endpoint ? `/${endpoint.replace(/^\//, '')}` : '');
    }
    
    function isValidImageFile(file) {
        if (!file) return false;
        
        // Проверяем тип
        if (!CONFIG.FILES.ALLOWED_TYPES.includes(file.type)) {
            return false;
        }
        
        // Проверяем размер
        if (file.size > CONFIG.FILES.MAX_SIZE) {
            return false;
        }
        
        return true;
    }
    
    function updateApiUrl(newUrl) {
        CONFIG.API.BASE_URL = newUrl;
        logger.info(`Config: API URL обновлен на: ${newUrl}`);
    }
    
    function enableDebug() {
        CONFIG.DEBUG = true;
        logger.info("Config: Режим отладки включен");
    }
    
    function disableDebug() {
        CONFIG.DEBUG = false;
        logger.info("Config: Режим отладки выключен");
    }
    
    // Публичный API
    return {
        init,
        
        // Основные настройки
        get: () => CONFIG,
        api: () => CONFIG.API,
        ui: () => CONFIG.UI,
        files: () => CONFIG.FILES,
        modes: () => CONFIG.MODES,
        
        // Утилиты
        getApiUrl,
        isValidImageFile,
        updateApiUrl,
        enableDebug,
        disableDebug,
        
        // Состояние
        isInitialized: () => isInitialized,
        isDebug: () => CONFIG.DEBUG
    };
})();

// Автоинициализация только если еще не инициализирован
if (!window.MishuraApp.config.isInitialized()) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.MishuraApp.config.init();
        });
    } else {
        window.MishuraApp.config.init();
    }
}