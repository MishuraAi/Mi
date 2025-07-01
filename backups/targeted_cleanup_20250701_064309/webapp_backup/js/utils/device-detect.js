/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Определение устройства (device-detect.js)
ВЕРСИЯ: 0.4.1 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Определяет тип устройства пользователя и его характеристики.
Позволяет адаптировать интерфейс под разные типы устройств.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.utils = window.MishuraApp.utils || {};
window.MishuraApp.utils.deviceDetector = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let logger;
    
    // Информация об устройстве
    let deviceInfo = {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        if (window.MishuraApp.utils.logger) {
            logger = window.MishuraApp.utils.logger;
        } else {
            logger = {
                debug: function(msg) { console.log('[DEBUG] ' + msg); },
                info: function(msg) { console.log('[INFO] ' + msg); },
                warn: function(msg) { console.warn('[WARN] ' + msg); },
                error: function(msg) { console.error('[ERROR] ' + msg); }
            };
        }
        
        // Определяем тип устройства
        detectDeviceType();
        
        // Настраиваем обработчики событий изменения размера
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleOrientationChange);
        
        // Добавляем классы для устройства в body
        updateBodyClasses();
        
        logger.info('Модуль Определение устройства инициализирован', deviceInfo);
    }
    
    /**
     * Определение типа устройства
     * @private
     */
    function detectDeviceType() {
        // Получаем текущую ширину экрана
        deviceInfo.screenWidth = window.innerWidth;
        deviceInfo.screenHeight = window.innerHeight;
        deviceInfo.pixelRatio = window.devicePixelRatio || 1;
        
        // Определяем ориентацию
        deviceInfo.orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        
        // Улучшенное определение типа устройства
        const userAgent = navigator.userAgent.toLowerCase();
        deviceInfo.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                             deviceInfo.screenWidth < 768;
        deviceInfo.isTablet = /ipad|android(?!.*mobile)/i.test(userAgent) || 
                             (deviceInfo.screenWidth >= 768 && deviceInfo.screenWidth < 1024);
        deviceInfo.isDesktop = !deviceInfo.isMobile && !deviceInfo.isTablet;
        
        // Расширенная проверка сенсорного экрана
        deviceInfo.isTouchDevice = 'ontouchstart' in window || 
                                  navigator.maxTouchPoints > 0 || 
                                  navigator.msMaxTouchPoints > 0 ||
                                  (window.DocumentTouch && document instanceof DocumentTouch);
        
        // Дополнительная информация о мобильном устройстве
        deviceInfo.isIOS = /iphone|ipad|ipod/i.test(userAgent);
        deviceInfo.isAndroid = /android/i.test(userAgent);
        deviceInfo.hasNotch = deviceInfo.isIOS && 
                             (window.screen.height === 812 || 
                              window.screen.height === 844 || 
                              window.screen.height === 896 || 
                              window.screen.height === 926);
        
        // ДОБАВЛЕНО: Дополнительная мобильная диагностика
        deviceInfo.userAgent = navigator.userAgent;
        deviceInfo.isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        deviceInfo.isWebView = /wv|WebView/.test(navigator.userAgent);
        
        // Проверка поддержки современных CSS features
        deviceInfo.supportsCSSContain = CSS.supports('contain: layout');
        deviceInfo.supportsWebP = checkWebPSupport();
        
        // Определение DPI для оптимизации изображений
        deviceInfo.dpi = window.devicePixelRatio * 96;
        deviceInfo.isHighDPI = window.devicePixelRatio > 1.5;
        
        logger.debug('Mobile diagnostics:', {
            isIOS: deviceInfo.isIOS,
            isAndroid: deviceInfo.isAndroid,
            isSafari: deviceInfo.isSafari,
            dpi: deviceInfo.dpi,
            supportsCSSContain: deviceInfo.supportsCSSContain
        });
    }
    
    /**
     * Проверка поддержки WebP
     * @private
     * @returns {boolean} - результат проверки
     */
    function checkWebPSupport() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    
    /**
     * Обработчик изменения размера окна
     * @private
     */
    function handleResize() {
        // Обновляем информацию об устройстве
        detectDeviceType();
        
        // Обновляем классы
        updateBodyClasses();
        
        // Отправляем событие изменения размера
        document.dispatchEvent(new CustomEvent('deviceResize', {
            detail: { deviceInfo: deviceInfo }
        }));
    }
    
    /**
     * Обработчик изменения ориентации устройства
     * @private
     */
    function handleOrientationChange() {
        // Обновляем информацию об устройстве
        detectDeviceType();
        
        // Обновляем классы
        updateBodyClasses();
        
        // Отправляем событие изменения ориентации
        document.dispatchEvent(new CustomEvent('deviceOrientationChange', {
            detail: { deviceInfo: deviceInfo }
        }));
    }
    
    /**
     * Обновление классов в body в зависимости от устройства
     * @private
     */
    function updateBodyClasses() {
        const bodyClasses = document.body.classList;
        
        // Удаляем все классы устройств
        bodyClasses.remove('device-mobile', 'device-tablet', 'device-desktop');
        bodyClasses.remove('touch-device', 'no-touch-device');
        bodyClasses.remove('orientation-portrait', 'orientation-landscape');
        bodyClasses.remove('ios-device', 'android-device', 'has-notch');
        
        // Добавляем новые классы
        if (deviceInfo.isMobile) bodyClasses.add('device-mobile');
        if (deviceInfo.isTablet) bodyClasses.add('device-tablet');
        if (deviceInfo.isDesktop) bodyClasses.add('device-desktop');
        
        if (deviceInfo.isTouchDevice) {
            bodyClasses.add('touch-device');
        } else {
            bodyClasses.add('no-touch-device');
        }
        
        if (deviceInfo.isIOS) bodyClasses.add('ios-device');
        if (deviceInfo.isAndroid) bodyClasses.add('android-device');
        if (deviceInfo.hasNotch) bodyClasses.add('has-notch');
        
        bodyClasses.add('orientation-' + deviceInfo.orientation);
    }
    
    /**
     * Получение информации об устройстве
     * @public
     * @returns {Object} - информация об устройстве
     */
    function getDeviceInfo() {
        return { ...deviceInfo };
    }
    
    /**
     * Проверка, является ли устройство мобильным
     * @public
     * @returns {boolean} - результат проверки
     */
    function isMobileDevice() {
        return deviceInfo.isMobile;
    }
    
    /**
     * Проверка, является ли устройство планшетом
     * @public
     * @returns {boolean} - результат проверки
     */
    function isTabletDevice() {
        return deviceInfo.isTablet;
    }
    
    /**
     * Проверка, является ли устройство десктопом
     * @public
     * @returns {boolean} - результат проверки
     */
    function isDesktopDevice() {
        return deviceInfo.isDesktop;
    }
    
    /**
     * Проверка, имеет ли устройство сенсорный экран
     * @public
     * @returns {boolean} - результат проверки
     */
    function isTouchEnabled() {
        return deviceInfo.isTouchDevice;
    }
    
    // Публичный API
    return {
        init,
        getDeviceInfo,
        isMobileDevice,
        isTabletDevice,
        isDesktopDevice,
        isTouchEnabled
    };
})();