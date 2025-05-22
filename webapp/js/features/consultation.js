/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Консультации (consultation.js)
ВЕРСИЯ: 0.4.6 (Разделение логики submit, улучшенная инициализация и обработка событий)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Реализует функциональность консультаций с ИИ-стилистом.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};
window.MishuraApp.features.consultation = (function() {
    'use strict';
    
    let config, logger, uiHelpers, modals, imageUpload, apiService;
    let consultationForm, occasionSelector, preferencesInput, submitButton;
    let resultsContainer; 
    let currentConsultationData = null;
    let uploadedImage = null; // Только для режима 'single'
    
    function init() {
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("Consultation(f):", ...args), info: (...args)=>console.info("Consultation(f):", ...args), warn: (...args)=>console.warn("Consultation(f):", ...args), error: (...args)=>console.error("Consultation(f):", ...args) };
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        modals = window.MishuraApp.components.modals;
        imageUpload = window.MishuraApp.components.imageUpload;
        
        // Инициализация API сервиса
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            apiService = window.MishuraApp.api.service;
            if (typeof apiService.init === 'function') {
                apiService.init();
                logger.info("Consultation: API сервис успешно инициализирован");
            } else {
                logger.error("Consultation: apiService.init не является функцией");
                if (uiHelpers) uiHelpers.showToast("Ошибка: Сервис API не инициализирован (C01).", 5000);
            }
        } else {
            logger.error("Consultation: API сервис НЕ НАЙДЕН! Запросы не будут работать.");
            if (uiHelpers) uiHelpers.showToast("Ошибка: Сервис API не загружен (C00).", 5000);
        }

        initDOMElements();
        initEventListeners();
        logger.debug("Модуль консультаций инициализирован (v0.4.6)");
    }
    
    function initDOMElements() {
        consultationForm = document.getElementById('consultation-form');
        // Элементы ниже используются как для 'single', так и для 'compare' (если форма общая)
        occasionSelector = document.getElementById('occasion-selector');
        preferencesInput = document.getElementById('preferences-input');
        submitButton = document.getElementById('submit-consultation'); 
        resultsContainer = document.getElementById('results-container'); 
                
        if (!consultationForm) logger.warn("Consultation DOM: 'consultation-form' не найден");
        if (!occasionSelector) logger.warn("Consultation DOM: 'occasion-selector' не найден");
        if (!preferencesInput) logger.warn("Consultation DOM: 'preferences-input' не найден");
        if (!submitButton) logger.warn("Consultation DOM: 'submit-consultation' не найден");
        if (!resultsContainer) logger.warn("Consultation DOM: 'results-container' не найден");
    }
    
    function initEventListeners() {
        if (consultationForm) {
            consultationForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const currentModeButton = document.querySelector('#consultation-overlay .mode-button.active');
                const currentMode = currentModeButton ? currentModeButton.dataset.mode : 'single';
                logger.info(`Consultation: Обработчик submit формы, режим '${currentMode}'`);

                if (currentMode === 'single') {
                    handleSingleConsultationSubmit(); 
                } else if (currentMode === 'compare') {
                    if (window.MishuraApp.features.comparison && typeof window.MishuraApp.features.comparison.handleCompareSubmit === 'function') {
                        logger.debug('Consultation: Делегирование submit модулю comparison.js');
                        window.MishuraApp.features.comparison.handleCompareSubmit();
                    } else {
                        logger.error('Consultation: Режим сравнения, но comparison.handleCompareSubmit не найден.');
                        if (uiHelpers) uiHelpers.showToast('Ошибка: Функция сравнения неисправна (C04).');
                    }
                }
            });
        } else {
            logger.warn("Consultation: Обработчик submit для 'consultation-form' не назначен: форма не найдена.");
        }
        
        document.addEventListener('singleImageUploaded', function(e) {
            uploadedImage = e.detail.file; // Сохраняем только для 'single'
            logger.debug('Consultation (event singleImageUploaded): Изображение для одиночного анализа загружено -', uploadedImage ? uploadedImage.name : 'Н/Д');
            updateSingleModeSubmitButtonState();
        });
        
        document.addEventListener('singleImageRemoved', function() {
            uploadedImage = null;
            logger.debug('Consultation (event singleImageRemoved): Изображение для одиночного анализа удалено.');
            updateSingleModeSubmitButtonState();
        });
        
        document.addEventListener('modalOpened', function(e) {
            if (e.detail.modalId === 'consultation-overlay') {
                logger.debug("Consultation (event modalOpened 'consultation-overlay'): Сброс формы и обновление состояния кнопки.");
                resetConsultationForm(); // Сбрасываем при каждом открытии модалки консультации
                updateSingleModeSubmitButtonState(); // Обновляем состояние кнопки на случай, если режим 'single' активен
                 if (window.MishuraApp.features.comparison && typeof window.MishuraApp.features.comparison.updateSubmitButtonState === 'function') {
                    window.MishuraApp.features.comparison.updateSubmitButtonState(); // Также обновляем кнопку для режима сравнения
                }
            }
        });
         // modalClosed для consultation-overlay уже не нужен здесь, т.к. reset при открытии
         document.addEventListener('modeChanged', function(e) {
            logger.debug(`Consultation (event modeChanged): режим ${e.detail.mode}. Обновление кнопки.`);
            if (e.detail.mode === 'single') {
                updateSingleModeSubmitButtonState();
            }
            // Состояние кнопки для 'compare' управляется comparison.js через тот же event
        });
    }
    
    function updateSingleModeSubmitButtonState() {
        if (submitButton) {
            const currentModeButton = document.querySelector('#consultation-overlay .mode-button.active');
            const currentMode = currentModeButton ? currentModeButton.dataset.mode : 'single';
            if (currentMode === 'single') {
                submitButton.disabled = !uploadedImage;
                logger.debug(`Consultation: Кнопка submit (single mode) ${submitButton.disabled ? 'деактивирована' : 'активирована'}`);
            }
            // Для режима 'compare' кнопка управляется из comparison.js
        }
    }

    function openConsultationModal() { // Вызывается из app.js
        logger.info('Consultation: вызов openConsultationModal()');
        // resetConsultationForm() теперь вызывается по событию modalOpened
        if (modals && typeof modals.openConsultationModal === 'function') {
            modals.openConsultationModal();
        } else {
            logger.error("Consultation: modals.openConsultationModal не найден.");
            if (uiHelpers) uiHelpers.showToast("Ошибка: Не удалось открыть окно консультации (C05).");
        }
    }
    
    function handleSingleConsultationSubmit() { 
        logger.debug('Consultation: обработка отправки формы ОДИНОЧНОЙ консультации...');

        if (!uploadedImage) {
            if (uiHelpers) uiHelpers.showToast('Загрузите изображение для анализа.');
            logger.warn('Consultation (single): Отправка прервана - изображение не загружено.');
            return;
        }
        const occasion = occasionSelector ? occasionSelector.value : '';
        const preferences = preferencesInput ? preferencesInput.value : '';
        if (occasion === '') {
            if (uiHelpers) uiHelpers.showToast('Выберите повод для консультации.');
            logger.warn('Consultation (single): Отправка прервана - повод не выбран.');
            return;
        }
        
        const formData = new FormData();
        formData.append('image', uploadedImage);
        formData.append('occasion', occasion);
        formData.append('preferences', preferences);

        logger.info('Consultation (single): Данные для запроса:', {occasion, preferencesLength: preferences.length, imageName: uploadedImage.name});
        if (uiHelpers) uiHelpers.showLoading('Мишура анализирует ваш образ...');
        
        if (!apiService || typeof apiService.processStylistConsultation !== 'function') {
            logger.error('Consultation (single): КРИТИЧЕСКАЯ ОШИБКА - apiService или processStylistConsultation недоступен!');
            if (uiHelpers) { uiHelpers.hideLoading(); uiHelpers.showToast('Ошибка: Сервис API недоступен (C02/C03).');}
            return;
        }

        // Отключаем кнопку на время запроса
        if (submitButton) submitButton.disabled = true;

        apiService.processStylistConsultation(formData)
            .then(handleConsultationResponse)
            .catch(handleConsultationError)
            .finally(() => {
                if (uiHelpers) uiHelpers.hideLoading();
                // Восстанавливаем состояние кнопки
                if (submitButton) submitButton.disabled = false;
            });
    }
    
    function handleConsultationResponse(response) { // Общий для single и compare, если результаты одинаково обрабатываются
        logger.info('Consultation: Ответ от сервера (обработка):', response);
        const adviceText = response && response.advice; // advice - ключ с результатом от Gemini
        
        if (!response || response.status !== 'success' || typeof adviceText !== 'string') {
            const errorMessage = (response && response.message) ? response.message : 'ИИ-стилист не смог предоставить ответ (пусто).';
            logger.error('Consultation: Ошибка в ответе сервера:', errorMessage, response);
            if (uiHelpers) uiHelpers.showToast(`Ошибка: ${errorMessage}`);
            if (resultsContainer) resultsContainer.innerHTML = `<p>Мишура не смогла дать совет: ${errorMessage}</p>`;
        } else {
            currentConsultationData = adviceText; // Сохраняем только текст совета
            renderConsultationResults(adviceText);
            logger.info('Consultation: Консультация успешно получена и отображена.');
        }
        
        if (modals && typeof modals.openResultsModal === 'function') {
            modals.openResultsModal();
        } else {
            logger.error("Consultation: Не удалось открыть модальное окно результатов - modals.openResultsModal не найден.");
        }
        if (modals && typeof modals.closeModal === 'function' && document.getElementById('consultation-overlay')?.classList.contains('active')) {
            modals.closeModal('consultation-overlay');
        }
    }
    
    function handleConsultationError(error) { // Общий для single и compare
        const errorMessage = (error && error.message) ? error.message : 'Неизвестная ошибка при запросе к стилисту.';
        logger.error('Consultation: Ошибка при запросе (поймана .catch):', errorMessage, error);
        if (uiHelpers) uiHelpers.showToast(`Связь: ${errorMessage}`);
        
        if (resultsContainer) resultsContainer.innerHTML = `<p>Не удалось получить совет: ${errorMessage}. Попробуйте снова.</p>`;
        
        if (modals && typeof modals.openResultsModal === 'function') {
            const resultsModal = document.getElementById('results-overlay');
            if (resultsModal && !resultsModal.classList.contains('active')) {
                modals.openResultsModal();
            }
        }
    }
        
    function renderConsultationResults(adviceText) { // Общий
        if (!resultsContainer) return logger.warn("Consultation: resultsContainer не найден для отображения результатов.");
        resultsContainer.innerHTML = ''; 
        
        if (uiHelpers && typeof uiHelpers.parseMarkdownToHtml === 'function') {
            resultsContainer.innerHTML = uiHelpers.parseMarkdownToHtml(adviceText);
        } else {
            resultsContainer.innerHTML = adviceText; 
            logger.warn("Consultation: uiHelpers.parseMarkdownToHtml не найден, результат вставлен как есть.");
        }
    }
    
    function resetConsultationForm() { // Сбрасывает общие элементы формы
        logger.debug('Consultation: Сброс формы консультации...');
        
        if (consultationForm) consultationForm.reset();
        // Не очищаем resultsContainer здесь, т.к. он в отдельной модалке

        // Сброс одиночного изображения
        if (imageUpload && typeof imageUpload.resetSingleImageUpload === 'function') {
            imageUpload.resetSingleImageUpload();
        } else {
             uploadedImage = null; // Ручной сброс, если imageUpload не справился
        }
        // Сброс изображений для сравнения
        if (window.MishuraApp.features.comparison && typeof window.MishuraApp.features.comparison.resetCompareForm === 'function') {
            window.MishuraApp.features.comparison.resetCompareForm();
        } else if (imageUpload && typeof imageUpload.resetCompareImageUploads === 'function') {
             imageUpload.resetCompareImageUploads();
        }


        currentConsultationData = null;
        if (submitButton) submitButton.disabled = true;

        const formContainer = document.getElementById('consultation-overlay');
        if(formContainer){ // Скрываем доп. поля
            const occasionEl = formContainer.querySelector('.occasion-selector');
            const labels = formContainer.querySelectorAll('.input-label');
            const prefsEl = formContainer.querySelector('.preferences-input');
            if (occasionEl) occasionEl.classList.add('hidden');
            labels.forEach(l => l.classList.add('hidden'));
            if (prefsEl) prefsEl.classList.add('hidden');
        }
        logger.debug('Consultation: Форма консультации сброшена.');
    }
    
    function getCurrentConsultationData() {
        return currentConsultationData;
    }
    
    return { init, openConsultationModal, getCurrentConsultationData, resetConsultationForm };
})();