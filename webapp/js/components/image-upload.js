/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает функциональность загрузки и отображения изображений для консультации.
Включает обработку перетаскивания файлов, предварительный просмотр и валидацию.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.components = window.MishuraApp.components || {};
window.MishuraApp.components.imageUpload = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger, uiHelpers;
    
    // Элементы DOM для одиночной загрузки
    let singleUploadArea, singleFileInput, singlePreviewContainer, singlePreviewImage;
    let deleteButtons;
    
    // Элементы DOM для сравнения
    let imageSlots, compareUploadInputs;
    
    // Флаг активной загрузки
    let isUploadingActive = false;
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger;
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        // Инициализация элементов DOM
        initDOMElements();
        
        // Настройка обработчиков событий
        initSingleImageUpload();
        initCompareImageUpload();
        initDeleteButtons();
        
        logger.debug("Модуль загрузки изображений инициализирован");
    }
    
    /**
     * Инициализация элементов DOM
     * @private
     */
    function initDOMElements() {
        // Элементы для одиночной загрузки
        singleUploadArea = document.getElementById('single-upload-area');
        singleFileInput = document.getElementById('single-upload-input');
        singlePreviewContainer = document.getElementById('single-preview-container');
        singlePreviewImage = document.getElementById('single-preview-image');
        
        // Элементы для сравнения
        imageSlots = document.querySelectorAll('.image-slot');
        compareUploadInputs = document.querySelectorAll('.compare-upload-input');
        
        // Кнопки удаления
        deleteButtons = document.querySelectorAll('.delete-image');
        
        // Логирование ошибок, если элементы не найдены
        if (!singleUploadArea) logger.warn("Элемент singleUploadArea не найден");
        if (!singleFileInput) logger.warn("Элемент singleFileInput не найден");
        if (!singlePreviewContainer) logger.warn("Элемент singlePreviewContainer не найден");
        if (!singlePreviewImage) logger.warn("Элемент singlePreviewImage не найден");
    }
    
    /**
     * Инициализация загрузки одиночного изображения
     * @private
     */
    function initSingleImageUpload() {
        if (!singleUploadArea || !singleFileInput) return;
        
        // Обработчик клика
        singleUploadArea.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            singleFileInput.click();
        });
        
        // Обработчик изменения файла
        singleFileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                handleSingleImageSelection(file);
            }
        });
        
        // Обработчики перетаскивания
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
                const file = e.dataTransfer.files[0];
                handleSingleImageSelection(file);
            }
        });
    }
    
    /**
     * Обработка выбора одиночного изображения
     * @private
     * @param {File} file - выбранный файл изображения
     */
    function handleSingleImageSelection(file) {
        if (!isValidImageFile(file)) {
            uiHelpers.showToast('Пожалуйста, выберите изображение');
            return;
        }
        
        isUploadingActive = true;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (singlePreviewImage && singlePreviewContainer && singleUploadArea) {
                singlePreviewImage.src = e.target.result;
                singlePreviewContainer.classList.remove('hidden');
                singleUploadArea.classList.add('hidden');
                
                // Активация полей формы
                const occasionSelector = document.querySelector('.occasion-selector');
                const inputLabels = document.querySelectorAll('.input-label');
                const preferencesInput = document.querySelector('.preferences-input');
                
                if (occasionSelector) occasionSelector.classList.remove('hidden');
                inputLabels.forEach(label => label.classList.remove('hidden'));
                if (preferencesInput) preferencesInput.classList.remove('hidden');
                
                // Отправка события о загрузке изображения
                document.dispatchEvent(new CustomEvent('singleImageUploaded', {
                    detail: { file: file }
                }));
            }
            
            isUploadingActive = false;
        };
        
        reader.onerror = function() {
            uiHelpers.showToast('Ошибка при чтении файла');
            isUploadingActive = false;
        };
        
        reader.readAsDataURL(file);
    }
    
    /**
     * Инициализация загрузки изображений для сравнения
     * @private
     */
    function initCompareImageUpload() {
        if (!imageSlots.length) return;
        
        // Обработчики для слотов сравнения
        imageSlots.forEach(slot => {
            slot.addEventListener('click', function(e) {
                if (!slot.classList.contains('filled')) {
                    const input = slot.querySelector('.compare-upload-input');
                    if (input) input.click();
                }
            });
            
            // Обработчики перетаскивания для слотов
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
                    const file = e.dataTransfer.files[0];
                    const slotIndex = parseInt(slot.dataset.slot, 10);
                    handleCompareImageSelection(file, slotIndex);
                }
            });
        });
        
        // Обработчики для инпутов сравнения
        compareUploadInputs = document.querySelectorAll('.compare-upload-input');
        compareUploadInputs.forEach(input => {
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const slotIndex = parseInt(this.dataset.slot, 10);
                    handleCompareImageSelection(file, slotIndex);
                }
            });
        });
    }
    
    /**
     * Обработка выбора изображения для сравнения
     * @private
     * @param {File} file - выбранный файл изображения
     * @param {number} slotIndex - индекс слота для изображения
     */
    function handleCompareImageSelection(file, slotIndex) {
        if (!isValidImageFile(file)) {
            uiHelpers.showToast('Пожалуйста, выберите изображение');
            return;
        }
        
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return;
        
        isUploadingActive = true;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // Очищаем слот
            while (slot.firstChild) {
                slot.removeChild(slot.firstChild);
            }
            
            // Добавляем изображение
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'slot-image';
            img.alt = `Изображение ${slotIndex + 1} для сравнения`;
            
            // Добавляем кнопку удаления
            const removeBtn = document.createElement('div');
            removeBtn.className = 'remove-image';
            removeBtn.textContent = '✕';
            removeBtn.setAttribute('role', 'button');
            removeBtn.setAttribute('tabindex', '0');
            removeBtn.setAttribute('aria-label', 'Удалить изображение');
            removeBtn.dataset.slot = slotIndex;
            
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                resetSlot(slotIndex);
                
                // Отправка события об удалении изображения
                document.dispatchEvent(new CustomEvent('compareImageRemoved', {
                    detail: { slot: slotIndex }
                }));
            });
            
            slot.appendChild(img);
            slot.appendChild(removeBtn);
            slot.classList.add('filled');
            
            // Отправка события о загрузке изображения
            document.dispatchEvent(new CustomEvent('compareImageUploaded', {
                detail: { file: file, slot: slotIndex }
            }));
            
            isUploadingActive = false;
        };
        
        reader.onerror = function() {
            uiHelpers.showToast('Ошибка при чтении файла');
            isUploadingActive = false;
        };
        
        reader.readAsDataURL(file);
    }
    
    /**
     * Инициализация кнопок удаления
     * @private
     */
    function initDeleteButtons() {
        deleteButtons = document.querySelectorAll('.delete-image');
        if (!deleteButtons.length) return;
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const target = this.dataset.target;
                
                if (target === 'single') {
                    resetSingleImageUpload();
                    
                    // Отправка события об удалении изображения
                    document.dispatchEvent(new CustomEvent('singleImageRemoved'));
                } else if (target.startsWith('slot-')) {
                    const slotIndex = parseInt(target.split('-')[1], 10);
                    resetSlot(slotIndex);
                    
                    // Отправка события об удалении изображения
                    document.dispatchEvent(new CustomEvent('compareImageRemoved', {
                        detail: { slot: slotIndex }
                    }));
                }
            });
        });
    }
    
    /**
     * Проверка типа файла изображения
     * @private
     * @param {File} file - файл для проверки
     * @returns {boolean} - результат проверки
     */
    function isValidImageFile(file) {
        return file && file.type && file.type.match('image.*');
    }
    
    /**
     * Сброс одиночного изображения
     */
    function resetSingleImageUpload() {
        logger.debug('Сброс одиночного изображения');
        
        if (singleFileInput) singleFileInput.value = '';
        if (singlePreviewContainer) singlePreviewContainer.classList.add('hidden');
        if (singleUploadArea) singleUploadArea.classList.remove('hidden');
    }
    
    /**
     * Сброс слота сравнения
     * @param {number} slotIndex - индекс слота для сброса
     */
    function resetSlot(slotIndex) {
        logger.debug(`Сброс слота сравнения ${slotIndex}`);
        
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return;
        
        // Очищаем слот
        while (slot.firstChild) {
            slot.removeChild(slot.firstChild);
        }
        
        // Сбрасываем класс filled
        slot.classList.remove('filled');
        
        // Добавляем иконку загрузки обратно
        const uploadIcon = document.createElement('div');
        uploadIcon.className = 'upload-icon';
        uploadIcon.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><use href="#upload-svg-icon"></use></svg>';
        uploadIcon.setAttribute('aria-hidden', 'true');
        
        // Добавляем поле загрузки
        const input = document.createElement('input');
        input.type = 'file';
        input.className = 'compare-upload-input';
        input.accept = 'image/*';
        input.dataset.slot = slotIndex;
        
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                handleCompareImageSelection(file, slotIndex);
            }
        });
        
        slot.appendChild(uploadIcon);
        slot.appendChild(input);
    }
    
    /**
     * Сброс всех слотов сравнения
     */
    function resetCompareImageUploads() {
        logger.debug('Сброс всех слотов сравнения');
        
        imageSlots.forEach(slot => {
            const slotIndex = parseInt(slot.dataset.slot, 10);
            resetSlot(slotIndex);
        });
        
        // Отправка события об удалении всех изображений
        document.dispatchEvent(new CustomEvent('allCompareImagesRemoved'));
    }
    
    /**
     * Проверка, идет ли загрузка изображения
     * @returns {boolean} - флаг активной загрузки
     */
    function isUploading() {
        return isUploadingActive;
    }
    
    // Публичный API модуля
    return {
        init,
        resetSingleImageUpload,
        resetCompareImageUploads,
        resetSlot,
        isUploading
    };
})();