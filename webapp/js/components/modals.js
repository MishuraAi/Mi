/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Управление модальными окнами (modals.js)
ВЕРСИЯ: 0.4.7 (Надежная привязка обработчиков отмены, логирование ID)
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
    let isModalsInitialized = false;
    
    function init() {
        if (isModalsInitialized) {
            // console.warn("Modals: Повторная инициализация модуля модальных окон пропущена.");
            return;
        }
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("Modals(f):", ...args), info: (...args)=>console.info("Modals(f):", ...args), warn: (...args)=>console.warn("Modals(f):", ...args), error: (...args)=>console.error("Modals(f):", ...args) };
        logger.debug("Инициализация модуля модальных окон (v0.4.7)");
        
        setupGlobalCloseListeners();
        setupStandardCancelButtons();

        isModalsInitialized = true;
        logger.info('Модуль Модальные окна инициализирован (v0.4.7)');
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
                // Просто назначаем обработчик. Если cloneNode нужен для других целей - вернуть.
                // Для простоты и избежания потери контекста, если кнопки не пересоздаются динамически.
                // Если кнопки пересоздаются, cloneNode нужен или делегирование.
                // Пока предполагаем, что кнопки статичны после загрузки DOM.
                buttonElement.removeEventListener('click', closeModalHandler); // Удаляем старый, если был
                buttonElement.addEventListener('click', closeModalHandler.bind(null, modalIdToClose, buttonId)); // Привязываем modalId
                logger.debug(`Modals: Обработчик для кнопки отмены '${buttonId}' (закрывает '${modalIdToClose}') назначен.`);
            } else {
                logger.warn(`Modals: Стандартная кнопка отмены с ID '${buttonId}' не найдена в DOM.`);
            }
        }
    }
    
    // Вспомогательная функция для обработчика, чтобы можно было легко удалять
    function closeModalHandler(modalIdToClose, buttonId, event) {
        event.preventDefault(); 
        event.stopPropagation();
        logger.debug(`Modals: Кнопка отмены '${buttonId}' нажата (через closeModalHandler), закрытие '${modalIdToClose}'`);
        closeModal(modalIdToClose);
    }

    function setupGlobalCloseListeners() { /* ... как в версии 0.4.6 ... */ 
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && activeModalId) {
                logger.debug(`Modals: Нажата Escape, закрытие активного модального окна: ${activeModalId}`);
                closeModal(activeModalId);
            }
        });

        document.body.addEventListener('click', function(e) {
            const target = e.target;
            if (target.classList.contains('overlay') && target.classList.contains('active')) {
                if (target.id === activeModalId || !activeModalId) { 
                    logger.debug(`Modals: Клик на фон оверлея '${target.id}', закрытие.`);
                    closeModal(target.id);
                }
            }
        });
    }
        
    function openModal(modalId) {
        if (!isModalsInitialized) {
            logger.warn("Modals: Попытка открыть модальное окно до полной инициализации модуля modals. Вызов init().");
            init();
        }
        logger.debug(`Modals: Попытка открытия модального окна: '${modalId}'`);
        const modalElement = document.getElementById(modalId);
        
        if (!modalElement) {
            logger.error(`Modals: Модальное окно с ID '${modalId}' не найдено в DOM.`);
            return;
        }
        
        // Закрываем все активные модальные окна перед открытием нового
        const activeModals = document.querySelectorAll('.overlay.active');
        activeModals.forEach(modal => {
            if (modal.id !== modalId) {
                logger.debug(`Modals: Закрытие активного окна '${modal.id}' перед открытием '${modalId}'`);
                closeModal(modal.id);
            }
        });
        
        // Убеждаемся, что loading-overlay закрыт
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay && loadingOverlay.classList.contains('active')) {
            logger.debug("Modals: Закрытие loading-overlay перед открытием нового окна");
            loadingOverlay.classList.remove('active');
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
        if (!isModalsInitialized) {
            logger.warn("Modals: Попытка закрыть модальное окно до полной инициализации модуля modals.");
        }
        logger.debug(`Modals: Попытка закрытия модального окна: '${modalId}'`);
        const modalElement = document.getElementById(modalId);
        
        if (!modalElement) {
            logger.error(`Modals: Модальное окно с ID '${modalId}' для закрытия не найдено.`);
            return;
        }
        
        if (!modalElement.classList.contains('active')) {
            logger.warn(`Modals: Попытка закрыть '${modalId}', которое уже неактивно.`);
            if (activeModalId === modalId) {
                activeModalId = null;
            }
            return;
        }

        // Удаляем класс active
        modalElement.classList.remove('active');
        
        // Обновляем состояние активного модального окна
        if (activeModalId === modalId) {
            activeModalId = null;
        }
        
        // Проверяем, остались ли активные модальные окна
        const activeModals = document.querySelectorAll('.overlay.active');
        if (activeModals.length === 0) {
            document.body.classList.remove('modal-open');
            logger.debug("Modals: Класс 'modal-open' удален с body - нет активных модальных окон");
        } else {
            // Если есть другие активные окна, обновляем activeModalId
            const lastActiveModal = activeModals[activeModals.length - 1];
            activeModalId = lastActiveModal.id;
            logger.debug(`Modals: После закрытия '${modalId}' активным стало окно '${activeModalId}'`);
        }
        
        // Отправляем событие о закрытии
        document.dispatchEvent(new CustomEvent('modalClosed', { 
            detail: { 
                modalId: modalId,
                newActiveModalId: activeModalId 
            }
        }));
        
        logger.info(`Modals: Модальное окно '${modalId}' успешно закрыто.`);
    }
    
    function openConsultationModal() {
        logger.debug('Modals: Вызов openConsultationModal()');
        // Сброс формы consultation.js теперь происходит по событию 'modalOpened' в самом consultation.js
        openModal('consultation-overlay');
    }
    
    function openTryOnModal() {
        logger.debug('Modals: Вызов openTryOnModal()');
        // Сброс формы try-on.js происходит по событию 'modalOpened' в try-on.js
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
    
    return { 
        init, 
        openModal, 
        closeModal, 
        openConsultationModal, 
        openTryOnModal, 
        openResultsModal, 
        openTryOnResultModal, 
        isModalOpen, 
        getActiveModal,
        isInitialized: () => isModalsInitialized // Экспортируем флаг
    };
})();