/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Управление модальными окнами (modals.js)
ВЕРСИЯ: 0.4.6 (Более надежная привязка обработчиков отмены)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает функциональность открытия и закрытия модальных окон приложения.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.components = window.MishuraApp.components || {};
window.MishuraApp.components.modals = (function() {
    'use strict';
    
    let logger;
    let activeModalId = null; 
    
    function init() {
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("Modals(f):", ...args), info: (...args)=>console.info("Modals(f):", ...args), warn: (...args)=>console.warn("Modals(f):", ...args), error: (...args)=>console.error("Modals(f):", ...args) };
        logger.debug("Инициализация модуля модальных окон (v0.4.6)");
        
        setupGlobalCloseListeners();
        setupStandardCancelButtons();

        logger.info('Модуль Модальные окна инициализирован (v0.4.6)');
    }

    function setupStandardCancelButtons() {
        logger.debug("Modals: Настройка стандартных кнопок отмены...");
        const cancelButtonsMap = {
            'consultation-cancel': 'consultation-overlay', 
            'results-close': 'results-overlay',            
            'try-on-cancel': 'try-on-overlay',             
            'try-on-result-close': 'try-on-result-overlay' 
        };

        for (const buttonId in cancelButtonsMap) {
            const buttonElement = document.getElementById(buttonId);
            const modalIdToClose = cancelButtonsMap[buttonId];
            if (buttonElement) {
                // Удаляем старый обработчик через клонирование, затем добавляем новый
                const newButton = buttonElement.cloneNode(true);
                buttonElement.parentNode.replaceChild(newButton, buttonElement);

                newButton.addEventListener('click', function(event) {
                    event.preventDefault(); 
                    event.stopPropagation();
                    logger.debug(`Modals: Кнопка отмены '${buttonId}' нажата, закрытие '${modalIdToClose}'`);
                    closeModal(modalIdToClose);
                });
                logger.debug(`Modals: Обработчик для кнопки отмены '${buttonId}' назначен.`);
            } else {
                logger.warn(`Modals: Стандартная кнопка отмены с ID '${buttonId}' не найдена.`);
            }
        }
    }
    
    function setupGlobalCloseListeners() {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && activeModalId) {
                logger.debug(`Modals: Нажата Escape, закрытие активного модального окна: ${activeModalId}`);
                closeModal(activeModalId);
            }
        });

        document.body.addEventListener('click', function(e) {
            const target = e.target;
            if (target.classList.contains('overlay') && target.classList.contains('active')) {
                if (target.id === activeModalId || !activeModalId) { // Закрываем, если это активное или нет активного
                    logger.debug(`Modals: Клик на фон оверлея '${target.id}', закрытие.`);
                    closeModal(target.id);
                }
            }
        });
    }
        
    function openModal(modalId) {
        logger.debug(`Modals: Попытка открытия модального окна: '${modalId}'`);
        const modalElement = document.getElementById(modalId);
        
        if (!modalElement) {
            logger.error(`Modals: Модальное окно с ID '${modalId}' не найдено.`);
            return;
        }
        
        if (activeModalId && activeModalId !== modalId) {
            logger.warn(`Modals: Попытка открыть '${modalId}', когда активно '${activeModalId}'. Сначала закроем предыдущее.`);
            closeModal(activeModalId); 
        }
        
        modalElement.classList.add('active');
        document.body.classList.add('modal-open'); 
        activeModalId = modalId; 
        
        setTimeout(() => {
            const focusable = modalElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) {
                focusable.focus();
            }
        }, 100); 
        
        document.dispatchEvent(new CustomEvent('modalOpened', { detail: { modalId: modalId } }));
        logger.info(`Modals: Модальное окно '${modalId}' успешно открыто.`);
    }
    
    function closeModal(modalId) {
        logger.debug(`Modals: Попытка закрытия модального окна: '${modalId}'`);
        const modalElement = document.getElementById(modalId);
        
        if (!modalElement) {
            logger.error(`Modals: Модальное окно с ID '${modalId}' для закрытия не найдено.`);
            return;
        }
        
        if (!modalElement.classList.contains('active')) {
            logger.warn(`Modals: Попытка закрыть '${modalId}', которое уже неактивно.`);
            if (activeModalId === modalId) activeModalId = null;
            if (!document.querySelector('.overlay.active')) {
                document.body.classList.remove('modal-open');
            }
            return;
        }

        modalElement.classList.remove('active');
        
        if (activeModalId === modalId) {
            activeModalId = null;
            if (!document.querySelector('.overlay.active')) {
                 document.body.classList.remove('modal-open');
                 logger.debug("Modals: Класс 'modal-open' удален с body.");
            } else {
                const stillActiveModal = document.querySelector('.overlay.active');
                if (stillActiveModal) { // Доп. проверка
                    activeModalId = stillActiveModal.id;
                    logger.warn(`Modals: Окно '${modalId}' закрыто, но '${activeModalId}' все еще активно.`);
                }
            }
        }
        
        document.dispatchEvent(new CustomEvent('modalClosed', { detail: { modalId: modalId } }));
        logger.info(`Modals: Модальное окно '${modalId}' успешно закрыто.`);
    }
    
    function openConsultationModal() {
        logger.debug('Modals: Вызов openConsultationModal()');
        // Сброс формы consultation.js теперь происходит по событию 'modalOpened' в самом consultation.js
        openModal('consultation-overlay');
    }
    
    function openTryOnModal() {
        logger.debug('Modals: Вызов openTryOnModal()');
        // Сброс формы try-on.js теперь происходит по событию 'modalOpened' в самом try-on.js
        openModal('try-on-overlay');
    }
    
    function openResultsModal() {
        logger.debug('Modals: Вызов openResultsModal()');
        openModal('results-overlay');
    }
    
    function openTryOnResultModal() {
        logger.debug('Modals: Вызов openTryOnResultModal()');
        openModal('try-on-result-overlay');
    }
    
    function isModalOpen(modalId) { return activeModalId === modalId; }
    function getActiveModal() { return activeModalId; }
    
    return { init, openModal, closeModal, openConsultationModal, openTryOnModal, openResultsModal, openTryOnResultModal, isModalOpen, getActiveModal };
})();