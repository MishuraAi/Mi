/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузчик приложения (app.js)
ВЕРСИЯ: 0.4.5 (Улучшен вызов init модулей, настройка обработчиков кнопок)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Загрузчик приложения, который инициализирует все модули в правильном порядке.
==========================================================================================
*/

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    window.MishuraApp = window.MishuraApp || {};
    ['utils', 'api', 'components', 'features'].forEach(ns => {
        window.MishuraApp[ns] = window.MishuraApp[ns] || {};
    });
    
    const appLoaderLogger = { 
        debug: (...args) => console.debug("AppLoader:", ...args), 
        info: (...args) => console.info("AppLoader:", ...args), 
        warn: (...args) => console.warn("AppLoader:", ...args), 
        error: (...args) => console.error("AppLoader:", ...args) 
    };

    function tryInitModule(modulePath, moduleFriendlyName) {
        const parts = modulePath.split('.');
        let moduleObject = window;
        for (const part of parts) {
            if (moduleObject && typeof moduleObject === 'object' && part in moduleObject) {
                moduleObject = moduleObject[part];
            } else {
                appLoaderLogger.warn(`Модуль по пути '${modulePath}' не найден (ошибка на '${part}'). Инициализация ${moduleFriendlyName} пропускается.`);
                return false;
            }
        }
        
        if (moduleObject && typeof moduleObject.init === 'function') {
            try {
                // Проверяем, есть ли флаг isInitialized и не был ли модуль уже инициализирован
                if (typeof moduleObject.isInitialized === 'function' && moduleObject.isInitialized()) {
                    appLoaderLogger.debug(`Модуль '${moduleFriendlyName}' (${modulePath}) уже был инициализирован. Повторный вызов init() пропускается.`);
                    return true;
                }
                moduleObject.init(); 
                // Логгер самого модуля должен сообщить об успехе.
                // appLoaderLogger.info(`Модуль '${moduleFriendlyName}' (${modulePath}) вызвал init().`);
                return true;
            } catch (e) {
                appLoaderLogger.error(`Ошибка при вызове init() для модуля '${moduleFriendlyName}' (${modulePath}):`, e.message, e.stack);
                return false;
            }
        } else {
            appLoaderLogger.warn(`Модуль '${moduleFriendlyName}' (${modulePath}) найден, но функция init отсутствует или не является функцией.`);
            return false;
        }
    }

    try {
        appLoaderLogger.info("Инициализация приложения МИШУРА (v0.4.5)...");
        
        // Порядок важен!
        tryInitModule('MishuraApp.config', 'Конфигурация');
        tryInitModule('MishuraApp.utils.logger', 'Логгер');
        
        // Обновляем ссылку на логгер, если он был успешно инициализирован
        const logger = (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.logger) 
                        ? window.MishuraApp.utils.logger 
                        : appLoaderLogger;

        // Проверяем конфигурацию API после инициализации
        if (window.MishuraApp.config) {
            logger.info("Проверка конфигурации API:", {
                apiUrl: window.MishuraApp.config.appSettings.apiUrl,
                baseUrl: window.MishuraApp.config.apiSettings.baseUrl,
                endpoints: window.MishuraApp.config.apiSettings.endpoints
            });
        } else {
            logger.error("Конфигурация не найдена после инициализации!");
        }

        tryInitModule('MishuraApp.utils.deviceDetector', 'Определение устройства');
        tryInitModule('MishuraApp.utils.uiHelpers', 'UI-хелперы');
        
        tryInitModule('MishuraApp.api.service', 'API-сервис'); 
        
        // Проверяем инициализацию API сервиса
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            logger.info("API сервис инициализирован:", {
                isInitialized: window.MishuraApp.api.service.isInitialized ? window.MishuraApp.api.service.isInitialized() : 'метод не найден',
                baseUrl: window.MishuraApp.api.service.getBaseUrl ? window.MishuraApp.api.service.getBaseUrl() : 'метод не найден'
            });
        } else {
            logger.error("API сервис не найден после инициализации!");
        }

        tryInitModule('MishuraApp.components.navigation', 'Навигация');
        tryInitModule('MishuraApp.components.modals', 'Модальные окна'); 
        tryInitModule('MishuraApp.components.imageUpload', 'Загрузка изображений');
        
        tryInitModule('MishuraApp.features.consultation', 'Консультации');
        tryInitModule('MishuraApp.features.comparison', 'Сравнение образов');
        tryInitModule('MishuraApp.features.tryOn', 'Виртуальная примерка');
        
        tryInitModule('MishuraApp.main', 'Основной модуль'); 
        
        // Настройка обработчиков кнопок ПОСЛЕ инициализации всех модулей
        setupGlobalButtonHandlers(logger);

        logger.info("Инициализация всех модулей приложения МИШУРА успешно завершена.");
        
    } catch (error) {
        appLoaderLogger.error("Критическая ошибка на верхнем уровне инициализации приложения МИШУРА:", error.message, error.stack);
        const uiHelpers = window.MishuraApp.utils.uiHelpers;
        if (uiHelpers && typeof uiHelpers.showToast === 'function') {
            uiHelpers.showToast('Критическая ошибка при запуске. Обновите страницу.', 5000);
        } else {
            alert('Произошла критическая ошибка при запуске приложения. Пожалуйста, обновите страницу.');
        }
    }
});

/**
 * Настройка обработчиков для глобальных кнопок, инициирующих открытие модальных окон.
 */
function setupGlobalButtonHandlers(loggerInstance) {
    const logger = loggerInstance || console;
    logger.debug("App.js: Настройка обработчиков глобальных кнопок...");

    const modals = window.MishuraApp.components.modals;
    const consultationFeature = window.MishuraApp.features.consultation;
    const tryOnFeature = window.MishuraApp.features.tryOn;
    const uiHelpers = window.MishuraApp.utils.uiHelpers;

    if (!modals) {
        logger.error("App.js: Модуль modals не найден! Обработчики кнопок не могут быть настроены корректно.");
        if (uiHelpers) uiHelpers.showToast("Ошибка интерфейса: функции модальных окон недоступны (A02).");
        return;
    }

    // Кнопка "Получить консультацию" (ID: consultation-button)
    const consultationButton = document.getElementById('consultation-button');
    if (consultationButton) {
        // Удаляем старые обработчики, если есть (через клонирование)
        const newConsultationButton = consultationButton.cloneNode(true);
        consultationButton.parentNode.replaceChild(newConsultationButton, consultationButton);

        newConsultationButton.addEventListener('click', function() {
            logger.debug("App.js: Кнопка 'consultation-button' нажата.");
            if (consultationFeature && typeof consultationFeature.openConsultationModal === 'function') {
                 consultationFeature.openConsultationModal(); // Делегируем открытие модулю consultation
            } else if (typeof modals.openConsultationModal === 'function') { // Фоллбэк на прямое открытие через modals
                logger.warn("App.js: consultationFeature.openConsultationModal не найден, используем modals.openConsultationModal().");
                modals.openConsultationModal();
            } else {
                logger.error("App.js: Не найден метод для открытия модального окна консультации!");
                if (uiHelpers) uiHelpers.showToast("Функция консультации временно недоступна (A03).");
            }
        });
        logger.info("App.js: Обработчик для 'consultation-button' назначен.");
    } else {
        logger.warn("App.js: Кнопка 'consultation-button' не найдена в DOM.");
    }

    // Кнопка "Примерить" (ID: try-on-button)
    const tryOnButton = document.getElementById('try-on-button');
    if (tryOnButton) {
        const newTryOnButton = tryOnButton.cloneNode(true);
        tryOnButton.parentNode.replaceChild(newTryOnButton, tryOnButton);
        
        newTryOnButton.addEventListener('click', function() {
            logger.debug("App.js: Кнопка 'try-on-button' нажата.");
            if (tryOnFeature && typeof tryOnFeature.resetFittingForm === 'function') {
                tryOnFeature.resetFittingForm(); // Сначала сброс формы
            } else {
                 logger.warn("App.js: tryOnFeature.resetFittingForm не найден.");
            }
            if (typeof modals.openTryOnModal === 'function') {
                modals.openTryOnModal();
            } else {
                 logger.error("App.js: modals.openTryOnModal не найден!");
                 if (uiHelpers) uiHelpers.showToast("Функция примерки временно недоступна (A04).");
            }
        });
        logger.info("App.js: Обработчик для 'try-on-button' назначен.");
    } else {
        logger.warn("App.js: Кнопка 'try-on-button' не найдена в DOM.");
    }

    // Плавающая кнопка (FAB) (ID: fab-button)
    const fabButton = document.getElementById('fab-button');
    if (fabButton) {
        const newFabButton = fabButton.cloneNode(true);
        fabButton.parentNode.replaceChild(newFabButton, fabButton);

        newFabButton.addEventListener('click', function() {
            logger.debug("App.js: Кнопка 'fab-button' (FAB) нажата.");
            if (consultationFeature && typeof consultationFeature.openConsultationModal === 'function') {
                 consultationFeature.openConsultationModal();
            } else if (typeof modals.openConsultationModal === 'function') {
                logger.warn("App.js: consultationFeature.openConsultationModal не найден для FAB, используем modals.openConsultationModal().");
                modals.openConsultationModal();
            } else {
                 logger.error("App.js: Не найден метод для открытия модального окна консультации через FAB!");
                 if (uiHelpers) uiHelpers.showToast("Функция консультации временно недоступна (A05).");
            }
        });
        logger.info("App.js: Обработчик для 'fab-button' назначен.");
    } else {
        logger.warn("App.js: Кнопка 'fab-button' не найдена в DOM.");
    }
    logger.debug("App.js: Настройка обработчиков глобальных кнопок завершена.");
}