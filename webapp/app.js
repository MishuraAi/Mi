/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузчик приложения (app.js)
ВЕРСИЯ: 0.4.3 (Улучшенная проверка инициализации модулей)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Загрузчик приложения, который инициализирует все модули в правильном порядке.
==========================================================================================
*/

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    window.MishuraApp = window.MishuraApp || {};
    // Обеспечиваем существование всех основных пространств имен
    ['utils', 'api', 'components', 'features'].forEach(ns => {
        window.MishuraApp[ns] = window.MishuraApp[ns] || {};
    });
    
    const appLogger = window.MishuraApp.utils.logger || { 
        debug: (...args)=>console.debug("AppLoader:",...args), 
        info: (...args)=>console.info("AppLoader:",...args), 
        warn: (...args)=>console.warn("AppLoader:",...args), 
        error: (...args)=>console.error("AppLoader:",...args) 
    };

    function tryInitModule(modulePath, moduleName) {
        const parts = modulePath.split('.');
        let current = window;
        for (let i = 0; i < parts.length; i++) {
            if (current && typeof current === 'object' && parts[i] in current) {
                current = current[parts[i]];
            } else {
                appLogger.warn(`Модуль или пространство имен '${modulePath}' не найдено (часть '${parts[i]}' отсутствует).`);
                return false;
            }
        }
        
        if (current && typeof current.init === 'function') {
            try {
                current.init();
                appLogger.info(`Модуль '${moduleName}' (${modulePath}) успешно инициализирован.`);
                return true;
            } catch (e) {
                appLogger.error(`Ошибка при инициализации модуля '${moduleName}' (${modulePath}):`, e);
                return false;
            }
        } else {
            appLogger.warn(`Модуль '${moduleName}' (${modulePath}) найден, но функция init отсутствует или не является функцией.`);
            return false;
        }
    }

    try {
        appLogger.info("Инициализация приложения МИШУРА (v0.4.3)...");
        
        // 1. Конфигурация (должна быть первой)
        tryInitModule('MishuraApp.config', 'Конфигурация');
        
        // 2. Базовые утилиты (Логгер должен быть одним из первых после конфига)
        tryInitModule('MishuraApp.utils.logger', 'Логгер');
        // Обновляем appLogger, если основной логгер только что инициализировался
        if(window.MishuraApp.utils.logger && typeof window.MishuraApp.utils.logger.info === 'function') {
           // appLogger = window.MishuraApp.utils.logger; // Не переназначаем, т.к. он может быть уже использован
        }
        tryInitModule('MishuraApp.utils.deviceDetector', 'Определение устройства');
        tryInitModule('MishuraApp.utils.uiHelpers', 'UI-хелперы');
        
        // 3. API-сервис
        tryInitModule('MishuraApp.api.service', 'API-сервис');
        
        // 4. Компоненты интерфейса
        tryInitModule('MishuraApp.components.navigation', 'Навигация');
        tryInitModule('MishuraApp.components.modals', 'Модальные окна');
        tryInitModule('MishuraApp.components.imageUpload', 'Загрузка изображений');
        
        // 5. Функциональные модули (Features)
        tryInitModule('MishuraApp.features.consultation', 'Консультации');
        tryInitModule('MishuraApp.features.comparison', 'Сравнение образов');
        tryInitModule('MishuraApp.features.tryOn', 'Виртуальная примерка');
        
        // 6. Основной модуль приложения (должен быть последним из логики приложения)
        tryInitModule('MishuraApp.main', 'Основной модуль');
        
        // 7. Настройка глобальных обработчиков кнопок (если они не в main.js)
        // setupButtonHandlers(); // Эта функция была в старой версии, ее логика теперь должна быть в main.js или других модулях.
        // Если setupButtonHandlers была специфична для app.js, ее нужно пересмотреть или интегрировать в main.js
        // Пока закомментируем, так как ее определение отсутствует в текущей версии app.js.

        appLogger.info("Инициализация всех модулей приложения МИШУРА завершена.");
        
    } catch (error) {
        appLogger.error("Критическая ошибка при инициализации приложения МИШУРА:", error);
        const uiHelpers = window.MishuraApp.utils.uiHelpers;
        if (uiHelpers && typeof uiHelpers.showToast === 'function') {
            uiHelpers.showToast('Произошла критическая ошибка при запуске. Обновите страницу.', 5000);
        } else {
            alert('Произошла критическая ошибка при запуске приложения. Пожалуйста, обновите страницу.');
        }
    }
});

// Убрал старые функции initializeUtilities, initializeComponents, initializeFeatures, setupButtonHandlers,
// так как их логика теперь встроена в основной поток с tryInitModule.
// Если setupButtonHandlers должна быть, ее нужно определить или перенести в main.js.