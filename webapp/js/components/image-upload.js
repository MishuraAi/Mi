/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 0.6.0 (ИСПРАВЛЕНЫ ВСЕ ПРОБЛЕМЫ ЗАГРУЗКИ)
ДАТА ОБНОВЛЕНИЯ: 2025-05-26

ИСПРАВЛЕНИЯ:
- Улучшена инициализация DOM элементов
- Исправлена обработка событий загрузки
- Добавлена надежная проверка элементов
- Исправлены проблемы с режимами single/compare
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.components = window.MishuraApp.components || {};
window.MishuraApp.components.imageUpload = (function() {
    'use strict';
    
    let config, logger, uiHelpers;
    
    // DOM элементы для single режима
    let singleUploadArea, singleFileInput, singlePreviewContainer, singlePreviewImage, singleDeleteButton;
    
    // DOM элементы для compare режима  
    let imageSlotsContainer, compareSlots = [];
    
    // Состояние
    let isUploadingActive = false;
    let uploadedImages = { single: null, compare: [null, null, null, null] };
    let isImageUploadInitialized = false;
    let currentMode = 'single';
    
    function init() {
        if (isImageUploadInitialized) {
            console.log('ImageUpload: Уже инициализирован, пропускаем');
            return;
        }

        logger = window.MishuraApp.utils.logger || createFallbackLogger();
        uiHelpers = window.MishuraApp.utils.uiHelpers;

        logger.debug("Инициализация модуля загрузки изображений (v0.6.0 - ИСПРАВЛЕНО)");
        
        // Пробуем инициализировать DOM элементы с задержками
        setTimeout(() => {
            if (initDOMElements()) {
                initEventHandlers();
                isImageUploadInitialized = true;
                logger.info("Модуль загрузки изображений успешно инициализирован");
            } else {
                // Пробуем еще раз через секунду
                setTimeout(() => {
                    if (initDOMElements()) {
                        initEventHandlers();
                        isImageUploadInitialized = true;
                        logger.info("Модуль загрузки изображений инициализирован (повторная попытка)");
                    }
                }, 1000);
            }
        }, 100);
    }
    
    function createFallbackLogger() {
        return {
            debug: (...args) => console.debug("ImageUpload:", ...args),
            info: (...args) => console.info("ImageUpload:", ...args),
            warn: (...args) => console.warn("ImageUpload:", ...args),
            error: (...args) => console.error("ImageUpload:", ...args)
        };
    }
    
    function initDOMElements() {
        logger.debug("Поиск DOM элементов...");
        
        // Элементы для single режима
        singleUploadArea = document.querySelector('#single-upload-area');
        singleFileInput = document.querySelector('#single-upload-input');
        singlePreviewContainer = document.querySelector('#single-preview-container');
        singlePreviewImage = document.querySelector('#single-preview-image');
        singleDeleteButton = document.querySelector('#single-analysis-mode .delete-image[data-target="single"]');
        
        // Элементы для compare режима
        imageSlotsContainer = document.querySelector('#compare-analysis-mode .image-slots');
        
        logger.debug("Найденные элементы:", {
            singleUploadArea: !!singleUploadArea,
            singleFileInput: !!singleFileInput,
            singlePreviewContainer: !!singlePreviewContainer,
            singlePreviewImage: !!singlePreviewImage,
            singleDeleteButton: !!singleDeleteButton,
            imageSlotsContainer: !!imageSlotsContainer
        });

        // Проверяем критически важные элементы
        const hasSingleElements = singleUploadArea && singleFileInput;
        const hasCompareElements = imageSlotsContainer;
        
        if (!hasSingleElements) {
            logger.error("Критические элементы single режима не найдены");
            return false;
        }
        
        if (!hasCompareElements) {
            logger.error("Контейнер compare режима не найден"); 
            return false;
        }

        // Инициализируем compare слоты
        if (imageSlotsContainer) {
            compareSlots = imageSlotsContainer.querySelectorAll('.image-slot');
            logger.debug(`Найдено ${compareSlots.length} слотов для сравнения`);
        }

        return true;
    }
    
    function initEventHandlers() {
        logger.debug("Инициализация обработчиков событий");
        
        // Обработчики режимов
        document.addEventListener('modeChanged', handleModeChange);
        
        // Single режим
        initSingleMode();
        
        // Compare режим  
        initCompareMode();
        
        // Обработчики событий загрузки
        document.addEventListener('singleImageUploaded', (e) => {
            logger.debug('Событие: одиночное изображение загружено');
        });
        
        document.addEventListener('compareImageUploaded', (e) => {
            logger.debug(`Событие: изображение сравнения загружено в слот ${e.detail.slot}`);
        });
    }
    
    function handleModeChange(e) {
        const mode = e.detail.mode;
        currentMode = mode;
        logger.debug(`Смена режима на: ${mode}`);
        
        if (mode === 'single') {
            resetCompareMode();
        } else if (mode === 'compare') {
            resetSingleMode();
            // Переинициализируем compare режим
            setTimeout(() => {
                initCompareMode();
            }, 100);
        }
    }
    
    function initSingleMode() {
        if (!singleUploadArea || !singleFileInput) {
            logger.warn("Single режим: элементы не найдены");
            return;
        }

        logger.debug("Инициализация single режима");
        
        // Удаляем старые обработчики
        singleUploadArea.onclick = null;
        singleFileInput.onchange = null;
        
        // Клик по области загрузки
        singleUploadArea.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            logger.debug("Клик по области загрузки (single)");
            
            try {
                singleFileInput.value = '';
                singleFileInput.click();
            } catch (err) {
                logger.error('Ошибка открытия диалога выбора файла:', err);
                showToast('Ошибка открытия диалога выбора файла');
            }
        });
        
        // Изменение файла
        singleFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                logger.debug(`Single файл выбран: ${file.name}`);
                handleSingleImageUpload(file);
            }
        });
        
        // Drag & Drop
        singleUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            singleUploadArea.classList.add('dragover');
        });
        
        singleUploadArea.addEventListener('dragleave', () => {
            singleUploadArea.classList.remove('dragover');
        });
        
        singleUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            singleUploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                logger.debug(`Single файл перетащен: ${files[0].name}`);
                handleSingleImageUpload(files[0]);
            }
        });

        // Кнопка удаления
        if (singleDeleteButton) {
            singleDeleteButton.onclick = null;
            singleDeleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                logger.debug("Удаление single изображения");
                resetSingleMode();
            });
        }
    }
    
    function initCompareMode() {
        if (!imageSlotsContainer) {
            logger.warn("Compare режим: контейнер не найден");
            return;
        }
        
        compareSlots = imageSlotsContainer.querySelectorAll('.image-slot');
        logger.debug(`Инициализация compare режима: ${compareSlots.length} слотов`);

        compareSlots.forEach((slot, index) => {
            initCompareSlot(slot, index);
        });
    }
    
    function initCompareSlot(slot, slotIndex) {
        const input = slot.querySelector('.compare-upload-input, input[type="file"]');
        
        if (!input) {
            logger.warn(`Compare слот ${slotIndex}: input не найден`);
            return;
        }

        logger.debug(`Инициализация compare слота ${slotIndex}`);
        
        // Удаляем старые обработчики
        slot.onclick = null;
        input.onchange = null;
        
        // Клик по слоту
        slot.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-image') || e.target.closest('.delete-image')) {
                return;
            }
            
            if (!slot.classList.contains('filled')) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug(`Клик по compare слоту ${slotIndex}`);
                
                try {
                    input.value = '';
                    input.click();
                } catch (err) {
                    logger.error('Ошибка открытия диалога:', err);
                }
            }
        });
        
        // Изменение файла
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                logger.debug(`Compare файл выбран для слота ${slotIndex}: ${file.name}`);
                handleCompareImageUpload(file, slotIndex);
            }
        });

        // Drag & Drop
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!slot.classList.contains('filled')) {
                slot.classList.add('dragover');
            }
        });
        
        slot.addEventListener('dragleave', () => {
            slot.classList.remove('dragover');
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('dragover');
            
            if (!slot.classList.contains('filled') && e.dataTransfer.files.length > 0) {
                logger.debug(`Compare файл перетащен в слот ${slotIndex}`);
                handleCompareImageUpload(e.dataTransfer.files[0], slotIndex);
            }
        });
    }
    
    function handleSingleImageUpload(file) {
        if (!isValidImageFile(file)) return;

        logger.debug(`Обработка single изображения: ${file.name}`);
        isUploadingActive = true;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (singlePreviewImage && singlePreviewContainer && singleUploadArea) {
                    singlePreviewImage.src = e.target.result;
                    singlePreviewImage.style.display = 'block';
                    singlePreviewContainer.style.display = 'block';
                    singlePreviewContainer.classList.remove('hidden');
                    singleUploadArea.classList.add('hidden');
                    
                    uploadedImages.single = file;
                    
                    showFormElements();
                    
                    // Отправляем событие
                    document.dispatchEvent(new CustomEvent('singleImageUploaded', { 
                        detail: { file: file } 
                    }));
                    
                    logger.info(`Single изображение успешно загружено: ${file.name}`);
                    showToast('Изображение загружено успешно');
                }
            } catch (err) {
                logger.error('Ошибка при отображении изображения:', err);
                showToast('Ошибка при обработке изображения');
            } finally {
                isUploadingActive = false;
            }
        };
        
        reader.onerror = () => {
            logger.error('Ошибка чтения файла');
            showToast('Ошибка при чтении файла');
            isUploadingActive = false;
        };
        
        reader.readAsDataURL(file);
    }
    
    function handleCompareImageUpload(file, slotIndex) {
        if (!isValidImageFile(file)) return;

        logger.debug(`Обработка compare изображения для слота ${slotIndex}: ${file.name}`);
        isUploadingActive = true;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
                if (!slot) {
                    logger.error(`Слот ${slotIndex} не найден`);
                    return;
                }

                const previewImg = slot.querySelector('.preview-image');
                const uploadIcon = slot.querySelector('.upload-icon');
                
                if (previewImg) {
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                }
                
                if (uploadIcon) {
                    uploadIcon.style.display = 'none';
                }

                // Создаем кнопку удаления
                let deleteBtn = slot.querySelector('.delete-image');
                if (!deleteBtn) {
                    deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-image';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.style.cssText = `
                        position: absolute;
                        top: 5px;
                        right: 5px;
                        z-index: 20;
                        background: rgba(0, 0, 0, 0.7);
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                    `;
                    slot.appendChild(deleteBtn);
                    
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        logger.debug(`Удаление изображения из слота ${slotIndex}`);
                        resetCompareSlot(slotIndex);
                    });
                }

                slot.classList.add('filled');
                uploadedImages.compare[slotIndex] = file;
                
                const filledCount = uploadedImages.compare.filter(img => img !== null).length;
                logger.debug(`Compare: заполнено ${filledCount} слотов`);
                
                if (filledCount >= 2) {
                    showFormElements();
                }
                
                // Отправляем событие
                document.dispatchEvent(new CustomEvent('compareImageUploaded', { 
                    detail: { file: file, slot: slotIndex } 
                }));
                
                logger.info(`Compare изображение загружено в слот ${slotIndex}: ${file.name}`);
                showToast(`Изображение ${filledCount} загружено`);
                
            } catch (err) {
                logger.error('Ошибка при обработке compare изображения:', err);
                showToast('Ошибка при обработке изображения');
            } finally {
                isUploadingActive = false;
            }
        };
        
        reader.onerror = () => {
            logger.error('Ошибка чтения compare файла');
            showToast('Ошибка при чтении файла');
            isUploadingActive = false;
        };
        
        reader.readAsDataURL(file);
    }
    
    function isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (!file || !file.type) {
            showToast('Файл не определен');
            return false;
        }
        
        if (!validTypes.includes(file.type.toLowerCase())) {
            showToast('Поддерживаются только JPG, PNG, WEBP форматы');
            return false;
        }
        
        if (file.size > maxSize) {
            const sizeMB = (file.size / (1024*1024)).toFixed(1);
            showToast(`Файл слишком большой (${sizeMB}МБ). Максимум 10МБ`);
            return false;
        }
        
        return true;
    }
    
    function showFormElements() {
        const occasionSelector = document.querySelector('#consultation-overlay .occasion-selector');
        const preferencesInput = document.querySelector('#consultation-overlay .preferences-input');
        const submitButton = document.querySelector('#consultation-overlay #submit-consultation');
        const labels = document.querySelectorAll('#consultation-overlay .input-label');
        
        if (occasionSelector) {
            occasionSelector.classList.remove('hidden');
            occasionSelector.style.display = 'block';
        }
        if (preferencesInput) {
            preferencesInput.classList.remove('hidden');
            preferencesInput.style.display = 'block';
        }
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.classList.remove('disabled');
        }
        labels.forEach(label => {
            label.classList.remove('hidden');
            label.style.display = 'block';
        });
        
        logger.debug("Элементы формы показаны");
    }
    
    function hideFormElements() {
        const occasionSelector = document.querySelector('#consultation-overlay .occasion-selector');
        const preferencesInput = document.querySelector('#consultation-overlay .preferences-input');
        const submitButton = document.querySelector('#consultation-overlay #submit-consultation');
        const labels = document.querySelectorAll('#consultation-overlay .input-label');
        
        if (occasionSelector) {
            occasionSelector.classList.add('hidden');
        }
        if (preferencesInput) {
            preferencesInput.classList.add('hidden');
        }
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.add('disabled');
        }
        labels.forEach(label => {
            label.classList.add('hidden');
        });
    }
    
    function resetSingleMode() {
        logger.debug('Сброс single режима');
        
        if (singleFileInput) singleFileInput.value = '';
        
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
    }
    
    function resetCompareSlot(slotIndex) {
        logger.debug(`Сброс compare слота ${slotIndex}`);
        
        const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return;
        
        const img = slot.querySelector('.preview-image');
        const deleteBtn = slot.querySelector('.delete-image');
        const uploadIcon = slot.querySelector('.upload-icon');
        const input = slot.querySelector('input[type="file"]');
        
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
        if (deleteBtn) deleteBtn.remove();
        if (uploadIcon) uploadIcon.style.display = 'flex';
        if (input) input.value = '';
        
        slot.classList.remove('filled');
        uploadedImages.compare[slotIndex] = null;
        
        const filledCount = uploadedImages.compare.filter(img => img !== null).length;
        if (filledCount < 2) {
            hideFormElements();
        }
        
        document.dispatchEvent(new CustomEvent('compareImageRemoved', { 
            detail: { slot: slotIndex } 
        }));
    }
    
    function resetCompareMode() {
        logger.debug('Сброс compare режима');
        
        for (let i = 0; i < 4; i++) {
            resetCompareSlot(i);
        }
        
        hideFormElements();
        document.dispatchEvent(new CustomEvent('allCompareImagesRemoved'));
    }
    
    function showToast(message) {
        if (uiHelpers && typeof uiHelpers.showToast === 'function') {
            uiHelpers.showToast(message);
        } else {
            console.log('Toast:', message);
        }
    }
    
    // Публичный API
    return { 
        init, 
        resetSingleImageUpload: resetSingleMode,
        resetCompareImageUploads: resetCompareMode, 
        resetSlot: resetCompareSlot,
        isUploading: () => isUploadingActive, 
        getUploadedImages: () => uploadedImages,
        isInitialized: () => isImageUploadInitialized
    };
})();