/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Главный модуль (main.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

НАЗНАЧЕНИЕ ФАЙЛА:
Главный модуль приложения МИШУРА. Точка входа для инициализации всех компонентов.
Управляет жизненным циклом приложения и связывает все модули вместе.
==========================================================================================
*/

// Создаем глобальное пространство имен для приложения
window.MishuraApp = window.MishuraApp || {};

// Самовызывающаяся функция для изоляции основного кода
(function(app) {
    'use strict';
    
    // Инициализация модулей
    let Logger, DeviceDetect, UIHelpers, Modals, Navigation, ImageUpload, APIService;
    let ConsultationFeature, ComparisonFeature, TryOnFeature;
        
    /**
     * Инициализация Telegram WebApp API
     */
    function initTelegramWebApp() {
        if (window.Telegram && window.Telegram.WebApp) {
            if (Logger) Logger.info("Telegram WebApp API доступен. Вызов ready()...");
            else console.info("Telegram WebApp API доступен. Вызов ready()...");
            
            try {
                Telegram.WebApp.ready(); // Сообщаем Telegram, что приложение готово
                if (Logger) Logger.info("Telegram.WebApp.ready() успешно вызван");
                else console.info("Telegram.WebApp.ready() успешно вызван");
                
                // Пример: Попробуем расширить приложение на весь экран, если это возможно
                if (Telegram.WebApp.isExpanded) {
                    // Уже расширено
                } else {
                    Telegram.WebApp.expand();
                }
                return true;
            } catch (e) {
                if (Logger) Logger.error("Ошибка при работе с Telegram.WebApp:", e);
                else console.error("Ошибка при работе с Telegram.WebApp:", e);
                return false;
            }
        } else {
            if (Logger) Logger.warn("window.Telegram.WebApp не найден! Приложение запущено вне Telegram или API не инициализирован");
            else console.warn("window.Telegram.WebApp не найден! Приложение запущено вне Telegram или API не инициализирован");
            return false;
        }
    }
    
    /**
     * Настройка глобального обработчика ошибок
     */
    function setupErrorHandling() {
        window.onerror = function(message, source, lineno, colno, error) {
            if (Logger) Logger.error("Глобальная ошибка JavaScript:", {message, source, lineno, colno, error: error?.stack});
            else console.error("Глобальная ошибка JavaScript:", {message, source, lineno, colno, error: error?.stack});
            
            if (UIHelpers) UIHelpers.showToast("Произошла ошибка. Проверьте консоль.");
            else alert("Произошла ошибка. Проверьте консоль.");
            
            return false;
        };
    }
    
    /**
     * Инициализация всего приложения
     */
    app.init = function() {
        // Инициализируем ссылки на модули
        if (app.utils) {
            Logger = app.utils.logger;
            DeviceDetect = app.utils.deviceDetect;
            UIHelpers = app.utils.uiHelpers;
        }
        
        if (app.components) {
            Modals = app.components.modals;
            Navigation = app.components.navigation;
            ImageUpload = app.components.imageUpload;
        }
        
        if (app.api) {
            APIService = app.api.service;
        }
        
        if (app.features) {
            ConsultationFeature = app.features.consultation;
            ComparisonFeature = app.features.comparison;
            TryOnFeature = app.features.tryOn;
        }
        
        if (Logger) Logger.info("Инициализация приложения МИШУРА");
        else console.info("Инициализация приложения МИШУРА");
        
        // Настройка обработчика ошибок
        setupErrorHandling();
        
        // Определение устройства пользователя
        if (DeviceDetect && typeof DeviceDetect.init === 'function') {
            DeviceDetect.init();
            if (Logger) Logger.info(`Определен тип устройства - iOS: ${DeviceDetect.isIOS}, Android: ${DeviceDetect.isAndroid}`);
        }
        
        // Инициализация Telegram WebApp API
        const telegramInitialized = initTelegramWebApp();
        
        // Инициализация компонентов UI
        if (UIHelpers && typeof UIHelpers.init === 'function') UIHelpers.init();
        if (Modals && typeof Modals.init === 'function') Modals.init();
        if (Navigation && typeof Navigation.init === 'function') Navigation.init();
        if (ImageUpload && typeof ImageUpload.init === 'function') ImageUpload.init();
        
        // Инициализация API сервиса
        if (APIService && typeof APIService.init === 'function') APIService.init();
        
        // Инициализация функциональных модулей
        if (ConsultationFeature && typeof ConsultationFeature.init === 'function') ConsultationFeature.init();
        if (ComparisonFeature && typeof ComparisonFeature.init === 'function') ComparisonFeature.init();
        if (TryOnFeature && typeof TryOnFeature.init === 'function') TryOnFeature.init();
        
        if (UIHelpers && typeof UIHelpers.showToast === 'function') {
            UIHelpers.showToast("Приложение МИШУРА готово к работе!");
        }
    };
    
    // Экспортируем интерфейс и версию
    app.version = '0.4.0';
    
})(window.MishuraApp);

// Экспортируем модуль в глобальное пространство имен для доступа из других модулей
window.MishuraApp.main = {
    init: function() {
        if (window.MishuraApp && typeof window.MishuraApp.init === 'function') {
            window.MishuraApp.init();
        } else {
            console.error("Ошибка: window.MishuraApp.init не является функцией");
        }
    },
    version: window.MishuraApp.version || '0.4.0'
};