/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузчик приложения (app.js)
ВЕРСИЯ: 0.4.4 (Восстановлен setupButtonHandlers, улучшена логика инициализации)
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
    
    // Инициализируем логгер как можно раньше, но после создания MishuraApp.utils
    // Резервный логгер, если основной еще не определен
    const earlyLogger = (window.MishuraApp.utils && window.MishuraApp.utils.logger && window.MishuraApp.utils.logger.info) 
        ? window.MishuraApp.utils.logger 
        : { 
            debug: (...args) => console.debug("AppLoader(early):", ...args), 
            info: (...args) => console.info("AppLoader(early):", ...args), 
            warn: (...args) => console.warn("AppLoader(early):", ...args), 
            error: (...args) => console.error("AppLoader(early):", ...args) 
          };

    function tryInitModule(modulePath, moduleName) {
        const parts = modulePath.split('.');
        let current = window;
        let pathConstructed = "";
        for (let i = 0; i < parts.length; i++) {
            pathConstructed += (i > 0 ? "." : "") + parts[i];
            if (current && typeof current === 'object' && parts[i] in current) {
                current = current[parts[i]];
            } else {
                earlyLogger.warn(`Модуль или пространство имен по пути '${modulePath}' не найдено (ошибка на '${parts[i]}' в '${pathConstructed}').`);
                return false;
            }
        }
        
        if (current && typeof current.init === 'function') {
            try {
                current.init(); // Вызываем init() модуля
                // Логгер модуля должен сам сообщить об успешной инициализации
                // earlyLogger.info(`Модуль '${moduleName}' (${modulePath}) вызвал init().`);
                return true;
            } catch (e) {
                earlyLogger.error(`Ошибка при вызове init() для модуля '${moduleName}' (${modulePath}):`, e.message, e.stack);
                return false;
            }
        } else {
            earlyLogger.warn(`Модуль '${moduleName}' (${modulePath}) найден, но функция init отсутствует или не является функцией.`);
            return false;
        }
    }

    try {
        earlyLogger.info("Инициализация приложения МИШУРА (v0.4.4)...");
        
        // Порядок инициализации важен!
        tryInitModule('MishuraApp.config', 'Конфигурация');
        tryInitModule('MishuraApp.utils.logger', 'Логгер'); // Logger должен быть инициализирован как можно раньше
        
        // Теперь, когда основной логгер MishuraApp.utils.logger должен быть доступен, можно его использовать
        const logger = window.MishuraApp.utils.logger || earlyLogger; // Используем основной, если он есть

        tryInitModule('MishuraApp.utils.deviceDetector', 'Определение устройства');
        tryInitModule('MishuraApp.utils.uiHelpers', 'UI-хелперы');
        
        tryInitModule('MishuraApp.api.service', 'API-сервис'); // API сервис ДО компонентов и фич, которые его используют
        
        tryInitModule('MishuraApp.components.navigation', 'Навигация');
        tryInitModule('MishuraApp.components.modals', 'Модальные окна'); // Modals ДО фич, которые их открывают
        tryInitModule('MishuraApp.components.imageUpload', 'Загрузка изображений');
        
        tryInitModule('MishuraApp.features.consultation', 'Консультации');
        tryInitModule('MishuraApp.features.comparison', 'Сравнение образов');
        tryInitModule('MishuraApp.features.tryOn', 'Виртуальная примерка');
        
        tryInitModule('MishuraApp.main', 'Основной модуль'); // Main обычно в конце, он может зависеть от всего
        
        // Настройка глобальных обработчиков кнопок, которые инициируют действия
        setupButtonHandlers();

        logger.info("Инициализация всех модулей приложения МИШУРА успешно завершена.");
        
    } catch (error) {
        earlyLogger.error("Критическая ошибка на верхнем уровне инициализации приложения МИШУРА:", error.message, error.stack);
        const uiHelpers = window.MishuraApp.utils.uiHelpers; // Попытка получить uiHelpers
        if (uiHelpers && typeof uiHelpers.showToast === 'function') {
            uiHelpers.showToast('Критическая ошибка при запуске. Обновите страницу.', 5000);
        } else {
            alert('Произошла критическая ошибка при запуске приложения. Пожалуйста, обновите страницу.');
        }
    }
});

/**
 * Настройка обработчиков для кнопок, инициирующих открытие модальных окон.
 * Эта функция вызывается после инициализации всех модулей, включая modals.
 */
function setupButtonHandlers() {
    const logger = (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.logger) || console;
    logger.debug("App.js: Настройка обработчиков глобальных кнопок...");

    const modals = window.MishuraApp.components.modals;
    const uiHelpers = window.MishuraApp.utils.uiHelpers;

    if (!modals || typeof modals.openConsultationModal !== 'function' || typeof modals.openTryOnModal !== 'function') {
        logger.error("App.js: Модуль modals или его методы openConsultationModal/openTryOnModal не найдены! Кнопки не будут работать.");
        if (uiHelpers && typeof uiHelpers.showToast === 'function') {
            uiHelpers.showToast("Ошибка интерфейса: некоторые функции недоступны (A01).");
        }
        return; // Прерываем настройку, если модуль модалок недоступен
    }

    // Кнопка "Получить консультацию"
    const consultationButton = document.getElementById('consultation-button');
    if (consultationButton) {
        consultationButton.addEventListener('click', function() {
            logger.debug("App.js: Кнопка 'consultation-button' нажата.");
            // Модуль consultation.js сам должен позаботиться о сбросе своей формы перед открытием
            // через modals.openConsultationModal() -> modals.openModal() -> событие 'modalOpened'
            // или модуль consultation.js должен иметь свой public метод open() который делает reset и вызывает modals
            if (window.MishuraApp.features.consultation && typeof window.MishuraApp.features.consultation.openConsultationModal === 'function') {
                 window.MishuraApp.features.consultation.openConsultationModal();
            } else {
                logger.warn("App.js: MishuraApp.features.consultation.openConsultationModal не найден, пытаемся открыть напрямую через modals.");
                modals.openConsultationModal();
            }
        });
        logger.info("App.js: Обработчик для 'consultation-button' назначен.");
    } else {
        logger.warn("App.js: Кнопка 'consultation-button' не найдена в DOM.");
    }

    // Кнопка "Примерить"
    const tryOnButton = document.getElementById('try-on-button');
    if (tryOnButton) {
        tryOnButton.addEventListener('click', function() {
            logger.debug("App.js: Кнопка 'try-on-button' нажата.");
            // Аналогично, модуль tryOn должен сам управлять сбросом своей формы
            if (window.MishuraApp.features.tryOn && typeof window.MishuraApp.features.tryOn.resetFittingForm === 'function'){
                window.MishuraApp.features.tryOn.resetFittingForm(); // Вызываем сброс перед открытием
            }
            modals.openTryOnModal();
        });
        logger.info("App.js: Обработчик для 'try-on-button' назначен.");
    } else {
        logger.warn("App.js: Кнопка 'try-on-button' не найдена в DOM.");
    }

    // Плавающая кнопка (FAB)
    const fabButton = document.getElementById('fab-button');
    if (fabButton) {
        fabButton.addEventListener('click', function() {
            logger.debug("App.js: Кнопка 'fab-button' (FAB) нажата.");
            if (window.MishuraApp.features.consultation && typeof window.MishuraApp.features.consultation.openConsultationModal === 'function') {
                 window.MishuraApp.features.consultation.openConsultationModal();
            } else {
                logger.warn("App.js: MishuraApp.features.consultation.openConsultationModal не найден для FAB, пытаемся открыть напрямую через modals.");
                modals.openConsultationModal();
            }
        });
        logger.info("App.js: Обработчик для 'fab-button' назначен.");
    } else {
        logger.warn("App.js: Кнопка 'fab-button' не найдена в DOM.");
    }
    logger.debug("App.js: Настройка обработчиков глобальных кнопок завершена.");
}