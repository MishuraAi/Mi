/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 1.0.6 (ВИДИМЫЕ КНОПКИ ЗАГРУЗКИ)
ДАТА ОБНОВЛЕНИЯ: 2025-05-29

РЕШЕНИЕ: Полностью видимые стилизованные кнопки вместо скрытых input'ов
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

        logger.info("Инициализация модуля загрузки изображений (v1.0.6 - Visible Buttons)");
        
        setupEventListeners();
        
        // Отложенная инициализация
        setTimeout(() => {
            initializeUploadHandlers();
        }, 300);
        
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
                }, 400);
            }
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
        logger.debug("Инициализация single режима");
        
        // Поддерживаем оба варианта ID
        const uploadArea = document.querySelector('#single-upload-area') || document.querySelector('#single-preview');
        if (!uploadArea) {
            logger.warn("Single режим: область загрузки не найдена");
            return;
        }
        
        // Создаем видимую кнопку загрузки
        createVisibleSingleButton(uploadArea);
        setupSingleDeleteButton();
    }
    
    function createVisibleSingleButton(uploadArea) {
        // Очищаем область загрузки
        uploadArea.innerHTML = '';
        
        // Создаем скрытый файловый input
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'file';
        hiddenInput.accept = 'image/*';
        hiddenInput.id = 'single-hidden-input';
        hiddenInput.style.display = 'none';
        
        // Создаем видимую кнопку загрузки
        const uploadButton = document.createElement('div');
        uploadButton.className = 'visible-upload-button';
        uploadButton.innerHTML = `
            <div class="upload-icon" style="font-size: 48px; margin-bottom: 16px; color: #d4af37;">📷</div>
            <div class="upload-title" style="font-size: 18px; font-weight: bold; color: #d4af37; margin-bottom: 8px;">
                Выберите фото одежды
            </div>
            <div class="upload-subtitle" style="font-size: 14px; color: #888; margin-bottom: 16px;">
                JPG, PNG, WEBP до 10МБ
            </div>
            <div class="upload-btn" style="
                background: linear-gradient(135deg, #d4af37, #f4d03f);
                color: #000;
                padding: 12px 24px;
                border-radius: 25px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-block;
                box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
            ">
                📁 Выбрать файл
            </div>
        `;
        
        uploadButton.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 40px 20px;
            border: 2px dashed #d4af37;
            border-radius: 15px;
            background: rgba(212, 175, 55, 0.05);
            cursor: pointer;
            transition: all 0.3s ease;
            min-height: 200px;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            -webkit-user-select: none;
        `;
        
        // Добавляем hover эффект
        uploadButton.addEventListener('mouseenter', () => {
            uploadButton.style.background = 'rgba(212, 175, 55, 0.1)';
            uploadButton.style.transform = 'scale(1.02)';
        });
        
        uploadButton.addEventListener('mouseleave', () => {
            uploadButton.style.background = 'rgba(212, 175, 55, 0.05)';
            uploadButton.style.transform = 'scale(1)';
        });
        
        // Обработчик клика по кнопке
        uploadButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            logger.debug("🖱️ Клик по видимой кнопке single загрузки");
            hiddenInput.click();
        });
        
        // Обработчик изменения файла
        hiddenInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            logger.debug(`Single файл выбран: ${file ? file.name : 'none'}`);
            
            if (!file) return;
            
            if (!isValidImageFile(file)) {
                e.target.value = '';
                return;
            }
            
            handleSingleImageUpload(file);
        });
        
        // Добавляем touch-оптимизации
        uploadButton.style.cssText += `
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            -webkit-user-select: none;
        `;
        
        // Улучшенные touch-события
        uploadButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            uploadButton.style.transform = 'scale(0.98)';
            uploadButton.style.background = 'rgba(212, 175, 55, 0.15)';
        }, { passive: false });
        
        uploadButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            uploadButton.style.transform = 'scale(1)';
            uploadButton.style.background = 'rgba(212, 175, 55, 0.05)';
            hiddenInput.click();
        }, { passive: false });
        
        // Добавляем в DOM
        uploadArea.appendChild(hiddenInput);
        uploadArea.appendChild(uploadButton);
        
        // Drag & Drop
        setupDragAndDrop(uploadArea, (file) => {
            if (isValidImageFile(file)) {
                handleSingleImageUpload(file);
            }
        });
        
        logger.debug("✅ Видимая кнопка single загрузки создана");
    }
    
    function initCompareMode() {
        logger.debug("Инициализация compare режима");
        
        const imageSlotsContainer = document.querySelector('#compare-mode .compare-slots');
        if (!imageSlotsContainer) {
            logger.warn('Compare режим: контейнер .compare-slots не найден');
            return;
        }
        
        if (!imageSlotsContainer) {
            logger.warn("Compare режим: контейнер слотов не найден");
            return;
        }
        
        const compareSlots = imageSlotsContainer.querySelectorAll('.compare-slot');
        if (!compareSlots || compareSlots.length === 0) {
            logger.warn('Compare режим: слоты .compare-slot не найдены');
            return;
        }
        logger.debug(`Compare режим: найдено ${compareSlots.length} слотов`);

        compareSlots.forEach((slot, index) => {
            createVisibleCompareButton(slot, index);
        });
    }
    
    function createVisibleCompareButton(slot, slotIndex) {
        logger.debug(`Создание видимой кнопки для слота ${slotIndex}`);
        
        // Устанавливаем атрибуты
        slot.setAttribute('data-slot', slotIndex);
        slot.style.position = 'relative';
        
        // Если слот уже заполнен, не создаем новую кнопку
        if (slot.classList.contains('filled')) {
            return;
        }
        
        // Очищаем слот
        slot.innerHTML = '';
        
        // Создаем скрытый файловый input
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'file';
        hiddenInput.accept = 'image/*';
        hiddenInput.className = 'compare-hidden-input';
        hiddenInput.setAttribute('data-slot', slotIndex);
        hiddenInput.style.display = 'none';
        
        // Создаем видимую кнопку загрузки
        const uploadButton = document.createElement('div');
        uploadButton.className = 'visible-compare-button';
        uploadButton.innerHTML = `
            <div class="upload-icon" style="font-size: 32px; margin-bottom: 12px; color: #d4af37;">📷</div>
            <div class="upload-title" style="font-size: 14px; font-weight: bold; color: #d4af37; margin-bottom: 8px;">
                Фото ${slotIndex + 1}
            </div>
            <div class="upload-btn" style="
                background: linear-gradient(135deg, #d4af37, #f4d03f);
                color: #000;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-block;
                box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
            ">
                📁 Выбрать
            </div>
        `;
        
        uploadButton.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            width: 100%;
            height: 100%;
            border: 2px dashed #d4af37;
            border-radius: 10px;
            background: rgba(212, 175, 55, 0.05);
            cursor: pointer;
            transition: all 0.3s ease;
            padding: 16px 8px;
            box-sizing: border-box;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            -webkit-user-select: none;
        `;
        
        // Добавляем hover эффект
        uploadButton.addEventListener('mouseenter', () => {
            uploadButton.style.background = 'rgba(212, 175, 55, 0.1)';
            uploadButton.style.transform = 'scale(1.05)';
        });
        
        uploadButton.addEventListener('mouseleave', () => {
            uploadButton.style.background = 'rgba(212, 175, 55, 0.05)';
            uploadButton.style.transform = 'scale(1)';
        });
        
        // Обработчик клика по кнопке
        uploadButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            logger.debug(`🖱️ Клик по видимой кнопке слота ${slotIndex}`);
            hiddenInput.click();
        });
        
        // Обработчик изменения файла
        hiddenInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            logger.debug(`Compare файл выбран для слота ${slotIndex}: ${file ? file.name : 'none'}`);
            
            if (file && isValidImageFile(file)) {
                handleCompareImageUpload(file, slotIndex);
            } else if (file) {
                e.target.value = '';
            }
        });
        
        // Обработчик клика по кнопке удаления (будет добавлен позже)
        slot.addEventListener('click', function(e) {
            if (e.target.classList.contains('delete-image') || e.target.closest('.delete-image')) {
                e.preventDefault();
                e.stopPropagation();
                logger.debug(`Удаление изображения из слота ${slotIndex}`);
                resetCompareSlot(slotIndex);
            }
        });
        
        // Добавляем touch-оптимизации
        uploadButton.style.cssText += `
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            -webkit-user-select: none;
        `;
        
        // Улучшенные touch-события
        uploadButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            uploadButton.style.transform = 'scale(0.98)';
            uploadButton.style.background = 'rgba(212, 175, 55, 0.15)';
        }, { passive: false });
        
        uploadButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            uploadButton.style.transform = 'scale(1)';
            uploadButton.style.background = 'rgba(212, 175, 55, 0.05)';
            hiddenInput.click();
        }, { passive: false });
        
        // Добавляем в DOM
        slot.appendChild(hiddenInput);
        slot.appendChild(uploadButton);
        
        // Drag & Drop
        setupDragAndDrop(slot, (file) => {
            if (!slot.classList.contains('filled') && isValidImageFile(file)) {
                handleCompareImageUpload(file, slotIndex);
            }
        });
        
        logger.debug(`✅ Видимая кнопка для слота ${slotIndex} создана`);
    }
    
    function setupDragAndDrop(element, onFileDrop) {
        // Улучшенная поддержка touch устройств
        let touchStarted = false;
        
        // Desktop drag & drop
        element.addEventListener('dragover', function(e) {
            e.preventDefault();
            element.classList.add('dragover');
            element.style.background = 'rgba(212, 175, 55, 0.2)';
        });
        
        element.addEventListener('dragleave', function() {
            element.classList.remove('dragover');
            element.style.background = '';
        });
        
        element.addEventListener('drop', function(e) {
            e.preventDefault();
            element.classList.remove('dragover');
            element.style.background = '';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                onFileDrop(files[0]);
            }
        });
        
        // ДОБАВЛЕНО: Улучшенная поддержка touch
        element.addEventListener('touchstart', function(e) {
            touchStarted = true;
            element.classList.add('touch-active');
            
            // Предотвращаем нежелательный скролл
            if (e.target === element) {
                e.preventDefault();
            }
        }, { passive: false });
        
        element.addEventListener('touchend', function(e) {
            if (touchStarted) {
                touchStarted = false;
                element.classList.remove('touch-active');
                
                // Эмулируем клик для touch устройств
                if (e.target === element || element.contains(e.target)) {
                    const input = element.querySelector('input[type="file"]');
                    if (input) {
                        setTimeout(() => input.click(), 100);
                    }
                }
            }
        });
        
        element.addEventListener('touchcancel', function() {
            touchStarted = false;
            element.classList.remove('touch-active');
        });
    }
    
    // ДОБАВИТЬ: Стили для touch активности
    const touchStyles = document.createElement('style');
    touchStyles.textContent = `
        .touch-active {
            background: rgba(212, 175, 55, 0.15) !important;
            transform: scale(0.98) !important;
            transition: all 0.1s ease !important;
        }
        
        /* Улучшенные touch targets */
        @media (hover: none) {
            .upload-area, .image-slot, .btn {
                -webkit-tap-highlight-color: rgba(212, 175, 55, 0.2);
                touch-action: manipulation;
            }
        }
    `;
    document.head.appendChild(touchStyles);
    
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
        }
    }
    
    function handleSingleImageUpload(file) {
        logger.debug('Обработка single изображения:', file.name);
        
        uploadedImages.single = file;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewContainer = document.querySelector('#single-preview-container') || document.querySelector('#single-preview');
            const previewImage = document.querySelector('#single-preview-image') || document.querySelector('#single-preview img');
            const uploadArea = document.querySelector('#single-upload-area') || document.querySelector('#single-preview');
            
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
            const slot = document.querySelector(`.compare-slot[data-slot="${slotIndex}"]`);
            if (!slot) {
                logger.error(`Слот ${slotIndex} не найден`);
                return;
            }
            
            // ИСПРАВЛЕНИЕ: Правильная очистка и создание превью
            slot.innerHTML = '';
            slot.classList.add('filled');
            
            // Создаем preview изображение
            const previewImg = document.createElement('img');
            previewImg.className = 'preview-image';
            previewImg.src = e.target.result;
            previewImg.alt = `Превью изображения ${slotIndex + 1}`;
            
            // ИСПРАВЛЕНИЕ: Правильные стили без конфликтов
            previewImg.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 8px;
                display: block;
                opacity: 1;
                z-index: 15;
                visibility: visible;
            `;
            
            // Создаем кнопку удаления
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-image';
            deleteBtn.innerHTML = '✕';
            deleteBtn.setAttribute('aria-label', `Удалить изображение ${slotIndex + 1}`);
            
            // ИСПРАВЛЕНИЕ: Обработчик удаления с правильным scope
            deleteBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                resetCompareSlot(slotIndex);
            });
            
            // Добавляем элементы в DOM
            slot.appendChild(previewImg);
            slot.appendChild(deleteBtn);
            
            // Показываем форму, если достаточно изображений
            const filledCount = uploadedImages.compare.filter(img => img !== null).length;
            if (filledCount >= 2) {
                showFormElements();
            }
            
            // ИСПРАВЛЕНИЕ: Корректное событие
            document.dispatchEvent(new CustomEvent('compareImageUploaded', { 
                detail: { 
                    file: file, 
                    slot: slotIndex,
                    slotIndex: slotIndex,
                    fileName: file.name
                } 
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
        // Совместимость со старой и новой разметкой
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
        
        // Новая разметка: активируем форму, показываем поля и кнопку
        const form = document.getElementById('consultation-form');
        if (form) {
            form.classList.add('active');
            form.style.display = 'block';
        }
        const occasionInput = document.getElementById('occasion');
        if (occasionInput) {
            occasionInput.parentElement?.classList?.remove('hidden');
            occasionInput.style.display = 'block';
        }
        const preferencesInput = document.getElementById('preferences');
        if (preferencesInput) {
            preferencesInput.parentElement?.classList?.remove('hidden');
            preferencesInput.style.display = 'block';
        }
        const submitBtn = document.getElementById('form-submit');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('disabled');
            submitBtn.style.display = 'flex';
        }
        
        logger.debug("Элементы формы показаны (совместимость с новой разметкой)");
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
        // Новая разметка
        const form = document.getElementById('consultation-form');
        if (form) {
            form.classList.remove('active');
            form.style.display = 'none';
        }
        const submitBtn = document.getElementById('form-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('disabled');
            submitBtn.style.display = 'none';
        }
    }
    
    function resetSingleMode() {
        logger.debug('Сброс single режима');
        
        const previewContainer = document.querySelector('#single-preview-container');
        const previewImage = document.querySelector('#single-preview-image');
        const uploadArea = document.querySelector('#single-upload-area');
        
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
        
        // Переинициализируем
        setTimeout(() => {
            initSingleMode();
        }, 100);
        
        document.dispatchEvent(new CustomEvent('singleImageRemoved'));
    }
    
    function resetCompareSlot(slotIndex) {
        logger.debug(`Сброс compare слота ${slotIndex}`);
        
        const slot = document.querySelector(`.compare-slot[data-slot="${slotIndex}"]`);
        if (!slot) return;
        
        // Очищаем слот
        slot.innerHTML = '';
        slot.classList.remove('filled');
        uploadedImages.compare[slotIndex] = null;
        
        // Пересоздаем кнопку загрузки
        createVisibleCompareButton(slot, slotIndex);
        
        const filledCount = uploadedImages.compare.filter(img => img !== null).length;
        if (filledCount < 2) {
            hideFormElements();
        }
        
        document.dispatchEvent(new CustomEvent('compareImageRemoved', { 
            detail: { 
                slot: slotIndex,
                slotIndex: slotIndex
            } 
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
                console.log('Toast:', msg);
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