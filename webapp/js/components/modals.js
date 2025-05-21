/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Управление модальными окнами (modals.js)
ВЕРСИЯ: 0.4.5 (Усиленная привязка обработчиков, более четкое управление activeModal)
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
    let activeModalId = null; // Хранит ID активного модального окна (оверлея)
    
    function init() {
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("ModalsLogger:", ...args), info: (...args)=>console.info("ModalsLogger:", ...args), warn: (...args)=>console.warn("ModalsLogger:", ...args), error: (...args)=>console.error("ModalsLogger:", ...args) };
        logger.debug("Инициализация модуля модальных окон (v0.4.5)");
        
        setupGlobalCloseListeners();
        setupStandardCancelButtons();

        logger.info('Модуль Модальные окна инициализирован (v0.4.5)');
    }

    function setupStandardCancelButtons() {
        logger.debug("Настройка стандартных кнопок отмены...");
        const cancelButtonsMap = {
            'consultation-cancel': 'consultation-overlay', // Кнопка в модалке консультации
            'results-close': 'results-overlay',             // Кнопка в модалке результатов
            'try-on-cancel': 'try-on-overlay',              // Кнопка в модалке примерки
            'try-on-result-close': 'try-on-result-overlay'  // Кнопка в модалке результатов примерки
        };

        for (const buttonId in cancelButtonsMap) {
            const buttonElement = document.getElementById(buttonId);
            const modalIdToClose = cancelButtonsMap[buttonId];
            if (buttonElement) {
                // Удаляем предыдущий обработчик, если он был (через клонирование)
                const newButton = buttonElement.cloneNode(true);
                buttonElement.parentNode.replaceChild(newButton, buttonElement);

                newButton.addEventListener('click', function(event) {
                    event.preventDefault(); // На всякий случай, если кнопка внутри формы
                    event.stopPropagation();
                    logger.debug(`Кнопка отмены '${buttonId}' нажата, закрытие модального окна '${modalIdToClose}'`);
                    closeModal(modalIdToClose);
                });
                logger.debug(`Обработчик для кнопки отмены '${buttonId}' успешно назначен.`);
            } else {
                logger.warn(`Стандартная кнопка отмены с ID '${buttonId}' не найдена в DOM.`);
            }
        }
    }
    
    function setupGlobalCloseListeners() {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && activeModalId) {
                logger.debug(`Нажата клавиша Escape, закрытие активного модального окна: ${activeModalId}`);
                closeModal(activeModalId);
            }
        });

        // Используем document.body для делегирования, чтобы ловить клики на оверлеях,
        // даже если они были добавлены/изменены после инициализации modals.js.
        document.body.addEventListener('click', function(e) {
            // Проверяем, что клик был непосредственно на элементе с классом 'overlay' и он активен
            if (e.target.classList.contains('overlay') && e.target.classList.contains('active')) {
                // Дополнительно проверяем, что это действительно текущий активный оверлей,
                // или если activeModalId не установлен, то закрываем тот, по которому кликнули.
                if (e.target.id === activeModalId || !activeModalId) {
                    logger.debug(`Клик на фон активного оверлея '${e.target.id}', закрытие.`);
                    closeModal(e.target.id);
                } else {
                    logger.debug(`Клик на активный оверлей '${e.target.id}', но activeModalId='${activeModalId}'. Не закрываем.`);
                }
            }
        });
    }
        
    function openModal(modalId) {
        logger.debug(`Попытка открытия модального окна: '${modalId}'`);
        const modalElement = document.getElementById(modalId);
        
        if (!modalElement) {
            logger.error(`Модальное окно с ID '${modalId}' не найдено в DOM.`);
            return;
        }
        
        if (activeModalId && activeModalId !== modalId) {
            logger.warn(`Попытка открыть '${modalId}', когда уже активно '${activeModalId}'. Сначала закроем предыдущее.`);
            closeModal(activeModalId); 
        }
        
        modalElement.classList.add('active');
        document.body.classList.add('modal-open'); 
        activeModalId = modalId; 
        
        setTimeout(() => {
            const focusable = modalElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) {
                focusable.focus();
                logger.debug(`Фокус установлен на первый интерактивный элемент в '${modalId}'`);
            }
        }, 100); 
        
        document.dispatchEvent(new CustomEvent('modalOpened', { detail: { modalId: modalId } }));
        logger.info(`Модальное окно '${modalId}' успешно открыто.`);
    }
    
    function closeModal(modalId) {
        logger.debug(`Попытка закрытия модального окна: '${modalId}'`);
        const modalElement = document.getElementById(modalId);
        
        if (!modalElement) {
            logger.error(`Модальное окно с ID '${modalId}' для закрытия не найдено.`);
            return;
        }
        
        if (!modalElement.classList.contains('active')) {
            logger.warn(`Попытка закрыть модальное окно '${modalId}', которое уже неактивно.`);
            // Тем не менее, убедимся, что activeModalId сброшен, если он указывал на это окно
            if (activeModalId === modalId) activeModalId = null;
            // И проверим класс body
            if (!document.querySelector('.overlay.active')) {
                document.body.classList.remove('modal-open');
            }
            return; // Нечего закрывать
        }

        modalElement.classList.remove('active');
        
        if (activeModalId === modalId) {
            activeModalId = null;
            // Только если нет других активных модальных окон, убираем класс с body
            if (!document.querySelector('.overlay.active')) {
                 document.body.classList.remove('modal-open');
                 logger.debug("Класс 'modal-open' удален с body.");
            } else {
                const stillActiveModal = document.querySelector('.overlay.active');
                activeModalId = stillActiveModal.id; // Восстанавливаем, если другое окно было активно
                logger.warn(`Модальное окно '${modalId}' закрыто, но найдено другое активное: '${activeModalId}'.`);
            }
        } else if (activeModalId) {
             logger.warn(`Закрыто модальное окно '${modalId}', но активным считалось '${activeModalId}'.`);
        }
        
        document.dispatchEvent(new CustomEvent('modalClosed', { detail: { modalId: modalId } }));
        logger.info(`Модальное окно '${modalId}' успешно закрыто.`);
    }
    
    function openConsultationModal() {
        logger.debug('Вызов modals.openConsultationModal()');
        // Сброс формы консультации должен происходить в самом модуле consultation.js,
        // когда он получает событие modalOpened для 'consultation-overlay' или перед вызовом openModal.
        // Или, если он вызывается из app.js, то app.js может сначала вызвать consultation.reset, потом modals.open
        openModal('consultation-overlay');
    }
    
    function openTryOnModal() {
        logger.debug('Вызов modals.openTryOnModal()');
        // Аналогично, сброс формы tryOn лучше делать в ее модуле.
        openModal('try-on-overlay');
    }
    
    function openResultsModal() {
        logger.debug('Вызов modals.openResultsModal()');
        openModal('results-overlay');
    }
    
    function openTryOnResultModal() {
        logger.debug('Вызов modals.openTryOnResultModal()');
        openModal('try-on-result-overlay');
    }
    
    function isModalOpen(modalId) { return activeModalId === modalId; }
    function getActiveModal() { return activeModalId; }
    
    return { init, openModal, closeModal, openConsultationModal, openTryOnModal, openResultsModal, openTryOnResultModal, isModalOpen, getActiveModal };
})();