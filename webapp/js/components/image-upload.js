/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 0.4.6 (Улучшенное логирование, проверка DOM элементов)
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
    
    function init() {
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("ImageUpload(f):",...args), info: (...args)=>console.info("ImageUpload(f):",...args), warn: (...args)=>console.warn("ImageUpload(f):",...args), error: (...args)=>console.error("ImageUpload(f):",...args) };
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        logger.debug("Инициализация модуля загрузки изображений (v0.4.6)");
        initDOMElements();
        initModeButtons(); 
        initSingleImageUpload();
        initCompareImageUpload();
        logger.info("Модуль загрузки изображений инициализирован (v0.4.6)");
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

        // Логирование для проверки
        const elementsToLog = {singleUploadArea, singleFileInput, singlePreviewContainer, singlePreviewImage, singleDeleteButton, imageSlotsContainer, modeButtonsLength: modeButtons.length, singleAnalysisMode, compareAnalysisMode};
        for(const key in elementsToLog){
            if(elementsToLog[key] === null || (typeof elementsToLog[key] === 'number' && elementsToLog[key] === 0) || (typeof elementsToLog[key] === 'object' && !elementsToLog[key])) {
                 logger.warn(`ImageUpload DOM: Элемент или коллекция '${key}' не найден(а) или пуст(а).`);
            }
        }
    }
    
    function initModeButtons() {
        if (!modeButtons || !modeButtons.length) return logger.warn("ImageUpload: Переключатели режимов не найдены.");
        
        modeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const mode = this.getAttribute('data-mode');
                logger.debug(`ImageUpload: Кнопка режима нажата - '${mode}'`);
                modeButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                if (singleAnalysisMode) singleAnalysisMode.classList.add('hidden');
                if (compareAnalysisMode) compareAnalysisMode.classList.add('hidden');
                
                if (mode === 'single' && singleAnalysisMode) singleAnalysisMode.classList.remove('hidden');
                else if (mode === 'compare' && compareAnalysisMode) compareAnalysisMode.classList.remove('hidden');
                
                document.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode: mode } }));
            });
        });
        const initialActiveButton = document.querySelector('#consultation-overlay .mode-button.active') || 
                                   (modeButtons.length > 0 ? modeButtons[0] : null);
        if (initialActiveButton) {
            if(!initialActiveButton.classList.contains('active')){ // Кликаем, только если еще не активен
                logger.debug(`ImageUpload: Установка начального режима через клик: ${initialActiveButton.dataset.mode}`);
                initialActiveButton.click();
            } else {
                logger.debug(`ImageUpload: Начальный режим уже установлен: ${initialActiveButton.dataset.mode}`);
                 // Явно диспатчим событие, чтобы другие модули тоже обновились
                document.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode: initialActiveButton.dataset.mode } }));
            }
        } else {
            logger.warn("ImageUpload: Не удалось установить начальный активный режим.");
        }
    }

    function resetFileInput(inputElement) {
        if (inputElement) {
            try {
                inputElement.value = null;
            } catch (ex) {
                logger.warn(`ImageUpload: Не удалось сбросить input.value для '${inputElement.id || 'unknown_input'}'.`, ex);
            }
        }
    }

    function initSingleImageUpload() {
        if (!singleUploadArea || !singleFileInput || !singleDeleteButton) {
            return logger.warn("ImageUpload (Single): Пропуск инициализации - ключевые DOM элементы не найдены.");
        }

        singleUploadArea.addEventListener('click', () => {
            logger.debug("ImageUpload (Single): Клик на область загрузки. Сброс инпута.");
            resetFileInput(singleFileInput); 
            singleFileInput.click();
        });
        
        singleFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                logger.debug(`ImageUpload (Single): Файл выбран: ${file.name}`);
                handleSingleImageSelection(file);
            }
        });
        
        singleUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); singleUploadArea.classList.add('dragover'); });
        singleUploadArea.addEventListener('dragleave', () => singleUploadArea.classList.remove('dragover'));
        singleUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            singleUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                logger.debug(`ImageUpload (Single): Файл перетащен: ${e.dataTransfer.files[0].name}`);
                handleSingleImageSelection(e.dataTransfer.files[0]);
            }
        });
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
                singlePreviewContainer.classList.remove('hidden');
                singleUploadArea.classList.add('hidden');
                uploadedImages.single = file;
                
                const formContainer = document.getElementById('consultation-overlay');
                if (formContainer) {
                    const occasionSel = formContainer.querySelector('.occasion-selector');
                    const labels = formContainer.querySelectorAll('.input-label');
                    const prefsInput = formContainer.querySelector('.preferences-input');
                    if (occasionSel) occasionSel.classList.remove('hidden');
                    labels.forEach(l => l.classList.remove('hidden'));
                    if (prefsInput) prefsInput.classList.remove('hidden');
                }
                logger.info(`ImageUpload (Single): Изображение ${file.name} загружено и отображено.`);
                document.dispatchEvent(new CustomEvent('singleImageUploaded', { detail: { file: file } }));
            } else {
                logger.error("ImageUpload (Single): DOM элементы для превью не найдены.");
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

        slots.forEach(slot => {
            const slotIndex = parseInt(slot.dataset.slot, 10);
            const input = slot.querySelector('.compare-upload-input');
            if (!input) return logger.warn(`ImageUpload (Compare): Инпут для слота ${slotIndex} не найден.`);

            slot.addEventListener('click', function() {
                if (!this.classList.contains('filled')) {
                    logger.debug(`ImageUpload (Compare): Клик на пустой слот ${slotIndex}. Сброс инпута.`);
                    resetFileInput(input); 
                    input.click();
                }
            });
            
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    logger.debug(`ImageUpload (Compare): Файл выбран для слота ${slotIndex}: ${file.name}`);
                    handleCompareImageSelection(file, slotIndex);
                }
            });

            slot.addEventListener('dragover', (e) => { e.preventDefault(); if (!slot.classList.contains('filled')) slot.classList.add('dragover'); });
            slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('dragover');
                if (!slot.classList.contains('filled') && e.dataTransfer.files.length) {
                     logger.debug(`ImageUpload (Compare): Файл перетащен для слота ${slotIndex}: ${e.dataTransfer.files[0].name}`);
                    handleCompareImageSelection(e.dataTransfer.files[0], slotIndex);
                }
            });
        });
    }
    
    function handleCompareImageSelection(file, slotIndex) {
        logger.debug(`ImageUpload (Compare): Обработка изображения для слота ${slotIndex}: ${file.name}`);
        if (!isValidImageFile(file)) return;
        
        const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return logger.error(`ImageUpload (Compare): Слот ${slotIndex} не найден.`);
        
        isUploadingActive = true;
        const reader = new FileReader();
        reader.onload = (e) => {
            const uploadIconElement = slot.querySelector('.upload-icon');
            if (uploadIconElement) uploadIconElement.style.display = 'none';
            
            let img = slot.querySelector('.slot-image');
            if (!img) { img = document.createElement('img'); img.className = 'slot-image'; slot.appendChild(img); }
            img.src = e.target.result;
            img.alt = `Изображение ${slotIndex + 1}`;
            
            let removeBtn = slot.querySelector('.remove-image');
            if (!removeBtn) {
                removeBtn = document.createElement('div');
                removeBtn.className = 'remove-image'; removeBtn.textContent = '✕';
                removeBtn.setAttribute('role', 'button'); removeBtn.tabIndex = 0;
                removeBtn.dataset.slot = slotIndex;
                removeBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    logger.debug(`ImageUpload (Compare): Нажата кнопка удаления для слота ${slotIndex}.`);
                    resetSlot(slotIndex);
                });
                slot.appendChild(removeBtn);
            }
            removeBtn.style.display = 'flex';

            slot.classList.add('filled');
            uploadedImages.compare[slotIndex] = file;
            
            const filledSlotsCount = document.querySelectorAll('#compare-analysis-mode .image-slot.filled').length;
            logger.debug(`ImageUpload (Compare): Заполнено слотов: ${filledSlotsCount}`);
            if (filledSlotsCount >= 2) {
                const formContainer = document.getElementById('consultation-overlay');
                if(formContainer){
                    const occasionSel = formContainer.querySelector('.occasion-selector');
                    const labels = formContainer.querySelectorAll('.input-label');
                    const prefsInput = formContainer.querySelector('.preferences-input');
                    if (occasionSel) occasionSel.classList.remove('hidden');
                    labels.forEach(l => l.classList.remove('hidden'));
                    if (prefsInput) prefsInput.classList.remove('hidden');
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
        
    function isValidImageFile(file) {
        const validTypes = (config && config.appSettings && config.appSettings.supportedImageFormats) 
                           ? config.appSettings.supportedImageFormats.map(fmt => `image/${fmt.replace('jpg','jpeg')}`) // Преобразуем 'jpg' в 'image/jpeg'
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
    
    function resetSingleImageUpload() {
        logger.debug('ImageUpload: Сброс одиночного изображения...');
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
    
    function resetSlot(slotIndex) {
        logger.debug(`ImageUpload: Сброс слота сравнения ${slotIndex}...`);
        const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return logger.error(`ImageUpload: Слот ${slotIndex} не найден для сброса.`);
        
        const img = slot.querySelector('.slot-image');
        if (img) img.remove();
        const removeBtn = slot.querySelector('.remove-image');
        if (removeBtn) removeBtn.remove();
        
        const uploadIconElement = slot.querySelector('.upload-icon');
        if (uploadIconElement) uploadIconElement.style.display = 'flex';
        
        slot.classList.remove('filled');
        const input = slot.querySelector('.compare-upload-input');
        resetFileInput(input);
        uploadedImages.compare[slotIndex] = null;
        
        const filledSlotsCount = document.querySelectorAll('#compare-analysis-mode .image-slot.filled').length;
        logger.debug(`ImageUpload: Кол-во заполненных слотов после сброса слота ${slotIndex}: ${filledSlotsCount}`);
        if (filledSlotsCount < 2) { // Если стало меньше двух фото, скрываем поля и деактивируем кнопку
             const formContainer = document.getElementById('consultation-overlay');
             if(formContainer){
                const occasionSel = formContainer.querySelector('.occasion-selector');
                const labels = formContainer.querySelectorAll('.input-label');
                const prefsInput = formContainer.querySelector('.preferences-input');
                const submitBtn = formContainer.querySelector('#submit-consultation');
                if (occasionSel) occasionSel.classList.add('hidden');
                labels.forEach(l => l.classList.add('hidden'));
                if (prefsInput) prefsInput.classList.add('hidden');
                if (submitBtn) submitBtn.disabled = true; // Деактивируем, если фото стало < 2
            }
        }
        document.dispatchEvent(new CustomEvent('compareImageRemoved', { detail: { slot: slotIndex } }));
        logger.debug(`ImageUpload: Слот сравнения ${slotIndex} сброшен.`);
    }
    
    function resetCompareImageUploads() {
        logger.debug('ImageUpload: Сброс всех слотов сравнения...');
        if (imageSlotsContainer) {
            const slots = imageSlotsContainer.querySelectorAll('.image-slot');
            slots.forEach(slot => resetSlot(parseInt(slot.dataset.slot, 10)));
        }
        // Дополнительный сброс общих полей формы и кнопки
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
        document.dispatchEvent(new CustomEvent('allCompareImagesRemoved'));
        logger.debug('ImageUpload: Все слоты сравнения сброшены.');
    }
    
    function isUploading() { return isUploadingActive; }
    function getUploadedImages() { return uploadedImages; }
    
    return { init, resetSingleImageUpload, resetCompareImageUploads, resetSlot, isUploading, getUploadedImages };
})();