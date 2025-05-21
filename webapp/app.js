/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
ФАЙЛ: Загрузчик приложения (app.js)
ВЕРСИЯ: 0.4.1
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Загрузчик приложения, который инициализирует все модули в правильном порядке.
Заменяет старый script.js, но с минимальным содержимым.
==========================================================================================
*/

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // Создаем глобальный объект приложения, если он еще не создан
    window.MishuraApp = window.MishuraApp || {};
    window.MishuraApp.utils = window.MishuraApp.utils || {};
    window.MishuraApp.api = window.MishuraApp.api || {};
    window.MishuraApp.components = window.MishuraApp.components || {};
    window.MishuraApp.features = window.MishuraApp.features || {};
    
    try {
        console.log("Инициализация приложения...");
        
        // Инициализация конфигурации
        if (window.MishuraApp.config && typeof window.MishuraApp.config.init === 'function') {
            window.MishuraApp.config.init();
            console.log("Конфигурация инициализирована");
        } else {
            console.warn("Модуль конфигурации не найден");
        }
        
        // Инициализация базовых утилит
        initializeUtilities();
        console.log("Базовые утилиты инициализированы");
        
        // Инициализация API-сервиса
        if (window.MishuraApp.api.service && typeof window.MishuraApp.api.service.init === 'function') {
            window.MishuraApp.api.service.init();
            console.log("API-сервис инициализирован");
        } else {
            console.warn("Модуль API-сервиса не найден");
        }
        
        // Инициализация компонентов интерфейса
        initializeComponents();
        console.log("Компоненты интерфейса инициализированы");
        
        // Инициализация функциональных модулей
        initializeFeatures();
        console.log("Функциональные модули инициализированы");
        
        // Инициализация основного модуля
        if (window.MishuraApp.main && typeof window.MishuraApp.main.init === 'function') {
            window.MishuraApp.main.init();
            console.log("Приложение инициализировано успешно");
        } else {
            console.warn("Основной модуль не найден");
        }
        
    } catch (error) {
        console.error("Ошибка при инициализации приложения:", error);
        
        // Отображаем сообщение об ошибке пользователю
        if (window.MishuraApp.utils.uiHelpers && typeof window.MishuraApp.utils.uiHelpers.showToast === 'function') {
            window.MishuraApp.utils.uiHelpers.showToast('Произошла ошибка при запуске приложения. Пожалуйста, обновите страницу.');
        } else {
            alert('Произошла ошибка при запуске приложения. Пожалуйста, обновите страницу.');
        }
    }
});

/**
 * Инициализация базовых утилит
 */
function initializeUtilities() {
    // Инициализация логгера
    if (window.MishuraApp.utils.logger && typeof window.MishuraApp.utils.logger.init === 'function') {
        window.MishuraApp.utils.logger.init();
    } else {
        console.warn("Модуль логгера не найден");
    }
    
    // Инициализация определения устройства
    if (window.MishuraApp.utils.deviceDetector && typeof window.MishuraApp.utils.deviceDetector.init === 'function') {
        window.MishuraApp.utils.deviceDetector.init();
    } else {
        console.warn("Модуль определения устройства не найден");
    }
    
    // Инициализация UI-хелперов
    if (window.MishuraApp.utils.uiHelpers && typeof window.MishuraApp.utils.uiHelpers.init === 'function') {
        window.MishuraApp.utils.uiHelpers.init();
    } else {
        console.warn("Модуль UI-хелперов не найден");
    }
    
    // Инициализация навигации
    if (window.MishuraApp.utils.navigation && typeof window.MishuraApp.utils.navigation.init === 'function') {
        window.MishuraApp.utils.navigation.init();
    } else {
        console.warn("Модуль навигации не найден");
    }
    
    // Инициализация модальных окон
    if (window.MishuraApp.utils.modals && typeof window.MishuraApp.utils.modals.init === 'function') {
        window.MishuraApp.utils.modals.init();
    } else {
        console.warn("Модуль модальных окон не найден");
    }
}

/**
 * Инициализация компонентов интерфейса
 */
function initializeComponents() {
    // Инициализация компонента загрузки изображений
    if (window.MishuraApp.components.imageUpload && typeof window.MishuraApp.components.imageUpload.init === 'function') {
        window.MishuraApp.components.imageUpload.init();
    } else {
        console.warn("Компонент загрузки изображений не найден");
    }
}

/**
 * Инициализация функциональных модулей
 */
function initializeFeatures() {
    // Инициализация модуля консультации
    if (window.MishuraApp.features.consultation && typeof window.MishuraApp.features.consultation.init === 'function') {
        window.MishuraApp.features.consultation.init();
    } else {
        console.warn("Модуль консультации не найден");
    }
    
    // Инициализация модуля сравнения
    if (window.MishuraApp.features.comparison && typeof window.MishuraApp.features.comparison.init === 'function') {
        window.MishuraApp.features.comparison.init();
    } else {
        console.warn("Модуль сравнения не найден");
    }
    
    // Инициализация модуля виртуальной примерки
    if (window.MishuraApp.features.tryOn && typeof window.MishuraApp.features.tryOn.init === 'function') {
        window.MishuraApp.features.tryOn.init();
    } else {
        console.warn("Модуль виртуальной примерки не найден");
    }
}