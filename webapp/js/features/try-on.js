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
            logger.warn(`TryOn: Элементы для загрузки типа '${type}' не найдены (uploadArea или fileInput).`);
            return;
        }
        uploadArea.addEventListener('click', () => {
            logger.debug(`TryOn: Клик на область загрузки '${type}'. Сброс инпута.`);
            resetFileInputLocal(fileInput); // Используем локальный сброс
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            logger.debug(`TryOn: Файл выбран для типа '${type}'.`);
            handlePhotoUpload(e, type);
        });

        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                logger.debug(`TryOn: Файл перетащен для типа '${type}'.`);
                handlePhotoUpload({ target: { files: [e.dataTransfer.files[0]] } }, type);
            }
        });
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
    
    async function handlePhotoUpload(e, type) {
        if (!e.target.files || !e.target.files[0]) {
            logger.warn(`TryOn: Нет файлов для загрузки (тип: ${type})`);
            return;
        }
        
        const file = e.target.files[0];
        logger.debug(`TryOn: Обработка загрузки фото типа ${type}: ${file.name}`);

        try {
            const isValid = await isValidImageFileLocal(file);
            if (!isValid) {
                resetFileInputLocal(e.target);
                return;
            }
            
            uploadedImages[type] = file;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                let previewEl, containerEl, uploadAreaEl;
                if (type === 'yourPhoto') {
                    previewEl = yourPhotoPreview; 
                    containerEl = yourPhotoContainer; 
                    uploadAreaEl = yourPhotoUploadArea;
                } else {
                    previewEl = outfitPhotoPreview; 
                    containerEl = outfitPhotoContainer; 
                    uploadAreaEl = outfitPhotoUploadArea;
                }
                
                if (previewEl && containerEl && uploadAreaEl) {
                    previewEl.src = event.target.result;
                    previewEl.style.display = 'block'; 
                    containerEl.classList.remove('hidden');
                    uploadAreaEl.classList.add('hidden');
                    logger.debug(`TryOn: Превью для ${type} установлено.`);
                } else {
                    logger.error(`TryOn: DOM элементы для превью (тип: ${type}) не найдены!`);
                }
                updateTryOnButtonState();
            };
            
            reader.onerror = (error) => {
                logger.error(`TryOn: Ошибка FileReader (тип: ${type}):`, error);
                if (uiHelpers) uiHelpers.showToast('Ошибка при чтении файла.');
                resetFileInputLocal(e.target);
            };
            
            reader.readAsDataURL(file);
        } catch (error) {
            logger.error(`TryOn: Ошибка при обработке фото (тип: ${type}):`, error);
            if (uiHelpers) uiHelpers.showToast('Произошла ошибка при обработке фото');
            resetFileInputLocal(e.target);
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
    
    function handleTryOnSubmit() {
        logger.info("TryOn: Обработка запроса на примерку...");
        
        if (!uploadedImages.yourPhoto || !uploadedImages.outfitPhoto) {
            if (uiHelpers) uiHelpers.showToast('Загрузите оба изображения для примерки.');
            logger.warn("TryOn: Запрос отклонен: не все изображения загружены.");
            return;
        }
        
        const styleType = tryOnStyleSelector ? tryOnStyleSelector.value : "default";
        logger.debug(`TryOn: Выбранный стиль примерки: ${styleType}`);
        
        if (uiHelpers) uiHelpers.showLoading('Мишура создает ваш новый образ...');
        
        const aiService = window.MishuraApp.services.aiService;
        if (!aiService || typeof aiService.processTryOn !== 'function') {
            logger.error('TryOn: КРИТИЧЕСКАЯ ОШИБКА - aiService или processTryOn недоступен!');
            if (uiHelpers) { 
                uiHelpers.hideLoading(); 
                uiHelpers.showToast('Ошибка: Сервис ИИ недоступен (T01/T02).');
            }
            return;
        }

        aiService.processTryOn(uploadedImages.yourPhoto, uploadedImages.outfitPhoto, styleType)
            .then(result => {
                logger.info("TryOn: Результат примерки получен:", result);
                
                if (result.success && result.resultImage) {
                    currentTryOnResultDataUrl = result.resultImage;
                    showTryOnResult(currentTryOnResultDataUrl);
                    
                    if (result.advice) {
                        if (uiHelpers) uiHelpers.showToast(result.advice);
                    }
                } else {
                    throw new Error('Неверный формат результата примерки');
                }
            })
            .catch(error => {
                const errorMsg = error && error.message ? error.message : "Ошибка при обработке примерки.";
                logger.error("TryOn: Ошибка при примерке:", errorMsg, error);
                if (uiHelpers) uiHelpers.showToast(`Ошибка: ${errorMsg}`);
                if (tryOnResultImage) {
                    tryOnResultImage.src = '';
                    tryOnResultImage.alt = errorMsg;
                    tryOnResultImage.style.display = 'block';
                }
                if (modals) modals.openTryOnResultModal();
            })
            .finally(() => {
                if (uiHelpers) uiHelpers.hideLoading();
            });
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
    
    return { init, resetFittingForm };
})();