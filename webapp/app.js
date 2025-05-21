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
    
    // Создаем глобальный объект приложения и его структуру
    window.MishuraApp = window.MishuraApp || {};
    window.MishuraApp.utils = window.MishuraApp.utils || {};
    window.MishuraApp.services = window.MishuraApp.services || {};
    window.MishuraApp.components = window.MishuraApp.components || {};
    
    try {
        console.log("Инициализация приложения...");
        
        // Инициализация конфигурации
        if (window.MishuraApp.config && typeof window.MishuraApp.config.init === 'function') {
            window.MishuraApp.config.init();
            console.log("Инициализация конфигурации завершена");
        } else {
            console.warn("Модуль конфигурации не найден");
        }
        
        // Инициализация базовых утилит
        initializeUtilities();
        console.log("Базовые утилиты инициализированы");
        
        // Инициализация API-сервиса
        if (window.MishuraApp.services.api && typeof window.MishuraApp.services.api.init === 'function') {
            window.MishuraApp.services.api.init();
            console.log("API-сервис инициализирован");
        } else {
            console.warn("Модуль API-сервиса не найден");
        }
        
        // Инициализация компонентов интерфейса
        initializeUIComponents();
        console.log("Компоненты интерфейса инициализированы");
        
        // Инициализация функциональных модулей
        initializeFunctionalModules();
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
        console.warn("Модуль модальных окон не найден или не определен. Создаём временную реализацию.");
        
        // Создаем временную реализацию модуля модальных окон
        window.MishuraApp.utils.modals = {
            init: function() {
                console.log("Модальные окна инициализированы (временная реализация)");
            },
            openModal: function(modalId) {
                console.log("Открытие модального окна:", modalId);
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.add('active');
                    document.body.classList.add('modal-open');
                }
            },
            closeModal: function(modalId) {
                console.log("Закрытие модального окна:", modalId);
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.remove('active');
                    document.body.classList.remove('modal-open');
                }
            },
            openConsultationModal: function() {
                this.openModal('consultation-modal');
            }
        };
        window.MishuraApp.utils.modals.init();
    }
}

/**
 * Инициализация компонентов интерфейса
 */
function initializeUIComponents() {
    // Инициализация компонента загрузки изображений
    if (window.MishuraApp.components.imageUpload && typeof window.MishuraApp.components.imageUpload.init === 'function') {
        window.MishuraApp.components.imageUpload.init();
    } else {
        console.warn("Компонент загрузки изображений не найден");
        
        // Создаем временную реализацию компонента загрузки изображений
        window.MishuraApp.components.imageUpload = {
            init: function() {
                console.log("Компонент загрузки изображений инициализирован (временная реализация)");
            },
            resetSingleImageUpload: function() {
                console.log("Сброс изображения (временная реализация)");
                const singlePreviewContainer = document.getElementById('single-preview-container');
                const singleUploadArea = document.getElementById('single-upload-area');
                
                if (singlePreviewContainer) singlePreviewContainer.classList.add('hidden');
                if (singleUploadArea) singleUploadArea.classList.remove('hidden');
            }
        };
        window.MishuraApp.components.imageUpload.init();
    }
}

/**
 * Инициализация функциональных модулей
 */
function initializeFunctionalModules() {
    // Инициализация модуля консультации
    if (window.MishuraApp.components.consultation && typeof window.MishuraApp.components.consultation.init === 'function') {
        window.MishuraApp.components.consultation.init();
    } else {
        console.warn("Модуль консультации не найден");
        
        // Создаем временную реализацию модуля консультации
        window.MishuraApp.components.consultation = {
            init: function() {
                console.log("Модуль консультации инициализирован (временная реализация)");
                
                // Привязываем обработчики к кнопкам консультации
                const consultationTriggers = document.querySelectorAll('.consultation-trigger');
                if (consultationTriggers) {
                    consultationTriggers.forEach(trigger => {
                        trigger.addEventListener('click', function() {
                            window.MishuraApp.utils.modals.openConsultationModal();
                        });
                    });
                }
            },
            openConsultationModal: function() {
                window.MishuraApp.utils.modals.openConsultationModal();
            }
        };
        window.MishuraApp.components.consultation.init();
    }
    
    // Инициализация модуля сравнения
    if (window.MishuraApp.components.compare && typeof window.MishuraApp.components.compare.init === 'function') {
        window.MishuraApp.components.compare.init();
    } else {
        console.warn("Модуль сравнения не найден");
        
        // Можно добавить временную реализацию по мере необходимости
        window.MishuraApp.components.compare = {
            init: function() {
                console.log("Модуль сравнения инициализирован (временная реализация)");
            }
        };
        window.MishuraApp.components.compare.init();
    }
    
    // Инициализация модуля виртуальной примерки
    if (window.MishuraApp.components.virtualFitting && typeof window.MishuraApp.components.virtualFitting.init === 'function') {
        window.MishuraApp.components.virtualFitting.init();
    } else {
        console.warn("Модуль виртуальной примерки не найден");
        
        // Можно добавить временную реализацию по мере необходимости
        window.MishuraApp.components.virtualFitting = {
            init: function() {
                console.log("Модуль виртуальной примерки инициализирован (временная реализация)");
            }
        };
        window.MishuraApp.components.virtualFitting.init();
    }
}