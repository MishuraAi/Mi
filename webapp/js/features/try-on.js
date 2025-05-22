/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Виртуальная примерка (try-on.js)
ВЕРСИЯ: 0.5.3 (Усиленная проверка API, сброс инпутов, обработка событий)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Реализует функциональность виртуальной примерки одежды.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};
window.MishuraApp.features.tryOn = (function() {
    'use strict';
    
    let config, logger, uiHelpers, apiService, modals;
    
    let tryOnButtonMain, tryOnOverlay; 
    let yourPhotoInput, outfitPhotoInput;
    let yourPhotoPreview, outfitPhotoPreview;
    let yourPhotoContainer, outfitPhotoContainer;
    let yourPhotoUploadArea, outfitPhotoUploadArea;
    let deleteYourPhotoButton, deleteOutfitPhotoButton;
    let tryOnSubmitButton, tryOnStyleSelector;
    let tryOnResultImage;
    let tryOnDownloadButton;
    
    let uploadedImages = { yourPhoto: null, outfitPhoto: null };
    let currentTryOnResultDataUrl = null;
    
    function init() {
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("TryOn(f):",...args), info: (...args)=>console.info("TryOn(f):",...args), warn: (...args)=>console.warn("TryOn(f):",...args), error: (...args)=>console.error("TryOn(f):",...args) };
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        modals = window.MishuraApp.components.modals;
        
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            apiService = window.MishuraApp.api.service;
            if (typeof apiService.isInitialized === 'function' && !apiService.isInitialized()) {
                logger.warn("TryOn: API сервис найден, но isInitialized()=false. Вызов init() API сервиса.");
                if(typeof apiService.init === 'function') apiService.init();
            }
        } else {
            logger.error("TryOn: API сервис НЕ НАЙДЕН! Запросы не будут работать.");
            if (uiHelpers) uiHelpers.showToast("Ошибка: Сервис API не загружен (T00).", 5000);
        }

        // Инициализация AI сервиса
        if (window.MishuraApp.services && window.MishuraApp.services.aiService) {
            const aiService = window.MishuraApp.services.aiService;
            if (typeof aiService.init === 'function') {
                aiService.init();
                logger.info('TryOn: AI сервис инициализирован');
            } else {
                logger.error("TryOn: AI сервис найден, но не имеет метода init");
            }
        } else {
            logger.error("TryOn: AI сервис НЕ НАЙДЕН!");
            if (uiHelpers) uiHelpers.showToast("Ошибка: Сервис AI не загружен (T01).", 5000);
        }

        logger.debug("Инициализация модуля виртуальной примерки (v0.5.3)");
        initDOMElements();
        initEventListeners();
        logger.info('Модуль Виртуальная примерка инициализирован (v0.5.3)');
    }
    
    function initDOMElements() {
        logger.debug("TryOn: Инициализация DOM элементов...");
        tryOnButtonMain = document.getElementById('try-on-button'); 
        tryOnOverlay = document.getElementById('try-on-overlay');
        
        yourPhotoInput = document.getElementById('your-photo-input');
        outfitPhotoInput = document.getElementById('outfit-photo-input');
        yourPhotoPreview = document.getElementById('your-photo-preview');
        outfitPhotoPreview = document.getElementById('outfit-photo-preview');
        yourPhotoContainer = document.getElementById('your-photo-container');
        outfitPhotoContainer = document.getElementById('outfit-photo-container');
        yourPhotoUploadArea = document.getElementById('your-photo-upload-area');
        outfitPhotoUploadArea = document.getElementById('outfit-photo-upload-area');
        
        deleteYourPhotoButton = document.querySelector('#your-photo-container .delete-image[data-target="your-photo"]');
        deleteOutfitPhotoButton = document.querySelector('#outfit-photo-container .delete-image[data-target="outfit-photo"]');
        
        tryOnSubmitButton = document.getElementById('try-on-button-submit');
        tryOnStyleSelector = document.getElementById('try-on-style-selector');
        tryOnResultImage = document.getElementById('try-on-result-image'); 
        tryOnDownloadButton = document.getElementById('try-on-result-download'); 

        // Проверки наличия
        if(!tryOnButtonMain) logger.warn("TryOn DOM: 'try-on-button' (main) не найден.");
        if(!yourPhotoInput) logger.warn("TryOn DOM: 'your-photo-input' не найден.");
        if(!outfitPhotoInput) logger.warn("TryOn DOM: 'outfit-photo-input' не найден.");
        if(!tryOnSubmitButton) logger.warn("TryOn DOM: 'try-on-button-submit' не найден.");
        // и т.д. для остальных
    }

    function resetFileInputLocal(inputElement) { // Локальная, чтобы не зависеть от image-upload.js
        if (inputElement) {
            try { inputElement.value = null; logger.debug(`TryOn: Инпут ${inputElement.id} сброшен.`); } 
            catch (e) { logger.warn(`TryOn: Не удалось сбросить ${inputElement.id}.value`, e); }
        }
    }
    
    function initEventListeners() {
        logger.debug("TryOn: Инициализация обработчиков событий...");

        if (tryOnButtonMain && modals && typeof modals.openTryOnModal === 'function') {
            tryOnButtonMain.addEventListener('click', function() {
                logger.debug("TryOn: Кнопка 'Примерить' (главное меню) нажата.");
                resetFittingForm(); 
                modals.openTryOnModal();
            });
        } else {
             if(!tryOnButtonMain) logger.warn("TryOn: Кнопка 'tryOnButtonMain' не найдена для назначения обработчика.");
             if(!modals || typeof modals.openTryOnModal !== 'function') logger.warn("TryOn: modals.openTryOnModal не доступен.");
        }

        setupUploadArea(yourPhotoUploadArea, yourPhotoInput, 'yourPhoto');
        setupUploadArea(outfitPhotoUploadArea, outfitPhotoInput, 'outfitPhoto');

        if (deleteYourPhotoButton) {
            deleteYourPhotoButton.addEventListener('click', () => resetPhoto('yourPhoto'));
        } else logger.warn("TryOn: Кнопка deleteYourPhotoButton не найдена.");

        if (deleteOutfitPhotoButton) {
            deleteOutfitPhotoButton.addEventListener('click', () => resetPhoto('outfitPhoto'));
        } else logger.warn("TryOn: Кнопка deleteOutfitPhotoButton не найдена.");
        
        if (tryOnSubmitButton) {
            tryOnSubmitButton.addEventListener('click', handleTryOnSubmit);
        } else {
            logger.warn("TryOn: Кнопка 'tryOnSubmitButton' (в модалке) не найдена.");
        }

        if (tryOnDownloadButton) {
            tryOnDownloadButton.addEventListener('click', handleDownload);
        } else logger.warn("TryOn: Кнопка tryOnDownloadButton не найдена.");
        
        document.addEventListener('modalOpened', function(e) {
            if (e.detail.modalId === 'try-on-overlay') {
                logger.debug("TryOn (event modalOpened 'try-on-overlay'): Сброс формы примерки.");
                resetFittingForm();
            }
        });
    }

    function setupUploadArea(uploadArea, fileInput, type) {
        if (!uploadArea || !fileInput) {
            logger.error(`TryOn: Не удалось настроить область загрузки для ${type}: элементы не найдены`);
            return;
        }

        // Добавляем подсказку о требованиях к фото
        const hintText = type === 'yourPhoto' 
            ? 'Загрузите фото в полный рост на нейтральном фоне'
            : 'Загрузите фото одежды или образа';
        
        const hintElement = document.createElement('div');
        hintElement.className = 'upload-hint';
        hintElement.textContent = hintText;
        uploadArea.appendChild(hintElement);

        // Настройка drag & drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                fileInput.files = e.dataTransfer.files;
                handlePhotoUpload({ target: fileInput }, type);
            }
        });

        // Клик по области загрузки
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Обработка выбора файла
        fileInput.addEventListener('change', (e) => {
            handlePhotoUpload(e, type);
        });

        logger.debug(`TryOn: Область загрузки для ${type} настроена`);
    }
    
    function isValidImageFileLocal(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const defaultMaxSize = 5 * 1024 * 1024; // 5MB
        const maxSize = (config && config.LIMITS && config.LIMITS.MAX_FILE_SIZE) ? config.LIMITS.MAX_FILE_SIZE : defaultMaxSize;
        
        if (!file || !file.type) { 
            logger.warn("TryOn.isValid: Файл/тип отсутствуют."); 
            return false; 
        }
        
        if (!validTypes.includes(file.type)) {
            logger.warn(`TryOn.isValid: Недопустимый тип: ${file.type} для ${file.name}`);
            if (uiHelpers) uiHelpers.showToast('Поддерживаются только JPG, PNG и WEBP форматы');
            return false;
        }
        
        if (file.size > maxSize) {
            logger.warn(`TryOn.isValid: Файл ${file.name} слишком большой: ${(file.size / (1024*1024)).toFixed(1)}MB`);
            if (uiHelpers) uiHelpers.showToast(`Файл слишком большой. Максимальный размер: ${(maxSize / (1024*1024)).toFixed(1)}MB`);
            return false;
        }

        // Проверка размеров изображения
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                const minWidth = 300;
                const minHeight = 400;
                const maxWidth = 2000;
                const maxHeight = 3000;
                
                if (img.width < minWidth || img.height < minHeight) {
                    logger.warn(`TryOn.isValid: Изображение слишком маленькое: ${img.width}x${img.height}`);
                    if (uiHelpers) uiHelpers.showToast(`Изображение должно быть не менее ${minWidth}x${minHeight} пикселей`);
                    resolve(false);
                } else if (img.width > maxWidth || img.height > maxHeight) {
                    logger.warn(`TryOn.isValid: Изображение слишком большое: ${img.width}x${img.height}`);
                    if (uiHelpers) uiHelpers.showToast(`Изображение должно быть не более ${maxWidth}x${maxHeight} пикселей`);
                    resolve(false);
                } else {
                    resolve(true);
                }
            };
            img.onerror = function() {
                logger.warn("TryOn.isValid: Ошибка загрузки изображения для проверки размеров");
                if (uiHelpers) uiHelpers.showToast('Ошибка при проверке изображения');
                resolve(false);
            };
            img.src = URL.createObjectURL(file);
        });
    }
    
    async function handlePhotoUpload(event, type) {
        const file = event.target.files[0];
        if (!file) {
            logger.warn('TryOn: Файл не выбран');
            return;
        }

        // Проверяем тип файла
        if (!file.type.startsWith('image/')) {
            logger.error('TryOn: Выбранный файл не является изображением');
            showError('Пожалуйста, выберите изображение');
            return;
        }

        // Показываем индикатор загрузки
        const loadingIndicator = document.getElementById('try-on-loading');
        const loadingText = document.getElementById('try-on-loading-text');
        
        if (loadingIndicator && loadingText) {
            loadingIndicator.style.display = 'flex';
            loadingText.textContent = 'Проверка фото...';
        } else {
            logger.warn('TryOn: Элементы индикатора загрузки не найдены');
        }

        try {
            if (type === 'person') {
                // Проверяем фото в полный рост
                const isValid = await aiService.validatePersonImage(file);
                if (!isValid) {
                    showError('Пожалуйста, загрузите фотографию в полный рост на нейтральном фоне. Фото должно быть вертикальным и содержать фигуру человека целиком.');
                    event.target.value = ''; // Сбрасываем выбор файла
                    return;
                }
            }

            // Создаем превью
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById(`${type}-preview`);
                if (preview) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    
                    // Обновляем текст кнопки
                    const button = document.getElementById(`${type}-upload-button`);
                    if (button) {
                        button.textContent = 'Изменить фото';
                    }
                    
                    logger.info(`TryOn: Фото ${type} успешно загружено и отображено`);
                } else {
                    logger.error(`TryOn: Элемент превью для ${type} не найден`);
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            logger.error('TryOn: Ошибка при обработке фото:', error);
            showError('Ошибка при обработке фото. Пожалуйста, попробуйте еще раз.');
            event.target.value = ''; // Сбрасываем выбор файла
        } finally {
            // Скрываем индикатор загрузки в любом случае
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        }
    }
    
    function resetPhoto(type) {
        logger.debug(`TryOn: Сброс фото типа ${type}`);
        let input, preview, container, uploadArea;
        
        if (type === 'yourPhoto') {
            input = yourPhotoInput; preview = yourPhotoPreview;
            container = yourPhotoContainer; uploadArea = yourPhotoUploadArea;
        } else { 
            input = outfitPhotoInput; preview = outfitPhotoPreview;
            container = outfitPhotoContainer; uploadArea = outfitPhotoUploadArea;
        }
        
        resetFileInputLocal(input);
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
        if (container) container.classList.add('hidden');
        if (uploadArea) uploadArea.classList.remove('hidden');
        
        uploadedImages[type] = null;
        updateTryOnButtonState();
        logger.debug(`TryOn: Фото типа ${type} сброшено.`);
    }
    
    function updateTryOnButtonState() {
        if (tryOnSubmitButton) {
            const isEnabled = !!(uploadedImages.yourPhoto && uploadedImages.outfitPhoto);
            tryOnSubmitButton.disabled = !isEnabled;
        }
    }
    
    async function handleTryOnSubmit() {
        logger.info('TryOn: Обработка запроса на примерку...');
        
        if (!uploadedImages.yourPhoto || !uploadedImages.outfitPhoto) {
            logger.warn('TryOn: Не все изображения загружены');
            if (uiHelpers) uiHelpers.showToast('Пожалуйста, загрузите оба изображения');
            return;
        }

        try {
            const styleType = tryOnStyleSelector ? tryOnStyleSelector.value : 'default';
            
            // Получаем экземпляр aiService
            const aiService = window.MishuraApp.services.aiService;
            if (!aiService) {
                throw new Error('AI сервис не инициализирован');
            }

            // Показываем индикатор загрузки
            if (uiHelpers) uiHelpers.showLoading('Обработка примерки...');
            
            // Вызываем метод processTryOn
            const result = await aiService.processTryOn(
                uploadedImages.yourPhoto,
                uploadedImages.outfitPhoto,
                styleType
            );
            
            if (result && result.success) {
                showTryOnResult(result.resultImage);
                if (result.advice) {
                    logger.info('TryOn: Получен совет:', result.advice);
                }
            } else {
                throw new Error('Неверный формат ответа от сервера');
            }
        } catch (error) {
            logger.error('TryOn: Ошибка при обработке примерки:', error);
            if (uiHelpers) {
                uiHelpers.hideLoading();
                uiHelpers.showToast(error.message || 'Произошла ошибка при обработке примерки');
            }
        }
    }
    
    function showTryOnResult(imageDataUrl) {
        logger.debug("TryOn: Отображение результата примерки.");
        if (tryOnResultImage) {
            tryOnResultImage.src = imageDataUrl;
            tryOnResultImage.style.display = 'block';
            tryOnResultImage.alt = 'Результат виртуальной примерки';
            logger.debug("TryOn: Изображение результата примерки установлено.");
        } else {
            logger.error("TryOn: Элемент tryOnResultImage не найден!");
        }
        if (modals && typeof modals.openTryOnResultModal === 'function') {
            modals.openTryOnResultModal();
        } else {
            logger.error("TryOn: modals.openTryOnResultModal не найден!");
        }
    }
    
    function handleDownload() { 
        logger.info("TryOn: Запрос на скачивание результата (пока заглушка).");
        if (!currentTryOnResultDataUrl) {
            if(uiHelpers) uiHelpers.showToast("Нет результата для скачивания."); return;
        }
        if(uiHelpers) uiHelpers.showToast("Функция скачивания в разработке.");
    }

    function resetFittingForm() {
        logger.info('TryOn: Сброс формы примерки (resetFittingForm)');
        resetPhoto('yourPhoto');
        resetPhoto('outfitPhoto');
        
        if (tryOnStyleSelector) tryOnStyleSelector.selectedIndex = 0;
        if (tryOnSubmitButton) tryOnSubmitButton.disabled = true; 
        
        if (tryOnResultImage) {
            if (currentTryOnResultDataUrl && currentTryOnResultDataUrl.startsWith('blob:')) {
                URL.revokeObjectURL(currentTryOnResultDataUrl); // Освобождаем blob URL
                logger.debug("TryOn: Отозван blob URL для предыдущего результата примерки.");
            }
            tryOnResultImage.src = '';
            tryOnResultImage.alt = 'Результат виртуальной примерки (в разработке)';
            tryOnResultImage.style.display = 'none';
        }
        currentTryOnResultDataUrl = null;
        logger.debug('TryOn: Форма примерки полностью сброшена.');
    }
    
    return { 
        init, 
        resetFittingForm,
        handleTryOnSubmit,
        handlePhotoUpload,
        resetPhoto
    };
})();