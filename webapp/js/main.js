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
    const Logger = app.utils.logger;
    const DeviceDetect = app.utils.deviceDetect;
    const UIHelpers = app.utils.uiHelpers;
    const Modals = app.components.modals;
    const Navigation = app.components.navigation;
    const ImageUpload = app.components.imageUpload;
    const APIService = app.api.service;
    const ConsultationFeature = app.features.consultation;
    const ComparisonFeature = app.features.comparison;
    const TryOnFeature = app.features.tryOn;
        
    /**
     * Инициализация Telegram WebApp API
     */
    function initTelegramWebApp() {
        if (window.Telegram && window.Telegram.WebApp) {
            Logger.info("Telegram WebApp API доступен. Вызов ready()...");
            try {
                Telegram.WebApp.ready(); // Сообщаем Telegram, что приложение готово
                Logger.info("Telegram.WebApp.ready() успешно вызван");
                
                // Пример: Попробуем расширить приложение на весь экран, если это возможно
                if (Telegram.WebApp.isExpanded) {
                    // Уже расширено
                } else {
                    Telegram.WebApp.expand();
                }
                return true;
            } catch (e) {
                Logger.error("Ошибка при работе с Telegram.WebApp:", e);
                return false;
            }
        } else {
            Logger.warn("window.Telegram.WebApp не найден! Приложение запущено вне Telegram или API не инициализирован");
            return false;
        }
    }
    
    /**
     * Настройка глобального обработчика ошибок
     */
    function setupErrorHandling() {
        window.onerror = function(message, source, lineno, colno, error) {
            Logger.error("Глобальная ошибка JavaScript:", {message, source, lineno, colno, error: error?.stack});
            UIHelpers.showToast("Произошла ошибка. Проверьте консоль.");
            return false;
        };
    }
    
    /**
     * Инициализация всего приложения
     */
    app.init = function() {
        Logger.info("Инициализация приложения МИШУРА");
        
        // Определение устройства пользователя
        DeviceDetect.init();
        Logger.info(`Определен тип устройства - iOS: ${DeviceDetect.isIOS}, Android: ${DeviceDetect.isAndroid}`);
        
        // Настройка обработчика ошибок
        setupErrorHandling();
        
        // Инициализация Telegram WebApp API
        const telegramInitialized = initTelegramWebApp();
        
        // Инициализация компонентов UI
        UIHelpers.init();
        Modals.init();
        Navigation.init();
        ImageUpload.init();
        
        // Инициализация API сервиса
        APIService.init();
        
        // Инициализация функциональных модулей
        ConsultationFeature.init();
        ComparisonFeature.init();
        TryOnFeature.init();
        
        UIHelpers.showToast("Приложение МИШУРА готово к работе!");
    };
    
    // Экспортируем интерфейс и версию
    app.version = '0.4.0';
    
})(window.MishuraApp);

// Экспортируем модуль в глобальное пространство имен для доступа из других модулей
window.MishuraApp.main = (function() {
    return {
        init: window.MishuraApp.init,
        version: window.MishuraApp.version
    };
})();