/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 1.0.1 (ИСПРАВЛЕНЫ КЛИКИ И АДАПТИВНОСТЬ)
ДАТА ОБНОВЛЕНИЯ: 2025-05-28
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
    let eventListenersAttached = false;
    
    function init() {
        if (isImageUploadInitialized) {
            return;
        }

        logger = window.MishuraApp.utils.logger || createFallbackLogger();
        uiHelpers = window.MishuraApp.utils.uiHelpers;

        logger.info("Инициализация модуля загрузки изображений (v1.0.1)");
        
        setupEventListeners();
        
        // Отложенная инициализация для страховки
        setTimeout(() => {
            initializeUploadHandlers();
        }, 500);
        
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
        if (eventListenersAttached) return;
        
        // Слушаем события смены режима
        document.addEventListener('modeChanged', handleModeChange);
        
        // Слушаем открытие модальных окон
        document.addEventListener('modalOpened', (e) => {
            logger.debug(`Модальное окно открыто: ${e.detail.modalId}`);
            if (e.detail.modalId === 'consultation-overlay' || e.detail.modalId === 'compare-overlay') {
                setTimeout(() => {
                    initializeUploadHandlers();
                }, 300);
            }
        });
        
        // Слушаем события DOM
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                initializeUploadHandlers();
            }, 200);
        });
        
        eventListenersAttached = true;
        logger.debug("Глобальные обработчики событий установлены");
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
        }, 200);
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
        
        if (!singleUploadArea) {
            logger.warn("Single режим: область загрузки не найдена");
            return;
        }
        
        if (!singleFileInput) {
            logger.warn("Single режим: input не найден");
            return;
        }

        logger.debug("Инициализация single режима");
        
        // ИСПРАВЛЕНИЕ: правильная привязка обработчиков без клонирования
        setupSingleAreaHandlers(singleUploadArea, singleFileInput);
        setupSingleDeleteButton();
    }
    
    function setupSingleAreaHandlers(uploadArea, fileInput) {
        // Удаляем старые обработчики
        const newUploadArea = uploadArea.cloneNode(true);
        uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
        
        // Находим новый input в клонированной области
        const newFileInput = newUploadArea.querySelector('#single-upload-input');
        
        if (!newFileInput) {
            logger.error("Single: не удалось найти input после клонирования");
            return;
        }
        
        // ИСПРАВЛЕНИЕ: улучшенный обработчик клика
        newUploadArea.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            logger.debug("Клик по области загрузки (single)");
            
            // Программно кликаем по input
            try {
                newFileInput.click();
                logger.debug("Input clicked successfully");
            } catch (error) {
                logger.error("Ошибка при клике по input:", error);
                // Fallback для старых браузеров
                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                newFileInput.dispatchEvent(event);
            }
        });
        
        // ИСПРАВЛЕНИЕ: улучшенный обработчик изменения файла
        newFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            logger.debug(`Single файл выбран: ${file ? file.name : 'none'}`);
            
            if (!file) return;
            
            if (!isValidImageFile(file)) {
                e.target.value = ''; // Очищаем input
                return;
            }
            
            handleSingleImageUpload(file);
        });
        
        // Touch обработчики для мобильных устройств
        newUploadArea.addEventListener('touchstart', function(e) {
            e.preventDefault();
            logger.debug('Touch start на области загрузки');
        }, { passive: false });
        
        newUploadArea.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            logger.debug('Touch end - запуск выбора файла');
            
            try {
                newFileInput.click();
            } catch (error) {
                logger.error("Ошибка при touch click:", error);
            }
        }, { passive: false });
        
        // Drag & Drop обработчики
        newUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            newUploadArea.classList.add('dragover');
        });
        
        newUploadArea.addEventListener('dragleave', function() {
            newUploadArea.classList.remove('dragover');
        });
        
        newUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            newUploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && isValidImageFile(files[0])) {
                logger.debug(`Single файл перетащен: ${files[0].name}`);
                handleSingleImageUpload(files[0]);
            }
        });
    }
    
    function setupSingleDeleteButton() {
        const deleteButton = document.querySelector('#single-preview-container .delete-image');
        
        if (deleteButton) {
            // Удаляем старые обработчики
            const newDeleteButton = deleteButton.cloneNode(true);
            deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);
            
            newDeleteButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug("Удаление single изображения");
                resetSingleMode();
            });
            
            // Touch обработчик для мобильных
            newDeleteButton.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug("Touch удаление single изображения");
                resetSingleMode();
            }, { passive: false });
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
        // Устанавливаем атрибут data-slot для идентификации
        slot.setAttribute('data-slot', slotIndex);
        
        // Клонируем слот для удаления старых обработчиков
        const newSlot = slot.cloneNode(true);
        slot.parentNode.replaceChild(newSlot, slot);
        
        const input = newSlot.querySelector('.compare-upload-input, input[type="file"]');
        
        if (!input) {
            logger.warn(`Compare слот ${slotIndex}: input не найден`);
            return;
        }

        logger.debug(`Инициализация compare слота ${slotIndex}`);
        
        // ИСПРАВЛЕНИЕ: улучшенный обработчик клика по слоту
        newSlot.addEventListener('click', function(e) {
            // Проверяем, что клик не по кнопке удаления
            if (e.target.classList.contains('delete-image') || e.target.closest('.delete-image')) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug(`Удаление изображения из слота ${slotIndex}`);
                resetCompareSlot(slotIndex);
                return;
            }
            
            if (!newSlot.classList.contains('filled')) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug(`Клик по compare слоту ${slotIndex}`);
                
                try {
                    input.click();
                } catch (error) {
                    logger.error(`Ошибка клика по input в слоте ${slotIndex}:`, error);
                }
            }
        });
        
        // Touch обработчики для мобильных
        newSlot.addEventListener('touchend', function(e) {
            if (e.target.classList.contains('delete-image') || e.target.closest('.delete-image')) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug(`Touch удаление из слота ${slotIndex}`);
                resetCompareSlot(slotIndex);
                return;
            }
            
            if (!newSlot.classList.contains('filled')) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug(`Touch по compare слоту ${slotIndex}`);
                
                try {
                    input.click();
                } catch (error) {
                    logger.error(`Ошибка touch click в слоте ${slotIndex}:`, error);
                }
            }
        }, { passive: false });
        
        // Изменение файла
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && isValidImageFile(file)) {
                logger.debug(`Compare файл выбран для слота ${slotIndex}: ${file.name}`);
                handleCompareImageUpload(file, slotIndex);
            } else if (file) {
                e.target.value = ''; // Очищаем input при ошибке
            }
        });

        // Drag & Drop обработчики
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
        reader.onload = function(e) {
            const previewContainer = document.querySelector('#single-preview-container');
            const previewImage = document.querySelector('#single-preview-image');
            const uploadArea = document.querySelector('#single-upload-area');
            
            if (previewImage && previewContainer) {
                previewImage.src = e.target.result;
                previewContainer.classList.remove('hidden');
                previewContainer.style.display = 'block';
                previewImage.style.display = 'block';
                
                // Обновляем обработчик кнопки удаления
                setTimeout(() => {
                    setupSingleDeleteButton();
                }, 100);
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
        
        reader.onerror = function() {
            logger.error('Ошибка чтения файла:', file.name);
            showToast('Ошибка при загрузке изображения');
        };
        
        reader.readAsDataURL(file);
    }
    
    function handleCompareImageUpload(file, slotIndex) {
        logger.debug(`Обработка compare изображения для слота ${slotIndex}:`, file.name);
        
        uploadedImages.compare[slotIndex] = file;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
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
        
        reader.onerror = function() {
            logger.error(`Ошибка чтения файла для слота ${slotIndex}:`, file.name);
            showToast('Ошибка при загрузке изображения');
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
        const selectors = [
            '#consultation-overlay .occasion-selector',
            '#consultation-overlay .preferences-input',
            '#consultation-overlay #submit-consultation',
            '#consultation-overlay .input-label',
            '#compare-overlay .occasion-selector',
            '#compare-overlay .preferences-input', 
            '#compare-overlay #submit-comparison',
            '#compare-overlay .input-label'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element) {
                    element.classList.remove('hidden');
                    element.style.display = element.tagName === 'BUTTON' ? 'flex' : 'block';
                    
                    if (element.tagName === 'BUTTON') {
                        element.disabled = false;
                        element.classList.remove('disabled');
                    }
                }
            });
        });
        
        logger.debug("Элементы формы показаны");
    }
    
    function hideFormElements() {
        const selectors = [
            '#consultation-overlay .occasion-selector',
            '#consultation-overlay .preferences-input',
            '#consultation-overlay #submit-consultation',
            '#consultation-overlay .input-label',
            '#compare-overlay .occasion-selector',
            '#compare-overlay .preferences-input',
            '#compare-overlay #submit-comparison', 
            '#compare-overlay .input-label'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element) {
                    element.classList.add('hidden');
                    element.style.display = 'none';
                    
                    if (element.tagName === 'BUTTON') {
                        element.disabled = true;
                        element.classList.add('disabled');
                    }
                }
            });
        });
        
        logger.debug("Элементы формы скрыты");
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
        
        // Переинициализируем обработчики
        setTimeout(() => {
            initSingleMode();
        }, 100);
        
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
        
        // Переинициализируем слот
        setTimeout(() => {
            initCompareSlot(slot, slotIndex);
        }, 100);
        
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
        
        setTimeout(() => {
            initCompareMode();
        }, 100);
        
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
                // Создаем временный toast
                const tmpToast = document.createElement('div');
                tmpToast.className = 'toast active';
                tmpToast.textContent = msg;
                tmpToast.style.cssText = `
                    position: fixed; 
                    bottom: 80px; 
                    left: 50%; 
                    transform: translateX(-50%);
                    background: #1a1a1a; 
                    color: white; 
                    padding: 12px 20px; 
                    border-radius: 8px;
                    z-index: 1000;
                    font-size: 14px;
                `;
                document.body.appendChild(tmpToast);
                setTimeout(() => {
                    if (tmpToast.parentNode) {
                        tmpToast.parentNode.removeChild(tmpToast);
                    }
                }, 3000);
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
        isInitialized: () => isImageUploadInitialized,
        reinitialize: initializeUploadHandlers
    };
})();