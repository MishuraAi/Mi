/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
ФАЙЛ: Основной файл приложения (app.js)
ВЕРСИЯ: 0.4.1
ДАТА ОБНОВЛЕНИЯ: 2025-05-21
==========================================================================================
*/

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // Создаем глобальный объект приложения, если он еще не создан
    window.MishuraApp = window.MishuraApp || {};
    
    try {
        console.log("Инициализация приложения...");
        
        // Инициализация конфигурации
        window.MishuraApp.config.init();
        console.log("Инициализация конфигурации завершена");
        
        // Инициализация базовых утилит
        initializeUtilities();
        console.log("Базовые утилиты инициализированы");
        
        // Инициализация API-сервиса
        window.MishuraApp.services.api.init();
        console.log("API-сервис инициализирован");
        
        // Инициализация компонентов интерфейса
        initializeUIComponents();
        console.log("Компоненты интерфейса инициализированы");
        
        // Инициализация функциональных модулей
        initializeFunctionalModules();
        console.log("Функциональные модули инициализированы");
        
        // Инициализация основного модуля
        window.MishuraApp.main.init();
        console.log("Приложение инициализировано успешно");
        
    } catch (error) {
        console.error("Ошибка при инициализации приложения:", error);
    }
});

/**
 * Инициализация базовых утилит
 */
function initializeUtilities() {
    // Инициализация логгера
    window.MishuraApp.utils.logger.init();
    
    // Инициализация определения устройства
    window.MishuraApp.utils.deviceDetector.init();
    
    // Инициализация UI-хелперов
    window.MishuraApp.utils.uiHelpers.init();
    
    // Инициализация навигации
    window.MishuraApp.utils.navigation.init();
    
    // Инициализация модальных окон
    window.MishuraApp.utils.modals.init();
}

/**
 * Инициализация компонентов интерфейса
 */
function initializeUIComponents() {
    // Инициализация компонента загрузки изображений
    window.MishuraApp.components.imageUpload.init();
}

/**
 * Инициализация функциональных модулей
 */
function initializeFunctionalModules() {
    // Инициализация модуля консультации
    window.MishuraApp.components.consultation.init();
    
    // Инициализация модуля сравнения
    window.MishuraApp.components.compare.init();
    
    // Инициализация модуля виртуальной примерки
    window.MishuraApp.components.virtualFitting.init();
}