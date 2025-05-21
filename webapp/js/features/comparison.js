/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Сравнение образов (comparison.js)
ВЕРСИЯ: 0.4.3 (Улучшенная интеграция с API и управлением состоянием кнопки)
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
    let compareSubmitButton, resultsContainer; // Используем общую кнопку и контейнер результатов
    let validCompareImagesCount = 0; 
    
    function init() {
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("ComparisonLogger:",...args), info: (...args)=>console.info("ComparisonLogger:",...args), warn: (...args)=>console.warn("ComparisonLogger:",...args), error: (...args)=>console.error("ComparisonLogger:",...args) };
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        modals = window.MishuraApp.components.modals;
        imageUpload = window.MishuraApp.components.imageUpload;
        
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            apiService = window.MishuraApp.api.service;
            if (typeof apiService.isInitialized === 'function' && !apiService.isInitialized()) {
                logger.warn("Модуль comparison: API сервис (api.service) найден, но isInitialized() false. Попытка инициализации...");
                if(typeof apiService.init === 'function') apiService.init();
            }
        } else {
            logger.error("Модуль comparison: API сервис (window.MishuraApp.api.service) НЕ НАЙДЕН!");
        }

        logger.debug('Инициализация модуля Сравнение (v0.4.3)');
        initDOMElements();
        initEventListeners();
        updateSubmitButtonState(); // Обновляем при инициализации
        logger.info('Модуль Сравнение инициализирован (v0.4.3)');
    }
    
    function initDOMElements() {
        // Используем элементы из общей формы модального окна консультации
        compareSubmitButton = document.getElementById('submit-consultation'); 
        resultsContainer = document.getElementById('results-container'); 

        if (!compareSubmitButton) logger.warn("Comparison DOM: 'submit-consultation' (для кнопки) не найден");
        if (!resultsContainer) logger.warn("Comparison DOM: 'results-container' (для результатов) не найден");
    }
    
    function initEventListeners() {
        document.addEventListener('compareImageUploaded', function(e) {
            validCompareImagesCount = countValidCompareImages();
            logger.debug(`Событие compareImageUploaded. Фото для сравнения: ${validCompareImagesCount}`);
            updateSubmitButtonState();
        });
        
        document.addEventListener('compareImageRemoved', function(e) {
            validCompareImagesCount = countValidCompareImages();
            logger.debug(`Событие compareImageRemoved. Фото для сравнения: ${validCompareImagesCount}`);
            updateSubmitButtonState();
        });
        
        document.addEventListener('allCompareImagesRemoved', function() {
            validCompareImagesCount = 0;
            logger.debug(`Событие allCompareImagesRemoved. Фото для сравнения: ${validCompareImagesCount}`);
            updateSubmitButtonState();
        });

        // Слушаем событие смены режима от image-upload.js или consultation.js
        document.addEventListener('modeChanged', function(e) {
            logger.debug(`Comparison: получено событие modeChanged, новый режим ${e.detail.mode}`);
            updateSubmitButtonState(); // Важно для правильной (де)активации кнопки
            if (e.detail.mode !== 'compare' && validCompareImagesCount > 0) {
                // Если ушли с режима сравнения, но фото были, можно их сбросить, чтобы не путать пользователя
                // resetCompareForm(); // Это может быть слишком агрессивно. Пока просто обновим кнопку.
            }
        });
    }

    function countValidCompareImages() {
        if (imageUpload && typeof imageUpload.getUploadedImages === 'function') {
            const compareImages = imageUpload.getUploadedImages().compare;
            return compareImages.filter(img => img !== null && img !== undefined).length;
        }
        return 0;
    }
    
    function updateSubmitButtonState() {
        if (!compareSubmitButton) return;
        const currentModeButton = document.querySelector('#consultation-overlay .mode-button.active');
        const isActiveCompareMode = currentModeButton && currentModeButton.dataset.mode === 'compare';
        
        compareSubmitButton.disabled = !(isActiveCompareMode && validCompareImagesCount >= 2);
        logger.debug(`Статус кнопки отправки сравнения: ${compareSubmitButton.disabled ? 'отключена' : 'включена'} (режим compare: ${isActiveCompareMode}, фото: ${validCompareImagesCount})`);
    }

    function handleCompareSubmit() { // Вызывается из consultation.js, когда режим 'compare'
        logger.info("Обработка отправки формы для сравнения...");

        const currentUploadedCompareImages = (imageUpload && typeof imageUpload.getUploadedImages === 'function')
                                     ? imageUpload.getUploadedImages().compare.filter(img => img !== null)
                                     : [];
        
        if (currentUploadedCompareImages.length < 2) {
            if (uiHelpers) uiHelpers.showToast('Загрузите не менее 2 изображений для сравнения.');
            logger.warn("Сравнение прервано: изображений меньше 2.");
            return;
        }
        
        const occasionInput = document.getElementById('occasion-selector');
        const preferencesInput = document.getElementById('preferences-input');
        const occasion = occasionInput ? occasionInput.value : '';
        const preferences = preferencesInput ? preferencesInput.value : '';

        if (occasion === '') {
            if (uiHelpers) uiHelpers.showToast('Выберите повод для сравнения.');
            logger.warn('Сравнение прервано: повод не выбран.');
            return;
        }
        
        const formData = new FormData();
        currentUploadedCompareImages.forEach((imageFile) => {
            formData.append(`images`, imageFile, imageFile.name); 
        });
        formData.append('occasion', occasion);
        formData.append('preferences', preferences);
        
        if (uiHelpers) uiHelpers.showLoading('Мишура сравнивает ваши образы...');
        
        if (!apiService) {
            logger.error('КРИТИЧЕСКАЯ ОШИБКА: apiService не определен в comparison.js!');
            if (uiHelpers) { uiHelpers.hideLoading(); uiHelpers.showToast('Ошибка: Сервис API недоступен (CMP01).'); }
            return;
        }
        if (typeof apiService.processCompareOutfits !== 'function') {
            logger.error('КРИТИЧЕСКАЯ ОШИБКА: apiService.processCompareOutfits не является функцией!');
            if (uiHelpers) { uiHelpers.hideLoading(); uiHelpers.showToast('Ошибка: Метод API недоступен (CMP02).'); }
            return;
        }

        apiService.processCompareOutfits(formData)
            .then(response => {
                logger.info("Ответ от API сравнения:", response);
                if (response && response.status === 'success' && response.advice) {
                    renderCompareResults(response.advice);
                } else {
                    const errorMsg = response && response.message ? response.message : "Не удалось выполнить сравнение.";
                    logger.error("Ошибка от API сравнения:", errorMsg, response);
                    if (uiHelpers) uiHelpers.showToast(`Сравнение: ${errorMsg}`);
                    if (resultsContainer) resultsContainer.innerHTML = `<p>Мишура не смогла сравнить: ${errorMsg}</p>`;
                }
                 if (modals) { // Открываем модальное окно результатов в любом случае (успех или ошибка)
                    // modals.closeModal('consultation-overlay'); // Закрытие окна ввода теперь обрабатывается в consultation.js или modals.js
                    modals.openResultsModal(); 
                }
            })
            .catch(error => {
                const errorMsg = error && error.message ? error.message : "Ошибка сети или сервера.";
                logger.error("Сетевая ошибка или ошибка сервера при сравнении:", errorMsg, error);
                if (uiHelpers) uiHelpers.showToast(`Ошибка: ${errorMsg}`);
                if (resultsContainer) resultsContainer.innerHTML = `<p>Не удалось сравнить: ${errorMsg}</p>`;
                if (modals) modals.openResultsModal();
            })
            .finally(() => {
                if (uiHelpers) uiHelpers.hideLoading();
            });
    }
    
    function renderCompareResults(adviceText) {
        if (!resultsContainer) return logger.warn("resultsContainer не найден для отображения результатов сравнения.");
        resultsContainer.innerHTML = ''; 
        
        if (uiHelpers && typeof uiHelpers.parseMarkdownToHtml === 'function') {
            resultsContainer.innerHTML = uiHelpers.parseMarkdownToHtml(adviceText);
        } else {
            resultsContainer.innerHTML = adviceText;
            logger.warn("uiHelpers.parseMarkdownToHtml не найден, результат сравнения вставлен как есть.");
        }
    }
    
    function resetCompareForm() { 
        logger.debug('Сброс формы сравнения (через comparison.js)...');
        validCompareImagesCount = 0;
        if (imageUpload && typeof imageUpload.resetCompareImageUploads === 'function') {
            imageUpload.resetCompareImageUploads(); 
        } else {
            logger.warn("imageUpload.resetCompareImageUploads не найден.");
        }
        updateSubmitButtonState(); 
        // if (resultsContainer) resultsContainer.innerHTML = ''; // Очистка результатов, если они в той же модалке
    }
        
    return {
        init,
        handleCompareSubmit, 
        resetCompareForm,
        updateSubmitButtonState // Для вызова извне, например, из consultation.js при смене режима
    };
})();