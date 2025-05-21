/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Модальные окна (modals.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

НАЗНАЧЕНИЕ ФАЙЛА:
Управление модальными окнами и оверлеями приложения. Контролирует открытие
и закрытие диалогов, взаимодействие с оверлеями и управление состоянием.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.components = window.MishuraApp.components || {};
window.MishuraApp.components.modals = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger;
    
    // Элементы DOM для модальных окон и оверлеев
    let consultationOverlay, resultsOverlay, tryOnOverlay, loadingOverlay, tryOnResultOverlay;
    
    // Кнопки закрытия модальных окон
    let consultationCancel, resultsClose, tryOnCancel, tryOnResultClose;
    
    // Состояние модальных окон
    let activeOverlay = null;
    let isLoading = false;
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger;
        
        // Получаем ссылки на DOM элементы оверлеев
        consultationOverlay = document.getElementById('consultation-overlay');
        resultsOverlay = document.getElementById('results-overlay');
        tryOnOverlay = document.getElementById('try-on-overlay');
        loadingOverlay = document.getElementById('loading-overlay');
        tryOnResultOverlay = document.getElementById('try-on-result-overlay');
        
        // Кнопки закрытия модальных окон
        consultationCancel = document.getElementById('consultation-cancel');
        resultsClose = document.getElementById('results-close');
        tryOnCancel = document.getElementById('try-on-cancel');
        tryOnResultClose = document.getElementById('try-on-result-close');
        
        // Проверяем наличие элементов
        const missingElements = [];
        if (!consultationOverlay) missingElements.push('consultation-overlay');
        if (!resultsOverlay) missingElements.push('results-overlay');
        if (!tryOnOverlay) missingElements.push('try-on-overlay');
        if (!loadingOverlay) missingElements.push('loading-overlay');
        if (!tryOnResultOverlay) missingElements.push('try-on-result-overlay');
        
        if (missingElements.length > 0) {
            logger.warn(`Не найдены элементы модальных окон: ${missingElements.join(', ')}`);
        }
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        logger.debug("Модуль модальных окон инициализирован");
    }
    
    /**
     * Настраивает обработчики событий для модальных окон
     * @private
     */
    function setupEventListeners() {
        // Кнопки закрытия модальных окон
        if (consultationCancel) {
            consultationCancel.addEventListener('click', () => {
                closeOverlay(consultationOverlay);
            });
        }
        
        if (resultsClose) {
            resultsClose.addEventListener('click', () => {
                closeOverlay(resultsOverlay);
            });
        }
        
        if (tryOnCancel) {
            tryOnCancel.addEventListener('click', () => {
                closeOverlay(tryOnOverlay);
            });
        }
        
        if (tryOnResultClose) {
            tryOnResultClose.addEventListener('click', () => {
                closeOverlay(tryOnResultOverlay);
            });
        }
        
        // Закрытие по нажатию клавиши Esc
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && activeOverlay && activeOverlay !== loadingOverlay) {
                closeOverlay(activeOverlay);
            }
        });
        
        // Опциональное закрытие по клику вне диалога
        // Для этого нужно добавить обработчики на сами оверлеи
        [consultationOverlay, resultsOverlay, tryOnOverlay, tryOnResultOverlay].forEach(overlay => {
            if (overlay) {
                overlay.addEventListener('click', (event) => {
                    // Проверяем, что клик был именно по оверлею, а не по его содержимому
                    if (event.target === overlay) {
                        closeOverlay(overlay);
                    }
                });
            }
        });
    }
    
    /**
     * Открывает модальное окно консультации
     */
    function openConsultationModal() {
        logger.info("Открытие модального окна консультации");
        
        try {
            // Можно добавить здесь логику сброса формы или другие подготовительные действия
            // Это будет делать модуль consultation.js

            if (consultationOverlay) {
                openOverlay(consultationOverlay);
                logger.debug("Модальное окно консультации успешно открыто");
                
                // Отправляем событие открытия для обработки в других модулях
                document.dispatchEvent(new CustomEvent('consultationModalOpened'));
            } else {
                logger.error("Элемент consultationOverlay не найден!");
            }
        } catch (e) {
            logger.error("Ошибка при открытии модального окна консультации:", e);
            // Если у нас есть uiHelpers, можно показать toast, но здесь мы не хотим создавать зависимость
        }
    }
    
    /**
     * Открывает модальное окно результатов
     * @param {string} htmlContent - HTML-содержимое для отображения в результатах
     */
    function openResultsModal(htmlContent) {
        logger.info("Открытие модального окна результатов");
        
        const resultsContainer = document.getElementById('results-container');
        
        if (resultsContainer && resultsOverlay) {
            if (htmlContent) {
                resultsContainer.innerHTML = htmlContent;
            }
            
            openOverlay(resultsOverlay);
            logger.debug("Модальное окно результатов успешно открыто");
            
            // Отправляем событие открытия
            document.dispatchEvent(new CustomEvent('resultsModalOpened'));
        } else {
            logger.error("Элементы для отображения результатов не найдены");
        }
    }
    
    /**
     * Открывает модальное окно примерки
     */
    function openTryOnModal() {
        logger.info("Открытие модального окна примерки");
        
        if (tryOnOverlay) {
            openOverlay(tryOnOverlay);
            logger.debug("Модальное окно примерки успешно открыто");
            
            // Отправляем событие открытия
            document.dispatchEvent(new CustomEvent('tryOnModalOpened'));
        } else {
            logger.error("Элемент tryOnOverlay не найден!");
        }
    }
    
    /**
     * Открывает модальное окно результатов примерки
     * @param {string} imageSrc - URL изображения результата примерки
     */
    function openTryOnResultModal(imageSrc) {
        logger.info("Открытие модального окна результатов примерки");
        
        const resultImage = document.getElementById('try-on-result-image');
        
        if (resultImage && tryOnResultOverlay) {
            if (imageSrc) {
                resultImage.src = imageSrc;
            }
            
            openOverlay(tryOnResultOverlay);
            logger.debug("Модальное окно результатов примерки успешно открыто");
            
            // Отправляем событие открытия
            document.dispatchEvent(new CustomEvent('tryOnResultModalOpened'));
        } else {
            logger.error("Элементы для отображения результатов примерки не найдены");
        }
    }
    
    /**
     * Показывает глобальный индикатор загрузки
     * @param {string} message - Текст сообщения загрузки
     */
    function showLoading(message = 'Загрузка...') {
        logger.debug(`Показ индикатора загрузки: ${message}`);
        
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        if (loadingOverlay) {
            openOverlay(loadingOverlay);
        } else {
            logger.error("Элемент #loading-overlay не найден.");
        }
        
        isLoading = true;
    }
    
    /**
     * Скрывает глобальный индикатор загрузки
     */
    function hideLoading() {
        logger.debug('Скрытие индикатора загрузки');
        
        if (loadingOverlay) {
            closeOverlay(loadingOverlay);
        }
        
        isLoading = false;
    }
    
    /**
     * Открывает оверлей
     * @param {HTMLElement} overlayElement - Элемент оверлея
     */
    function openOverlay(overlayElement) {
        if (!overlayElement) {
            logger.error('Попытка открыть несуществующий оверлей');
            return;
        }
        
        logger.debug(`Открытие оверлея: ${overlayElement.id}`);
        
        // Если уже открыт другой оверлей (кроме загрузки), закрываем его
        if (activeOverlay && activeOverlay !== loadingOverlay && activeOverlay !== overlayElement) {
            closeOverlay(activeOverlay);
        }
        
        overlayElement.classList.add('active');
        document.body.style.overflow = 'hidden'; // Предотвращаем прокрутку фона
        
        activeOverlay = overlayElement;
    }
    
    /**
     * Закрывает оверлей
     * @param {HTMLElement} overlayElement - Элемент оверлея
     */
    function closeOverlay(overlayElement) {
        if (!overlayElement) {
            logger.error('Попытка закрыть несуществующий оверлей');
            return;
        }
        
        logger.debug(`Закрытие оверлея: ${overlayElement.id}`);
        
        overlayElement.classList.remove('active');
        
        // Если это был активный оверлей, сбрасываем его
        if (activeOverlay === overlayElement) {
            activeOverlay = null;
        }
        
        // Восстанавливаем прокрутку, только если нет других активных оверлеев
        if (!activeOverlay) {
            document.body.style.overflow = '';
        }
        
        // Генерируем событие закрытия оверлея
        document.dispatchEvent(new CustomEvent('overlayClose', { 
            detail: { id: overlayElement.id } 
        }));
    }
    
    /**
     * Проверяет, показывается ли индикатор загрузки
     * @returns {boolean} - true если индикатор загрузки активен
     */
    function isLoadingActive() {
        return isLoading;
    }
    
    /**
     * Возвращает активный оверлей
     * @returns {HTMLElement|null} - Активный элемент оверлея или null
     */
    function getActiveOverlay() {
        return activeOverlay;
    }
    
    // Публичный API модуля
    return {
        init,
        openConsultationModal,
        openResultsModal,
        openTryOnModal,
        openTryOnResultModal,
        showLoading,
        hideLoading,
        openOverlay,
        closeOverlay,
        isLoadingActive,
        getActiveOverlay
    };
})();
