/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 0.4.5 (Усилен сброс input.value, рефакторинг обработчиков)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает функциональность загрузки и отображения изображений для консультации.
Включает обработку перетаскивания файлов, предварительный просмотр и валидацию.
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
        logger = window.MishuraApp.utils.logger || { debug: (...args)=>console.debug("ImageUploadLogger:",...args), info: (...args)=>console.info("ImageUploadLogger:",...args), warn: (...args)=>console.warn("ImageUploadLogger:",...args), error: (...args)=>console.error("ImageUploadLogger:",...args) };
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        logger.debug("Инициализация модуля загрузки изображений (v0.4.5)");
        initDOMElements();
        initModeButtons(); // Важно инициализировать режимы до обработчиков загрузки
        initSingleImageUpload();
        initCompareImageUpload();
        logger.debug("Модуль загрузки изображений инициализирован (v0.4.5)");
    }
    
    function initDOMElements() {
        logger.debug("ImageUpload: Инициализация DOM элементов...");
        singleUploadArea = document.getElementById('single-upload-area');
        singleFileInput = document.getElementById('single-upload-input');
        singlePreviewContainer = document.getElementById('single-preview-container');
        singlePreviewImage = document.getElementById('single-preview-image');
        singleDeleteButton = document.querySelector('#single-preview-container .delete-image[data-target="single"]');
        
        imageSlotsContainer = document.querySelector('#compare-analysis-mode .image-slots');
        
        modeButtons = document.querySelectorAll('#consultation-overlay .mode-button'); // Ищем кнопки только внутри модалки консультации
        singleAnalysisMode = document.getElementById('single-analysis-mode');
        compareAnalysisMode = document.getElementById('compare-analysis-mode');

        if (!singleUploadArea) logger.warn("ImageUpload DOM: 'single-upload-area' не найден");
        if (!singleFileInput) logger.warn("ImageUpload DOM: 'single-upload-input' не найден");
        if (!singlePreviewContainer) logger.warn("ImageUpload DOM: 'single-preview-container' не найден");
        if (!singlePreviewImage) logger.warn("ImageUpload DOM: 'single-preview-image' не найден");
        if (!singleDeleteButton) logger.warn("ImageUpload DOM: кнопка удаления для одиночного фото не найдена");
        if (!imageSlotsContainer) logger.warn("ImageUpload DOM: контейнер '.image-slots' для сравнения не найден");
        if (!modeButtons.length) logger.warn("ImageUpload DOM: кнопки переключения режимов '.mode-button' не найдены");
        if (!singleAnalysisMode) logger.warn("ImageUpload DOM: 'single-analysis-mode' не найден");
        if (!compareAnalysisMode) logger.warn("ImageUpload DOM: 'compare-analysis-mode' не найден");
    }
    
    function initModeButtons() {
        if (!modeButtons || !modeButtons.length) return logger.warn("Переключатели режимов не найдены, инициализация пропущена.");
        
        modeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const mode = this.getAttribute('data-mode');
                logger.debug(`Кнопка режима нажата: ${mode}`);
                modeButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                if (singleAnalysisMode) singleAnalysisMode.classList.add('hidden');
                if (compareAnalysisMode) compareAnalysisMode.classList.add('hidden');
                
                if (mode === 'single' && singleAnalysisMode) singleAnalysisMode.classList.remove('hidden');
                else if (mode === 'compare' && compareAnalysisMode) compareAnalysisMode.classList.remove('hidden');
                
                document.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode: mode } }));
            });
        });
        // Установка начального активного режима (например, первый или тот, что с классом active в HTML)
        const initialActiveButton = document.querySelector('#consultation-overlay .mode-button.active') || 
                                   (modeButtons.length > 0 ? modeButtons[0] : null);
        if (initialActiveButton) {
            logger.debug(`Установка начального режима: ${initialActiveButton.dataset.mode}`);
            initialActiveButton.click(); // Эмулируем клик для установки состояния
        } else {
            logger.warn("Не удалось установить начальный активный режим: кнопки режимов не найдены или нет активной по умолчанию.");
        }
    }

    function resetFileInput(inputElement) {
        if (inputElement) {
            try {
                inputElement.value = null;
                logger.debug(`Значение инпута файла '${inputElement.id || 'compare-input'}' сброшено.`);
            } catch (ex) {
                logger.warn("Не удалось сбросить input.value напрямую.", ex);
            }
        } else {
            logger.warn("Попытка сбросить несуществующий file input.");
        }
    }

    function initSingleImageUpload() {
        if (!singleUploadArea || !singleFileInput || !singleDeleteButton) {
            logger.warn("Пропуск initSingleImageUpload: один или несколько DOM элементов не найдены.");
            return;
        }

        singleUploadArea.addEventListener('click', () => {
            logger.debug("Клик на область одиночной загрузки. Сброс инпута singleFileInput.");
            resetFileInput(singleFileInput); 
            singleFileInput.click();
        });
        
        singleFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                logger.debug(`Файл выбран для одиночной загрузки: ${file.name}`);
                handleSingleImageSelection(file);
            } else {
                logger.debug("Диалог выбора файла для одиночной загрузки отменен пользователем.");
            }
        });
        
        singleUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); singleUploadArea.classList.add('dragover'); });
        singleUploadArea.addEventListener('dragleave', () => singleUploadArea.classList.remove('dragover'));
        singleUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            singleUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                logger.debug(`Файл перетащен для одиночной загрузки: ${e.dataTransfer.files[0].name}`);
                handleSingleImageSelection(e.dataTransfer.files[0]);
            }
        });
        singleDeleteButton.addEventListener('click', () => {
            logger.debug("Нажата кнопка удаления для одиночного изображения.");
            resetSingleImageUpload(); // Этот метод уже должен вызвать событие singleImageRemoved
        });
    }
    
    function handleSingleImageSelection(file) {
        logger.debug(`Обработка одиночного изображения: ${file.name}`);
        if (!isValidImageFile(file)) return; // isValidImageFile покажет toast, если нужно

        isUploadingActive = true;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (singlePreviewImage && singlePreviewContainer && singleUploadArea) {
                singlePreviewImage.src = e.target.result;
                singlePreviewContainer.classList.remove('hidden');
                singleUploadArea.classList.add('hidden');
                uploadedImages.single = file;
                
                // Показываем поля формы при загрузке фото
                const formContainer = document.getElementById('consultation-overlay');
                if (formContainer) {
                    const occasionSel = formContainer.querySelector('.occasion-selector');
                    const labels = formContainer.querySelectorAll('.input-label');
                    const prefsInput = formContainer.querySelector('.preferences-input');
                    if (occasionSel) occasionSel.classList.remove('hidden');
                    labels.forEach(l => l.classList.remove('hidden'));
                    if (prefsInput) prefsInput.classList.remove('hidden');
                } else {
                    logger.warn("Контейнер формы 'consultation-overlay' не найден для показа доп. полей.");
                }
                
                logger.info(`Одиночное изображение ${file.name} загружено и отображено.`);
                document.dispatchEvent(new CustomEvent('singleImageUploaded', { detail: { file: file } }));
            } else {
                logger.error("DOM элементы для превью одиночного изображения не найдены при попытке отображения.");
            }
            isUploadingActive = false;
        };
        reader.onerror = (error) => {
            logger.error("Ошибка FileReader (одиночная загрузка):", error);
            if (uiHelpers) uiHelpers.showToast('Ошибка при чтении файла.');
            isUploadingActive = false;
        };
        reader.readAsDataURL(file);
    }
    
    function initCompareImageUpload() {
        if (!imageSlotsContainer) return logger.warn("Пропуск initCompareImageUpload: imageSlotsContainer не найден.");
        
        const slots = imageSlotsContainer.querySelectorAll('.image-slot');
        if (!slots.length) return logger.warn("Слоты для сравнения (.image-slot) не найдены внутри imageSlotsContainer.");

        slots.forEach(slot => {
            const slotIndex = parseInt(slot.dataset.slot, 10);
            const input = slot.querySelector('.compare-upload-input');
            if (!input) return logger.warn(`Инпут для слота ${slotIndex} не найден.`);

            slot.addEventListener('click', function() {
                if (!this.classList.contains('filled')) {
                    logger.debug(`Клик на пустой слот сравнения ${slotIndex}. Сброс инпута.`);
                    resetFileInput(input); 
                    input.click();
                } else {
                    logger.debug(`Клик на заполненный слот ${slotIndex}. Действий нет.`);
                }
            });
            
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    logger.debug(`Файл выбран для слота сравнения ${slotIndex}: ${file.name}`);
                    handleCompareImageSelection(file, slotIndex);
                } else {
                     logger.debug(`Диалог выбора файла для слота ${slotIndex} отменен.`);
                }
            });

            slot.addEventListener('dragover', (e) => { e.preventDefault(); if (!slot.classList.contains('filled')) slot.classList.add('dragover'); });
            slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('dragover');
                if (!slot.classList.contains('filled') && e.dataTransfer.files.length) {
                    logger.debug(`Файл перетащен для слота сравнения ${slotIndex}: ${e.dataTransfer.files[0].name}`);
                    handleCompareImageSelection(e.dataTransfer.files[0], slotIndex);
                }
            });
        });
    }
    
    function handleCompareImageSelection(file, slotIndex) {
        logger.debug(`Обработка изображения для слота ${slotIndex}: ${file.name}`);
        if (!isValidImageFile(file)) return;
        
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return logger.error(`Слот ${slotIndex} не найден для handleCompareImageSelection.`);
        
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
            img.alt = `Изображение ${slotIndex + 1}`;
            
            let removeBtn = slot.querySelector('.remove-image');
            if (!removeBtn) {
                removeBtn = document.createElement('div');
                removeBtn.className = 'remove-image';
                removeBtn.textContent = '✕';
                removeBtn.setAttribute('role', 'button');
                removeBtn.tabIndex = 0;
                removeBtn.dataset.slot = slotIndex;
                removeBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    logger.debug(`Нажата кнопка удаления для слота ${slotIndex} (динамическая).`);
                    resetSlot(slotIndex); // resetSlot вызовет событие compareImageRemoved
                });
                slot.appendChild(removeBtn);
            }
            removeBtn.style.display = 'flex';

            slot.classList.add('filled');
            uploadedImages.compare[slotIndex] = file;
            
            const filledSlotsCount = document.querySelectorAll('#compare-analysis-mode .image-slot.filled').length;
            logger.debug(`Количество заполненных слотов для сравнения: ${filledSlotsCount}`);
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
            logger.info(`Изображение ${file.name} загружено в слот ${slotIndex}.`);
            document.dispatchEvent(new CustomEvent('compareImageUploaded', { detail: { file: file, slot: slotIndex } }));
            isUploadingActive = false;
        };
        reader.onerror = (error) => {
            logger.error(`Ошибка FileReader (слот ${slotIndex}):`, error);
            if (uiHelpers) uiHelpers.showToast('Ошибка при чтении файла.');
            isUploadingActive = false;
        };
        reader.readAsDataURL(file);
    }
        
    function isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const defaultMaxSize = 5 * 1024 * 1024; // 5MB
        const maxSize = (config && config.LIMITS && config.LIMITS.MAX_FILE_SIZE) ? config.LIMITS.MAX_FILE_SIZE : defaultMaxSize;
        
        if (!file || !file.type) { logger.warn("isValidImageFile: Файл или тип файла отсутствует."); return false; }
        if (!validTypes.includes(file.type)) {
            logger.warn(`isValidImageFile: Недопустимый тип файла: ${file.type} для файла ${file.name}`);
            if (uiHelpers) uiHelpers.showToast(`Неверный тип файла: ${file.name}. Допустимы: JPG, PNG, WEBP.`);
            return false;
        }
        if (file.size > maxSize) {
            const fileSizeMB = (file.size / (1024*1024)).toFixed(1);
            const maxAllowedMB = (maxSize / (1024*1024)).toFixed(1);
            logger.warn(`isValidImageFile: Файл ${file.name} слишком большой: ${fileSizeMB}MB, макс: ${maxAllowedMB}MB`);
            if (uiHelpers) uiHelpers.showToast(`Файл ${file.name} слишком большой (${fileSizeMB} МБ). Макс. ${maxAllowedMB} МБ`);
            return false;
        }
        return true;
    }
    
    function resetSingleImageUpload() {
        logger.debug('Сброс одиночного изображения (resetSingleImageUpload)...');
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
            if (submitBtn) submitBtn.disabled = true; // Делаем неактивной
        }
        document.dispatchEvent(new CustomEvent('singleImageRemoved')); // Важно вызвать событие
        logger.debug('Одиночное изображение сброшено.');
    }
    
    function resetSlot(slotIndex) {
        logger.debug(`Сброс слота сравнения ${slotIndex}...`);
        const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return logger.error(`Слот ${slotIndex} не найден для сброса.`);
        
        const img = slot.querySelector('.slot-image');
        if (img) img.remove();
        const removeBtn = slot.querySelector('.remove-image');
        if (removeBtn) removeBtn.remove();
        
        const uploadIconElement = slot.querySelector('.upload-icon');
        if (uploadIconElement) uploadIconElement.style.display = 'flex'; // Восстанавливаем видимость иконки
        
        slot.classList.remove('filled');
        const input = slot.querySelector('.compare-upload-input');
        resetFileInput(input);
        uploadedImages.compare[slotIndex] = null;
        
        // Обновляем состояние кнопки и полей формы, если количество фото < 2
        const filledSlotsCount = document.querySelectorAll('#compare-analysis-mode .image-slot.filled').length;
        logger.debug(`Количество заполненных слотов после сброса слота ${slotIndex}: ${filledSlotsCount}`);
        if (filledSlotsCount < 2) {
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
        }
        document.dispatchEvent(new CustomEvent('compareImageRemoved', { detail: { slot: slotIndex } })); // Событие для обновления в comparison.js
        logger.debug(`Слот сравнения ${slotIndex} сброшен.`);
    }
    
    function resetCompareImageUploads() {
        logger.debug('Сброс всех слотов сравнения (resetCompareImageUploads)...');
        if (imageSlotsContainer) {
            const slots = imageSlotsContainer.querySelectorAll('.image-slot');
            slots.forEach(slot => resetSlot(parseInt(slot.dataset.slot, 10))); // resetSlot вызовет нужные события
        }
        // Дополнительно убедиться, что поля формы скрыты (может быть избыточно, если resetSlot уже все сделал)
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
        logger.debug('Все слоты сравнения сброшены.');
    }
    
    function isUploading() { return isUploadingActive; }
    function getUploadedImages() { return uploadedImages; }
    
    return { init, resetSingleImageUpload, resetCompareImageUploads, resetSlot, isUploading, getUploadedImages };
})();