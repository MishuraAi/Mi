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
    let uiHelpers;
    
    // Ссылки на модальные окна
    let consultationOverlay;
    let resultsOverlay;
    let tryOnOverlay;
    let tryOnResultOverlay;
    
    function init() {
        logger = window.MishuraApp.utils.logger;
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        logger.debug('Инициализация модуля модальных окон');
        
        // Получаем ссылки на модальные окна
        consultationOverlay = document.getElementById('consultation-overlay');
        resultsOverlay = document.getElementById('results-overlay');
        tryOnOverlay = document.getElementById('try-on-overlay');
        tryOnResultOverlay = document.getElementById('try-on-result-overlay');
        
        // Проверяем наличие всех модальных окон
        if (!consultationOverlay || !resultsOverlay || !tryOnOverlay || !tryOnResultOverlay) {
            logger.error('Не все модальные окна найдены в DOM');
            return;
        }
        
        // Настраиваем обработчики для кнопок закрытия
        setupCloseButtons();
        
        logger.info('Модуль модальных окон инициализирован');
    }
    
    function setupCloseButtons() {
        // Кнопки закрытия для каждого модального окна
        const closeButtons = {
            'consultation-cancel': consultationOverlay,
            'results-close': resultsOverlay,
            'try-on-cancel': tryOnOverlay,
            'try-on-result-close': tryOnResultOverlay
        };
        
        // Настраиваем обработчики для каждой кнопки
        Object.entries(closeButtons).forEach(([buttonId, overlay]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                // Клонируем кнопку для удаления старых обработчиков
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                newButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    logger.debug(`Нажата кнопка закрытия: ${buttonId}`);
                    closeModal(overlay);
                });
            } else {
                logger.warn(`Кнопка закрытия ${buttonId} не найдена`);
            }
        });
        
        // Закрытие по клику вне модального окна
        [consultationOverlay, resultsOverlay, tryOnOverlay, tryOnResultOverlay].forEach(overlay => {
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    logger.debug('Клик вне модального окна');
                    closeModal(overlay);
                }
            });
        });
    }
    
    function openModal(overlay) {
        if (!overlay) {
            logger.error('Попытка открыть несуществующее модальное окно');
            return;
        }
        
        logger.debug(`Открытие модального окна: ${overlay.id}`);
        
        // Скрываем все модальные окна
        [consultationOverlay, resultsOverlay, tryOnOverlay, tryOnResultOverlay].forEach(modal => {
            if (modal && modal !== overlay) {
                modal.classList.remove('active');
            }
        });
        
        // Показываем нужное модальное окно
        overlay.classList.add('active');
        document.body.classList.add('modal-open');
    }
    
    function closeModal(overlay) {
        if (!overlay) {
            logger.error('Попытка закрыть несуществующее модальное окно');
            return;
        }
        
        logger.debug(`Закрытие модального окна: ${overlay.id}`);
        
        // Добавляем небольшую задержку для анимации
        setTimeout(() => {
            overlay.classList.remove('active');
            document.body.classList.remove('modal-open');
        }, 50);
    }
    
    return {
        init,
        openModal,
        closeModal,
        openConsultationModal: function() {
            logger.debug('Открытие модального окна консультации');
            openModal(consultationOverlay);
            // Инициируем событие для других модулей
            document.dispatchEvent(new CustomEvent('modalOpened', {
                detail: { modalId: 'consultation-overlay' }
            }));
        },
        openResultsModal: function() {
            logger.debug('Открытие модального окна результатов');
            openModal(resultsOverlay);
        },
        closeModalById: function(overlayId) {
            let overlay;
            if (typeof overlayId === 'string') {
                overlay = document.getElementById(overlayId);
            } else {
                overlay = overlayId;
            }
            closeModal(overlay);
        }
    };
})();