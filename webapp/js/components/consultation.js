/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Консультации (consultation.js)
ВЕРСИЯ: 1.0.0 (ПОЛНОСТЬЮ ИСПРАВЛЕН)
ДАТА ОБНОВЛЕНИЯ: 2025-05-27

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
    let uploadedImage = null;
    let uploadedCompareImages = [null, null, null, null];
    let currentMode = 'single';
    let isConsultationInitialized = false;
    
    function init() {
        if (isConsultationInitialized) return;
        
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger || createFallbackLogger();
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        modals = window.MishuraApp.components.modals;
        imageUpload = window.MishuraApp.components.imageUpload;
        
        // Инициализация API сервиса
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            apiService = window.MishuraApp.api.service;
            if (typeof apiService.init === 'function' && (!apiService.isInitialized || !apiService.isInitialized())) {
                apiService.init(config);
            }
            logger.info("Consultation: API сервис успешно инициализирован");
        } else {
            logger.error("Consultation: API сервис НЕ НАЙДЕН! Запросы не будут работать.");
            if (uiHelpers) uiHelpers.showToast("Ошибка: Сервис API не загружен (C00).", 5000);
        }

        initDOMElements();
        initEventListeners();
        
        isConsultationInitialized = true;
        logger.info("Модуль консультаций инициализирован (v1.0.0)");
    }
    
    function createFallbackLogger() {
        return {
            debug: (...args) => console.debug("Consultation:", ...args),
            info: (...args) => console.info("Consultation:", ...args),
            warn: (...args) => console.warn("Consultation:", ...args),
            error: (...args) => console.error("Consultation:", ...args)
        };
    }
    
    function initDOMElements() {
        consultationForm = document.getElementById('consultation-form');
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
                logger.info(`Consultation: Обработчик submit формы, режим '${currentMode}'`);

                if (currentMode === 'single') {
                    handleSingleConsultationSubmit(); 
                } else if (currentMode === 'compare') {
                    handleCompareConsultationSubmit();
                }
            });
        }
        
        document.addEventListener('singleImageUploaded', function(e) {
            uploadedImage = e.detail.file;
            logger.debug('Consultation: Изображение для одиночного анализа загружено -', uploadedImage ? uploadedImage.name : 'Н/Д');
            updateSingleModeSubmitButtonState();
        });
        
        document.addEventListener('singleImageRemoved', function() {
            uploadedImage = null;
            logger.debug('Consultation: Изображение для одиночного анализа удалено.');
            updateSingleModeSubmitButtonState();
        });

        document.addEventListener('compareImageUploaded', function(e) {
            const { file, slot } = e.detail;
            uploadedCompareImages[slot] = file;
            logger.debug(`Consultation: Изображение загружено в слот ${slot} - ${file.name}`);
            updateCompareSubmitButtonState();
        });

        document.addEventListener('compareImageRemoved', function(e) {
            const { slot } = e.detail;
            uploadedCompareImages[slot] = null;
            logger.debug(`Consultation: Изображение удалено из слота ${slot}`);
            updateCompareSubmitButtonState();
        });

        document.addEventListener('allCompareImagesRemoved', function() {
            uploadedCompareImages = [null, null, null, null];
            logger.debug('Consultation: Все изображения сравнения удалены.');
            updateCompareSubmitButtonState();
        });
        
        document.addEventListener('modalOpened', function(e) {
            if (e.detail.modalId === 'consultation-overlay') {
                logger.debug("Consultation: Модальное окно открыто, обновление состояния кнопки.");
                updateSingleModeSubmitButtonState();
                updateCompareSubmitButtonState();
            }
        });
        
        document.addEventListener('modeChanged', function(e) {
            currentMode = e.detail.mode;
            logger.debug(`Consultation: режим ${currentMode}. Обновление кнопки.`);
            if (currentMode === 'single') {
                updateSingleModeSubmitButtonState();
            } else if (currentMode === 'compare') {
                updateCompareSubmitButtonState();
            }
        });
    }
    
    function updateSingleModeSubmitButtonState() {
        if (submitButton && currentMode === 'single') {
            submitButton.disabled = !uploadedImage;
            logger.debug(`Consultation: Кнопка submit (single mode) ${submitButton.disabled ? 'деактивирована' : 'активирована'}`);
        }
    }

    function updateCompareSubmitButtonState() {
        if (submitButton && currentMode === 'compare') {
            const filledImages = uploadedCompareImages.filter(img => img !== null);
            submitButton.disabled = filledImages.length < 2;
            logger.debug(`Consultation: Кнопка submit (compare mode) ${submitButton.disabled ? 'деактивирована' : 'активирована'} (изображений: ${filledImages.length})`);
        }
    }

    function openConsultationModal() {
        logger.info('Consultation: вызов openConsultationModal()');
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
        
        if (!apiService || typeof apiService.analyzeImage !== 'function') {
            const errorMsg = !apiService ? 'API сервис не инициализирован' : 'Метод analyzeImage не найден';
            logger.error(`Consultation (single): КРИТИЧЕСКАЯ ОШИБКА - ${errorMsg}`);
            if (uiHelpers) { 
                uiHelpers.hideLoading(); 
                uiHelpers.showToast(`Ошибка: ${errorMsg} (C02/C03).`, 5000);
            }
            return;
        }

        if (submitButton) submitButton.disabled = true;
        
        if (uiHelpers) uiHelpers.showLoading('Мишура анализирует ваш образ...');

        apiService.analyzeImage(uploadedImage, 'single', occasion, preferences)
            .then(handleConsultationResponse)
            .catch(handleConsultationError)
            .finally(() => {
                if (uiHelpers) uiHelpers.hideLoading();
                updateSingleModeSubmitButtonState();
            });
    }

    function handleCompareConsultationSubmit() {
        logger.debug('Consultation: обработка отправки формы СРАВНЕНИЯ консультации...');

        const filledImages = uploadedCompareImages.filter(img => img !== null);
        if (filledImages.length < 2) {
            if (uiHelpers) uiHelpers.showToast('Загрузите минимум 2 изображения для сравнения.');
            logger.warn('Consultation (compare): Отправка прервана - недостаточно изображений.');
            return;
        }

        const occasion = occasionSelector ? occasionSelector.value : '';
        const preferences = preferencesInput ? preferencesInput.value : '';
        
        if (occasion === '') {
            if (uiHelpers) uiHelpers.showToast('Выберите повод для консультации.');
            logger.warn('Consultation (compare): Отправка прервана - повод не выбран.');
            return;
        }

        if (!apiService || typeof apiService.compareImages !== 'function') {
            logger.error('Consultation (compare): КРИТИЧЕСКАЯ ОШИБКА - apiService или compareImages недоступен!');
            if (uiHelpers) { 
                uiHelpers.hideLoading(); 
                uiHelpers.showToast('Ошибка: Сервис API недоступен (C02/C03).');
            }
            return;
        }

        if (submitButton) submitButton.disabled = true;
        
        if (uiHelpers) uiHelpers.showLoading('Мишура сравнивает образы...');

        apiService.compareImages(filledImages, occasion, preferences)
            .then(handleConsultationResponse)
            .catch(handleConsultationError)
            .finally(() => {
                if (uiHelpers) uiHelpers.hideLoading();
                updateCompareSubmitButtonState();
            });
    }
    
    function handleConsultationResponse(response) {
        logger.info('Consultation: Ответ от сервера:', response);
        
        if (response && response.status === 'error') {
            const errorMessage = response.message || 'Неизвестная ошибка сервера';
            logger.error('Consultation: Ошибка API:', errorMessage, response);
            if (uiHelpers) uiHelpers.showToast(`Ошибка: ${errorMessage}`, 8000);
            
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div class="error-message">
                    <h3>🔌 Проблема с подключением</h3>
                    <p>${errorMessage}</p>
                    ${response.error_type === 'connection_refused' ? '<p><strong>Решение:</strong> Запустите API сервер в отдельном терминале:<br><code>python api.py</code></p>' : ''}
                </div>`;
            }
            
            showResultsModal();
            return;
        }
        
        const adviceText = response && response.advice;
        
        if (!response || response.status !== 'success' || typeof adviceText !== 'string') {
            const errorMessage = (response && response.message) ? response.message : 'ИИ-стилист не смог предоставить ответ (пусто).';
            logger.error('Consultation: Ошибка в ответе сервера:', errorMessage, response);
            if (uiHelpers) uiHelpers.showToast(`Ошибка: ${errorMessage}`);
            if (resultsContainer) resultsContainer.innerHTML = `<p>Мишура не смогла дать совет: ${errorMessage}</p>`;
            return;
        }
        
        currentConsultationData = adviceText;
        renderConsultationResults(adviceText);
        logger.info('Consultation: Консультация успешно получена и отображена.');
        
        // Закрываем окно консультации и открываем результаты
        closeConsultationAndShowResults();
    }
    
    function handleConsultationError(error) {
        const errorMessage = (error && error.message) ? error.message : 'Неизвестная ошибка при запросе к стилисту.';
        logger.error('Consultation: Ошибка при запросе:', errorMessage, error);
        if (uiHelpers) uiHelpers.showToast(`Связь: ${errorMessage}`);
        
        if (resultsContainer) {
            resultsContainer.innerHTML = `<p>Не удалось получить совет: ${errorMessage}. Попробуйте снова.</p>`;
        }
        
        showResultsModal();
    }
    
    function closeConsultationAndShowResults() {
        if (modals) {
            const consultationModal = document.getElementById('consultation-overlay');
            if (consultationModal && consultationModal.classList.contains('active')) {
                modals.closeModalById('consultation-overlay');
                setTimeout(() => {
                    modals.openResultsModal();
                    const closeButton = document.getElementById('results-close');
                    if (closeButton) {
                        closeButton.focus();
                    }
                }, 150);
            } else {
                showResultsModal();
            }
        }
    }
    
    function showResultsModal() {
        if (modals && typeof modals.openResultsModal === 'function') {
            modals.openResultsModal();
            const closeButton = document.getElementById('results-close');
            if (closeButton) {
                closeButton.focus();
            }
        }
    }
        
    function renderConsultationResults(adviceText) {
        if (resultsContainer) {
            // Преобразуем markdown в HTML если нужно
            const htmlContent = parseMarkdownToHtml(adviceText);
            resultsContainer.innerHTML = htmlContent;
            resultsContainer.classList.add('active');
        }
    }
    
    function parseMarkdownToHtml(markdown) {
        if (!markdown) return '';
        
        return markdown
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^\s*[-*]\s(.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            .replace(/^(?!<[h|u|li])(.*$)/gm, '<p>$1</p>')
            .replace(/\n\n/g, '\n')
            .replace(/<p><\/p>/g, '');
    }
    
    function resetConsultationForm() {
        logger.debug('Consultation: Сброс формы консультации...');
        
        if (consultationForm) consultationForm.reset();

        if (imageUpload && typeof imageUpload.resetSingleImageUpload === 'function') {
            imageUpload.resetSingleImageUpload();
        } else {
             uploadedImage = null;
        }
        
        if (imageUpload && typeof imageUpload.resetCompareImageUploads === 'function') {
             imageUpload.resetCompareImageUploads();
        }
        uploadedCompareImages = [null, null, null, null];

        currentConsultationData = null;
        if (submitButton) submitButton.disabled = true;

        const formContainer = document.getElementById('consultation-overlay');
        if(formContainer){
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

    function handleCompareSubmit() {
        logger.debug('Consultation: Вызов handleCompareSubmit() (публичная функция)');
        handleCompareConsultationSubmit();
    }

    function updateSubmitButtonState() {
        logger.debug('Consultation: Вызов updateSubmitButtonState() (публичная функция)');
        if (currentMode === 'compare') {
            updateCompareSubmitButtonState();
        } else {
            updateSingleModeSubmitButtonState();
        }
    }
    
    return { 
        init, 
        openConsultationModal, 
        getCurrentConsultationData, 
        resetConsultationForm,
        handleCompareSubmit,
        updateSubmitButtonState,
        isInitialized: () => isConsultationInitialized
    };
})(); 