/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Виртуальная примерка (try-on.js)
ВЕРСИЯ: 0.5.2 (Улучшена инициализация API, загрузка фото, обработка событий)
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
    
    let tryOnButtonMain, tryOnOverlay; // tryOnCancelButton обрабатывается в modals.js
    let yourPhotoInput, outfitPhotoInput;
    let yourPhotoPreview, outfitPhotoPreview;
    let yourPhotoContainer, outfitPhotoContainer;
    let yourPhotoUploadArea, outfitPhotoUploadArea;
    let deleteYourPhotoButton, deleteOutfitPhotoButton;
    let tryOnSubmitButton, tryOnStyleSelector;
    
    let tryOnResultImage; // tryOnResultCloseButton и tryOnResultOverlay управляются modals.js
    
    let tryOnDownloadButton; // tryOnShareButton не используется пока
    
    let uploadedImages = { yourPhoto: null, outfitPhoto: null };
    let currentTryOnResultDataUrl = null;
    
    function init() {
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("TryOnLogger:",...args), info: (...args)=>console.info("TryOnLogger:",...args), warn: (...args)=>console.warn("TryOnLogger:",...args), error: (...args)=>console.error("TryOnLogger:",...args) };
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        modals = window.MishuraApp.components.modals;
        
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            apiService = window.MishuraApp.api.service;
            if (typeof apiService.isInitialized === 'function') {
                if (!apiService.isInitialized()) {
                    logger.warn("Модуль tryOn: API сервис (api.service) найден, но isInitialized() false. Попытка инициализации...");
                    if(typeof apiService.init === 'function') apiService.init();
                } else {
                     logger.debug("Модуль tryOn: API сервис (api.service) уже инициализирован.");
                }
            } else {
                 logger.warn("Модуль tryOn: API сервис (api.service) найден, но нет isInitialized().");
            }
        } else {
            logger.error("Модуль tryOn: API сервис (window.MishuraApp.api.service) НЕ НАЙДЕН!");
            if (uiHelpers) uiHelpers.showToast("Критическая ошибка: Сервис API не загружен (T00).", 5000);
        }

        logger.debug("Инициализация модуля виртуальной примерки (v0.5.2)");
        initDOMElements();
        initEventListeners();
        logger.info('Модуль Виртуальная примерка инициализирован (v0.5.2)');
    }
    
    function initDOMElements() {
        logger.debug("TryOn: Инициализация DOM элементов...");
        tryOnButtonMain = document.getElementById('try-on-button'); 
        tryOnOverlay = document.getElementById('try-on-overlay');
        // tryOnCancelButton = document.getElementById('try-on-cancel'); // Обрабатывается в modals.js
        
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
        // tryOnResultCloseButton = document.getElementById('try-on-result-close'); // Обрабатывается в modals.js

        tryOnDownloadButton = document.getElementById('try-on-result-download'); 

        const elementsToVerify = {tryOnButtonMain, tryOnOverlay, yourPhotoInput, outfitPhotoInput, tryOnSubmitButton, tryOnResultImage, deleteYourPhotoButton, deleteOutfitPhotoButton, yourPhotoUploadArea, outfitPhotoUploadArea, yourPhotoPreview, outfitPhotoPreview, yourPhotoContainer, outfitPhotoContainer};
        for(const key in elementsToVerify) {
            if(!elementsToVerify[key]) logger.warn(`TryOn DOM Element not found: ${key}`);
        }
    }

    function resetFileInput(inputElement) {
        if (inputElement) {
            try { inputElement.value = null; logger.debug(`Инпут ${inputElement.id} сброшен.`); } 
            catch (e) { logger.warn(`Не удалось сбросить ${inputElement.id}.value`, e); }
        }
    }
    
    function initEventListeners() {
        logger.debug("TryOn: Инициализация обработчиков событий...");

        if (tryOnButtonMain && modals && typeof modals.openTryOnModal === 'function') {
            tryOnButtonMain.addEventListener('click', function() {
                logger.debug("Кнопка 'Примерить' (главное меню) нажата. Вызов modals.openTryOnModal().");
                resetFittingForm(); // Сброс формы ПЕРЕД открытием модального окна
                modals.openTryOnModal();
            });
        } else {
            if(!tryOnButtonMain) logger.warn("Кнопка 'Примерить' (tryOnButtonMain) не найдена.");
            if(!modals || typeof modals.openTryOnModal !== 'function') logger.warn("modals.openTryOnModal не доступен.");
        }

        setupUploadArea(yourPhotoUploadArea, yourPhotoInput, 'yourPhoto');
        setupUploadArea(outfitPhotoUploadArea, outfitPhotoInput, 'outfitPhoto');

        if (deleteYourPhotoButton) {
            deleteYourPhotoButton.addEventListener('click', () => resetPhoto('yourPhoto'));
        } else logger.warn("Кнопка deleteYourPhotoButton не найдена.");

        if (deleteOutfitPhotoButton) {
            deleteOutfitPhotoButton.addEventListener('click', () => resetPhoto('outfitPhoto'));
        } else logger.warn("Кнопка deleteOutfitPhotoButton не найдена.");
        
        if (tryOnSubmitButton) {
            tryOnSubmitButton.addEventListener('click', handleTryOnSubmit);
        } else {
            logger.warn("Кнопка 'Примерить' (tryOnSubmitButton) в модальном окне не найдена.");
        }

        if (tryOnDownloadButton) {
            tryOnDownloadButton.addEventListener('click', handleDownload);
        } else logger.warn("Кнопка tryOnDownloadButton не найдена.");
        
        // Обработчик закрытия модального окна try-on-overlay для сброса формы
        document.addEventListener('modalClosed', function(e) {
            if (e.detail.modalId === 'try-on-overlay') {
                logger.debug("Событие modalClosed для 'try-on-overlay', сброс формы примерки.");
                resetFittingForm(); // Гарантируем сброс при закрытии
            }
        });
    }

    function setupUploadArea(uploadArea, fileInput, type) {
        if (!uploadArea || !fileInput) {
            logger.warn(`TryOn: Элементы для загрузки типа '${type}' не найдены.`);
            return;
        }
        uploadArea.addEventListener('click', () => {
            logger.debug(`TryOn: Клик на область загрузки '${type}'. Сброс инпута.`);
            resetFileInput(fileInput);
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
    
    function handlePhotoUpload(e, type) {
        if (!e.target.files || !e.target.files[0]) return logger.warn(`TryOn: Нет файлов для загрузки (тип: ${type})`);
        const file = e.target.files[0];
        logger.debug(`TryOn: Обработка загрузки фото типа ${type}: ${file.name}`);

        if (!isValidImageFile(file)) {
            logger.warn(`TryOn: Файл ${file.name} не является валидным изображением.`);
            if (uiHelpers) uiHelpers.showToast('Выберите изображение (JPG, PNG, WEBP).');
            resetFileInput(e.target); 
            return;
        }
        
        uploadedImages[type] = file;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            let previewEl, containerEl, uploadAreaEl;
            if (type === 'yourPhoto') {
                previewEl = yourPhotoPreview; containerEl = yourPhotoContainer; uploadAreaEl = yourPhotoUploadArea;
            } else {
                previewEl = outfitPhotoPreview; containerEl = outfitPhotoContainer; uploadAreaEl = outfitPhotoUploadArea;
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
        };
        reader.readAsDataURL(file);
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
        
        resetFileInput(input);
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
            // logger.debug(`TryOn: Кнопка "Примерить" (в модалке) ${isEnabled ? 'активирована' : 'деактивирована'}`);
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
        
        const formData = new FormData();
        formData.append('personImage', uploadedImages.yourPhoto);
        formData.append('outfitImage', uploadedImages.outfitPhoto);
        formData.append('styleType', styleType);
        
        if (!apiService) {
            logger.error('КРИТИЧЕСКАЯ ОШИБКА: apiService не определен в try-on.js!');
            if (uiHelpers) { uiHelpers.hideLoading(); uiHelpers.showToast('Ошибка: Сервис API недоступен (T01).');}
            emulateTryOnResponse(formData); // Эмуляция для разработки
            return;
        }
        if (typeof apiService.processTryOn !== 'function') {
            logger.error('КРИТИЧЕСКАЯ ОШИБКА: apiService.processTryOn не является функцией!');
            if (uiHelpers) { uiHelpers.hideLoading(); uiHelpers.showToast('Ошибка: Метод API недоступен (T02).');}
            emulateTryOnResponse(formData); // Эмуляция для разработки
            return;
        }

        apiService.processTryOn(formData)
            .then(response => {
                logger.info("TryOn: Ответ от API примерки:", response);
                // API сервис теперь может вернуть { resultImage: "url_or_base64", status: "success_text_response" } если ответ не JSON
                if (response && (response.status === 'success' || response.status === "success_text_response" ) && response.resultImage) {
                    currentTryOnResultDataUrl = response.resultImage;
                    showTryOnResult(currentTryOnResultDataUrl);
                } else {
                    const errorMsg = response && response.message ? response.message : "Не удалось выполнить примерку.";
                    logger.error("TryOn: Ошибка от API примерки:", errorMsg, response);
                    if (uiHelpers) uiHelpers.showToast(`Примерка: ${errorMsg}`);
                    if (tryOnResultImage) { tryOnResultImage.src=''; tryOnResultImage.alt = errorMsg; tryOnResultImage.style.display = 'block';}
                    if (modals) modals.openTryOnResultModal();
                }
            })
            .catch(error => {
                const errorMsg = error && error.message ? error.message : "Ошибка сети или сервера.";
                logger.error("TryOn: Сетевая ошибка или ошибка сервера:", errorMsg, error);
                if (uiHelpers) uiHelpers.showToast(`Ошибка: ${errorMsg}`);
                if (tryOnResultImage) { tryOnResultImage.src=''; tryOnResultImage.alt = errorMsg; tryOnResultImage.style.display = 'block';}
                if (modals) modals.openTryOnResultModal();
            })
            .finally(() => {
                if (uiHelpers) uiHelpers.hideLoading();
            });
    }

    async function emulateTryOnResponse(formData) {
        logger.warn("TryOn: Выполняется эмуляция ответа API для примерки.");
        if (uiHelpers) uiHelpers.showLoading('Эмуляция примерки...');
        
        try {
            const personFile = formData.get('personImage');
            const outfitFile = formData.get('outfitImage');
            if (personFile instanceof File && outfitFile instanceof File) {
                const compositeDataUrl = await createCompositeImage(personFile, outfitFile);
                currentTryOnResultDataUrl = compositeDataUrl;
                showTryOnResult(currentTryOnResultDataUrl);
            } else {
                throw new Error("Файлы для эмуляции (personImage или outfitImage) не найдены в FormData.");
            }
        } catch (error) {
            logger.error("TryOn: Ошибка при эмуляции примерки:", error);
            if (uiHelpers) uiHelpers.showToast('Ошибка эмуляции примерки.');
            if (tryOnResultImage) {tryOnResultImage.src=''; tryOnResultImage.alt = 'Ошибка эмуляции'; tryOnResultImage.style.display = 'block';}
            if (modals) modals.openTryOnResultModal();
        } finally {
            if (uiHelpers) uiHelpers.hideLoading();
        }
    }
    
    function showTryOnResult(imageDataUrl) {
        logger.debug("TryOn: Отображение результата примерки.");
        if (tryOnResultImage) {
            tryOnResultImage.src = imageDataUrl;
            tryOnResultImage.style.display = 'block';
            tryOnResultImage.alt = 'Результат виртуальной примерки'; // Сбрасываем alt ошибки
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
            if(uiHelpers) uiHelpers.showToast("Нет результата для скачивания.");
            return;
        }
        if(uiHelpers) uiHelpers.showToast("Функция скачивания в разработке.");
    }

    function isValidImageFile(file) {
        // Эта функция дублируется, лучше вынести ее в uiHelpers или использовать из image-upload.js, если он доступен глобально.
        // Пока оставим локальную копию для независимости модуля.
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const defaultMaxSize = 5 * 1024 * 1024; // 5MB
        const maxSize = (config && config.LIMITS && config.LIMITS.MAX_FILE_SIZE) ? config.LIMITS.MAX_FILE_SIZE : defaultMaxSize;
        
        if (!file || !file.type) { logger.warn("TryOn.isValidImageFile: Файл или тип файла отсутствует."); return false; }
        if (!validTypes.includes(file.type)) {
            logger.warn(`TryOn.isValidImageFile: Недопустимый тип файла: ${file.type} для ${file.name}`);
            return false;
        }
        if (file.size > maxSize) {
            logger.warn(`TryOn.isValidImageFile: Файл ${file.name} слишком большой: ${(file.size / (1024*1024)).toFixed(1)}MB`);
            return false;
        }
        return true;
    }
    
    function resetFittingForm() {
        logger.info('TryOn: Сброс формы примерки (resetFittingForm)');
        resetPhoto('yourPhoto');
        resetPhoto('outfitPhoto');
        
        if (tryOnStyleSelector) tryOnStyleSelector.selectedIndex = 0;
        if (tryOnSubmitButton) tryOnSubmitButton.disabled = true; 
        
        if (tryOnResultImage) {
            tryOnResultImage.src = '';
            tryOnResultImage.alt = 'Результат виртуальной примерки (в разработке)';
            tryOnResultImage.style.display = 'none';
        }
        currentTryOnResultDataUrl = null;
        logger.debug('TryOn: Форма примерки полностью сброшена.');
    }

    function createCompositeImage(personImageFile, outfitImageFile) {
        return new Promise((resolve, reject) => {
            logger.debug("TryOn: Создание композитного изображения (локальная эмуляция)");
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const personImage = new Image();
            const outfitImage = new Image();
            let imagesLoaded = 0;

            function checkBothLoaded() {
                imagesLoaded++;
                if (imagesLoaded === 2) {
                    try {
                        const maxWidth = 600; const maxHeight = 800; // Ограничения для эмуляции
                        let pWidth = personImage.width; let pHeight = personImage.height;
                        if (pWidth > maxWidth) { pHeight = pHeight * (maxWidth/pWidth); pWidth = maxWidth;}
                        if (pHeight > maxHeight) { pWidth = pWidth * (maxHeight/pHeight); pHeight = maxHeight;}
                        canvas.width = pWidth; canvas.height = pHeight;
                        
                        ctx.drawImage(personImage, 0, 0, canvas.width, canvas.height);
                        
                        const scale = Math.min(canvas.width / outfitImage.width * 0.6, canvas.height / outfitImage.height * 0.6);
                        const outfitWidth = outfitImage.width * scale;
                        const outfitHeight = outfitImage.height * scale;
                        const outfitX = (canvas.width - outfitWidth) / 2;
                        const outfitY = canvas.height - outfitHeight - (canvas.height * 0.05); 
                        
                        ctx.globalAlpha = 0.9;
                        ctx.drawImage(outfitImage, outfitX, outfitY, outfitWidth, outfitHeight);
                        ctx.globalAlpha = 1.0;
                        
                        resolve(canvas.toDataURL('image/jpeg', 0.85)); 
                        logger.debug("TryOn: Композитное изображение (эмуляция) создано.");
                    } catch (error) {
                        logger.error("TryOn: Ошибка при создании композитного изображения (эмуляция):", error);
                        reject(error);
                    }
                }
            }
            
            const loadImage = (file, imgElement) => {
                const reader = new FileReader();
                reader.onload = (e) => { imgElement.src = e.target.result; };
                reader.onerror = () => reject(new Error(`Не удалось прочитать файл: ${file.name}`));
                imgElement.onload = checkBothLoaded;
                imgElement.onerror = () => reject(new Error(`Не удалось загрузить изображение из файла: ${file.name}`));
                if (file instanceof File) {
                    reader.readAsDataURL(file);
                } else {
                    reject(new Error(`Передан некорректный файл: ${typeof file}`));
                }
            };
            loadImage(personImageFile, personImage);
            loadImage(outfitImageFile, outfitImage);
        });
    }
        
    return { init, resetFittingForm };
})();