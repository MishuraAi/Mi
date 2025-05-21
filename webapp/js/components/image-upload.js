/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 0.4.4 (Улучшенная обработка событий и управление состоянием)
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
    
    // Элементы DOM для сравнения
    let imageSlotsContainer; // Родительский контейнер для слотов
    
    // Элементы DOM для переключения режимов
    let modeButtons, singleAnalysisMode, compareAnalysisMode;
    
    // Кнопки удаления (для одиночной загрузки)
    let singleDeleteButton;
    
    // Флаги состояния
    let isUploadingActive = false; // Общий флаг активности загрузки
    let uploadedImages = {
        single: null,
        compare: [null, null, null, null] // Для 4-х слотов сравнения
    };
    
    /**
     * Инициализация модуля
     */
    function init() {
        console.log("Инициализация модуля загрузки изображений (v0.4.4)");
        
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
                debug: function(...args) { console.debug('[DEBUG] ImageUpload:', ...args); },
                info: function(...args) { console.info('[INFO] ImageUpload:', ...args); },
                warn: function(...args) { console.warn('[WARN] ImageUpload:', ...args); },
                error: function(...args) { console.error('[ERROR] ImageUpload:', ...args); }
            };
        }
        
        // Инициализация элементов DOM
        initDOMElements();
        
        // Настройка обработчиков событий
        initModeButtons(); // Должен быть первым, чтобы правильно настроить видимость
        initSingleImageUpload();
        initCompareImageUpload(); // Инициализирует слоты при их наличии
        // Кнопки удаления для слотов создаются динамически
        
        logger.debug("Модуль загрузки изображений инициализирован (v0.4.4)");
    }
    
    /**
     * Инициализация элементов DOM
     * @private
     */
    function initDOMElements() {
        logger.debug("Инициализация DOM элементов");
        
        // Элементы для одиночной загрузки
        singleUploadArea = document.getElementById('single-upload-area');
        singleFileInput = document.getElementById('single-upload-input');
        singlePreviewContainer = document.getElementById('single-preview-container');
        singlePreviewImage = document.getElementById('single-preview-image');
        singleDeleteButton = document.querySelector('#single-preview-container .delete-image[data-target="single"]');


        // Элементы для сравнения
        imageSlotsContainer = document.querySelector('#compare-analysis-mode .image-slots');
        
        // Элементы для переключения режимов
        modeButtons = document.querySelectorAll('.mode-button');
        singleAnalysisMode = document.getElementById('single-analysis-mode');
        compareAnalysisMode = document.getElementById('compare-analysis-mode');
                
        // Логирование результатов
        logger.debug("Элементы DOM инициализированы:", {
            singleUploadArea: !!singleUploadArea,
            singleFileInput: !!singleFileInput,
            singlePreviewContainer: !!singlePreviewContainer,
            singlePreviewImage: !!singlePreviewImage,
            singleDeleteButton: !!singleDeleteButton,
            imageSlotsContainer: !!imageSlotsContainer,
            modeButtons: modeButtons ? modeButtons.length : 0,
            singleAnalysisMode: !!singleAnalysisMode,
            compareAnalysisMode: !!compareAnalysisMode
        });
        
        if (!singleUploadArea) logger.warn("Элемент singleUploadArea не найден");
        if (!singleFileInput) logger.warn("Элемент singleFileInput не найден");
        if (!singlePreviewContainer) logger.warn("Элемент singlePreviewContainer не найден");
        if (!singlePreviewImage) logger.warn("Элемент singlePreviewImage не найден");
        if (!singleDeleteButton) logger.warn("Кнопка удаления для одиночной загрузки не найдена");
        if (!imageSlotsContainer) logger.warn("Контейнер image-slots для сравнения не найден");
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
        
        logger.debug("Инициализация кнопок режимов");
        
        modeButtons.forEach(button => {
            // Просто добавляем обработчик, не клонируя, чтобы не потерять уже существующие, если есть
            button.addEventListener('click', function() {
                const mode = this.getAttribute('data-mode');
                logger.debug(`Кнопка режима нажата: ${mode}`);
                
                modeButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                if (singleAnalysisMode) singleAnalysisMode.classList.add('hidden');
                if (compareAnalysisMode) compareAnalysisMode.classList.add('hidden');
                
                if (mode === 'single' && singleAnalysisMode) {
                    singleAnalysisMode.classList.remove('hidden');
                } else if (mode === 'compare' && compareAnalysisMode) {
                    compareAnalysisMode.classList.remove('hidden');
                }
                
                document.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode: mode } }));
                logger.debug(`Переключение на режим: ${mode}`);
            });
        });
        
        // Установка начального режима (например, 'single' по умолчанию)
        const initialModeButton = document.querySelector('.mode-button[data-mode="single"]');
        if (initialModeButton) {
            initialModeButton.click(); // Эмулируем клик для установки начального состояния
        }
        logger.debug("Обработчики переключения режимов инициализированы");
    }
    
    /**
     * Инициализация загрузки одиночного изображения
     * @private
     */
    function initSingleImageUpload() {
        if (!singleUploadArea || !singleFileInput || !singleDeleteButton) {
            logger.warn("Невозможно инициализировать загрузку одиночного изображения - ключевые элементы не найдены");
            return;
        }
        
        logger.debug("Инициализация загрузки одиночного изображения");

        const handleSingleClick = () => {
            logger.debug("Клик на область загрузки одиночного изображения");
            if (singleFileInput.value) singleFileInput.value = null; // Сброс для повторного выбора того же файла
            singleFileInput.click();
        };
        singleUploadArea.addEventListener('click', handleSingleClick);
        
        const handleSingleFileChange = (event) => {
            logger.debug("Выбран файл для одиночной загрузки");
            const file = event.target.files[0];
            if (file) {
                handleSingleImageSelection(file);
            }
        };
        singleFileInput.addEventListener('change', handleSingleFileChange);
        
        const commonDragOver = (e, element) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.add('dragover');
        };
        const commonDragLeave = (e, element) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('dragover');
        };

        singleUploadArea.addEventListener('dragover', (e) => commonDragOver(e, singleUploadArea));
        singleUploadArea.addEventListener('dragleave', (e) => commonDragLeave(e, singleUploadArea));
        
        singleUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            singleUploadArea.classList.remove('dragover');
            logger.debug("Файл перетащен в область загрузки одиночного изображения");
            if (e.dataTransfer.files.length) {
                const file = e.dataTransfer.files[0];
                handleSingleImageSelection(file);
            }
        });

        singleDeleteButton.addEventListener('click', function() {
            logger.debug("Кнопка удаления одиночного изображения нажата");
            resetSingleImageUpload();
            document.dispatchEvent(new CustomEvent('singleImageRemoved'));
        });
        
        logger.debug("Обработчики одиночной загрузки инициализированы");
    }
    
    /**
     * Обработка выбора одиночного изображения
     * @private
     * @param {File} file - выбранный файл изображения
     */
    function handleSingleImageSelection(file) {
        logger.debug("Обработка выбора одиночного изображения", file.name);
        
        if (!isValidImageFile(file)) {
            logger.warn("Выбранный файл не является изображением:", file.name, file.type);
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Пожалуйста, выберите изображение (JPG, PNG, WEBP).');
            } else {
                alert('Пожалуйста, выберите изображение (JPG, PNG, WEBP).');
            }
            return;
        }
        
        isUploadingActive = true; // Устанавливаем флаг
        
        const reader = new FileReader();
        reader.onload = function(e) {
            logger.debug("Изображение загружено FileReader и готово к отображению");
            
            if (singlePreviewImage && singlePreviewContainer && singleUploadArea) {
                singlePreviewImage.src = e.target.result;
                singlePreviewContainer.classList.remove('hidden');
                singleUploadArea.classList.add('hidden');
                
                uploadedImages.single = file;
                
                const occasionSelector = document.querySelector('#consultation-overlay .occasion-selector');
                const inputLabels = document.querySelectorAll('#consultation-overlay .input-label');
                const preferencesInput = document.querySelector('#consultation-overlay .preferences-input');
                
                if (occasionSelector) occasionSelector.classList.remove('hidden');
                inputLabels.forEach(label => label.classList.remove('hidden'));
                if (preferencesInput) preferencesInput.classList.remove('hidden');
                
                document.dispatchEvent(new CustomEvent('singleImageUploaded', { detail: { file: file } }));
            } else {
                logger.error("Элементы для отображения превью одиночного изображения не найдены");
            }
            isUploadingActive = false; // Сбрасываем флаг
        };
        
        reader.onerror = function(error) {
            logger.error("Ошибка при чтении файла (FileReader):", error);
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Ошибка при чтении файла');
            } else {
                alert('Ошибка при чтении файла');
            }
            isUploadingActive = false; // Сбрасываем флаг
        };
        
        reader.readAsDataURL(file);
    }
    
    /**
     * Инициализация загрузки изображений для сравнения
     * @private
     */
    function initCompareImageUpload() {
        if (!imageSlotsContainer) {
            logger.warn("Невозможно инициализировать загрузку изображений для сравнения - контейнер слотов не найден");
            return;
        }
        
        logger.debug("Инициализация загрузки изображений для сравнения");
        
        const slots = imageSlotsContainer.querySelectorAll('.image-slot');
        
        slots.forEach(slot => {
            const slotIndex = parseInt(slot.dataset.slot, 10);
            const input = slot.querySelector('.compare-upload-input');

            if (!input) {
                logger.warn(`Инпут для загрузки не найден в слоте ${slotIndex}`);
                return;
            }

            // Обработчик клика на слот
            slot.addEventListener('click', function() {
                if (!this.classList.contains('filled')) {
                    logger.debug(`Клик на пустой слот сравнения ${slotIndex}`);
                    if(input.value) input.value = null; // Сброс для выбора того же файла
                    input.click();
                } else {
                    logger.debug(`Клик на заполненный слот сравнения ${slotIndex} - действие не требуется`);
                }
            });

            // Обработчики перетаскивания
            slot.addEventListener('dragover', (e) => {
                e.preventDefault(); e.stopPropagation();
                if (!slot.classList.contains('filled')) slot.classList.add('dragover');
            });
            slot.addEventListener('dragleave', (e) => {
                e.preventDefault(); e.stopPropagation();
                slot.classList.remove('dragover');
            });
            slot.addEventListener('drop', (e) => {
                e.preventDefault(); e.stopPropagation();
                slot.classList.remove('dragover');
                logger.debug(`Файл перетащен в слот сравнения ${slotIndex}`);
                if (!slot.classList.contains('filled') && e.dataTransfer.files.length) {
                    const file = e.dataTransfer.files[0];
                    handleCompareImageSelection(file, slotIndex);
                }
            });

            // Обработчик изменения файла в инпуте
            input.addEventListener('change', function(e) {
                logger.debug(`Выбран файл для слота сравнения ${slotIndex}`);
                const file = e.target.files[0];
                if (file) {
                    handleCompareImageSelection(file, slotIndex);
                }
            });
        });
        
        logger.debug("Обработчики загрузки для сравнения инициализированы для слотов");
    }
    
    /**
     * Обработка выбора изображения для сравнения
     * @private
     * @param {File} file - выбранный файл изображения
     * @param {number} slotIndex - индекс слота для изображения
     */
    function handleCompareImageSelection(file, slotIndex) {
        logger.debug(`Обработка выбора изображения для слота ${slotIndex}`, file.name);
        
        if (!isValidImageFile(file)) {
            logger.warn("Выбранный файл не является изображением:", file.name, file.type);
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Пожалуйста, выберите изображение (JPG, PNG, WEBP).');
            } else {
                alert('Пожалуйста, выберите изображение (JPG, PNG, WEBP).');
            }
            return;
        }
        
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) {
            logger.error(`Слот ${slotIndex} не найден в DOM`);
            return;
        }
        
        isUploadingActive = true; // Устанавливаем флаг
        
        const reader = new FileReader();
        reader.onload = function(e) {
            logger.debug(`Изображение для слота ${slotIndex} загружено FileReader и готово к отображению`);
            
            // Очищаем предыдущее содержимое слота (иконку загрузки)
            const uploadIconElement = slot.querySelector('.upload-icon');
            if (uploadIconElement) uploadIconElement.style.display = 'none'; // Скрываем иконку
            
            // Удаляем старое изображение, если оно было
            const oldImg = slot.querySelector('.slot-image');
            if(oldImg) oldImg.remove();
            const oldRemoveBtn = slot.querySelector('.remove-image');
            if(oldRemoveBtn) oldRemoveBtn.remove();

            // Добавляем новое изображение
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'slot-image';
            img.alt = `Изображение ${slotIndex + 1} для сравнения`;
            
            // Добавляем кнопку удаления
            const removeBtn = document.createElement('div');
            removeBtn.className = 'remove-image';
            removeBtn.textContent = '✕';
            removeBtn.setAttribute('role', 'button');
            removeBtn.tabIndex = 0;
            removeBtn.setAttribute('aria-label', 'Удалить изображение из слота');
            removeBtn.dataset.slot = slotIndex; // Для идентификации слота
            
            removeBtn.addEventListener('click', function(ev) {
                ev.stopPropagation(); // Предотвращаем срабатывание клика на родительском слоте
                logger.debug(`Нажата кнопка удаления для слота ${slotIndex}`);
                resetSlot(slotIndex);
                document.dispatchEvent(new CustomEvent('compareImageRemoved', { detail: { slot: slotIndex } }));
            });
            
            slot.appendChild(img);
            slot.appendChild(removeBtn);
            slot.classList.add('filled');
            
            uploadedImages.compare[slotIndex] = file;
            
            // Активация полей формы (если еще не активны и достаточно фото)
            const filledSlots = document.querySelectorAll('.image-slot.filled').length;
            if (filledSlots >= 2) {
                 const occasionSelector = document.querySelector('#consultation-overlay .occasion-selector');
                 const inputLabels = document.querySelectorAll('#consultation-overlay .input-label');
                 const preferencesInput = document.querySelector('#consultation-overlay .preferences-input');
                
                 if (occasionSelector) occasionSelector.classList.remove('hidden');
                 inputLabels.forEach(label => label.classList.remove('hidden'));
                 if (preferencesInput) preferencesInput.classList.remove('hidden');
            }
            
            document.dispatchEvent(new CustomEvent('compareImageUploaded', { detail: { file: file, slot: slotIndex } }));
            isUploadingActive = false; // Сбрасываем флаг
        };
        
        reader.onerror = function(error) {
            logger.error(`Ошибка при чтении файла для слота ${slotIndex} (FileReader):`, error);
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Ошибка при чтении файла');
            } else {
                alert('Ошибка при чтении файла');
            }
            isUploadingActive = false; // Сбрасываем флаг
        };
        
        reader.readAsDataURL(file);
    }
        
    /**
     * Проверка типа файла изображения
     * @private
     * @param {File} file - файл для проверки
     * @returns {boolean} - результат проверки
     */
    function isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = (config && config.LIMITS && config.LIMITS.MAX_FILE_SIZE) ? config.LIMITS.MAX_FILE_SIZE : 5 * 1024 * 1024; // 5MB по умолчанию
        
        if (!file || !file.type) return false;
        if (!validTypes.includes(file.type)) {
            logger.warn(`Недопустимый тип файла: ${file.type}`);
            return false;
        }
        if (file.size > maxSize) {
            logger.warn(`Файл слишком большой: ${file.size} байт, макс: ${maxSize} байт`);
            if (uiHelpers) uiHelpers.showToast(`Файл слишком большой. Макс. размер: ${maxSize / (1024*1024)} МБ`);
            return false;
        }
        return true;
    }
    
    /**
     * Сброс одиночного изображения
     */
    function resetSingleImageUpload() {
        logger.debug('Сброс одиночного изображения');
        
        if (singleFileInput) singleFileInput.value = ''; // Очистка инпута
        if (singlePreviewContainer) singlePreviewContainer.classList.add('hidden');
        if (singlePreviewImage) singlePreviewImage.src = ''; // Очистка src превью
        if (singleUploadArea) singleUploadArea.classList.remove('hidden');
        
        uploadedImages.single = null;

        // Скрываем поля формы, которые появляются после загрузки
        const occasionSelector = document.querySelector('#consultation-overlay .occasion-selector');
        const inputLabels = document.querySelectorAll('#consultation-overlay .input-label');
        const preferencesInput = document.querySelector('#consultation-overlay .preferences-input');

        if (occasionSelector) occasionSelector.classList.add('hidden');
        inputLabels.forEach(label => label.classList.add('hidden'));
        if (preferencesInput) preferencesInput.classList.add('hidden');

        // Отключаем кнопку отправки в форме консультации, если она есть и изображение обязательно
        const consultationSubmitButton = document.getElementById('submit-consultation');
        if (consultationSubmitButton) consultationSubmitButton.disabled = true;

        logger.debug('Одиночное изображение сброшено.');
    }
    
    /**
     * Сброс слота сравнения
     * @param {number} slotIndex - индекс слота для сброса
     */
    function resetSlot(slotIndex) {
        logger.debug(`Сброс слота сравнения ${slotIndex}`);
        
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) {
            logger.error(`Слот ${slotIndex} не найден для сброса`);
            return;
        }
        
        // Удаляем изображение и кнопку удаления
        const img = slot.querySelector('.slot-image');
        if (img) img.remove();
        const removeBtn = slot.querySelector('.remove-image');
        if (removeBtn) removeBtn.remove(); // Уже должен быть удален, но на всякий случай
        
        // Показываем иконку загрузки обратно
        const uploadIconElement = slot.querySelector('.upload-icon');
        if (uploadIconElement) uploadIconElement.style.display = 'flex'; // или 'block' в зависимости от CSS
        
        slot.classList.remove('filled');
        
        // Очищаем инпут файла для этого слота
        const input = slot.querySelector('.compare-upload-input');
        if (input) input.value = '';
        
        uploadedImages.compare[slotIndex] = null;
        
        // Проверяем, нужно ли скрывать поля формы, если изображений для сравнения стало меньше 2
        const filledSlotsCount = document.querySelectorAll('.image-slot.filled').length;
        if (filledSlotsCount < 2) {
            const occasionSelector = document.querySelector('#consultation-overlay .occasion-selector');
            const inputLabels = document.querySelectorAll('#consultation-overlay .input-label');
            const preferencesInput = document.querySelector('#consultation-overlay .preferences-input');

            if (occasionSelector) occasionSelector.classList.add('hidden');
            inputLabels.forEach(label => label.classList.add('hidden'));
            if (preferencesInput) preferencesInput.classList.add('hidden');

            // Отключаем кнопку "Проанализировать", если она относится к сравнению
            const compareSubmitButton = document.getElementById('submit-consultation'); // Если та же кнопка
            if (compareSubmitButton) compareSubmitButton.disabled = true;
        }
        logger.debug(`Слот сравнения ${slotIndex} сброшен.`);
    }
    
    /**
     * Сброс всех слотов сравнения
     */
    function resetCompareImageUploads() {
        logger.debug('Сброс всех слотов сравнения');
        if (imageSlotsContainer) {
            const slots = imageSlotsContainer.querySelectorAll('.image-slot');
            slots.forEach(slot => {
                const slotIndex = parseInt(slot.dataset.slot, 10);
                resetSlot(slotIndex); // resetSlot уже обрабатывает UI и uploadedImages.compare
            });
        }
        
        // Дополнительно убедимся, что все поля формы скрыты и кнопка выключена
        const occasionSelector = document.querySelector('#consultation-overlay .occasion-selector');
        const inputLabels = document.querySelectorAll('#consultation-overlay .input-label');
        const preferencesInput = document.querySelector('#consultation-overlay .preferences-input');
        if (occasionSelector) occasionSelector.classList.add('hidden');
        inputLabels.forEach(label => label.classList.add('hidden'));
        if (preferencesInput) preferencesInput.classList.add('hidden');
        
        const compareSubmitButton = document.getElementById('submit-consultation');
        if (compareSubmitButton) compareSubmitButton.disabled = true;

        document.dispatchEvent(new CustomEvent('allCompareImagesRemoved'));
        logger.debug('Все слоты сравнения сброшены.');
    }
    
    /**
     * Проверка, идет ли загрузка изображения
     * @returns {boolean} - флаг активной загрузки
     */
    function isUploading() {
        return isUploadingActive;
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
        resetSlot, // Оставляем, если нужен сброс конкретного слота извне
        isUploading,
        getUploadedImages // Для доступа к файлам из других модулей, если потребуется
    };
})();