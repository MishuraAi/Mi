/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 0.7.0 (ПОЛНОСТЬЮ ИСПРАВЛЕНА ЗАГРУЗКА)
ДАТА ОБНОВЛЕНИЯ: 2025-05-27
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

        logger.debug("Инициализация модуля загрузки изображений (v0.7.0)");
        
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
        
        // Обработчики модальных окон
        document.addEventListener('modalOpened', (e) => {
            if (e.detail.modalId === 'consultation-overlay') {
                logger.debug('Модальное окно открыто, переинициализация обработчиков');
                setTimeout(() => {
                    initDOMElements();
                    initSingleMode();
                    initCompareMode();
                }, 100);
            }
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
        const newSingleUploadArea = singleUploadArea.cloneNode(true);
        singleUploadArea.parentNode.replaceChild(newSingleUploadArea, singleUploadArea);
        singleUploadArea = newSingleUploadArea;
        
        // Находим input внутри клонированного элемента
        singleFileInput = singleUploadArea.querySelector('#single-upload-input') || document.querySelector('#single-upload-input');
        
        // Клик по области загрузки
        singleUploadArea.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            logger.debug("Клик по области загрузки (single)");
            
            if (singleFileInput) {
                singleFileInput.click();
            }
        });
        
        // Изменение файла
        if (singleFileInput) {
            singleFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                if (!isValidImageFile(file)) {
                    return;
                }
                
                logger.debug(`Single файл выбран: ${file.name}`);
                handleSingleImageUpload(file);
            });
        }
        
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
            if (files.length > 0 && isValidImageFile(files[0])) {
                logger.debug(`Single файл перетащен: ${files[0].name}`);
                handleSingleImageUpload(files[0]);
            }
        });

        // Кнопка удаления
        if (singleDeleteButton) {
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
        
        // Клонируем слот для удаления старых обработчиков
        const newSlot = slot.cloneNode(true);
        slot.parentNode.replaceChild(newSlot, slot);
        
        // Обновляем ссылку и находим элементы в новом слоте
        const newInput = newSlot.querySelector('.compare-upload-input, input[type="file"]');
        
        // Клик по слоту
        newSlot.addEventListener('click', (e) => {
            // Проверяем, что клик не по кнопке удаления
            if (e.target.classList.contains('delete-image') || e.target.closest('.delete-image')) {
                e.preventDefault();
                e.stopPropagation();
                resetCompareSlot(slotIndex);
                return;
            }
            
            if (!newSlot.classList.contains('filled')) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug(`Клик по compare слоту ${slotIndex}`);
                
                if (newInput) {
                    newInput.click();
                }
            }
        });
        
        // Изменение файла
        if (newInput) {
            newInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && isValidImageFile(file)) {
                    logger.debug(`Compare файл выбран для слота ${slotIndex}: ${file.name}`);
                    handleCompareImageUpload(file, slotIndex);
                }
            });
        }

        // Drag & Drop
        newSlot.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!newSlot.classList.contains('filled')) {
                newSlot.classList.add('dragover');
            }
        });
        
        newSlot.addEventListener('dragleave', () => {
            newSlot.classList.remove('dragover');
        });
        
        newSlot.addEventListener('drop', (e) => {
            e.preventDefault();
            newSlot.classList.remove('dragover');
            
            if (!newSlot.classList.contains('filled') && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (isValidImageFile(file)) {
                    logger.debug(`Compare файл перетащен в слот ${slotIndex}`);
                    handleCompareImageUpload(file, slotIndex);
                }
            }
        });
    }
    
    function handleSingleImageUpload(file) {
        logger.debug('Обработка single изображения:', file.name);
        
        uploadedImages.single = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            if (singlePreviewImage && singlePreviewContainer) {
                singlePreviewImage.src = e.target.result;
                singlePreviewContainer.classList.remove('hidden');
                singlePreviewContainer.style.display = 'block';
                singlePreviewImage.style.display = 'block';
            }
            
            if (singleUploadArea) {
                singleUploadArea.classList.add('hidden');
                singleUploadArea.style.display = 'none';
            }
            
            showFormElements();
            
            // Отправляем событие
            document.dispatchEvent(new CustomEvent('singleImageUploaded', { 
                detail: { file: file } 
            }));
        };
        
        reader.readAsDataURL(file);
    }
    
    function handleCompareImageUpload(file, slotIndex) {
        logger.debug(`Обработка compare изображения для слота ${slotIndex}:`, file.name);
        
        uploadedImages.compare[slotIndex] = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
            if (!slot) return;
            
            const previewImg = slot.querySelector('.preview-image');
            const uploadIcon = slot.querySelector('.upload-icon');
            
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            }
            
            if (uploadIcon) {
                uploadIcon.style.display = 'none';
            }
            
            slot.classList.add('filled');
            
            // Добавляем кнопку удаления
            if (!slot.querySelector('.delete-image')) {
                const deleteBtn = document.createElement('div');
                deleteBtn.className = 'delete-image';
                deleteBtn.innerHTML = '✕';
                deleteBtn.setAttribute('role', 'button');
                deleteBtn.setAttribute('tabindex', '0');
                deleteBtn.setAttribute('aria-label', `Удалить изображение ${slotIndex + 1}`);
                slot.appendChild(deleteBtn);
            }
            
            // Проверяем, достаточно ли изображений для показа формы
            const filledCount = uploadedImages.compare.filter(img => img !== null).length;
            if (filledCount >= 2) {
                showFormElements();
            }
            
            // Отправляем событие
            document.dispatchEvent(new CustomEvent('compareImageUploaded', { 
                detail: { file: file, slot: slotIndex } 
            }));
        };
        
        reader.readAsDataURL(file);
    }
    
    function isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
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
        
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
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
    
    function showToast(msg) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        } else {
            alert(msg);
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

// Автоматическая инициализация загрузки фото при загрузке страницы
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof initSingleImageUpload === 'function') {
            try {
                initSingleImageUpload();
            } catch (e) {
                if (window.logger) logger.error('Ошибка инициализации image-upload:', e);
            }
        }
    });
}