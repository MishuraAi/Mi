/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Консультации (consultation.js)
ВЕРСИЯ: 0.4.5 (Усиленная проверка инициализации apiService, исправление ID контейнеров)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Реализует функциональность консультаций с ИИ-стилистом.
Обрабатывает запросы пользователя, управляет формой и взаимодействует с API.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};
window.MishuraApp.features.consultation = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger, uiHelpers, modals, imageUpload, apiService;
    
    // Элементы DOM
    let consultationForm, occasionSelector, preferencesInput, submitButton;
    let resultsContainer; 

    // Текущие данные
    let currentConsultationData = null;
    let uploadedImage = null;
    
    /**
     * Инициализация модуля
     */
    function init() {
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("ConsultationLogger:", ...args), info: (...args)=>console.info("ConsultationLogger:", ...args), warn: (...args)=>console.warn("ConsultationLogger:", ...args), error: (...args)=>console.error("ConsultationLogger:", ...args) };
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        modals = window.MishuraApp.components.modals;
        imageUpload = window.MishuraApp.components.imageUpload;
        
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            apiService = window.MishuraApp.api.service;
            // Проверяем, был ли API сервис инициализирован
            if (typeof apiService.isInitialized === 'function') {
                if (!apiService.isInitialized()) {
                    logger.warn("Модуль consultation: API сервис (api.service) найден, но его isInitialized() вернул false. Вызов apiService.init() принудительно.");
                    // Попытка инициализировать API сервис, если он еще не готов.
                    // Это может помочь, если порядок загрузки скриптов не идеален,
                    // но в идеале app.js должен гарантировать инициализацию api.service ДО features.
                    if (typeof apiService.init === 'function') {
                        apiService.init();
                    } else {
                         logger.error("Модуль consultation: api.service.init() не является функцией!");
                    }
                } else {
                    logger.debug("Модуль consultation: API сервис (api.service) уже инициализирован.");
                }
            } else {
                logger.warn("Модуль consultation: API сервис (api.service) найден, но у него нет метода isInitialized(). Надеемся, что он уже готов к работе.");
            }
        } else {
            logger.error("Модуль consultation: API сервис (window.MishuraApp.api.service) НЕ НАЙДЕН! Запросы к API не будут работать.");
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast("Критическая ошибка: Сервис API не загружен (C00).", 5000);
            }
        }

        initDOMElements();
        initEventListeners();
        
        logger.debug("Модуль консультаций инициализирован (v0.4.5)");
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
                // Предотвращаем стандартную отправку формы
                e.preventDefault();
                // Определяем текущий режим (single или compare)
                const currentModeButton = document.querySelector('#consultation-overlay .mode-button.active');
                const currentMode = currentModeButton ? currentModeButton.dataset.mode : 'single';
                logger.info(`Обработчик submit формы: режим '${currentMode}'`);

                if (currentMode === 'single') {
                    handleConsultationSubmit(); // Вызываем наш обработчик для одиночной консультации
                } else if (currentMode === 'compare') {
                    // Делегируем модулю comparison
                    if (window.MishuraApp.features.comparison && typeof window.MishuraApp.features.comparison.handleCompareSubmit === 'function') {
                        logger.debug('Делегирование отправки формы модулю comparison.js');
                        window.MishuraApp.features.comparison.handleCompareSubmit();
                    } else {
                        logger.error('Режим сравнения активен, но comparison.handleCompareSubmit не найден.');
                        if (uiHelpers) uiHelpers.showToast('Ошибка: Функция сравнения недоступна (C04).');
                    }
                } else {
                    logger.warn(`Неизвестный режим формы: ${currentMode}`);
                }
            });
        } else {
            logger.warn("Обработчик submit для 'consultation-form' не назначен: форма не найдена.");
        }
        
        document.addEventListener('singleImageUploaded', function(e) {
            uploadedImage = e.detail.file;
            logger.debug('Событие singleImageUploaded (consultation.js): изображение для одиночного анализа загружено -', uploadedImage ? uploadedImage.name : 'Н/Д');
            // Кнопка отправки активируется, если мы в режиме 'single'
            const currentModeButton = document.querySelector('#consultation-overlay .mode-button.active');
            const currentMode = currentModeButton ? currentModeButton.dataset.mode : 'single';
            if (submitButton && currentMode === 'single') {
                submitButton.disabled = !uploadedImage; // Активна если есть картинка
            }
        });
        
        document.addEventListener('singleImageRemoved', function() {
            uploadedImage = null;
            logger.debug('Событие singleImageRemoved (consultation.js): изображение для одиночного анализа удалено.');
            const currentModeButton = document.querySelector('#consultation-overlay .mode-button.active');
            const currentMode = currentModeButton ? currentModeButton.dataset.mode : 'single';
            if (submitButton && currentMode === 'single') {
                submitButton.disabled = true; // Деактивируем, т.к. картинки нет
            }
        });
        
        document.addEventListener('modalClosed', function(e) {
            if (e.detail.modalId === 'consultation-overlay') { 
                logger.debug("Событие modalClosed для 'consultation-overlay', сброс формы консультации.");
                resetConsultationForm();
            }
        });

        // Слушаем смену режима, чтобы правильно управлять кнопкой "Проанализировать"
        document.addEventListener('modeChanged', function(e) {
            logger.debug(`Модуль consultation: событие modeChanged, режим ${e.detail.mode}. Обновление состояния кнопки.`);
            if (submitButton) {
                if (e.detail.mode === 'single') {
                    submitButton.disabled = !uploadedImage; // Для 'single' зависит от наличия фото
                } else if (e.detail.mode === 'compare') {
                    // Состояние кнопки для 'compare' управляется модулем comparison.js
                    // Здесь можно просто вызвать его updateSubmitButtonState, если он есть
                    if (window.MishuraApp.features.comparison && typeof window.MishuraApp.features.comparison.updateSubmitButtonState === 'function') {
                        window.MishuraApp.features.comparison.updateSubmitButtonState();
                    } else {
                        // Если comparison.js не управляет, то по умолчанию деактивируем
                        // submitButton.disabled = true;
                    }
                }
            }
        });
    }
    
    function openConsultationModal() {
        logger.info('Вызов openConsultationModal в consultation.js');
        resetConsultationForm(); 
        if (modals && typeof modals.openConsultationModal === 'function') {
            modals.openConsultationModal();
        } else {
            logger.error("modals.openConsultationModal не найден.");
            if (uiHelpers) uiHelpers.showToast("Ошибка: Не удалось открыть окно консультации (C05).");
        }
    }
    
    function handleConsultationSubmit() { // Теперь этот метод только для ОДИНОЧНОЙ консультации
        logger.debug('Обработка отправки формы одиночной консультации...');

        if (!uploadedImage) {
            if (uiHelpers) uiHelpers.showToast('Пожалуйста, загрузите изображение для анализа.');
            logger.warn('Отправка формы (single) прервана: изображение не загружено.');
            return;
        }
        
        const occasion = occasionSelector ? occasionSelector.value : '';
        const preferences = preferencesInput ? preferencesInput.value : '';
        
        if (occasion === '') {
            if (uiHelpers) uiHelpers.showToast('Пожалуйста, выберите повод для консультации.');
            logger.warn('Отправка формы (single) прервана: повод не выбран.');
            return;
        }
        
        const formData = new FormData();
        formData.append('image', uploadedImage);
        formData.append('occasion', occasion);
        formData.append('preferences', preferences);

        logger.info('Данные для запроса на одиночную консультацию:', {occasion, preferencesLength: preferences.length, imageName: uploadedImage.name});
        
        if (uiHelpers) uiHelpers.showLoading('Мишура анализирует ваш образ...');
        
        if (!apiService) {
            logger.error('КРИТИЧЕСКАЯ ОШИБКА: apiService не определен! Запрос не отправлен.');
            if (uiHelpers) { uiHelpers.hideLoading(); uiHelpers.showToast('Ошибка: Сервис API недоступен (C02).');}
            return;
        }
        if (typeof apiService.processStylistConsultation !== 'function') {
            logger.error('КРИТИЧЕСКАЯ ОШИБКА: apiService.processStylistConsultation не является функцией! Запрос не отправлен.');
            if (uiHelpers) { uiHelpers.hideLoading(); uiHelpers.showToast('Ошибка: Метод API недоступен (C03).');}
            return;
        }

        apiService.processStylistConsultation(formData)
            .then(handleConsultationResponse)
            .catch(handleConsultationError)
            .finally(() => {
                if (uiHelpers) uiHelpers.hideLoading();
            });
    }
    
    function handleConsultationResponse(response) {
        logger.info('Ответ от сервера (одиночная консультация):', response);
        
        if (!response || response.status !== 'success' || typeof response.advice !== 'string') {
            const errorMessage = (response && response.message) ? response.message : 'ИИ-стилист не смог предоставить ответ.';
            logger.error('Ошибка в ответе сервера (одиночная консультация):', errorMessage, response);
            if (uiHelpers) uiHelpers.showToast(`Ошибка: ${errorMessage}`);
            if (resultsContainer) resultsContainer.innerHTML = `<p>Мишура не смогла дать совет: ${errorMessage}</p>`;
        } else {
            currentConsultationData = response.advice;
            renderConsultationResults(currentConsultationData);
            logger.info('Одиночная консультация успешно получена и отображена.');
        }
        
        // В любом случае открываем модальное окно результатов
        if (modals && typeof modals.openResultsModal === 'function') {
            modals.openResultsModal();
        } else {
            logger.error("Не удалось открыть модальное окно результатов: modals.openResultsModal не найден.");
        }
        // Закрываем модальное окно ввода, если оно еще открыто (может быть закрыто и раньше)
        if (modals && typeof modals.closeModal === 'function' && document.getElementById('consultation-overlay')?.classList.contains('active')) {
            modals.closeModal('consultation-overlay');
        }
    }
    
    function handleConsultationError(error) {
        const errorMessage = (error && error.message) ? error.message : 'Неизвестная ошибка при запросе к стилисту.';
        logger.error('Ошибка при запросе одиночной консультации (поймана .catch):', errorMessage, error);
        if (uiHelpers) uiHelpers.showToast(`Связь со стилистом: ${errorMessage}`);
        
        if (resultsContainer) resultsContainer.innerHTML = `<p>Не удалось получить совет: ${errorMessage}. Попробуйте снова.</p>`;
        
        if (modals && typeof modals.openResultsModal === 'function') {
            const resultsModal = document.getElementById('results-overlay');
            if (resultsModal && !resultsModal.classList.contains('active')) {
                modals.openResultsModal();
            }
        }
    }
        
    function renderConsultationResults(adviceText) {
        if (!resultsContainer) return logger.warn("resultsContainer не найден для отображения результатов.");
        resultsContainer.innerHTML = ''; 
        
        if (uiHelpers && typeof uiHelpers.parseMarkdownToHtml === 'function') {
            resultsContainer.innerHTML = uiHelpers.parseMarkdownToHtml(adviceText);
        } else {
            resultsContainer.innerHTML = adviceText; 
            logger.warn("uiHelpers.parseMarkdownToHtml не найден, результат одиночной консультации вставлен как есть.");
        }
    }
    
    function resetConsultationForm() {
        logger.debug('Сброс формы консультации (в consultation.js)...');
        
        if (consultationForm) consultationForm.reset();
        // if (resultsContainer) resultsContainer.innerHTML = ''; // Результаты в отдельной модалке, ее содержимое очистится при след. открытии

        // Сбрасываем одиночное изображение. Модуль image-upload сам сбросит uploadedImage через событие.
        if (imageUpload && typeof imageUpload.resetSingleImageUpload === 'function') {
            imageUpload.resetSingleImageUpload();
        } else {
            logger.warn("imageUpload.resetSingleImageUpload не найден. Попытка ручного сброса UI для одиночного фото.");
            uploadedImage = null; // Если imageUpload не доступен, сбрасываем здесь
            const singlePreviewContainer = document.getElementById('single-preview-container');
            const singleUploadArea = document.getElementById('single-upload-area');
            if (singlePreviewContainer) singlePreviewContainer.classList.add('hidden');
            if (singleUploadArea) singleUploadArea.classList.remove('hidden');
        }
        
        // Сбрасываем изображения для сравнения. Модуль image-upload также должен это сделать.
        if (imageUpload && typeof imageUpload.resetCompareImageUploads === 'function') {
            imageUpload.resetCompareImageUploads();
        } else {
            logger.warn("imageUpload.resetCompareImageUploads не найден.");
        }

        currentConsultationData = null;
        if (submitButton) submitButton.disabled = true; // Делаем кнопку неактивной по умолчанию

        // Скрываем поля, которые должны появляться после загрузки фото
        const formElementsContainer = document.getElementById('consultation-overlay');
        if(formElementsContainer){
            const occasionElement = formElementsContainer.querySelector('.occasion-selector');
            const inputLabels = formElementsContainer.querySelectorAll('.input-label');
            const preferencesElement = formElementsContainer.querySelector('.preferences-input');
            if (occasionElement) occasionElement.classList.add('hidden');
            inputLabels.forEach(label => label.classList.add('hidden'));
            if (preferencesElement) preferencesElement.classList.add('hidden');
        }
        logger.debug('Форма консультации сброшена (в consultation.js).');
    }
    
    function getCurrentConsultationData() {
        return currentConsultationData;
    }
    
    return { init, openConsultationModal, getCurrentConsultationData, resetConsultationForm };
})();