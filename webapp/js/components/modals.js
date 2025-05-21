/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Управление модальными окнами (modals.js)
ВЕРСИЯ: 0.4.3 (Полное исправление модальных окон)
ДАТА ОБНОВЛЕНИЯ: 2025-05-22

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
        console.log("Инициализация модуля модальных окон");
        
        // Получаем ссылки на другие модули
        if (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.logger) {
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
        
        // Настройка обработчиков событий для кнопок открытия модальных окон
        setupOpenButtons();
        
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
     * Настройка обработчиков открытия модальных окон
     */
    function setupOpenButtons() {
        // Получить консультацию
        const consultationButton = document.getElementById('consultation-button');
        if (consultationButton) {
            consultationButton.addEventListener('click', function() {
                console.log("Кнопка открытия консультации нажата");
                openConsultationModal();
            });
        }
        
        // Примерить
        const tryOnButton = document.getElementById('try-on-button');
        if (tryOnButton) {
            tryOnButton.addEventListener('click', function() {
                console.log("Кнопка открытия примерки нажата");
                openTryOnModal();
            });
        }
    }
    
    /**
     * Настройка обработчиков закрытия для кнопок отмены в модальных окнах
     */
    function setupCloseButtons() {
        console.log("Настройка кнопок закрытия модальных окон");
        
        // Настройка кнопок закрытия консультации
        const consultationCancel = document.getElementById('consultation-cancel');
        if (consultationCancel) {
            consultationCancel.addEventListener('click', function() {
                console.log("Кнопка закрытия консультации нажата");
                closeModal('consultation-overlay');
            });
        } else {
            logger.warn("Кнопка consultationCancel не найдена");
        }
        
        // Настройка кнопок закрытия результатов
        const resultsClose = document.getElementById('results-close');
        if (resultsClose) {
            resultsClose.addEventListener('click', function() {
                console.log("Кнопка закрытия результатов нажата");
                closeModal('results-overlay');
            });
        } else {
            logger.warn("Кнопка resultsClose не найдена");
        }
        
        // Настройка кнопок закрытия примерки
        const tryOnCancel = document.getElementById('try-on-cancel');
        if (tryOnCancel) {
            tryOnCancel.addEventListener('click', function() {
                console.log("Кнопка закрытия примерки нажата");
                closeModal('try-on-overlay');
            });
        } else {
            logger.warn("Кнопка tryOnCancel не найдена");
        }
        
        // Настройка кнопок закрытия результатов примерки
        const tryOnResultClose = document.getElementById('try-on-result-close');
        if (tryOnResultClose) {
            tryOnResultClose.addEventListener('click', function() {
                console.log("Кнопка закрытия результатов примерки нажата");
                closeModal('try-on-result-overlay');
            });
        } else {
            logger.warn("Кнопка tryOnResultClose не найдена");
        }
    }
    
    /**
     * Настройка закрытия по клику на фон модального окна
     */
    function setupOverlayClicks() {
        const overlays = document.querySelectorAll('.overlay');
        overlays.forEach(overlay => {
            // Удаляем существующие обработчики, чтобы избежать дублирования
            const newOverlay = overlay.cloneNode(true);
            overlay.parentNode.replaceChild(newOverlay, overlay);
            
            newOverlay.addEventListener('click', function(e) {
                // Закрываем только если клик был именно на фоне (overlay), а не на его содержимом
                if (e.target === newOverlay) {
                    closeModal(newOverlay.id);
                }
            });
        });
        
        console.log(`Настроены обработчики кликов на фон для ${overlays.length} модальных окон`);
    }
    
    /**
     * Открытие модального окна
     * @param {string} modalId - идентификатор модального окна
     */
    function openModal(modalId) {
        console.log(`Открытие модального окна: ${modalId}`);
        
        const modal = document.getElementById(modalId);
        
        if (!modal) {
            console.error(`Модальное окно с ID ${modalId} не найдено`);
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
        
        console.log(`Модальное окно ${modalId} открыто`);
    }
    
    /**
     * Закрытие модального окна
     * @param {string} modalId - идентификатор модального окна
     */
    function closeModal(modalId) {
        console.log(`Закрытие модального окна: ${modalId}`);
        
        const modal = document.getElementById(modalId);
        
        if (!modal) {
            console.error(`Модальное окно с ID ${modalId} не найдено`);
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
        
        console.log(`Модальное окно ${modalId} закрыто`);
    }
    
    /**
     * Открытие модального окна консультации
     */
    function openConsultationModal() {
        console.log('Открытие модального окна консультации');
        
        // Сбрасываем в начальное состояние перед открытием
        resetConsultationModal();
        
        // Открываем модальное окно
        openModal('consultation-overlay');
    }
    
    /**
     * Сброс модального окна консультации в начальное состояние
     */
    function resetConsultationModal() {
        console.log('Сброс модального окна консультации');
        
        // Сбрасываем активный режим на "одиночный"
        const singleModeButton = document.querySelector('.mode-button[data-mode="single"]');
        const compareModeButton = document.querySelector('.mode-button[data-mode="compare"]');
        
        if (singleModeButton && compareModeButton) {
            singleModeButton.classList.add('active');
            compareModeButton.classList.remove('active');
            
            const singleAnalysisMode = document.getElementById('single-analysis-mode');
            const compareAnalysisMode = document.getElementById('compare-analysis-mode');
            
            if (singleAnalysisMode && compareAnalysisMode) {
                singleAnalysisMode.classList.remove('hidden');
                compareAnalysisMode.classList.add('hidden');
            }
        }
        
        // Сбрасываем изображения, если есть соответствующий модуль
        if (window.MishuraApp && window.MishuraApp.components && window.MishuraApp.components.imageUpload) {
            const imageUpload = window.MishuraApp.components.imageUpload;
            
            if (typeof imageUpload.resetSingleImageUpload === 'function') {
                imageUpload.resetSingleImageUpload();
            }
            
            if (typeof imageUpload.resetCompareImageUploads === 'function') {
                imageUpload.resetCompareImageUploads();
            }
        }
        
        // Сбрасываем форму
        const consultationForm = document.getElementById('consultation-form');
        if (consultationForm) {
            consultationForm.reset();
        }
        
        // Скрываем поля формы до загрузки фото
        const occasionSelector = document.querySelector('.occasion-selector');
        const inputLabels = document.querySelectorAll('.input-label');
        const preferencesInput = document.querySelector('.preferences-input');
        
        if (occasionSelector) occasionSelector.classList.add('hidden');
        inputLabels.forEach(label => label.classList.add('hidden'));
        if (preferencesInput) preferencesInput.classList.add('hidden');
    }
    
    /**
     * Открытие модального окна для примерки
     */
    function openTryOnModal() {
        console.log('Открытие модального окна примерки');
        
        resetTryOnModal();
        openModal('try-on-overlay');
    }
    
    /**
     * Сброс модального окна примерки в начальное состояние
     */
    function resetTryOnModal() {
        console.log('Сброс модального окна примерки');
        
        // Сбрасываем форму
        const tryOnForm = document.querySelector('#try-on-overlay form');
        if (tryOnForm) {
            tryOnForm.reset();
        }
        
        // Сбрасываем отображение загруженных изображений
        const yourPhotoContainer = document.getElementById('your-photo-container');
        const outfitPhotoContainer = document.getElementById('outfit-photo-container');
        const yourPhotoUploadArea = document.getElementById('your-photo-upload-area');
        const outfitPhotoUploadArea = document.getElementById('outfit-photo-upload-area');
        
        if (yourPhotoContainer) yourPhotoContainer.classList.add('hidden');
        if (outfitPhotoContainer) outfitPhotoContainer.classList.add('hidden');
        if (yourPhotoUploadArea) yourPhotoUploadArea.classList.remove('hidden');
        if (outfitPhotoUploadArea) outfitPhotoUploadArea.classList.remove('hidden');
        
        // Сбрасываем значения инпутов
        const yourPhotoInput = document.getElementById('your-photo-input');
        const outfitPhotoInput = document.getElementById('outfit-photo-input');
        
        if (yourPhotoInput) yourPhotoInput.value = '';
        if (outfitPhotoInput) outfitPhotoInput.value = '';
        
        // Сбрасываем TryOn модуль, если он существует
        if (window.MishuraApp && window.MishuraApp.features && window.MishuraApp.features.tryOn) {
            const tryOn = window.MishuraApp.features.tryOn;
            
            if (typeof tryOn.resetFittingForm === 'function') {
                tryOn.resetFittingForm();
            }
        }
    }
    
    /**
     * Открытие модального окна результатов
     */
    function openResultsModal() {
        console.log('Открытие модального окна результатов');
        
        openModal('results-overlay');
    }
    
    /**
     * Открытие модального окна результатов примерки
     */
    function openTryOnResultModal() {
        console.log('Открытие модального окна результатов примерки');
        
        openModal('try-on-result-overlay');
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
        openTryOnResultModal,
        isModalOpen,
        getActiveModal
    };
})();