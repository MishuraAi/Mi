/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Управление модальными окнами (modals.js)
ВЕРСИЯ: 0.3.0 (Модульная структура)
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
    let modalContainers = {}; 
    let activeModal = null;
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        logger = window.MishuraApp.utils.logger;
        
        // Находим все модальные окна
        const modals = document.querySelectorAll('.modal-container');
        modals.forEach(modal => {
            const modalId = modal.id;
            modalContainers[modalId] = modal;
            
            // Настройка кнопок закрытия
            const closeButtons = modal.querySelectorAll('.modal-close');
            closeButtons.forEach(button => {
                button.addEventListener('click', function() {
                    closeModal(modalId);
                });
            });
            
            // Закрытие по клику на оверлей
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeModal(modalId);
                }
            });
        });
        
        // Закрытие по Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && activeModal) {
                closeModal(activeModal);
            }
        });
        
        logger.debug("Модуль модальных окон инициализирован");
    }
    
    /**
     * Открытие модального окна
     * @param {string} modalId - идентификатор модального окна
     */
    function openModal(modalId) {
        if (!modalContainers[modalId]) {
            logger.error(`Модальное окно с ID ${modalId} не найдено`);
            return;
        }
        
        // Закрываем текущее активное модальное окно
        if (activeModal) {
            closeModal(activeModal);
        }
        
        // Открываем новое
        const modal = modalContainers[modalId];
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
        
        // Событие открытия
        document.dispatchEvent(new CustomEvent('modalOpened', {
            detail: { modalId: modalId }
        }));
        
        logger.debug(`Открыто модальное окно: ${modalId}`);
    }
    
    /**
     * Закрытие модального окна
     * @param {string} modalId - идентификатор модального окна
     */
    function closeModal(modalId) {
        if (!modalContainers[modalId]) {
            logger.error(`Модальное окно с ID ${modalId} не найдено`);
            return;
        }
        
        const modal = modalContainers[modalId];
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        activeModal = null;
        
        // Событие закрытия
        document.dispatchEvent(new CustomEvent('modalClosed', {
            detail: { modalId: modalId }
        }));
        
        logger.debug(`Закрыто модальное окно: ${modalId}`);
    }
    
    /**
     * Открытие модального окна консультации
     */
    function openConsultationModal() {
        logger.debug('Вызвана функция openConsultationModal');
        openModal('consultation-modal');
    }
    
    /**
     * Открытие модального окна выбора одежды
     */
    function openClothesModal() {
        openModal('clothes-modal');
    }
    
    /**
     * Открытие модального окна сравнения
     */
    function openCompareModal() {
        openModal('compare-modal');
    }
    
    /**
     * Открытие модального окна настроек
     */
    function openSettingsModal() {
        openModal('settings-modal');
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
        openClothesModal,
        openCompareModal,
        openSettingsModal,
        isModalOpen,
        getActiveModal
    };
})();