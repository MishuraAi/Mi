/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 0.4.3 (Полное исправление загрузки изображений)
ДАТА ОБНОВЛЕНИЯ: 2025-05-22

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
    
    // Элементы DOM для сравнения
    let imageSlots, compareUploadInputs;
    
    // Элементы DOM для переключения режимов
    let modeButtons, singleAnalysisMode, compareAnalysisMode;
    
    // Кнопки удаления
    let deleteButtons;
    
    // Флаги состояния
    let isUploadingActive = false;
    let uploadedImages = {
        single: null,
        compare: [null, null, null, null] // Для 4-х слотов сравнения
    };
    
    /**
     * Инициализация модуля
     */
    function init() {
        console.log("Инициализация модуля загрузки изображений");
        
        // Получаем ссылки на другие модули
        if (window.MishuraApp && window.MishuraApp.config) {
            config = window.MishuraApp.config;
        }
        
        if (window.MishuraApp && window.MishuraApp.utils) {
            logger = window.MishuraApp.utils.logger;
            uiHelpers = window.MishuraApp.utils.uiHelpers;
        }
        
        // Проверка наличия логгера
        if (!logger && console) {
            logger = {
                debug: console.debug.bind(console),
                info: console.info.bind(console),
                warn: console.warn.bind(console),
                error: console.error.bind(console)
            };
        }
        
        // Инициализация элементов DOM
        initDOMElements();
        
        // Настройка обработчиков событий
        initSingleImageUpload();
        initCompareImageUpload();
        initDeleteButtons();
        initModeButtons();
        
        logger.debug("Модуль загрузки изображений инициализирован");
    }
    
    /**
     * Инициализация элементов DOM
     * @private
     */
    function initDOMElements() {
        console.log("Инициализация DOM элементов");
        
        // Элементы для одиночной загрузки
        singleUploadArea = document.getElementById('single-upload-area');
        singleFileInput = document.getElementById('single-upload-input');
        singlePreviewContainer = document.getElementById('single-preview-container');
        singlePreviewImage = document.getElementById('single-preview-image');
        
        // Элементы для сравнения
        imageSlots = document.querySelectorAll('.image-slot');
        compareUploadInputs = document.querySelectorAll('.compare-upload-input');
        
        // Элементы для переключения режимов
        modeButtons = document.querySelectorAll('.mode-button');
        singleAnalysisMode = document.getElementById('single-analysis-mode');
        compareAnalysisMode = document.getElementById('compare-analysis-mode');
        
        // Кнопки удаления
        deleteButtons = document.querySelectorAll('.delete-image');
        
        // Логирование результатов
        console.log("Элементы DOM инициализированы:");
        console.log("- singleUploadArea:", singleUploadArea);
        console.log("- singleFileInput:", singleFileInput);
        console.log("- imageSlots.length:", imageSlots.length);
        console.log("- modeButtons.length:", modeButtons.length);
        
        // Логирование ошибок, если элементы не найдены
        if (!singleUploadArea) logger.warn("Элемент singleUploadArea не найден");
        if (!singleFileInput) logger.warn("Элемент singleFileInput не найден");
        if (!singlePreviewContainer) logger.warn("Элемент singlePreviewContainer не найден");
        if (!singlePreviewImage) logger.warn("Элемент singlePreviewImage не найден");
        if (!singleAnalysisMode) logger.warn("Элемент singleAnalysisMode не найден");
        if (!compareAnalysisMode) logger.warn("Элемент compareAnalysisMode не найден");
    }
    
    /**
     * Инициализация переключателей режимов анализа
     * @private
     */
    function initModeButtons() {
        if (!modeButtons || !modeButtons.length) {
            logger.warn("Переключатели режимов не найдены");
            return;
        }
        
        console.log("Инициализация кнопок режимов");
        
        modeButtons.forEach(button => {
            // Сначала удалим существующие обработчики, чтобы избежать дублирования
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                const mode = this.getAttribute('data-mode');
                console.log(`Кнопка режима нажата: ${mode}`);
                
                // Убираем активный класс со всех кнопок
                modeButtons.forEach(btn => btn.classList.remove('active'));
                
                // Добавляем активный класс на текущую кнопку
                this.classList.add('active');
                
                // Скрываем все режимы
                if (singleAnalysisMode) singleAnalysisMode.classList.add('hidden');
                if (compareAnalysisMode) compareAnalysisMode.classList.add('hidden');
                
                // Показываем выбранный режим
                if (mode === 'single' && singleAnalysisMode) {
                    singleAnalysisMode.classList.remove('hidden');
                } else if (mode === 'compare' && compareAnalysisMode) {
                    compareAnalysisMode.classList.remove('hidden');
                }
                
                // Отправляем событие смены режима
                document.dispatchEvent(new CustomEvent('modeChanged', {
                    detail: { mode: mode }
                }));
                
                logger.debug(`Переключение на режим: ${mode}`);
            });
        });
        
        logger.debug("Обработчики переключения режимов инициализированы");
    }
    
    /**
     * Инициализация загрузки одиночного изображения
     * @private
     */
    function initSingleImageUpload() {
        if (!singleUploadArea || !singleFileInput) {
            console.warn("Невозможно инициализировать загрузку одиночного изображения - элементы не найдены");
            return;
        }
        
        console.log("Инициализация загрузки одиночного изображения");
        
        // Сначала удалим существующие обработчики, чтобы избежать дублирования
        const newUploadArea = singleUploadArea.cloneNode(true);
        singleUploadArea.parentNode.replaceChild(newUploadArea, singleUploadArea);
        singleUploadArea = newUploadArea;
        
        const newFileInput = singleFileInput.cloneNode(true);
        singleFileInput.parentNode.replaceChild(newFileInput, singleFileInput);
        singleFileInput = newFileInput;
        
        // Обработчик клика
        singleUploadArea.addEventListener('click', function(event) {
            console.log("Клик на область загрузки одиночного изображения");
            event.preventDefault();
            event.stopPropagation();
            singleFileInput.click();
        });
        
        // Обработчик изменения файла
        singleFileInput.addEventListener('change', function(event) {
            console.log("Выбран файл для одиночной загрузки");
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
            console.log("Файл перетащен в область загрузки одиночного изображения");
            e.preventDefault();
            singleUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                const file = e.dataTransfer.files[0];
                handleSingleImageSelection(file);
            }
        });
        
        console.log("Обработчики одиночной загрузки инициализированы");
    }
    
    /**
     * Обработка выбора одиночного изображения
     * @private
     * @param {File} file - выбранный файл изображения
     */
    function handleSingleImageSelection(file) {
        console.log("Обработка выбора одиночного изображения", file);
        
        if (!isValidImageFile(file)) {
            console.warn("Выбранный файл не является изображением");
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Пожалуйста, выберите изображение');
            } else {
                alert('Пожалуйста, выберите изображение');
            }
            return;
        }
        
        isUploadingActive = true;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            console.log("Изображение загружено и готово к отображению");
            
            if (singlePreviewImage && singlePreviewContainer && singleUploadArea) {
                singlePreviewImage.src = e.target.result;
                singlePreviewContainer.classList.remove('hidden');
                singleUploadArea.classList.add('hidden');
                
                // Сохраняем информацию о загруженном изображении
                uploadedImages.single = file;
                
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
            } else {
                console.error("Элементы для отображения превью не найдены");
            }
            
            isUploadingActive = false;
        };
        
        reader.onerror = function(error) {
            console.error("Ошибка при чтении файла:", error);
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Ошибка при чтении файла');
            } else {
                alert('Ошибка при чтении файла');
            }
            isUploadingActive = false;
        };
        
        reader.readAsDataURL(file);
    }
    
    /**
     * Инициализация загрузки изображений для сравнения
     * @private
     */
    function initCompareImageUpload() {
        if (!imageSlots.length) {
            console.warn("Невозможно инициализировать загрузку изображений для сравнения - слоты не найдены");
            return;
        }
        
        console.log("Инициализация загрузки изображений для сравнения");
        
        // Обработчики для слотов сравнения
        imageSlots.forEach(slot => {
            // Сначала удалим существующие обработчики, чтобы избежать дублирования
            const newSlot = slot.cloneNode(true);
            slot.parentNode.replaceChild(newSlot, slot);
            
            newSlot.addEventListener('click', function(e) {
                const slotIndex = parseInt(newSlot.dataset.slot, 10);
                console.log(`Клик на слот сравнения ${slotIndex}`);
                
                if (!newSlot.classList.contains('filled')) {
                    const input = newSlot.querySelector('.compare-upload-input');
                    if (input) input.click();
                }
            });
            
            // Обработчики перетаскивания для слотов
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
                const slotIndex = parseInt(newSlot.dataset.slot, 10);
                console.log(`Файл перетащен в слот сравнения ${slotIndex}`);
                
                e.preventDefault();
                newSlot.classList.remove('dragover');
                
                if (!newSlot.classList.contains('filled') && e.dataTransfer.files.length) {
                    const file = e.dataTransfer.files[0];
                    handleCompareImageSelection(file, slotIndex);
                }
            });
            
            // Настраиваем инпут для этого слота
            const input = newSlot.querySelector('.compare-upload-input');
            if (input) {
                // Удаляем существующие обработчики
                const newInput = input.cloneNode(true);
                input.parentNode.replaceChild(newInput, input);
                
                newInput.addEventListener('change', function(e) {
                    const slotIndex = parseInt(newSlot.dataset.slot, 10);
                    console.log(`Выбран файл для слота сравнения ${slotIndex}`);
                    
                    const file = e.target.files[0];
                    if (file) {
                        handleCompareImageSelection(file, slotIndex);
                    }
                });
            }
        });
        
        // Обновляем список слотов после переназначения
        imageSlots = document.querySelectorAll('.image-slot');
        compareUploadInputs = document.querySelectorAll('.compare-upload-input');
        
        console.log("Обработчики загрузки для сравнения инициализированы");
    }
    
    /**
     * Обработка выбора изображения для сравнения
     * @private
     * @param {File} file - выбранный файл изображения
     * @param {number} slotIndex - индекс слота для изображения
     */
    function handleCompareImageSelection(file, slotIndex) {
        console.log(`Обработка выбора изображения для слота ${slotIndex}`, file);
        
        if (!isValidImageFile(file)) {
            console.warn("Выбранный файл не является изображением");
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Пожалуйста, выберите изображение');
            } else {
                alert('Пожалуйста, выберите изображение');
            }
            return;
        }
        
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) {
            console.error(`Слот ${slotIndex} не найден`);
            return;
        }
        
        isUploadingActive = true;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            console.log(`Изображение для слота ${slotIndex} загружено и готово к отображению`);
            
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
            
            // Сохраняем информацию о загруженном изображении
            uploadedImages.compare[slotIndex] = file;
            
            // Активация полей формы, если загружено хотя бы 2 изображения
            const filledSlots = document.querySelectorAll('.image-slot.filled');
            if (filledSlots.length >= 2) {
                const occasionSelector = document.querySelector('.occasion-selector');
                const inputLabels = document.querySelectorAll('.input-label');
                const preferencesInput = document.querySelector('.preferences-input');
                
                if (occasionSelector) occasionSelector.classList.remove('hidden');
                inputLabels.forEach(label => label.classList.remove('hidden'));
                if (preferencesInput) preferencesInput.classList.remove('hidden');
            }
            
            // Отправка события о загрузке изображения
            document.dispatchEvent(new CustomEvent('compareImageUploaded', {
                detail: { file: file, slot: slotIndex }
            }));
            
            isUploadingActive = false;
        };
        
        reader.onerror = function(error) {
            console.error(`Ошибка при чтении файла для слота ${slotIndex}:`, error);
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Ошибка при чтении файла');
            } else {
                alert('Ошибка при чтении файла');
            }
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
        if (!deleteButtons.length) {
            console.warn("Кнопки удаления не найдены");
            return;
        }
        
        console.log("Инициализация кнопок удаления");
        
        deleteButtons.forEach(button => {
            // Сначала удалим существующие обработчики, чтобы избежать дублирования
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                const target = this.dataset.target;
                console.log(`Кнопка удаления нажата для ${target}`);
                
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
        
        // Обновляем список кнопок после переназначения
        deleteButtons = document.querySelectorAll('.delete-image');
        
        console.log("Обработчики кнопок удаления инициализированы");
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
        console.log('Сброс одиночного изображения');
        
        if (singleFileInput) singleFileInput.value = '';
        if (singlePreviewContainer) singlePreviewContainer.classList.add('hidden');
        if (singleUploadArea) singleUploadArea.classList.remove('hidden');
        
        // Сбрасываем информацию о загруженном изображении
        uploadedImages.single = null;
    }
    
    /**
     * Сброс слота сравнения
     * @param {number} slotIndex - индекс слота для сброса
     */
    function resetSlot(slotIndex) {
        console.log(`Сброс слота сравнения ${slotIndex}`);
        
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) {
            console.error(`Слот ${slotIndex} не найден`);
            return;
        }
        
        // Очищаем слот
        while (slot.firstChild) {
            slot.removeChild(slot.firstChild);
        }
        
        // Сбрасываем класс filled
        slot.classList.remove('filled');
        
        // Сбрасываем информацию о загруженном изображении
        uploadedImages.compare[slotIndex] = null;
        
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
        console.log('Сброс всех слотов сравнения');
        
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
    
    /**
     * Проверка, загружены ли изображения для сравнения
     * @returns {boolean} - флаг наличия загруженных изображений
     */
    function hasCompareImages() {
        const filledSlots = document.querySelectorAll('.image-slot.filled');
        return filledSlots.length >= 2;
    }
    
    /**
     * Проверка, загружено ли одиночное изображение
     * @returns {boolean} - флаг наличия загруженного изображения
     */
    function hasSingleImage() {
        return uploadedImages.single !== null;
    }
    
    /**
     * Получение загруженных изображений
     * @returns {Object} - объект с загруженными изображениями
     */
    function getUploadedImages() {
        return uploadedImages;
    }
    
    // Публичный API модуля
    return {
        init,
        resetSingleImageUpload,
        resetCompareImageUploads,
        resetSlot,
        isUploading,
        hasCompareImages,
        hasSingleImage,
        getUploadedImages
    };
})();