/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Сравнение образов (comparison.js)
ВЕРСИЯ: 0.4.4 (Усиленная проверка API, управление состоянием кнопки)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Реализует функциональность сравнения нескольких образов.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};
window.MishuraApp.features.comparison = (function() {
    'use strict';
    
    let config, logger, uiHelpers, modals, imageUpload, apiService;
    let compareSubmitButton, resultsContainer; 
    let validCompareImagesCount = 0; 
    
    function init() {
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("Comparison(f):",...args), info: (...args)=>console.info("Comparison(f):",...args), warn: (...args)=>console.warn("Comparison(f):",...args), error: (...args)=>console.error("Comparison(f):",...args) };
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        modals = window.MishuraApp.components.modals;
        imageUpload = window.MishuraApp.components.imageUpload;
        
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            apiService = window.MishuraApp.api.service;
            if (typeof apiService.isInitialized === 'function' && !apiService.isInitialized()) {
                logger.warn("Comparison: API сервис найден, но isInitialized()=false. Вызов init().");
                if(typeof apiService.init === 'function') apiService.init();
            }
        } else {
            logger.error("Comparison: API сервис НЕ НАЙДЕН! Запросы не будут работать.");
        }

        logger.debug('Инициализация модуля Сравнение (v0.4.4)');
        initDOMElements();
        initEventListeners();
        updateSubmitButtonState(); 
        logger.info('Модуль Сравнение инициализирован (v0.4.4)');
    }
    
    function initDOMElements() {
        compareSubmitButton = document.getElementById('submit-consultation'); 
        resultsContainer = document.getElementById('results-container'); 

        if (!compareSubmitButton) logger.warn("Comparison DOM: 'submit-consultation' не найден");
        if (!resultsContainer) logger.warn("Comparison DOM: 'results-container' не найден");
    }
    
    function initEventListeners() {
        const updateCountAndButton = () => {
            validCompareImagesCount = countValidCompareImages();
            updateSubmitButtonState();
        };

        document.addEventListener('compareImageUploaded', (event) => {
            logger.debug(`Comparison (event compareImageUploaded): Обновляем счетчик и кнопку.`);
            if (event.detail && event.detail.file) {
                updateCountAndButton();
            }
        });
        
        document.addEventListener('compareImageRemoved', (event) => {
            logger.debug(`Comparison (event compareImageRemoved): Обновляем счетчик и кнопку.`);
            if (event.detail && event.detail.slot !== undefined) {
                updateCountAndButton();
            }
        });
        
        document.addEventListener('allCompareImagesRemoved', () => {
            logger.debug(`Comparison (event allCompareImagesRemoved): Обновляем счетчик и кнопку.`);
            validCompareImagesCount = 0;
            updateSubmitButtonState();
        });
        
        document.addEventListener('modeChanged', function(e) {
            logger.debug(`Comparison (event modeChanged): режим ${e.detail.mode}. Обновление кнопки.`);
            if (e.detail.mode === 'compare') {
                updateCountAndButton();
            }
        });

        // Добавляем обработчик для изменения видимости режима
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.id === 'compare-analysis-mode' && 
                    (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    logger.debug('Comparison: Изменена видимость режима сравнения');
                    updateCountAndButton();
                }
            });
        });

        const compareModeElement = document.getElementById('compare-analysis-mode');
        if (compareModeElement) {
            observer.observe(compareModeElement, {
                attributes: true,
                attributeFilter: ['class', 'style']
            });
        }
    }

    function countValidCompareImages() {
        if (imageUpload && typeof imageUpload.getUploadedImages === 'function') {
            const compareImages = imageUpload.getUploadedImages().compare;
            return compareImages.filter(img => img !== null && img !== undefined).length;
        }
        logger.warn("Comparison: imageUpload.getUploadedImages не доступен для подсчета фото.");
        return 0;
    }
    
    function updateSubmitButtonState() {
        if (!compareSubmitButton) return;
        
        // Проверяем активный режим
        const currentModeButton = document.querySelector('#consultation-overlay .mode-button.active');
        const isActiveCompareMode = currentModeButton && currentModeButton.dataset.mode === 'compare';
        
        // Проверяем видимость режима сравнения
        const compareModeElement = document.getElementById('compare-analysis-mode');
        const isCompareModeVisible = compareModeElement && !compareModeElement.classList.contains('hidden');
        
        // Если мы в режиме сравнения (либо активна кнопка, либо виден режим)
        if (isActiveCompareMode || isCompareModeVisible) {
            const hasEnoughImages = validCompareImagesCount >= 2;
            compareSubmitButton.disabled = !hasEnoughImages;
            compareSubmitButton.classList.toggle('disabled', !hasEnoughImages);
            logger.debug(`Comparison: Статус кнопки submit: ${compareSubmitButton.disabled ? 'отключена' : 'включена'} (режим compare: ${isActiveCompareMode}, видимый режим: ${isCompareModeVisible}, фото: ${validCompareImagesCount})`);
        }
    }

    function handleCompareSubmit() { 
        logger.info("Comparison: Обработка отправки формы для сравнения...");

        const currentUploadedCompareImages = (imageUpload && typeof imageUpload.getUploadedImages === 'function')
                                     ? imageUpload.getUploadedImages().compare.filter(img => img !== null)
                                     : [];
        
        if (currentUploadedCompareImages.length < 2) {
            if (uiHelpers) uiHelpers.showToast('Загрузите не менее 2 изображений для сравнения.');
            logger.warn("Comparison: Отправка прервана - изображений < 2.");
            return;
        }
        
        const occasionInput = document.getElementById('occasion-selector');
        const preferencesInput = document.getElementById('preferences-input');
        const occasion = occasionInput ? occasionInput.value : '';
        const preferences = preferencesInput ? preferencesInput.value : '';

        if (occasion === '') {
            if (uiHelpers) uiHelpers.showToast('Выберите повод для сравнения.');
            logger.warn('Comparison: Отправка прервана - повод не выбран.');
            return;
        }
        
        const formData = new FormData();
        currentUploadedCompareImages.forEach((imageFile) => {
            formData.append(`images`, imageFile, imageFile.name); 
        });
        formData.append('occasion', occasion);
        formData.append('preferences', preferences);
        
        if (uiHelpers) uiHelpers.showLoading('Мишура сравнивает ваши образы...');
        
        if (!apiService || typeof apiService.processCompareOutfits !== 'function') {
            logger.error('Comparison: КРИТИЧЕСКАЯ ОШИБКА - apiService или processCompareOutfits недоступен!');
            if (uiHelpers) { uiHelpers.hideLoading(); uiHelpers.showToast('Ошибка: Сервис API недоступен (CMP01/CMP02).'); }
            return;
        }

        apiService.processCompareOutfits(formData)
            .then(response => {
                logger.info("Comparison: Ответ от API сравнения:", response);
                const adviceText = response && response.advice;

                if (response && response.status === 'success' && typeof adviceText === 'string') {
                    renderCompareResults(adviceText);
                } else {
                    const errorMsg = response && response.message ? response.message : "Не удалось выполнить сравнение (пусто).";
                    logger.error("Comparison: Ошибка от API сравнения:", errorMsg, response);
                    if (uiHelpers) uiHelpers.showToast(`Сравнение: ${errorMsg}`);
                    if (resultsContainer) resultsContainer.innerHTML = `<p>Мишура не смогла сравнить: ${errorMsg}</p>`;
                }
                 if (modals) { 
                    modals.openResultsModal(); 
                }
                if (modals && typeof modals.closeModal === 'function' && document.getElementById('consultation-overlay')?.classList.contains('active')) {
                    modals.closeModal('consultation-overlay');
                }
            })
            .catch(error => {
                const errorMsg = error && error.message ? error.message : "Ошибка сети или сервера.";
                logger.error("Comparison: Сетевая ошибка или ошибка сервера:", errorMsg, error);
                if (uiHelpers) uiHelpers.showToast(`Ошибка связи: ${errorMsg}`);
                if (resultsContainer) resultsContainer.innerHTML = `<p>Не удалось сравнить: ${errorMsg}</p>`;
                if (modals) modals.openResultsModal();
            })
            .finally(() => {
                if (uiHelpers) uiHelpers.hideLoading();
            });
    }
    
    function renderCompareResults(adviceText) {
        if (!resultsContainer) return logger.warn("Comparison: resultsContainer не найден.");
        resultsContainer.innerHTML = ''; 
        
        if (uiHelpers && typeof uiHelpers.parseMarkdownToHtml === 'function') {
            resultsContainer.innerHTML = uiHelpers.parseMarkdownToHtml(adviceText);
        } else {
            resultsContainer.innerHTML = adviceText;
            logger.warn("Comparison: uiHelpers.parseMarkdownToHtml не найден, результат вставлен как есть.");
        }
    }
    
    function resetCompareForm() { 
        logger.debug('Comparison: Сброс формы сравнения...');
        validCompareImagesCount = 0;
        // imageUpload.resetCompareImageUploads() уже вызывается из consultation.js -> resetConsultationForm
        // поэтому здесь достаточно обновить состояние кнопки.
        // Если этот модуль будет использоваться независимо, то вызов resetCompareImageUploads нужен здесь.
        if (imageUpload && typeof imageUpload.getUploadedImages === 'function' && imageUpload.getUploadedImages().compare.some(img => img !==null)){
             // Если вдруг остались загруженные фото, а resetCompareImageUploads не был вызван
             if (typeof imageUpload.resetCompareImageUploads === 'function') {
                logger.warn("Comparison (resetCompareForm): Обнаружены загруженные фото, принудительный вызов imageUpload.resetCompareImageUploads()");
                imageUpload.resetCompareImageUploads();
             }
        }
        updateSubmitButtonState(); 
        // if (resultsContainer) resultsContainer.innerHTML = ''; // Очищается в consultation.js или при открытии results-overlay
    }
        
    return {
        init,
        handleCompareSubmit, 
        resetCompareForm,
        updateSubmitButtonState 
    };
})();