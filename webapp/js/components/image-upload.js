/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 0.5.0 (ИСПРАВЛЕНА ЗАГРУЗКА ФОТОГРАФИЙ)
ДАТА ОБНОВЛЕНИЯ: 2025-05-25

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает функциональность загрузки и отображения изображений для консультации.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.components = window.MishuraApp.components || {};
window.MishuraApp.components.imageUpload = (function() {
    'use strict';
    
    let config, logger, uiHelpers;
    
    let singleUploadArea, singleFileInput, singlePreviewContainer, singlePreviewImage, singleDeleteButton;
    let imageSlotsContainer;
    let modeButtons, singleAnalysisMode, compareAnalysisMode;
    
    let isUploadingActive = false;
    let uploadedImages = { single: null, compare: [null, null, null, null] };
    let isImageUploadInitialized = false;
    let currentMode = 'single';
    
    function init() {
        if (isImageUploadInitialized) {
            return;
        }

        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger || { 
            debug: (...args) => console.debug("ImageUpload:", ...args), 
            info: (...args) => console.info("ImageUpload:", ...args), 
            warn: (...args) => console.warn("ImageUpload:", ...args), 
            error: (...args) => console.error("ImageUpload:", ...args) 
        };
        uiHelpers = window.MishuraApp.utils.uiHelpers;

        logger.debug("Инициализация модуля загрузки изображений (v0.5.0 - ИСПРАВЛЕНА ЗАГРУЗКА)");
        
        if (!initDOMElements()) {
            logger.error("ImageUpload: Критическая ошибка при инициализации DOM элементов");
            return;
        }
        
        initModeButtons();
        initSingleImageUpload();
        initCompareImageUpload();
        
        isImageUploadInitialized = true;
        logger.info("Модуль загрузки изображений успешно инициализирован");
    }
    
    function initDOMElements() {
        logger.debug("ImageUpload: Инициализация DOM элементов...");
        
        // Инициализация элементов для одиночной загрузки
        singleUploadArea = document.querySelector('#single-analysis-mode #single-upload-area');
        singleFileInput = document.querySelector('#single-analysis-mode #single-upload-input');
        singlePreviewContainer = document.querySelector('#single-analysis-mode #single-preview-container');
        singlePreviewImage = document.querySelector('#single-analysis-mode #single-preview-image');
        singleDeleteButton = document.querySelector('#single-analysis-mode .delete-image[data-target="single"]');
        
        // Инициализация элементов для режима сравнения
        imageSlotsContainer = document.querySelector('#compare-analysis-mode .image-slots');
        
        // Инициализация элементов переключения режимов
        singleAnalysisMode = document.getElementById('single-analysis-mode');
        compareAnalysisMode = document.getElementById('compare-analysis-mode');

        const elementsToLog = {
            singleUploadArea: !!singleUploadArea, 
            singleFileInput: !!singleFileInput, 
            singlePreviewContainer: !!singlePreviewContainer, 
            singlePreviewImage: !!singlePreviewImage, 
            singleDeleteButton: !!singleDeleteButton, 
            imageSlotsContainer: !!imageSlotsContainer, 
            singleAnalysisMode: !!singleAnalysisMode, 
            compareAnalysisMode: !!compareAnalysisMode
        };

        logger.debug("ImageUpload DOM элементы:", elementsToLog);

        // Проверяем наличие критических элементов с более мягкой логикой
        let missingCritical = false;
        
        // Для режима single
        if (!singleUploadArea || !singleFileInput) {
            logger.error("ImageUpload: Критические элементы для одиночной загрузки не найдены");
            if (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.uiHelpers) {
                window.MishuraApp.utils.uiHelpers.showToast('Ошибка: элементы загрузки фото не найдены!', 5000);
            }
            missingCritical = true;
        }
        
        // Для режима compare
        if (!imageSlotsContainer) {
            logger.error("ImageUpload: Контейнер для сравнения не найден");
            if (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.uiHelpers) {
                window.MishuraApp.utils.uiHelpers.showToast('Ошибка: контейнер для сравнения не найден!', 5000);
            }
            missingCritical = true;
        }

        // Если что-то не найдено, пробуем переинициализировать через небольшую задержку
        if (missingCritical) {
            logger.warn("ImageUpload: Попытка повторной инициализации через 500мс");
            setTimeout(() => {
                if (!isImageUploadInitialized) {
                    initDOMElements();
                }
            }, 500);
        }

        return !missingCritical;
    }
    
    function initModeButtons() {
        logger.debug("ImageUpload: Инициализация переключения режимов");
        
        // Слушаем события изменения режима
        document.addEventListener('modeChanged', function(e) {
            const mode = e.detail.mode;
            logger.debug(`ImageUpload: Получено событие modeChanged: '${mode}'`);
            currentMode = mode;
            
            if (mode === 'single') {
                if (singleAnalysisMode) singleAnalysisMode.classList.remove('hidden');
                if (compareAnalysisMode) compareAnalysisMode.classList.add('hidden');
                resetCompareImageUploads();
                logger.debug('ImageUpload: Режим single активирован');
            } else if (mode === 'compare') {
                if (singleAnalysisMode) singleAnalysisMode.classList.add('hidden');
                if (compareAnalysisMode) compareAnalysisMode.classList.remove('hidden');
                resetSingleImageUpload();
                logger.debug('ImageUpload: Режим compare активирован');
                
                // Реинициализируем compare режим
                setTimeout(() => {
                    initCompareImageUpload();
                }, 100);
            }
        });
        
        // Устанавливаем режим single по умолчанию
        if (singleAnalysisMode && compareAnalysisMode) {
            singleAnalysisMode.classList.remove('hidden');
            compareAnalysisMode.classList.add('hidden');
            currentMode = 'single';
        }
    }

    function resetFileInput(inputElement) {
        if (inputElement) {
            try {
                inputElement.value = "";
                logger.debug(`ImageUpload: Инпут успешно сброшен`);
            } catch (ex) {
                logger.error(`ImageUpload: Ошибка при сбросе инпута:`, ex);
            }
        }
    }

    function isTelegramWebApp() {
        return typeof window.Telegram !== 'undefined' && window.Telegram.WebApp;
    }

    function initSingleImageUpload() {
        if (!singleUploadArea || !singleFileInput) {
            logger.warn("ImageUpload (Single): Пропуск инициализации - элементы не найдены");
            return;
        }

        logger.debug("ImageUpload (Single): Инициализация одиночной загрузки");
        
        // Обработчик клика на область загрузки
        singleUploadArea.addEventListener('click', function(e) {
            e.preventDefault();
            logger.debug("ImageUpload (Single): Клик на область загрузки");
            if (isTelegramWebApp()) {
                logger.debug("ImageUpload: Открытие Telegram AttachmentMenu");
                try {
                    window.Telegram.WebApp.showAttachmentMenu();
                    window.Telegram.WebApp.onEvent('attachment', function(data) {
                        if (data && data.files && data.files.length > 0) {
                            // В некоторых случаях Telegram возвращает base64, в других — blob URL
                            // Здесь нужно реализовать обработку base64 или blob
                            // Для примера: если data.files[0].url — это blob URL
                            fetch(data.files[0].url)
                                .then(res => res.blob())
                                .then(blob => {
                                    const file = new File([blob], 'photo.jpg', { type: blob.type });
                                    handleSingleImageSelection(file);
                                });
                        } else {
                            if (uiHelpers) uiHelpers.showToast('Файл не выбран');
                        }
                    });
                } catch (err) {
                    logger.error('Ошибка Telegram AttachmentMenu:', err);
                    if (uiHelpers) uiHelpers.showToast('Ошибка загрузки через Telegram');
                }
            } else {
                resetFileInput(singleFileInput);
                singleFileInput.click();
            }
        });
        
        // Обработчик изменения файла
        singleFileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                logger.debug(`ImageUpload (Single): Файл выбран: ${file.name}`);
                handleSingleImageSelection(file);
            }
        });
        
        // Drag & Drop
        singleUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            singleUploadArea.classList.add('dragover');
        });
        
        singleUploadArea.addEventListener('dragleave', function() {
            singleUploadArea.classList.remove('dragover');
        });
        
        singleUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            singleUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                logger.debug(`ImageUpload (Single): Файл перетащен: ${e.dataTransfer.files[0].name}`);
                handleSingleImageSelection(e.dataTransfer.files[0]);
            }
        });

        // Обработчик кнопки удаления
        if (singleDeleteButton) {
            singleDeleteButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug("ImageUpload (Single): Нажата кнопка удаления");
                resetSingleImageUpload();
            });
        } else {
            logger.warn("ImageUpload (Single): Кнопка удаления не найдена");
            if (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.uiHelpers) {
                window.MishuraApp.utils.uiHelpers.showToast('Ошибка: кнопка удаления не найдена!', 5000);
            }
        }
    }
    
    function handleSingleImageSelection(file) {
        logger.debug(`ImageUpload (Single): Обработка изображения: ${file.name}`);
        if (!isValidImageFile(file)) return;

        isUploadingActive = true;
        const reader = new FileReader();
        reader.onload = function(e) {
            if (singlePreviewImage && singlePreviewContainer && singleUploadArea) {
                singlePreviewImage.src = e.target.result;
                singlePreviewImage.style.display = 'block';
                singlePreviewContainer.style.display = 'block';
                singlePreviewContainer.classList.remove('hidden');
                singleUploadArea.classList.add('hidden');
                uploadedImages.single = file;
                
                showFormElements();
                
                logger.info(`ImageUpload (Single): Изображение ${file.name} загружено`);
                document.dispatchEvent(new CustomEvent('singleImageUploaded', { detail: { file: file } }));
                
                resetFileInput(singleFileInput);
            }
            isUploadingActive = false;
        };
        reader.onerror = function(error) {
            logger.error("ImageUpload (Single): Ошибка FileReader:", error);
            if (uiHelpers) uiHelpers.showToast('Ошибка при чтении файла');
            isUploadingActive = false;
        };
        reader.readAsDataURL(file);
    }
    
    function initCompareImageUpload() {
        // Обновляем ссылку на контейнер слотов
        imageSlotsContainer = document.querySelector('#compare-analysis-mode .image-slots');
        
        if (!imageSlotsContainer) {
            logger.warn("ImageUpload (Compare): Контейнер слотов не найден");
            return;
        }
        
        const slots = imageSlotsContainer.querySelectorAll('.image-slot');
        if (!slots.length) {
            logger.warn("ImageUpload (Compare): Слоты не найдены");
            return;
        }

        logger.debug(`ImageUpload (Compare): Инициализация ${slots.length} слотов`);

        slots.forEach((slot, index) => {
            initCompareSlot(slot, index);
        });
    }
    
    function initCompareSlot(slot, slotIndex) {
        const input = slot.querySelector('.compare-upload-input');
        
        if (!input) {
            logger.warn(`ImageUpload (Compare): Input не найден для слота ${slotIndex}`);
            return;
        }

        logger.debug(`ImageUpload (Compare): Инициализация слота ${slotIndex}`);
        
        // Вместо клонирования используем более безопасный подход
        const oldHandlers = {
            click: slot.onclick,
            change: input.onchange,
            dragover: slot.ondragover,
            dragleave: slot.ondragleave,
            drop: slot.ondrop
        };
        
        // Очищаем старые обработчики
        slot.onclick = null;
        input.onchange = null;
        slot.ondragover = null;
        slot.ondragleave = null;
        slot.ondrop = null;
        
        // Обработчик клика на слот
        slot.addEventListener('click', function(e) {
            // Проверяем, что клик не по кнопке удаления
            if (e.target.classList.contains('delete-image') || e.target.closest('.delete-image')) {
                return;
            }
            
            if (!slot.classList.contains('filled')) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug(`ImageUpload (Compare): Клик по слоту ${slotIndex}`);
                resetFileInput(input);
                input.click();
            }
        });
        
        // Обработчик изменения файла
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                logger.debug(`ImageUpload (Compare): Файл выбран для слота ${slotIndex}: ${file.name}`);
                handleCompareImageSelection(file, slotIndex);
            }
        });

        // Drag & Drop
        slot.addEventListener('dragover', function(e) {
            e.preventDefault();
            if (!slot.classList.contains('filled')) {
                slot.classList.add('dragover');
            }
        });
        
        slot.addEventListener('dragleave', function() {
            slot.classList.remove('dragover');
        });
        
        slot.addEventListener('drop', function(e) {
            e.preventDefault();
            slot.classList.remove('dragover');
            if (!slot.classList.contains('filled') && e.dataTransfer.files.length) {
                logger.debug(`ImageUpload (Compare): Файл перетащен для слота ${slotIndex}`);
                handleCompareImageSelection(e.dataTransfer.files[0], slotIndex);
            }
        });
    }
    
    function handleCompareImageSelection(file, slotIndex) {
        logger.debug(`ImageUpload (Compare): Обработка изображения для слота ${slotIndex}: ${file.name}`);
        if (!isValidImageFile(file)) return;

        isUploadingActive = true;
        const reader = new FileReader();
        
        // Добавляем таймаут для предотвращения зависания
        const timeoutId = setTimeout(() => {
            if (isUploadingActive) {
                logger.error("ImageUpload (Compare): Таймаут при чтении файла");
                isUploadingActive = false;
                if (uiHelpers) uiHelpers.showToast('Ошибка при чтении файла: превышено время ожидания');
            }
        }, 10000); // 10 секунд таймаут

        reader.onload = function(e) {
            clearTimeout(timeoutId); // Очищаем таймаут при успешной загрузке
            
            const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
            if (!slot) {
                logger.error(`ImageUpload (Compare): Слот ${slotIndex} не найден`);
                isUploadingActive = false;
                return;
            }

            try {
                const previewImg = slot.querySelector('.preview-image');
                const uploadIcon = slot.querySelector('.upload-icon');
                let deleteBtn = slot.querySelector('.delete-image');

                if (previewImg) {
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                }
                
                if (uploadIcon) {
                    uploadIcon.style.display = 'none';
                }

                // Создаем кнопку удаления
                if (!deleteBtn) {
                    deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-image';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.title = 'Удалить изображение';
                    deleteBtn.style.position = 'absolute';
                    deleteBtn.style.top = '5px';
                    deleteBtn.style.right = '5px';
                    deleteBtn.style.zIndex = '20';
                    deleteBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    deleteBtn.style.color = 'white';
                    deleteBtn.style.border = 'none';
                    deleteBtn.style.borderRadius = '50%';
                    deleteBtn.style.width = '20px';
                    deleteBtn.style.height = '20px';
                    deleteBtn.style.cursor = 'pointer';
                    slot.appendChild(deleteBtn);
                    
                    deleteBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        logger.debug(`ImageUpload (Compare): Удаление изображения из слота ${slotIndex}`);
                        resetSlot(slotIndex);
                    });
                }

                slot.classList.add('filled');
                uploadedImages.compare[slotIndex] = file;
                
                const filledSlotsCount = document.querySelectorAll('#compare-analysis-mode .image-slot.filled').length;
                logger.debug(`ImageUpload (Compare): Заполнено слотов: ${filledSlotsCount}`);
                
                if (filledSlotsCount >= 2) {
                    showFormElements();
                }
                
                logger.info(`ImageUpload (Compare): Изображение ${file.name} загружено в слот ${slotIndex}`);
                document.dispatchEvent(new CustomEvent('compareImageUploaded', { detail: { file: file, slot: slotIndex } }));
                
                resetFileInput(slot.querySelector('input[type="file"]'));
            } catch (error) {
                logger.error("ImageUpload (Compare): Ошибка при обработке изображения:", error);
                if (uiHelpers) uiHelpers.showToast('Ошибка при обработке изображения');
            } finally {
                isUploadingActive = false;
            }
        };
        
        reader.onerror = function(error) {
            clearTimeout(timeoutId); // Очищаем таймаут при ошибке
            logger.error("ImageUpload (Compare): Ошибка FileReader:", error);
            if (uiHelpers) uiHelpers.showToast('Ошибка при чтении файла');
            isUploadingActive = false;
        };
        
        try {
            reader.readAsDataURL(file);
        } catch (error) {
            clearTimeout(timeoutId);
            logger.error("ImageUpload (Compare): Ошибка при чтении файла:", error);
            if (uiHelpers) uiHelpers.showToast('Ошибка при чтении файла');
            isUploadingActive = false;
        }
    }
    
    function showFormElements() {
        const formContainer = document.getElementById('consultation-overlay');
        if (formContainer) {
            const occasionSel = formContainer.querySelector('.occasion-selector');
            const labels = formContainer.querySelectorAll('.input-label');
            const prefsInput = formContainer.querySelector('.preferences-input');
            const submitBtn = formContainer.querySelector('#submit-consultation');
            
            if (occasionSel) {
                occasionSel.classList.remove('hidden');
                occasionSel.disabled = false;
            }
            labels.forEach(l => l.classList.remove('hidden'));
            if (prefsInput) {
                prefsInput.classList.remove('hidden');
                prefsInput.disabled = false;
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('disabled');
                submitBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    logger.debug("ImageUpload: Нажата кнопка отправки формы");
                    // Здесь можно добавить логику отправки формы
                });
            } else {
                logger.warn("ImageUpload: Кнопка отправки формы не найдена");
                if (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.uiHelpers) {
                    window.MishuraApp.utils.uiHelpers.showToast('Ошибка: кнопка отправки формы не найдена!', 5000);
                }
            }
        }
    }
    
    function hideFormElements() {
        const formContainer = document.getElementById('consultation-overlay');
        if (formContainer) {
            const occasionSel = formContainer.querySelector('.occasion-selector');
            const labels = formContainer.querySelectorAll('.input-label');
            const prefsInput = formContainer.querySelector('.preferences-input');
            const submitBtn = formContainer.querySelector('#submit-consultation');
            
            if (occasionSel) {
                occasionSel.classList.add('hidden');
                occasionSel.disabled = true;
            }
            labels.forEach(l => l.classList.add('hidden'));
            if (prefsInput) {
                prefsInput.classList.add('hidden');
                prefsInput.disabled = true;
            }
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('disabled');
            }
        }
    }
    
    function isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!file || !file.type) {
            logger.warn("isValidImageFile: Файл или тип не определены");
            return false;
        }
        
        if (!validTypes.includes(file.type.toLowerCase())) {
            logger.warn(`isValidImageFile: Недопустимый тип файла: ${file.type}`);
            if (uiHelpers) uiHelpers.showToast(`Тип файла не поддерживается. Используйте: JPG, PNG, WEBP`);
            return false;
        }
        
        if (file.size > maxSize) {
            const fileSizeMB = (file.size / (1024*1024)).toFixed(1);
            logger.warn(`isValidImageFile: Файл слишком большой: ${fileSizeMB}MB`);
            if (uiHelpers) uiHelpers.showToast(`Файл слишком большой (${fileSizeMB}МБ). Максимум 5МБ`);
            return false;
        }
        
        return true;
    }
    
    function resetSingleImageUpload() {
        logger.debug('ImageUpload: Сброс одиночного изображения');
        
        resetFileInput(singleFileInput);
        
        if (singlePreviewContainer) {
            singlePreviewContainer.classList.add('hidden');
            singlePreviewContainer.style.display = 'none';
        }
        if (singlePreviewImage) {
            singlePreviewImage.src = '';
            singlePreviewImage.style.display = 'none';
        }
        if (singleUploadArea) {
            singleUploadArea.classList.remove('hidden');
            singleUploadArea.style.display = 'block';
        }
        
        uploadedImages.single = null;
        hideFormElements();
        
        document.dispatchEvent(new CustomEvent('singleImageRemoved'));
        logger.debug('ImageUpload: Одиночное изображение сброшено');
    }
    
    function resetSlot(slotIndex) {
        logger.debug(`ImageUpload: Сброс слота ${slotIndex}`);
        
        const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
        if (!slot) {
            logger.error(`ImageUpload: Слот ${slotIndex} не найден для сброса`);
            return;
        }
        
        const img = slot.querySelector('.preview-image');
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
        
        const deleteBtn = slot.querySelector('.delete-image');
        if (deleteBtn) deleteBtn.remove();
        
        const uploadIcon = slot.querySelector('.upload-icon');
        if (uploadIcon) uploadIcon.style.display = 'flex';
        
        slot.classList.remove('filled');
        
        const input = slot.querySelector('.compare-upload-input');
        resetFileInput(input);
        
        uploadedImages.compare[slotIndex] = null;
        
        const filledSlotsCount = document.querySelectorAll('#compare-analysis-mode .image-slot.filled').length;
        if (filledSlotsCount < 2) {
            hideFormElements();
        }
        
        document.dispatchEvent(new CustomEvent('compareImageRemoved', { detail: { slot: slotIndex } }));
        logger.debug(`ImageUpload: Слот ${slotIndex} сброшен`);
    }
    
    function resetCompareImageUploads() {
        logger.debug('ImageUpload: Сброс всех слотов сравнения');
        
        imageSlotsContainer = document.querySelector('#compare-analysis-mode .image-slots');
        if (imageSlotsContainer) {
            const slots = imageSlotsContainer.querySelectorAll('.image-slot');
            slots.forEach(slot => {
                const slotIndex = parseInt(slot.dataset.slot, 10);
                if (!isNaN(slotIndex)) {
                    resetSlot(slotIndex);
                }
            });
        }
        
        hideFormElements();
        document.dispatchEvent(new CustomEvent('allCompareImagesRemoved'));
        logger.debug('ImageUpload: Все слоты сравнения сброшены');
    }
    
    function isUploading() { 
        return isUploadingActive; 
    }
    
    function getUploadedImages() { 
        return uploadedImages; 
    }
    
    return { 
        init, 
        resetSingleImageUpload, 
        resetCompareImageUploads, 
        resetSlot,
        isUploading, 
        getUploadedImages,
        isInitialized: () => isImageUploadInitialized
    };
})();