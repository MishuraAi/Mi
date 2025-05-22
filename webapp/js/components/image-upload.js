/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 0.4.7 (Усиленный сброс инпутов, более детальное логирование DOM)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

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
    
    function init() {
        if (isImageUploadInitialized) {
            // console.warn("ImageUpload: Повторная инициализация пропущена.");
            return;
        }
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("ImageUpload(f):",...args), info: (...args)=>console.info("ImageUpload(f):",...args), warn: (...args)=>console.warn("ImageUpload(f):",...args), error: (...args)=>console.error("ImageUpload(f):",...args) };
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        logger.debug("Инициализация модуля загрузки изображений (v0.4.7)");
        initDOMElements(); // Сначала DOM
        initModeButtons();   // Потом режимы
        initSingleImageUpload(); // Потом загрузчики
        initCompareImageUpload();
        isImageUploadInitialized = true;
        logger.info("Модуль загрузки изображений инициализирован (v0.4.7)");
    }
    
    function initDOMElements() {
        logger.debug("ImageUpload: Инициализация DOM элементов...");
        singleUploadArea = document.getElementById('single-upload-area');
        singleFileInput = document.getElementById('single-upload-input');
        singlePreviewContainer = document.getElementById('single-preview-container');
        singlePreviewImage = document.getElementById('single-preview-image');
        singleDeleteButton = document.querySelector('#single-preview-container .delete-image[data-target="single"]');
        
        imageSlotsContainer = document.querySelector('#compare-analysis-mode .image-slots');
        
        modeButtons = document.querySelectorAll('#consultation-overlay .mode-button');
        singleAnalysisMode = document.getElementById('single-analysis-mode');
        compareAnalysisMode = document.getElementById('compare-analysis-mode');

        const elementsToLog = {singleUploadArea, singleFileInput, singlePreviewContainer, singlePreviewImage, singleDeleteButton, imageSlotsContainer, modeButtonsLength: modeButtons.length, singleAnalysisMode, compareAnalysisMode};
        for(const key in elementsToLog){
            const element = elementsToLog[key];
            if(element === null || (typeof element === 'number' && element === 0) || (typeof element === 'object' && !element && key !== 'modeButtonsLength')) { // Для modeButtonsLength 0 - это валидное состояние если их нет
                 logger.warn(`ImageUpload DOM: Элемент или коллекция '${key}' не найден(а) или пуст(а).`);
            } else {
                 logger.debug(`ImageUpload DOM: Элемент '${key}' найден.`);
            }
        }
    }
    
    function initModeButtons() {
        if (!modeButtons || !modeButtons.length) {
            logger.warn("ImageUpload: Переключатели режимов (.mode-button в #consultation-overlay) не найдены.");
            // Если режимов нет, возможно, по умолчанию должен быть активен 'single-analysis-mode'
            if(singleAnalysisMode && compareAnalysisMode) {
                singleAnalysisMode.classList.remove('hidden');
                compareAnalysisMode.classList.add('hidden');
                logger.debug("ImageUpload: Режим 'single' установлен по умолчанию, т.к. кнопок режимов нет.");
            }
            return;
        }
        
        modeButtons.forEach(button => {
            // Удаляем старые обработчики (если были) и добавляем новый
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', function() {
                const mode = this.getAttribute('data-mode');
                logger.debug(`ImageUpload: Кнопка режима нажата - '${mode}'`);
                modeButtons.forEach(btn => document.getElementById(btn.id)?.classList.remove('active')); // Обновляем оригинальные кнопки
                this.classList.add('active');
                
                if (singleAnalysisMode) singleAnalysisMode.classList.add('hidden');
                if (compareAnalysisMode) compareAnalysisMode.classList.add('hidden');
                
                if (mode === 'single' && singleAnalysisMode) singleAnalysisMode.classList.remove('hidden');
                else if (mode === 'compare' && compareAnalysisMode) compareAnalysisMode.classList.remove('hidden');
                
                document.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode: mode } }));
            });
        });
        
        // Обновляем коллекцию modeButtons после клонирования
        modeButtons = document.querySelectorAll('#consultation-overlay .mode-button');

        const initialActiveButton = document.querySelector('#consultation-overlay .mode-button.active') || 
                                   (modeButtons.length > 0 ? modeButtons[0] : null);
        if (initialActiveButton) {
            logger.debug(`ImageUpload: Установка начального активного режима на '${initialActiveButton.dataset.mode}'`);
            initialActiveButton.click();
        } else {
            logger.warn("ImageUpload: Не удалось установить начальный активный режим (кнопки не найдены или нет активной).");
            if(singleAnalysisMode && compareAnalysisMode) { // Фоллбэк, если кнопки есть, но ни одна не активна
                singleAnalysisMode.classList.remove('hidden');
                compareAnalysisMode.classList.add('hidden');
                if (modeButtons.length > 0) modeButtons[0].classList.add('active');
                logger.debug("ImageUpload: Режим 'single' и первая кнопка активированы по умолчанию.");
                 document.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode: 'single' } }));
            }
        }
    }

    function resetFileInput(inputElement) {
        if (inputElement) {
            const inputId = inputElement.id || inputElement.className || 'unknown_input';
            try {
                inputElement.value = ""; // Попробуем сначала так
                 // Для некоторых браузеров и ситуаций может потребоваться пересоздание
                if (inputElement.value) { // Если value не сбросился
                    logger.warn(`ImageUpload: input.value для '${inputId}' не сбросился на пустую строку. Попытка через type.`);
                    inputElement.type = ''; // Это трюк
                    inputElement.type = 'file';
                    if (inputElement.value) {
                         logger.warn(`ImageUpload: input.value для '${inputId}' все еще не сброшен.`);
                    } else {
                        logger.debug(`ImageUpload: input.value для '${inputId}' сброшен через смену типа.`);
                    }
                } else {
                     logger.debug(`ImageUpload: input.value для '${inputId}' успешно сброшен на пустую строку.`);
                }
            } catch (ex) {
                logger.error(`ImageUpload: Ошибка при сбросе input.value для '${inputId}'.`, ex);
            }
        } else {
            logger.warn("ImageUpload: Попытка сбросить несуществующий file input.");
        }
    }

    function setupInputClick(triggerElement, fileInputElement) {
        if (!triggerElement || !fileInputElement) return;
        
        // Удаляем старые обработчики перед добавлением нового
        const newTrigger = triggerElement.cloneNode(true);
        triggerElement.parentNode.replaceChild(newTrigger, triggerElement);
        
        newTrigger.addEventListener('click', () => {
            const inputId = fileInputElement.id || 'unknown_input';
            logger.debug(`ImageUpload: Клик на триггер для '${inputId}'. Сброс инпута.`);
            resetFileInput(fileInputElement); 
            fileInputElement.click();
        });
        return newTrigger; // Возвращаем новый элемент, чтобы другие обработчики (drag/drop) вешались на него
    }

    function initSingleImageUpload() {
        if (!singleUploadArea || !singleFileInput || !singleDeleteButton) {
            return logger.warn("ImageUpload (Single): Пропуск инициализации - ключевые DOM элементы не найдены.");
        }
        singleUploadArea = setupInputClick(singleUploadArea, singleFileInput) || singleUploadArea; // Обновляем ссылку
        
        singleFileInput.addEventListener('change', (event) => { /* ... как было ... */ 
            const file = event.target.files[0];
            if (file) {
                logger.debug(`ImageUpload (Single): Файл выбран: ${file.name}`);
                handleSingleImageSelection(file);
            } else {
                logger.debug("ImageUpload (Single): Диалог выбора файла отменен.");
            }
        });
        
        singleUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); singleUploadArea.classList.add('dragover'); });
        singleUploadArea.addEventListener('dragleave', () => singleUploadArea.classList.remove('dragover'));
        singleUploadArea.addEventListener('drop', (e) => { /* ... как было ... */ 
            e.preventDefault();
            singleUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                logger.debug(`ImageUpload (Single): Файл перетащен: ${e.dataTransfer.files[0].name}`);
                handleSingleImageSelection(e.dataTransfer.files[0]);
            }
        });

        const newSingleDeleteButton = singleDeleteButton.cloneNode(true);
        singleDeleteButton.parentNode.replaceChild(newSingleDeleteButton, singleDeleteButton);
        singleDeleteButton = newSingleDeleteButton;

        singleDeleteButton.addEventListener('click', () => {
            logger.debug("ImageUpload (Single): Нажата кнопка удаления.");
            resetSingleImageUpload();
        });
    }
    
    function handleSingleImageSelection(file) {
        logger.debug(`ImageUpload (Single): Обработка изображения: ${file.name}`);
        if (!isValidImageFile(file)) return;

        isUploadingActive = true;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (singlePreviewImage && singlePreviewContainer && singleUploadArea) {
                singlePreviewImage.src = e.target.result;
                singlePreviewImage.style.display = 'block'; // Добавляем явное отображение
                singlePreviewContainer.classList.remove('hidden');
                singleUploadArea.classList.add('hidden');
                uploadedImages.single = file;
                
                const formContainer = document.getElementById('consultation-overlay');
                if (formContainer) {
                    const occasionSel = formContainer.querySelector('.occasion-selector');
                    const labels = formContainer.querySelectorAll('.input-label');
                    const prefsInput = formContainer.querySelector('.preferences-input');
                    const submitBtn = formContainer.querySelector('#submit-consultation');
                    if (occasionSel) occasionSel.classList.remove('hidden');
                    labels.forEach(l => l.classList.remove('hidden'));
                    if (prefsInput) prefsInput.classList.remove('hidden');
                    if (submitBtn) submitBtn.disabled = false; // Активируем кнопку отправки
                }
                logger.info(`ImageUpload (Single): Изображение ${file.name} загружено и отображено.`);
                document.dispatchEvent(new CustomEvent('singleImageUploaded', { detail: { file: file } }));
            } else {
                logger.error("ImageUpload (Single): DOM элементы для превью не найдены при попытке отображения.");
            }
            isUploadingActive = false;
        };
        reader.onerror = (error) => {
            logger.error("ImageUpload (Single): Ошибка FileReader:", error);
            if (uiHelpers) uiHelpers.showToast('Ошибка при чтении файла.');
            isUploadingActive = false;
        };
        reader.readAsDataURL(file);
    }
    
    function initCompareImageUpload() {
        if (!imageSlotsContainer) return logger.warn("ImageUpload (Compare): Пропуск инициализации - imageSlotsContainer не найден.");
        
        const slots = imageSlotsContainer.querySelectorAll('.image-slot');
        if (!slots.length) return logger.warn("ImageUpload (Compare): Слоты (.image-slot) не найдены.");

        slots.forEach(currentSlot => {
            const slotIndex = parseInt(currentSlot.dataset.slot, 10);
            const input = currentSlot.querySelector('.compare-upload-input');
            if (!input) {
                logger.warn(`ImageUpload (Compare): Инпут для слота ${slotIndex} не найден.`);
                return; // Пропускаем этот слот, если нет инпута
            }
            // Переназначаем обработчик клика на слот через клонирование
            let newSlot = currentSlot.cloneNode(true); // Клонируем весь слот
            currentSlot.parentNode.replaceChild(newSlot, currentSlot);
            const newSlotInput = newSlot.querySelector('.compare-upload-input'); // Находим инпут в новом слоте

            newSlot.addEventListener('click', function() {
                if (!this.classList.contains('filled')) {
                    logger.debug(`ImageUpload (Compare): Клик на пустой слот ${slotIndex}. Сброс инпута.`);
                    resetFileInput(newSlotInput); 
                    newSlotInput.click();
                }
            });
            
            // Обработчик change для инпута в новом слоте
            newSlotInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    logger.debug(`ImageUpload (Compare): Файл выбран для слота ${slotIndex}: ${file.name}`);
                    handleCompareImageSelection(file, slotIndex); // slotIndex правильный
                }
            });

            newSlot.addEventListener('dragover', (e) => { e.preventDefault(); if (!newSlot.classList.contains('filled')) newSlot.classList.add('dragover'); });
            newSlot.addEventListener('dragleave', () => newSlot.classList.remove('dragover'));
            newSlot.addEventListener('drop', (e) => {
                e.preventDefault();
                newSlot.classList.remove('dragover');
                if (!newSlot.classList.contains('filled') && e.dataTransfer.files.length) {
                     logger.debug(`ImageUpload (Compare): Файл перетащен для слота ${slotIndex}: ${e.dataTransfer.files[0].name}`);
                    handleCompareImageSelection(e.dataTransfer.files[0], slotIndex);
                }
            });
        });
    }
    
    function handleCompareImageSelection(file, slotIndex) {
        logger.debug(`ImageUpload (Compare): Обработка изображения для слота ${slotIndex}: ${file.name}`);
        if (!isValidImageFile(file)) return;
        
        // Важно использовать актуальный DOM элемент, а не тот, что мог быть заменен cloneNode
        const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return logger.error(`ImageUpload (Compare): Слот ${slotIndex} не найден в DOM для обновления.`);
        
        isUploadingActive = true;
        const reader = new FileReader();
        reader.onload = (e) => {
            const uploadIconElement = slot.querySelector('.upload-icon');
            if (uploadIconElement) uploadIconElement.style.display = 'none';
            
            let img = slot.querySelector('.slot-image');
            if (!img) { 
                img = document.createElement('img'); 
                img.className = 'slot-image'; 
                slot.appendChild(img); 
            }
            img.src = e.target.result;
            img.style.display = 'block'; // Добавляем явное отображение
            img.alt = `Изображение ${slotIndex + 1}`;
            
            let removeBtn = slot.querySelector('.remove-image');
            if (removeBtn) removeBtn.removeEventListener('click', resetSlotHandler); // Удаляем старый, если был
            else removeBtn = document.createElement('div');

            removeBtn.className = 'remove-image'; 
            removeBtn.textContent = '✕';
            removeBtn.setAttribute('role', 'button'); 
            removeBtn.tabIndex = 0;
            removeBtn.dataset.slot = slotIndex; // Убедимся, что data-slot есть
            removeBtn.style.display = 'flex'; // Добавляем явное отображение
            
            // Обертка для обработчика, чтобы передать slotIndex
            const currentSlotIndex = slotIndex; 
            removeBtn.addEventListener('click', function localResetSlotHandler(ev) {
                ev.stopPropagation();
                logger.debug(`ImageUpload (Compare): Нажата кнопка удаления для слота ${currentSlotIndex} (динамическая).`);
                resetSlot(currentSlotIndex); // Вызываем resetSlot с правильным индексом
            });
            if (!slot.contains(removeBtn)) slot.appendChild(removeBtn); // Добавляем, если еще не там

            slot.classList.add('filled');
            uploadedImages.compare[slotIndex] = file;
            
            const filledSlotsCount = document.querySelectorAll('#compare-analysis-mode .image-slot.filled').length;
            if (filledSlotsCount >= 2) {
                const formContainer = document.getElementById('consultation-overlay');
                if(formContainer){
                    const occasionSel = formContainer.querySelector('.occasion-selector');
                    const labels = formContainer.querySelectorAll('.input-label');
                    const prefsInput = formContainer.querySelector('.preferences-input');
                    const submitBtn = formContainer.querySelector('#submit-consultation');
                    if (occasionSel) occasionSel.classList.remove('hidden');
                    labels.forEach(l => l.classList.remove('hidden'));
                    if (prefsInput) prefsInput.classList.remove('hidden');
                    if (submitBtn) submitBtn.disabled = false; // Активируем кнопку отправки
                }
            }
            logger.info(`ImageUpload (Compare): Изображение ${file.name} загружено в слот ${slotIndex}.`);
            document.dispatchEvent(new CustomEvent('compareImageUploaded', { detail: { file: file, slot: slotIndex } }));
            isUploadingActive = false;
        };
        reader.onerror = (error) => {
            logger.error(`ImageUpload (Compare): Ошибка FileReader для слота ${slotIndex}:`, error);
            if (uiHelpers) uiHelpers.showToast('Ошибка при чтении файла.');
            isUploadingActive = false;
        };
        reader.readAsDataURL(file);
    }
    
    // Вспомогательная функция для обработчика кнопки удаления слота
    function resetSlotHandler(event) {
        event.stopPropagation();
        const slotIndex = parseInt(event.currentTarget.dataset.slot, 10);
        if (!isNaN(slotIndex)) {
            logger.debug(`ImageUpload (Compare): Нажата кнопка удаления (через resetSlotHandler) для слота ${slotIndex}.`);
            resetSlot(slotIndex);
        } else {
            logger.error("ImageUpload (Compare): Не удалось определить slotIndex для кнопки удаления.");
        }
    }
        
    function isValidImageFile(file) { /* ... как в версии 0.4.6 ... */ 
        const validTypes = (config && config.appSettings && config.appSettings.supportedImageFormats) 
                           ? config.appSettings.supportedImageFormats.map(fmt => `image/${fmt.replace('jpg','jpeg')}`) 
                           : ['image/jpeg', 'image/png', 'image/webp'];
        const defaultMaxSize = 5 * 1024 * 1024; 
        const maxSize = (config && config.LIMITS && config.LIMITS.MAX_FILE_SIZE) ? config.LIMITS.MAX_FILE_SIZE : defaultMaxSize;
        
        if (!file || !file.type) { logger.warn("isValidImageFile: Файл или тип не определены."); return false; }
        if (!validTypes.includes(file.type.toLowerCase())) {
            logger.warn(`isValidImageFile: Недопустимый тип файла: ${file.type} для '${file.name}'. Допустимые: ${validTypes.join(', ')}`);
            if (uiHelpers) uiHelpers.showToast(`Тип файла '${file.name}' не поддерживается. Используйте: ${ (config && config.appSettings && config.appSettings.supportedImageFormats) ? config.appSettings.supportedImageFormats.join(', ').toUpperCase() : 'JPG, PNG, WEBP'}.`);
            return false;
        }
        if (file.size > maxSize) {
            const fileSizeMB = (file.size / (1024*1024)).toFixed(1);
            const maxAllowedMB = (maxSize / (1024*1024)).toFixed(1);
            logger.warn(`isValidImageFile: Файл '${file.name}' слишком большой: ${fileSizeMB}MB (макс: ${maxAllowedMB}MB)`);
            if (uiHelpers) uiHelpers.showToast(`Файл '${file.name}' (${fileSizeMB}МБ) слишком большой. Макс. ${maxAllowedMB}МБ.`);
            return false;
        }
        return true;
    }
    
    function resetSingleImageUpload() { /* ... как в версии 0.4.6 ... */ 
        logger.debug('ImageUpload: Сброс одиночного изображения (resetSingleImageUpload)...');
        resetFileInput(singleFileInput);
        if (singlePreviewContainer) singlePreviewContainer.classList.add('hidden');
        if (singlePreviewImage) singlePreviewImage.src = '';
        if (singleUploadArea) singleUploadArea.classList.remove('hidden');
        uploadedImages.single = null;

        const formContainer = document.getElementById('consultation-overlay');
        if(formContainer){
            const occasionSel = formContainer.querySelector('.occasion-selector');
            const labels = formContainer.querySelectorAll('.input-label');
            const prefsInput = formContainer.querySelector('.preferences-input');
            const submitBtn = formContainer.querySelector('#submit-consultation');
            if (occasionSel) occasionSel.classList.add('hidden');
            labels.forEach(l => l.classList.add('hidden'));
            if (prefsInput) prefsInput.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = true; 
        }
        document.dispatchEvent(new CustomEvent('singleImageRemoved'));
        logger.debug('ImageUpload: Одиночное изображение сброшено.');
    }
    
    function resetSlot(slotIndex) { /* ... как в версии 0.4.6, но используем актуальный DOM элемент для слота ... */ 
        logger.debug(`ImageUpload: Сброс слота сравнения ${slotIndex}...`);
        const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return logger.error(`ImageUpload: Слот ${slotIndex} не найден в DOM для сброса.`);
        
        const img = slot.querySelector('.slot-image');
        if (img) img.remove();
        const removeBtn = slot.querySelector('.remove-image');
        if (removeBtn) removeBtn.remove();
        
        const uploadIconElement = slot.querySelector('.upload-icon');
        if (uploadIconElement) uploadIconElement.style.display = 'flex';
        
        slot.classList.remove('filled');
        const input = slot.querySelector('.compare-upload-input');
        resetFileInput(input); // Убедимся, что инпут сброшен
        uploadedImages.compare[slotIndex] = null;
        
        const filledSlotsCount = document.querySelectorAll('#compare-analysis-mode .image-slot.filled').length;
        logger.debug(`ImageUpload: Кол-во заполненных слотов после сброса слота ${slotIndex}: ${filledSlotsCount}`);
        if (filledSlotsCount < 2) { 
             const formContainer = document.getElementById('consultation-overlay');
             if(formContainer){ /* ... скрыть поля, деактивировать кнопку ... */ 
                const occasionSel = formContainer.querySelector('.occasion-selector');
                const labels = formContainer.querySelectorAll('.input-label');
                const prefsInput = formContainer.querySelector('.preferences-input');
                const submitBtn = formContainer.querySelector('#submit-consultation');
                if (occasionSel) occasionSel.classList.add('hidden');
                labels.forEach(l => l.classList.add('hidden'));
                if (prefsInput) prefsInput.classList.add('hidden');
                if (submitBtn) submitBtn.disabled = true; 
            }
        }
        document.dispatchEvent(new CustomEvent('compareImageRemoved', { detail: { slot: slotIndex } }));
        logger.debug(`ImageUpload: Слот сравнения ${slotIndex} сброшен.`);
    }
    
    function resetCompareImageUploads() { /* ... как в версии 0.4.6 ... */ 
        logger.debug('ImageUpload: Сброс всех слотов сравнения...');
        if (imageSlotsContainer) {
            const slots = imageSlotsContainer.querySelectorAll('.image-slot');
            slots.forEach(slot => resetSlot(parseInt(slot.dataset.slot, 10)));
        }
        const formContainer = document.getElementById('consultation-overlay');
        if(formContainer){ /* ... скрыть поля, деактивировать кнопку ... */ 
            const occasionSel = formContainer.querySelector('.occasion-selector');
            const labels = formContainer.querySelectorAll('.input-label');
            const prefsInput = formContainer.querySelector('.preferences-input');
            const submitBtn = formContainer.querySelector('#submit-consultation');
            if (occasionSel) occasionSel.classList.add('hidden');
            labels.forEach(l => l.classList.add('hidden'));
            if (prefsInput) prefsInput.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = true;
        }
        document.dispatchEvent(new CustomEvent('allCompareImagesRemoved'));
        logger.debug('ImageUpload: Все слоты сравнения сброшены.');
    }
    
    function isUploading() { return isUploadingActive; }
    function getUploadedImages() { return uploadedImages; }
    
    return { 
        init, 
        resetSingleImageUpload, 
        resetCompareImageUploads, 
        resetSlot, // Оставляем публичным на всякий случай
        isUploading, 
        getUploadedImages,
        isInitialized: () => isImageUploadInitialized // Экспортируем флаг
    };
})();