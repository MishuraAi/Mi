/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 1.0.0 (ПОЛНОСТЬЮ ИСПРАВЛЕН)
ДАТА ОБНОВЛЕНИЯ: 2025-05-27
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.components = window.MishuraApp.components || {};

window.MishuraApp.components.imageUpload = (function() {
    'use strict';
    
    let logger, uiHelpers;
    let isImageUploadInitialized = false;
    let currentMode = 'single';
    let uploadedImages = { single: null, compare: [null, null, null, null] };
    
    function init() {
        if (isImageUploadInitialized) {
            return;
        }

        logger = window.MishuraApp.utils.logger || createFallbackLogger();
        uiHelpers = window.MishuraApp.utils.uiHelpers;

        logger.info("Инициализация модуля загрузки изображений (v1.0.0)");
        
        setupEventListeners();
        isImageUploadInitialized = true;
        logger.info("Модуль загрузки изображений успешно инициализирован");
    }
    
    function createFallbackLogger() {
        return {
            debug: (...args) => console.debug("ImageUpload:", ...args),
            info: (...args) => console.info("ImageUpload:", ...args),
            warn: (...args) => console.warn("ImageUpload:", ...args),
            error: (...args) => console.error("ImageUpload:", ...args)
        };
    }
    
    function setupEventListeners() {
        // Слушаем события смены режима
        document.addEventListener('modeChanged', handleModeChange);
        
        // Слушаем открытие модального окна
        document.addEventListener('modalOpened', (e) => {
            if (e.detail.modalId === 'consultation-overlay') {
                setTimeout(() => {
                    initializeUploadHandlers();
                }, 200);
            }
        });
        
        // Инициализируем обработчики сразу
        setTimeout(() => {
            initializeUploadHandlers();
        }, 100);
    }
    
    function handleModeChange(e) {
        currentMode = e.detail.mode;
        logger.debug(`Смена режима на: ${currentMode}`);
        
        // Сбрасываем загруженные изображения при смене режима
        if (currentMode === 'single') {
            resetCompareMode();
        } else if (currentMode === 'compare') {
            resetSingleMode();
        }
        
        // Переинициализируем обработчики
        setTimeout(() => {
            initializeUploadHandlers();
        }, 100);
    }
    
    function initializeUploadHandlers() {
        logger.debug("Инициализация обработчиков загрузки");
        
        // Инициализируем single режим
        initSingleMode();
        
        // Инициализируем compare режим
        initCompareMode();
    }
    
    function initSingleMode() {
        const singleUploadArea = document.querySelector('#single-upload-area');
        const singleFileInput = document.querySelector('#single-upload-input');
        
        if (!singleUploadArea || !singleFileInput) {
            logger.warn("Single режим: элементы не найдены");
            return;
        }

        logger.debug("Инициализация single режима");
        
        // Удаляем старые обработчики, клонируя элементы
        const newUploadArea = singleUploadArea.cloneNode(true);
        singleUploadArea.parentNode.replaceChild(newUploadArea, singleUploadArea);
        
        const newFileInput = newUploadArea.querySelector('#single-upload-input');
        
        // Клик по области загрузки
        newUploadArea.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            logger.debug("Клик по области загрузки (single)");
            
            if (newFileInput) {
                newFileInput.click();
            }
        });
        
        // Изменение файла
        if (newFileInput) {
            newFileInput.addEventListener('change', (e) => {
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
        newUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            newUploadArea.classList.add('dragover');
        });
        
        newUploadArea.addEventListener('dragleave', () => {
            newUploadArea.classList.remove('dragover');
        });
        
        newUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            newUploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && isValidImageFile(files[0])) {
                logger.debug(`Single файл перетащен: ${files[0].name}`);
                handleSingleImageUpload(files[0]);
            }
        });

        // Обработчик кнопки удаления
        setupSingleDeleteButton();
    }
    
    function setupSingleDeleteButton() {
        const deleteButton = document.querySelector('#single-analysis-mode .delete-image[data-target="single"]');
        
        if (deleteButton) {
            // Удаляем старые обработчики
            const newDeleteButton = deleteButton.cloneNode(true);
            deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);
            
            newDeleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                logger.debug("Удаление single изображения");
                resetSingleMode();
            });
        }
    }
    
    function initCompareMode() {
        const imageSlotsContainer = document.querySelector('#compare-analysis-mode .image-slots');
        
        if (!imageSlotsContainer) {
            logger.warn("Compare режим: контейнер не найден");
            return;
        }
        
        const compareSlots = imageSlotsContainer.querySelectorAll('.image-slot');
        logger.debug(`Инициализация compare режима: ${compareSlots.length} слотов`);

        compareSlots.forEach((slot, index) => {
            initCompareSlot(slot, index);
        });
    }
    
    function initCompareSlot(slot, slotIndex) {
        // Клонируем слот для удаления старых обработчиков
        const newSlot = slot.cloneNode(true);
        slot.parentNode.replaceChild(newSlot, slot);
        
        const input = newSlot.querySelector('.compare-upload-input, input[type="file"]');
        
        if (!input) {
            logger.warn(`Compare слот ${slotIndex}: input не найден`);
            return;
        }

        logger.debug(`Инициализация compare слота ${slotIndex}`);
        
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
                
                if (input) {
                    input.click();
                }
            }
        });
        
        // Изменение файла
        if (input) {
            input.addEventListener('change', (e) => {
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
            const previewContainer = document.querySelector('#single-preview-container');
            const previewImage = document.querySelector('#single-preview-image');
            const uploadArea = document.querySelector('#single-upload-area');
            
            if (previewImage && previewContainer) {
                previewImage.src = e.target.result;
                previewContainer.classList.remove('hidden');
                previewContainer.style.display = 'block';
                previewImage.style.display = 'block';
            }
            
            if (uploadArea) {
                uploadArea.classList.add('hidden');
                uploadArea.style.display = 'none';
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
        
        const fileInput = document.querySelector('#single-upload-input');
        const previewContainer = document.querySelector('#single-preview-container');
        const previewImage = document.querySelector('#single-preview-image');
        const uploadArea = document.querySelector('#single-upload-area');
        
        if (fileInput) fileInput.value = '';
        
        if (previewContainer) {
            previewContainer.classList.add('hidden');
            previewContainer.style.display = 'none';
        }
        if (previewImage) {
            previewImage.src = '';
            previewImage.style.display = 'none';
        }
        if (uploadArea) {
            uploadArea.classList.remove('hidden');
            uploadArea.style.display = 'block';
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
        if (uiHelpers && typeof uiHelpers.showToast === 'function') {
            uiHelpers.showToast(msg);
        } else {
            const toast = document.getElementById('toast');
            if (toast) {
                toast.textContent = msg;
                toast.classList.add('active');
                setTimeout(() => toast.classList.remove('active'), 3000);
            } else {
                alert(msg);
            }
        }
    }
    
    // Публичный API
    return { 
        init, 
        resetSingleImageUpload: resetSingleMode,
        resetCompareImageUploads: resetCompareMode, 
        resetSlot: resetCompareSlot,
        getUploadedImages: () => uploadedImages,
        isInitialized: () => isImageUploadInitialized
    };
})();