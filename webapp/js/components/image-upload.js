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

        let missingCritical = false;
        if (!singleUploadArea || !singleFileInput || !imageSlotsContainer) {
            logger.error("ImageUpload: Критические DOM элементы не найдены");
            missingCritical = true;
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
            resetFileInput(singleFileInput);
            singleFileInput.click();
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
        
        // Удаляем старые обработчики
        const newSlot = slot.cloneNode(true);
        slot.parentNode.replaceChild(newSlot, slot);
        
        const newInput = newSlot.querySelector('.compare-upload-input');
        
        // Обработчик клика на слот
        newSlot.addEventListener('click', function(e) {
            // Проверяем, что клик не по кнопке удаления
            if (e.target.classList.contains('delete-image') || e.target.closest('.delete-image')) {
                return;
            }
            
            if (!newSlot.classList.contains('filled')) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug(`ImageUpload (Compare): Клик по слоту ${slotIndex}`);
                resetFileInput(newInput);
                newInput.click();
            }
        });
        
        // Обработчик изменения файла
        newInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                logger.debug(`ImageUpload (Compare): Файл выбран для слота ${slotIndex}: ${file.name}`);
                handleCompareImageSelection(file, slotIndex);
            }
        });

        // Drag & Drop
        newSlot.addEventListener('dragover', function(e) {
            e.preventDefault();
            if (!newSlot.classList.contains('filled')) {
                newSlot.classList.add('dragover');
            }
        });
        
        newSlot.addEventListener('dragleave', function() {
            newSlot.classList.remove('dragover');
        });
        
        newSlot.addEventListener('drop', function(e) {
            e.preventDefault();
            newSlot.classList.remove('dragover');
            if (!newSlot.classList.contains('filled') && e.dataTransfer.files.length) {
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
        reader.onload = function(e) {
            const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
            if (!slot) {
                logger.error(`ImageUpload (Compare): Слот ${slotIndex} не найден`);
                isUploadingActive = false;
                return;
            }

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
            isUploadingActive = false;
        };
        reader.onerror = function(error) {
            logger.error("ImageUpload (Compare): Ошибка FileReader:", error);
            if (uiHelpers) uiHelpers.showToast('Ошибка при чтении файла');
            isUploadingActive = false;
        };
        reader.readAsDataURL(file);
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