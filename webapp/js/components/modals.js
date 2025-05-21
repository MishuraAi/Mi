/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Управление модальными окнами (modals.js)
ВЕРСИЯ: 0.4.1 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает функциональность открытия и закрытия модальных окон приложения.
Включает общие методы работы с модальными окнами и специфические для консультации.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.utils = window.MishuraApp.utils || {};
window.MishuraApp.utils.modals = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let logger;
    
    // Объекты для модальных окон
    let activeModal = null;
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        if (window.MishuraApp.utils && window.MishuraApp.utils.logger) {
            logger = window.MishuraApp.utils.logger;
        } else {
            // Используем временный логгер, если основной недоступен
            logger = {
                debug: function(msg) { console.log('[DEBUG] ' + msg); },
                info: function(msg) { console.log('[INFO] ' + msg); },
                warn: function(msg) { console.warn('[WARN] ' + msg); },
                error: function(msg) { console.error('[ERROR] ' + msg); }
            };
        }
        
        // Настройка обработчиков событий для кнопок закрытия модальных окон
        setupCloseButtons();
        
        // Настройка закрытия по Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && activeModal) {
                closeModal(activeModal);
            }
        });
        
        // Настройка закрытия по клику на фон
        setupOverlayClicks();
        
        logger.info('Модуль Модальные окна инициализирован');
    }
    
    /**
     * Настройка обработчиков закрытия для кнопок отмены в модальных окнах
     */
    function setupCloseButtons() {
        // Настройка кнопок закрытия консультации
        const consultationCancel = document.getElementById('consultation-cancel');
        if (consultationCancel) {
            consultationCancel.addEventListener('click', function() {
                closeModal('consultation-overlay');
            });
        }
        
        // Настройка кнопок закрытия результатов
        const resultsClose = document.getElementById('results-close');
        if (resultsClose) {
            resultsClose.addEventListener('click', function() {
                closeModal('results-overlay');
            });
        }
        
        // Настройка кнопок закрытия примерки
        const tryOnCancel = document.getElementById('try-on-cancel');
        if (tryOnCancel) {
            tryOnCancel.addEventListener('click', function() {
                closeModal('try-on-overlay');
            });
        }
        
        // Настройка кнопок закрытия результатов примерки
        const tryOnResultClose = document.getElementById('try-on-result-close');
        if (tryOnResultClose) {
            tryOnResultClose.addEventListener('click', function() {
                closeModal('try-on-result-overlay');
            });
        }
    }
    
    /**
     * Настройка закрытия по клику на фон модального окна
     */
    function setupOverlayClicks() {
        const overlays = document.querySelectorAll('.overlay');
        overlays.forEach(overlay => {
            overlay.addEventListener('click', function(e) {
                // Закрываем только если клик был именно на фоне (overlay), а не на его содержимом
                if (e.target === overlay) {
                    closeModal(overlay.id);
                }
            });
        });
    }
    
    /**
     * Открытие модального окна
     * @param {string} modalId - идентификатор модального окна
     */
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        
        if (!modal) {
            if (logger) {
                logger.error(`Модальное окно с ID ${modalId} не найдено`);
            }
            return;
        }
        
        // Закрываем текущее активное модальное окно если есть
        if (activeModal) {
            closeModal(activeModal);
        }
        
        // Открываем новое окно
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        activeModal = modalId;
        
        // Фокус на первом интерактивном элементе
        setTimeout(() => {
            const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) {
                focusable.focus();
            }
        }, 100);
        
        // Отправляем событие открытия
        document.dispatchEvent(new CustomEvent('modalOpened', {
            detail: { modalId: modalId }
        }));
        
        if (logger) {
            logger.debug(`Открыто модальное окно: ${modalId}`);
        }
    }
    
    /**
     * Закрытие модального окна
     * @param {string} modalId - идентификатор модального окна
     */
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        
        if (!modal) {
            if (logger) {
                logger.error(`Модальное окно с ID ${modalId} не найдено`);
            }
            return;
        }
        
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        
        // Сбрасываем активное окно, только если закрываем текущее активное
        if (activeModal === modalId) {
            activeModal = null;
        }
        
        // Отправляем событие закрытия
        document.dispatchEvent(new CustomEvent('modalClosed', {
            detail: { modalId: modalId }
        }));
        
        if (logger) {
            logger.debug(`Закрыто модальное окно: ${modalId}`);
        }
    }
    
    /**
     * Открытие модального окна консультации
     */
    function openConsultationModal() {
        openModal('consultation-overlay');
    }
    
    /**
     * Открытие модального окна для примерки
     */
    function openTryOnModal() {
        openModal('try-on-overlay');
    }
    
    /**
     * Открытие модального окна результатов
     */
    function openResultsModal() {
        openModal('results-overlay');
    }
    
    /**
     * Проверка, открыто ли модальное окно
     * @param {string} modalId - идентификатор модального окна
     * @returns {boolean} - статус открытия
     */
    function isModalOpen(modalId) {
        return activeModal === modalId;
    }
    
    /**
     * Получение активного модального окна
     * @returns {string|null} - идентификатор активного окна
     */
    function getActiveModal() {
        return activeModal;
    }
    
    // Публичный API
    return {
        init,
        openModal,
        closeModal,
        openConsultationModal,
        openTryOnModal,
        openResultsModal,
        isModalOpen,
        getActiveModal
    };
})();