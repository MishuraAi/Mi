/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Определение устройства (device-detect.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

НАЗНАЧЕНИЕ ФАЙЛА:
Определение типа и характеристик устройства пользователя для адаптации
поведения приложения под различные платформы (iOS, Android, десктоп).
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.utils = window.MishuraApp.utils || {};
window.MishuraApp.utils.deviceDetect = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let logger;
    
    // Флаги типов устройств
    let isIOS = false;
    let isAndroid = false;
    let isMobile = false;
    let isTablet = false;
    let isDesktop = false;
    
    // Характеристики устройства
    let touchEnabled = false;
    let screenWidth = 0;
    let screenHeight = 0;
    let devicePixelRatio = 1;
    
    /**
     * Определение типа устройства на основе User-Agent и других характеристик
     */
    function detectDeviceType() {
        const ua = navigator.userAgent.toLowerCase();
        
        // Определение iOS
        isIOS = /ipad|iphone|ipod/.test(ua) && !window.MSStream;
        
        // Определение Android
        isAndroid = /android/.test(ua);
        
        // Определение мобильных устройств в целом
        isMobile = /mobile|iphone|ipod|android.*mobile|windows.*phone|blackberry.*mobile/i.test(ua);
        
        // Определение планшетов (грубое приближение)
        isTablet = /ipad|android(?!.*mobile)/i.test(ua) || 
                  (window.innerWidth >= 600 && window.innerWidth <= 1200 && 'ontouchstart' in window);
        
        // Если не мобильное и не планшет, значит десктоп
        isDesktop = !(isMobile || isTablet);
        
        // Определение поддержки сенсорного экрана
        touchEnabled = ('ontouchstart' in window) || 
                       (navigator.maxTouchPoints > 0) || 
                       (navigator.msMaxTouchPoints > 0);
        
        // Размеры экрана
        screenWidth = window.innerWidth;
        screenHeight = window.innerHeight;
        devicePixelRatio = window.devicePixelRatio || 1;
        
        logger.info("Определение устройства:", {
            isIOS, isAndroid, isMobile, isTablet, isDesktop,
            touchEnabled, screenWidth, screenHeight, devicePixelRatio
        });
        
        // Добавляем CSS-классы к body для стилизации
        updateBodyClasses();
    }
    
    /**
     * Добавляет CSS-классы к тегу body на основе типа устройства
     */
    function updateBodyClasses() {
        if (isIOS) document.body.classList.add('ios-device');
        if (isAndroid) document.body.classList.add('android-device');
        if (isMobile) document.body.classList.add('mobile-device');
        if (isTablet) document.body.classList.add('tablet-device');
        if (isDesktop) document.body.classList.add('desktop-device');
        if (touchEnabled) document.body.classList.add('touch-enabled');
    }
    
    /**
     * Инициализация специфичных настроек для разных платформ
     */
    function setupPlatformSpecifics() {
        if (isIOS) {
            // Исправления для iOS
            setupIOSFixes();
        }
        
        if (isAndroid) {
            // Исправления для Android
            setupAndroidFixes();
        }
        
        if (touchEnabled) {
            // Настройка для сенсорных устройств
            setupTouchHandling();
        }
    }
    
    /**
     * Применяет специфичные исправления для iOS
     */
    function setupIOSFixes() {
        // Исправление для скролла на iOS
        document.addEventListener('touchmove', function(e) {
            // Предотвращаем скролл только для определенных элементов
            if (e.target.closest('.no-scroll-ios')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Фикс для 100vh на iOS (проблема с адресной строкой браузера)
        const setIOSViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        window.addEventListener('resize', setIOSViewportHeight);
        setIOSViewportHeight(); // Вызов при инициализации
        
        logger.debug("Применены исправления для iOS");
    }
    
    /**
     * Применяет специфичные исправления для Android
     */
    function setupAndroidFixes() {
        // Исправления для разных версий Android при необходимости
        logger.debug("Применены исправления для Android");
    }
    
    /**
     * Устанавливает обработку сенсорных событий
     */
    function setupTouchHandling() {
        // Предотвращаем масштабирование двойным тапом на сенсорных устройствах
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            const DOUBLE_TAP_DELAY = 300;
            
            if (this.lastClick && (now - this.lastClick) < DOUBLE_TAP_DELAY) {
                e.preventDefault();
            }
            
            this.lastClick = now;
        }, { passive: false });
        
        logger.debug("Настроена обработка сенсорных событий");
    }
    
    /**
     * Определяет, поддерживает ли браузер определенную возможность
     * @param {string} feature - название возможности для проверки
     * @returns {boolean} - поддерживается ли возможность
     */
    function supportsFeature(feature) {
        switch (feature.toLowerCase()) {
            case 'touch':
                return touchEnabled;
            case 'webp':
                // Проверка поддержки WebP (упрощенная)
                const canvas = document.createElement('canvas');
                if (canvas.getContext && canvas.getContext('2d')) {
                    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
                }
                return false;
            case 'webgl':
                try {
                    const canvas = document.createElement('canvas');
                    return !!(window.WebGLRenderingContext && 
                             (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
                } catch (e) {
                    return false;
                }
            // Добавьте другие проверки по необходимости
            default:
                return false;
        }
    }
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылку на логгер
        logger = window.MishuraApp.utils.logger;
        
        // Определяем характеристики устройства
        detectDeviceType();
        
        // Настраиваем специфики платформ
        setupPlatformSpecifics();
        
        // Обработка изменения размера окна
        window.addEventListener('resize', function() {
            screenWidth = window.innerWidth;
            screenHeight = window.innerHeight;
            logger.debug("Изменение размера окна:", {width: screenWidth, height: screenHeight});
        });
        
        logger.debug("Модуль определения устройства инициализирован");
    }
    
    // Публичный API модуля
    return {
        init,
        get isIOS() { return isIOS; },
        get isAndroid() { return isAndroid; },
        get isMobile() { return isMobile; },
        get isTablet() { return isTablet; },
        get isDesktop() { return isDesktop; },
        get touchEnabled() { return touchEnabled; },
        get screenWidth() { return screenWidth; },
        get screenHeight() { return screenHeight; },
        get devicePixelRatio() { return devicePixelRatio; },
        supportsFeature
    };
})();