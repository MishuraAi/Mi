/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Управление модальными окнами (modals.js)
ВЕРСИЯ: 0.4.8 (Исправлена проверка модальных окон)
ДАТА ОБНОВЛЕНИЯ: 2025-05-26

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
    
    function init() {
        logger = window.MishuraApp.utils.logger;
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        logger.debug('Инициализация модуля модальных окон');
        
        // Получаем ссылки на модальные окна
        consultationOverlay = document.getElementById('consultation-overlay');
        // Создаем results-overlay, если отсутствует
        resultsOverlay = document.getElementById('results-overlay');
        if (!resultsOverlay) {
            resultsOverlay = document.createElement('div');
            resultsOverlay.id = 'results-overlay';
            resultsOverlay.className = 'modal-overlay';
            resultsOverlay.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Результат</h2>
                        <button id="results-close" class="close-btn">&times;</button>
                    </div>
                    <div id="results-container" class="modal-body" style="max-height:60vh; overflow:auto;"></div>
                </div>`;
            document.body.appendChild(resultsOverlay);
        }
        
        // Проверяем наличие основных модальных окон
        if (!consultationOverlay || !resultsOverlay) {
            logger.error('Основные модальные окна не найдены в DOM', {
                consultationOverlay: !!consultationOverlay,
                resultsOverlay: !!resultsOverlay
            });
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
            'results-close': resultsOverlay
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
        [consultationOverlay, resultsOverlay].forEach(overlay => {
            if (overlay) {
                overlay.addEventListener('click', function(e) {
                    if (e.target === overlay) {
                        logger.debug('Клик вне модального окна');
                        closeModal(overlay);
                    }
                });
            }
        });
    }
    
    function openModal(overlay) {
        if (!overlay) {
            logger.error('Попытка открыть несуществующее модальное окно');
            return;
        }
        
        logger.debug(`Открытие модального окна: ${overlay.id}`);
        
        // Скрываем все модальные окна
        [consultationOverlay, resultsOverlay].forEach(modal => {
            if (modal && modal !== overlay) {
                modal.classList.remove('active');
            }
        });
        
        // Показываем нужное модальное окно
        overlay.classList.add('active');
        overlay.querySelector('.dialog')?.classList.add('active');
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
            if (consultationOverlay) {
                openModal(consultationOverlay);
                // Инициируем событие для других модулей
                document.dispatchEvent(new CustomEvent('modalOpened', {
                    detail: { modalId: 'consultation-overlay' }
                }));
            } else {
                logger.error('Модальное окно консультации не найдено');
            }
        },
        openResultsModal: function() {
            logger.debug('Открытие модального окна результатов');
            if (resultsOverlay) {
                openModal(resultsOverlay);
            } else {
                logger.error('Модальное окно результатов не найдено');
            }
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