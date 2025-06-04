/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Конфигурация (config.js)
ВЕРСИЯ: 1.2.0 (АВТОМАТИЧЕСКИ СГЕНЕРИРОВАНО)
РЕЖИМ: DEMO
ДАТА ОБНОВЛЕНИЯ: 2025-06-04 23:58:50
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.config = (function() {
    'use strict';
    
    let logger;
    let isInitialized = false;
    
    const CONFIG = {
        // API настройки для demo
        API: {
            POSSIBLE_PORTS: [8000, 8001],
            POSSIBLE_HOSTS: ['http://localhost', 'http://127.0.0.1'],
            VERSION: 'v1',
            TIMEOUT: 30000,
            RETRIES: 3,
            BASE_URL: 'http://localhost:8000/api/v1',
            PORT: 8000
        },
        
        // UI настройки
        UI: {
            TOAST_DURATION: 5000,
            LOADING_MIN_DURATION: 2000,
            ANIMATION_DURATION: 500
        },
        
        // Настройки файлов
        FILES: {
            MAX_SIZE: 20 * 1024 * 1024,
            ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
            MAX_COMPARE_IMAGES: 4
        },
        
        // Режимы работы
        MODES: {
            SINGLE: 'single',
            COMPARE: 'compare'
        },
        
        // Настройки режима
        DEBUG: true,
        DEMO_MODE: true,
        PRODUCTION: false,
        ENVIRONMENT: 'demo',
        
        // Специфичные настройки
        DEMO_MESSAGES: true,
        PAYMENT_ENABLED: false,
        AI_ANALYSIS_REAL: false
    };
    
    function init() {
        if (isInitialized) {
            return CONFIG;
        }
        
        logger = window.MishuraApp.utils?.logger || createFallbackLogger();
        logger.info(`Инициализация МИШУРА в режиме: DEMO`);
        
        detectApiUrl();
        isInitialized = true;
        
        if (CONFIG.DEMO_MODE) {
            logger.warn("🧪 ВНИМАНИЕ: Приложение в ДЕМО режиме");
        } else if (CONFIG.PRODUCTION) {
            logger.info("🚀 Приложение в PRODUCTION режиме");
        } else {
            logger.info("🔧 Приложение в DEVELOPMENT режиме");
        }
        
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
    
    function detectApiUrl() {
        if (CONFIG.PRODUCTION) {
            CONFIG.API.BASE_URL = 'https://style-ai-bot.onrender.com/api/v1';
            return;
        }
        
        // Для development и demo пробуем локальные порты
        for (const port of CONFIG.API.POSSIBLE_PORTS) {
            const url = `http://localhost:${port}/api/v1`;
            
            fetch(`http://localhost:${port}/api/v1/health`, {
                method: 'GET',
                timeout: 3000
            }).then(response => {
                if (response.ok) {
                    CONFIG.API.BASE_URL = url;
                    CONFIG.API.PORT = port;
                    logger.info(`API найден на порту ${port}`);
                    return;
                }
            }).catch(error => {
                logger.debug(`Порт ${port} недоступен`);
            });
        }
        
        if (!CONFIG.API.BASE_URL) {
            CONFIG.API.BASE_URL = 'http://localhost:8000/api/v1';
            CONFIG.API.PORT = 8000;
        }
    }
    
    function getApiUrl(endpoint = '') {
        if (!CONFIG.API.BASE_URL) {
            detectApiUrl();
        }
        return CONFIG.API.BASE_URL + (endpoint ? `/${endpoint.replace(/^\//, '')}` : '');
    }
    
    function isValidImageFile(file) {
        if (!file) return false;
        return CONFIG.FILES.ALLOWED_TYPES.includes(file.type) && 
               file.size <= CONFIG.FILES.MAX_SIZE;
    }
    
    // Публичный API
    return {
        init,
        get: () => CONFIG,
        api: () => CONFIG.API,
        ui: () => CONFIG.UI,
        files: () => CONFIG.FILES,
        modes: () => CONFIG.MODES,
        getApiUrl,
        isValidImageFile,
        isInitialized: () => isInitialized,
        isDebug: () => CONFIG.DEBUG,
        isDemoMode: () => CONFIG.DEMO_MODE,
        isProduction: () => CONFIG.PRODUCTION,
        getEnvironment: () => CONFIG.ENVIRONMENT
    };
})();

// Автоинициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.MishuraApp.config.init();
    });
} else {
    window.MishuraApp.config.init();
}
