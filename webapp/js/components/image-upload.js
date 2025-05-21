/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает функциональность загрузки и управления изображениями в приложении.
Включает валидацию, обработку, предпросмотр и drag-n-drop для изображений.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.components = window.MishuraApp.components || {};
window.MishuraApp.components.imageUpload = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger, deviceDetect, uiHelpers;
    
    // Временное состояние модуля
    const state = {
        isImageUploading: false,
        lastUploadAttempt: 0
    };
    
    // Элементы DOM для одиночного режима
    let singleUploadInput, singleUploadArea, singlePreviewContainer, singlePreviewImage;
    
    // Элементы DOM для режима сравнения
    let compareUploadInputs, imageSlots;
    
    // Элементы DOM для режима примерки
    let yourPhotoInput, yourPhotoUploadArea, yourPhotoContainer, yourPhotoPreview;
    let outfitPhotoInput, outfitPhotoUploadArea, outfitPhotoContainer, outfitPhotoPreview;
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger;
        deviceDetect = window.MishuraApp.utils.deviceDetect;
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        // Инициализация элементов DOM
        initDOMElements();
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        // Специальная настройка для iOS
        if (deviceDetect.isIOS) {
            setupIOSFileInputs();
        }
        
        logger.debug("Модуль загрузки изображений инициализирован");
    }
    
    /**
     * Инициализирует все необходимые элементы DOM
     * @private
     */
    function initDOMElements() {
        // Элементы для одиночного режима
        singleUploadInput = document.getElementById('single-upload-input');
        singleUploadArea = document.getElementById('single-upload-area');
        singlePreviewContainer = document.getElementById('single-preview-container');
        singlePreviewImage = document.getElementById('single-preview-image');
        
        // Элементы для режима сравнения
        compareUploadInputs = document.querySelectorAll('.compare-upload-input');
        imageSlots = document.querySelectorAll('.image-slot');
        
        // Элементы для режима примерки
        yourPhotoInput = document.getElementById('your-photo-input');
        yourPhotoUploadArea = document.getElementById('your-photo-upload-area');
        yourPhotoContainer = document.getElementById('your-photo-container');
        yourPhotoPreview = document.getElementById('your-photo-preview');
        
        outfitPhotoInput = document.getElementById('outfit-photo-input');
        outfitPhotoUploadArea = document.getElementById('outfit-photo-upload-area');
        outfitPhotoContainer = document.getElementById('outfit-photo-container');
        outfitPhotoPreview = document.getElementById('outfit-photo-preview');
    }
    
    /**
     * Настраивает обработчики событий для всех элементов загрузки
     * @private
     */
    function setupEventListeners() {
        // Обработка одиночного изображения
        if (singleUploadInput) {
            singleUploadInput.addEventListener('change', handleSingleImageUpload);
            
            // Специально для iOS также добавляем обработчик на 'input'
            if (deviceDetect.isIOS) {
                singleUploadInput.addEventListener('input', handleSingleImageUpload);
            }
        }
        
        if (singleUploadArea) {
            singleUploadArea.addEventListener('click', () => {
                if (singleUploadInput && !state.isImageUploading) {
                    singleUploadInput.click();
                }
            });
            
            // Специальная обработка для мобильных устройств
            if (deviceDetect.isIOS || deviceDetect.isAndroid) {
                singleUploadArea.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    if (singleUploadInput && !state.isImageUploading) {
                        // Небольшая задержка для iOS, чтобы избежать дублирующих кликов
                        setTimeout(() => singleUploadInput.click(), 50);
                    }
                });
            }
            
            // Настройка Drag-n-Drop
            setupDragAndDrop(singleUploadArea, singleUploadInput, handleSingleImageFile);
        }
        
        // Обработка изображений для сравнения
        compareUploadInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const filesList = e.target.files;
                if (filesList && filesList.length > 0) {
                    handleCompareImageUpload(filesList[0], parseInt(e.target.dataset.slot));
                } else {
                    logger.warn("compareUploadInput change: Файлы не найдены");
                }
            });
            
            // Специальная обработка для iOS
            if (deviceDetect.isIOS) {
                input.addEventListener('input', (e) => {
                    const filesList = e.target.files;
                    if (filesList && filesList.length > 0) {
                        handleCompareImageUpload(filesList[0], parseInt(e.target.dataset.slot));
                    } else {
                        logger.warn("iOS compareUploadInput input: Файлы не найдены");
                    }
                });
            }
            
            const slotElement = input.closest('.image-slot');
            if (slotElement) {
                slotElement.addEventListener('click', (e) => {
                    if (!state.isImageUploading && 
                        (e.target === slotElement || slotElement.querySelector('.upload-icon')?.contains(e.target))) {
                        setTimeout(() => input.click(), deviceDetect.isIOS ? 50 : 0);
                    }
                });
                
                // Обработка для сенсорных устройств
                if (deviceDetect.isIOS || deviceDetect.isAndroid) {
                    slotElement.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        if (!state.isImageUploading) {
                            setTimeout(() => input.click(), 50);
                        }
                    });
                }
                
                // Настройка Drag-n-Drop
                setupDragAndDrop(
                    slotElement, 
                    input, 
                    handleCompareImageUpload, 
                    parseInt(input.dataset.slot)
                );
            }
        });
        
        // Обработка изображений для примерки
        if (yourPhotoInput && yourPhotoUploadArea) {
            yourPhotoInput.addEventListener('change', (e) => handleYourPhotoUpload(e.target.files[0]));
            if (deviceDetect.isIOS) {
                yourPhotoInput.addEventListener('input', (e) => handleYourPhotoUpload(e.target.files[0]));
            }
            
            yourPhotoUploadArea.addEventListener('click', () => {
                if (!state.isImageUploading) {
                    setTimeout(() => yourPhotoInput.click(), deviceDetect.isIOS ? 50 : 0);
                }
            });
            
            // Обработка для сенсорных устройств
            if (deviceDetect.isIOS || deviceDetect.isAndroid) {
                yourPhotoUploadArea.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    if (!state.isImageUploading) {
                        setTimeout(() => yourPhotoInput.click(), 50);
                    }
                });
            }
            
            // Настройка Drag-n-Drop
            setupDragAndDrop(yourPhotoUploadArea, yourPhotoInput, handleYourPhotoUpload);
        }
        
        if (outfitPhotoInput && outfitPhotoUploadArea) {
            outfitPhotoInput.addEventListener('change', (e) => handleOutfitPhotoUpload(e.target.files[0]));
            if (deviceDetect.isIOS) {
                outfitPhotoInput.addEventListener('input', (e) => handleOutfitPhotoUpload(e.target.files[0]));
            }
            
            outfitPhotoUploadArea.addEventListener('click', () => {
                if (!state.isImageUploading) {
                    setTimeout(() => outfitPhotoInput.click(), deviceDetect.isIOS ? 50 : 0);
                }
            });
            
            // Обработка для сенсорных устройств
            if (deviceDetect.isIOS || deviceDetect.isAndroid) {
                outfitPhotoUploadArea.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    if (!state.isImageUploading) {
                        setTimeout(() => outfitPhotoInput.click(), 50);
                    }
                });
            }
            
            // Настройка Drag-n-Drop
            setupDragAndDrop(outfitPhotoUploadArea, outfitPhotoInput, handleOutfitPhotoUpload);
        }
        
        // Делегирование событий для динамически создаваемых кнопок удаления
        document.body.addEventListener('click', function(event) {
            if (event.target && event.target.classList.contains('delete-image')) {
                handleDeleteImage(
                    event.target.dataset.target, 
                    event.target.dataset.slot ? parseInt(event.target.dataset.slot) : undefined
                );
            }
            if (event.target && event.target.classList.contains('remove-image')) {
                handleRemoveCompareImageDelegated(event);
            }
        });
        
        // Для мобильных устройств добавим обработку тапов
        if (deviceDetect.isIOS || deviceDetect.isAndroid) {
            document.body.addEventListener('touchend', function(event) {
                if (event.target && (event.target.classList.contains('delete-image') || 
                                    event.target.classList.contains('remove-image'))) {
                    event.preventDefault();
                    event.target.click(); // Эмулируем клик
                }
            });
        }
    }
    
    /**
     * Специальная настройка для iOS-устройств
     * @private
     */
    function setupIOSFileInputs() {
        logger.info("Настройка файловых инпутов для iOS");
        
        // Обработка клика для iOS, предотвращение дефолтного поведения
        document.querySelectorAll('.upload-area, .image-slot').forEach(area => {
            area.addEventListener('touchstart', function(e) {
                e.preventDefault(); // Предотвращаем дефолтное поведение iOS
                
                // Находим соответствующий input
                const input = area.querySelector('input[type="file"]');
                if (input && !state.isImageUploading) {
                    input.click();
                }
            });
        });
    }
    
    /**
     * Настраивает Drag-n-Drop для загрузки изображений
     * @private
     * @param {HTMLElement} uploadArea - Область для перетаскивания
     * @param {HTMLInputElement} inputElement - Элемент input[type="file"]
     * @param {Function} fileHandlerCallback - Функция-обработчик файла
     * @param {number|null} slotIndex - Индекс слота (для режима сравнения)
     */
    function setupDragAndDrop(uploadArea, inputElement, fileHandlerCallback, slotIndex = null) {
        if (!uploadArea || !inputElement) {
             logger.warn("Не удалось настроить Drag-n-Drop: uploadArea или inputElement не найдены.");
             return;
        }
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // Добавляем классы для визуального отображения состояния перетаскивания
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('drag-over');
                // Добавляем подсветку для мобильных устройств
                if (deviceDetect.isAndroid || deviceDetect.isIOS) {
                    uploadArea.style.backgroundColor = 'rgba(0, 194, 255, 0.2)';
                }
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('drag-over');
                // Удаляем подсветку
                if (deviceDetect.isAndroid || deviceDetect.isIOS) {
                    uploadArea.style.backgroundColor = '';
                }
            }, false);
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                const file = dt.files[0];
                // Не устанавливаем files на iOS, т.к. это может вызвать проблемы
                if (!deviceDetect.isIOS) {
                    inputElement.files = dt.files; // Для согласованности с обычным выбором
                }
                
                if (slotIndex !== null) {
                    fileHandlerCallback(file, slotIndex); // Для слотов сравнения
                } else {
                    fileHandlerCallback(file); // Для одиночной загрузки
                }
            } else {
                logger.warn("Drag-n-Drop: Файлы не найдены в dataTransfer.");
                uiHelpers.showToast("Не удалось загрузить файл. Попробуйте выбрать файл через меню.");
            }
        }, false);
    }
    
    /**
     * Обработчик загрузки одиночного изображения (событие change/input)
     * @private
     * @param {Event} event - Событие изменения input[type="file"]
     */
    function handleSingleImageUpload(event) {
        logger.debug("handleSingleImageUpload вызван с событием", event.type);
        const filesList = event.target.files;
        
        if (filesList && filesList.length > 0) {
            const file = filesList[0];
            handleSingleImageFile(file);
        } else {
            logger.warn("handleSingleImageUpload: Файлы не выбраны");
        }
    }
    
    /**
     * Обработчик для одиночного файла изображения
     * @private
     * @param {File} file - Файл изображения
     */
    function handleSingleImageFile(file) {
        if (!file) {
            logger.warn("handleSingleImageFile: Файл не предоставлен");
            return;
        }
        
        // Предотвращаем двойную обработку
        if (state.isImageUploading) {
            const now = Date.now();
            // Игнорируем слишком частые вызовы (особенно важно для iOS)
            if (now - state.lastUploadAttempt < 500) {
                logger.warn("Слишком частые попытки загрузки. Игнорируем.");
                return;
            }
        }
        
        state.isImageUploading = true;
        state.lastUploadAttempt = Date.now();
        
        logger.info("Обработка одиночного изображения:", 
            {name: file.name, type: file.type, size: file.size});
        
        // Визуально показываем пользователю, что начался процесс загрузки
        uiHelpers.showLoadingIndicatorFor(singleUploadArea);
        
        // Валидация с улучшенной обработкой iOS
        if (!validateImageFile(file)) {
            state.isImageUploading = false;
            if(singleUploadInput) singleUploadInput.value = ''; // Сброс инпута при невалидном файле
            uiHelpers.hideLoadingIndicatorFor(singleUploadArea);
            return;
        }
        
        // Запускаем обработку файла, которая может занять время
        processImageFile(file).then(processedFile => {
            // Сохраняем файл и генерируем событие
            const uploadSuccessEvent = new CustomEvent('singleImageUploaded', {
                detail: { file: processedFile }
            });
            document.dispatchEvent(uploadSuccessEvent);
            
            // Отображаем превью
            if (singlePreviewImage && singlePreviewContainer && singleUploadArea) {
                displayImagePreview(processedFile, singlePreviewImage, singlePreviewContainer, singleUploadArea);
            }
            
            uiHelpers.showToast("Изображение успешно загружено");
            
            // Сброс инпута для повторного выбора того же файла
            if(singleUploadInput) {
                try {
                    singleUploadInput.value = '';
                } catch (e) {
                    logger.warn("Не удалось сбросить значение input:", e);
                    // Для iOS - создаем новый инпут
                    if (deviceDetect.isIOS && singleUploadInput.parentNode) {
                        const newInput = document.createElement('input');
                        newInput.type = 'file';
                        newInput.id = 'single-upload-input';
                        newInput.className = 'upload-input';
                        newInput.accept = 'image/*';
                        const parentNode = singleUploadInput.parentNode;
                        parentNode.replaceChild(newInput, singleUploadInput);
                        singleUploadInput = newInput;
                        singleUploadInput.addEventListener('change', handleSingleImageUpload);
                        singleUploadInput.addEventListener('input', handleSingleImageUpload);
                    }
                }
            }
        })
        .catch(error => {
            logger.error("Ошибка при обработке изображения:", error);
            uiHelpers.showToast("Ошибка при обработке изображения. Попробуйте другой файл.");
        })
        .finally(() => {
            state.isImageUploading = false;
            uiHelpers.hideLoadingIndicatorFor(singleUploadArea);
        });
    }
    
    /**
     * Обработчик загрузки изображения для сравнения
     * @private
     * @param {File} file - Файл изображения
     * @param {number} slotIndex - Индекс слота для изображения
     */
    function handleCompareImageUpload(file, slotIndex) {
        if (!file || isNaN(slotIndex)) {
             logger.warn("handleCompareImageUpload: Файл или индекс слота не предоставлены.");
             return;
        }
        
        // Защита от двойной обработки
        if (state.isImageUploading) {
            const now = Date.now();
            if (now - state.lastUploadAttempt < 500) {
                logger.warn("Слишком частые попытки загрузки для сравнения. Игнорируем.");
                return;
            }
        }
        
        state.isImageUploading = true;
        state.lastUploadAttempt = Date.now();
        
        logger.info(`Обработка изображения для сравнения в слот ${slotIndex}:`, 
            {name: file.name, type: file.type, size: file.size});
            
        const slotElement = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slotElement) {
            logger.error(`Слот ${slotIndex} не найден`);
            state.isImageUploading = false;
            return;
        }
        
        // Отображаем индикатор загрузки на слоте
        uiHelpers.showLoadingIndicatorFor(slotElement);
        
        if (!validateImageFile(file)) {
            state.isImageUploading = false;
            const inputEl = document.querySelector(`.compare-upload-input[data-slot="${slotIndex}"]`);
            if (inputEl) inputEl.value = '';
            uiHelpers.hideLoadingIndicatorFor(slotElement);
            return;
        }
        
        // Обработка файла
        processImageFile(file).then(processedFile => {
            // Генерируем событие загрузки изображения для сравнения
            const uploadSuccessEvent = new CustomEvent('compareImageUploaded', {
                detail: { file: processedFile, slot: slotIndex }
            });
            document.dispatchEvent(uploadSuccessEvent);
            
            // Обновляем превью слота
            updateCompareSlotPreview(slotElement, processedFile, slotIndex);
            
            const inputEl = document.querySelector(`.compare-upload-input[data-slot="${slotIndex}"]`);
            if (inputEl) {
                try {
                    inputEl.value = ''; // Сброс инпута
                } catch (e) {
                    logger.warn(`Не удалось сбросить значение input для слота ${slotIndex}:`, e);
                    // Для iOS заменяем инпут новым
                    if (deviceDetect.isIOS && inputEl.parentNode) {
                        const newInput = document.createElement('input');
                        newInput.type = 'file';
                        newInput.className = 'compare-upload-input';
                        newInput.accept = 'image/*';
                        newInput.dataset.slot = slotIndex.toString();
                        const parentNode = inputEl.parentNode;
                        if (parentNode) {
                            parentNode.replaceChild(newInput, inputEl);
                            newInput.addEventListener('change', (e) => 
                                handleCompareImageUpload(e.target.files[0], parseInt(e.target.dataset.slot)));
                            newInput.addEventListener('input', (e) => 
                                handleCompareImageUpload(e.target.files[0], parseInt(e.target.dataset.slot)));
                        }
                    }
                }
            }
            
            uiHelpers.showToast(`Фото успешно добавлено в слот ${slotIndex + 1}`);
        })
        .catch(error => {
            logger.error(`Ошибка при обработке фото для слота ${slotIndex}:`, error);
            uiHelpers.showToast("Ошибка при обработке фото. Попробуйте другой файл.");
        })
        .finally(() => {
            state.isImageUploading = false;
            uiHelpers.hideLoadingIndicatorFor(slotElement);
        });
    }
    
    /**
     * Обновляет превью изображения в слоте для сравнения
     * @private
     * @param {HTMLElement} slotElement - Элемент слота
     * @param {File} file - Файл изображения
     * @param {number} slotIndex - Индекс слота
     */
    function updateCompareSlotPreview(slotElement, file, slotIndex) {
        logger.debug(`Обновление превью для слота ${slotIndex}`);
        slotElement.innerHTML = ''; // Очищаем слот полностью
        slotElement.classList.add('filled');

        const slotImage = document.createElement('img');
        slotImage.className = 'slot-image';
        slotImage.alt = `Предпросмотр фото ${slotIndex + 1}`;
        displayImagePreviewOnly(file, slotImage); // Просто отображаем, без скрытия uploadArea
        slotElement.appendChild(slotImage);

        const removeButton = document.createElement('div');
        removeButton.className = 'remove-image'; // Используем этот класс из CSS
        removeButton.textContent = '✕';
        removeButton.dataset.slot = slotIndex; // Сохраняем индекс слота
        // Обработчик будет добавлен делегированием
        slotElement.appendChild(removeButton);
    }
    
    /**
     * Обработчик удаления изображения из слота сравнения
     * @private
     * @param {Event} event - Событие клика
     */
    function handleRemoveCompareImageDelegated(event) {
        event.stopPropagation();
        const slotIndex = parseInt(event.target.dataset.slot);
        if (isNaN(slotIndex)) return;
        
        logger.info(`Удаление изображения из слота ${slotIndex} (делегировано)`);
        
        // Генерируем событие удаления
        const removeEvent = new CustomEvent('compareImageRemoved', {
            detail: { slot: slotIndex }
        });
        document.dispatchEvent(removeEvent);
        
        // Сбрасываем слот
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return;
        
        slot.classList.remove('filled');
        slot.innerHTML = `
            <div class="upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><use href="#upload-svg-icon"></use></svg></div>
            <input type="file" class="compare-upload-input" accept="image/*" data-slot="${slotIndex}">`;
            
        const newInput = slot.querySelector('.compare-upload-input');
        if (newInput) {
            newInput.addEventListener('change', (e) => 
                handleCompareImageUpload(e.target.files[0], parseInt(e.target.dataset.slot)));
                
            // Для iOS также добавляем обработчик на 'input'
            if (deviceDetect.isIOS) {
                newInput.addEventListener('input', (e) => 
                    handleCompareImageUpload(e.target.files[0], parseInt(e.target.dataset.slot)));
            }
        }
        
        // Перенастраиваем Drag-n-Drop для очищенного слота
        const slotInputForDnd = slot.querySelector('.compare-upload-input');
        if (slotInputForDnd) {
            setupDragAndDrop(slot, slotInputForDnd, handleCompareImageUpload, slotIndex);
        }
        
        uiHelpers.showToast(`Фото удалено из слота ${slotIndex + 1}`);
    }
    
    /**
     * Обработчик загрузки фото пользователя для примерки
     * @private
     * @param {File} file - Файл изображения
     */
    function handleYourPhotoUpload(file) {
        if (!file) return;
        
        // Защита от двойной обработки
        if (state.isImageUploading) {
            const now = Date.now();
            if (now - state.lastUploadAttempt < 500) return;
        }
        
        state.isImageUploading = true;
        state.lastUploadAttempt = Date.now();
        
        logger.info("Загрузка фото пользователя:", 
            {name: file.name, type: file.type, size: file.size});
            
        // Показываем индикатор загрузки
        if (yourPhotoUploadArea) {
            uiHelpers.showLoadingIndicatorFor(yourPhotoUploadArea);
        }
        
        if (!validateImageFile(file)) {
            state.isImageUploading = false;
            if (yourPhotoInput) yourPhotoInput.value = '';
            if (yourPhotoUploadArea) {
                uiHelpers.hideLoadingIndicatorFor(yourPhotoUploadArea);
            }
            return;
        }
        
        // Обработка файла
        processImageFile(file).then(processedFile => {
            // Генерируем событие загрузки фото пользователя
            const uploadSuccessEvent = new CustomEvent('yourPhotoUploaded', {
                detail: { file: processedFile }
            });
            document.dispatchEvent(uploadSuccessEvent);
            
            // Отображаем превью
            if (yourPhotoPreview && yourPhotoContainer && yourPhotoUploadArea) {
                displayImagePreview(processedFile, yourPhotoPreview, yourPhotoContainer, yourPhotoUploadArea);
            }
            
            uiHelpers.showToast("Ваше фото успешно загружено");
            
            // Сброс инпута
            if(yourPhotoInput) {
                try {
                    yourPhotoInput.value = '';
                } catch (e) {
                    // Для iOS - создаем новый инпут
                    if (deviceDetect.isIOS && yourPhotoInput.parentNode) {
                        const newInput = document.createElement('input');
                        newInput.type = 'file';
                        newInput.id = 'your-photo-input';
                        newInput.className = 'upload-input';
                        newInput.accept = 'image/*';
                        const parentNode = yourPhotoInput.parentNode;
                        parentNode.replaceChild(newInput, yourPhotoInput);
                        yourPhotoInput = newInput;
                        yourPhotoInput.addEventListener('change', (e) => handleYourPhotoUpload(e.target.files[0]));
                        yourPhotoInput.addEventListener('input', (e) => handleYourPhotoUpload(e.target.files[0]));
                    }
                }
            }
        })
        .catch(error => {
            logger.error("Ошибка при обработке вашего фото:", error);
            uiHelpers.showToast("Ошибка при обработке фото. Попробуйте другой файл.");
        })
        .finally(() => {
            state.isImageUploading = false;
            if (yourPhotoUploadArea) {
                uiHelpers.hideLoadingIndicatorFor(yourPhotoUploadArea);
            }
        });
    }
    
    /**
     * Обработчик загрузки фото образа для примерки
     * @private
     * @param {File} file - Файл изображения
     */
    function handleOutfitPhotoUpload(file) {
        if (!file) return;
        
        // Защита от двойной обработки 
        if (state.isImageUploading) {
            const now = Date.now();
            if (now - state.lastUploadAttempt < 500) return;
        }
        
        state.isImageUploading = true;
        state.lastUploadAttempt = Date.now();
        
        logger.info("Загрузка фото образа:", 
            {name: file.name, type: file.type, size: file.size});
            
        // Показываем индикатор загрузки
        if (outfitPhotoUploadArea) {
            uiHelpers.showLoadingIndicatorFor(outfitPhotoUploadArea);
        }
        
        if (!validateImageFile(file)) {
            state.isImageUploading = false;
            if (outfitPhotoInput) outfitPhotoInput.value = '';
            if (outfitPhotoUploadArea) {
                uiHelpers.hideLoadingIndicatorFor(outfitPhotoUploadArea);
            }
            return;
        }
        
        // Обработка файла
        processImageFile(file).then(processedFile => {
            // Генерируем событие загрузки фото образа
            const uploadSuccessEvent = new CustomEvent('outfitPhotoUploaded', {
                detail: { file: processedFile }
            });
            document.dispatchEvent(uploadSuccessEvent);
            
            // Отображаем превью
            if (outfitPhotoPreview && outfitPhotoContainer && outfitPhotoUploadArea) {
                displayImagePreview(processedFile, outfitPhotoPreview, outfitPhotoContainer, outfitPhotoUploadArea);
            }
            
            uiHelpers.showToast("Фото образа успешно загружено");
            
            // Сброс инпута
            if(outfitPhotoInput) {
                try {
                    outfitPhotoInput.value = '';
                } catch (e) {
                    // Для iOS - создаем новый инпут
                    if (deviceDetect.isIOS && outfitPhotoInput.parentNode) {
                        const newInput = document.createElement('input');
                        newInput.type = 'file';
                        newInput.id = 'outfit-photo-input';
                        newInput.className = 'upload-input';
                        newInput.accept = 'image/*';
                        const parentNode = outfitPhotoInput.parentNode;
                        parentNode.replaceChild(newInput, outfitPhotoInput);
                        outfitPhotoInput = newInput;
                        outfitPhotoInput.addEventListener('change', (e) => handleOutfitPhotoUpload(e.target.files[0]));
                        outfitPhotoInput.addEventListener('input', (e) => handleOutfitPhotoUpload(e.target.files[0]));
                    }
                }
            }
        })
        .catch(error => {
            logger.error("Ошибка при обработке фото образа:", error);
            uiHelpers.showToast("Ошибка при обработке фото. Попробуйте другой файл.");
        })
        .finally(() => {
            state.isImageUploading = false;
            if (outfitPhotoUploadArea) {
                uiHelpers.hideLoadingIndicatorFor(outfitPhotoUploadArea);
            }
        });
    }
    
    /**
     * Обработчик для удаления изображения
     * @private
     * @param {string} targetType - Тип цели (single, your-photo, outfit-photo)
     * @param {number} slotIndex - Индекс слота (опционально)
     */
    function handleDeleteImage(targetType, slotIndex = undefined) {
        logger.info(`Удаление изображения: тип '${targetType}', слот '${slotIndex}'`);
        
        let uploadAreaElement = null;
        let previewContainerElement = null;
        let imageInputElement = null;

        switch (targetType) {
            case 'single':
                // Генерируем событие удаления одиночного изображения
                document.dispatchEvent(new CustomEvent('singleImageRemoved'));
                
                uploadAreaElement = singleUploadArea;
                previewContainerElement = singlePreviewContainer;
                imageInputElement = singleUploadInput;
                break;
            case 'your-photo':
                // Генерируем событие удаления фото пользователя
                document.dispatchEvent(new CustomEvent('yourPhotoRemoved'));
                
                uploadAreaElement = yourPhotoUploadArea;
                previewContainerElement = yourPhotoContainer;
                imageInputElement = yourPhotoInput;
                break;
            case 'outfit-photo':
                // Генерируем событие удаления фото образа
                document.dispatchEvent(new CustomEvent('outfitPhotoRemoved'));
                
                uploadAreaElement = outfitPhotoUploadArea;
                previewContainerElement = outfitPhotoContainer;
                imageInputElement = outfitPhotoInput;
                break;
            // Случай для 'compare' обрабатывается в handleRemoveCompareImageDelegated
            default:
                logger.warn(`Неизвестный тип цели для удаления: ${targetType}`);
                return;
        }

        if (imageInputElement) {
            try {
                imageInputElement.value = '';
            } catch (e) {
                logger.warn(`Не удалось сбросить input для ${targetType}:`, e);
                // Создаем новый элемент для iOS
                if (deviceDetect.isIOS && imageInputElement.parentNode) {
                    const newInput = document.createElement('input');
                    newInput.type = 'file';
                    newInput.id = imageInputElement.id;
                    newInput.className = imageInputElement.className;
                    newInput.accept = 'image/*';
                    const parentNode = imageInputElement.parentNode;
                    parentNode.replaceChild(newInput, imageInputElement);
                    
                    // Присваиваем новый элемент переменной
                    switch (targetType) {
                        case 'single': 
                            singleUploadInput = newInput;
                            newInput.addEventListener('change', handleSingleImageUpload);
                            newInput.addEventListener('input', handleSingleImageUpload);
                            break;
                        case 'your-photo': 
                            yourPhotoInput = newInput;
                            newInput.addEventListener('change', (e) => handleYourPhotoUpload(e.target.files[0]));
                            newInput.addEventListener('input', (e) => handleYourPhotoUpload(e.target.files[0]));
                            break;
                        case 'outfit-photo': 
                            outfitPhotoInput = newInput;
                            newInput.addEventListener('change', (e) => handleOutfitPhotoUpload(e.target.files[0]));
                            newInput.addEventListener('input', (e) => handleOutfitPhotoUpload(e.target.files[0]));
                            break;
                    }
                }
            }
        }
        
        if (previewContainerElement) previewContainerElement.style.display = 'none';
        if (uploadAreaElement) uploadAreaElement.style.display = 'flex';
        
        uiHelpers.showToast("Изображение удалено");
    }
    
    /**
     * Отображает превью загруженного изображения
     * @private
     * @param {File} file - Файл изображения
     * @param {HTMLImageElement} imgElement - Элемент img для превью
     * @param {HTMLElement} previewContainer - Контейнер превью
     * @param {HTMLElement} uploadArea - Область загрузки
     */
    function displayImagePreview(file, imgElement, previewContainer, uploadArea) {
        if (!file || !imgElement || !previewContainer || !uploadArea) {
            logger.error('displayImagePreview: Отсутствуют необходимые DOM элементы.'); 
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function (e) { 
            imgElement.src = e.target.result; 
        };
        reader.readAsDataURL(file);
        
        previewContainer.style.display = 'block';
        uploadArea.style.display = 'none'; // Скрываем зону загрузки, показываем превью

        // Добавляем кнопку удаления, если ее еще нет
        if (previewContainer.id === "single-preview-container" && !previewContainer.querySelector('.delete-image')) {
            const removeButton = document.createElement('div');
            removeButton.className = 'delete-image';
            removeButton.textContent = '✕';
            removeButton.dataset.target = 'single';
            previewContainer.appendChild(removeButton);
        } else if (previewContainer.id === "your-photo-container" && !previewContainer.querySelector('.delete-image')) {
            const removeButton = document.createElement('div');
            removeButton.className = 'delete-image';
            removeButton.textContent = '✕';
            removeButton.dataset.target = 'your-photo';
            previewContainer.appendChild(removeButton);
        } else if (previewContainer.id === "outfit-photo-container" && !previewContainer.querySelector('.delete-image')) {
            const removeButton = document.createElement('div');
            removeButton.className = 'delete-image';
            removeButton.textContent = '✕';
            removeButton.dataset.target = 'outfit-photo';
            previewContainer.appendChild(removeButton);
        }
    }
    
    /**
     * Отображает превью изображения (для слотов сравнения)
     * @private
     * @param {File} file - Файл изображения
     * @param {HTMLImageElement} imgElement - Элемент img для превью
     */
    function displayImagePreviewOnly(file, imgElement) {
        if (!file || !imgElement) { 
            return; 
        }
        
        const reader = new FileReader();
        reader.onload = function (e) { 
            imgElement.src = e.target.result; 
        };
        reader.readAsDataURL(file);
    }
    
    /**
     * Валидирует файл изображения
     * @private
     * @param {File} file - Файл для валидации
     * @returns {boolean} - Результат валидации
     */
    function validateImageFile(file) {
        if (!file) {
            uiHelpers.showToast("Файл не выбран.");
            return false;
        }
        
        // Логирование для отладки
        logger.debug("Валидация файла:", {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        });
        
        // Проверка типа файла с учетом специфики iOS
        let isImage = false;
        
        // Стандартная проверка по MIME-типу
        if (file.type && file.type.startsWith('image/')) {
            isImage = true;
        } 
        // Для iOS расширенная проверка
        else if (deviceDetect.isIOS) {
            // Проверка по расширению файла, для случаев когда iOS не передает MIME-тип
            const fileName = file.name.toLowerCase();
            const validExtensions = config.VALID_IMAGE_EXTENSIONS || ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif'];
            isImage = validExtensions.some(ext => fileName.endsWith(ext));
            
            // Дополнительная проверка для iOS, где иногда файлы могут иметь нестандартные типы
            if (file.type === 'application/octet-stream' && file.name.match(/\.(jpg|jpeg|png|gif|heic|heif)$/i)) {
                isImage = true;
            }
        }
        
        if (!isImage) {
            uiHelpers.showToast("Пожалуйста, выберите файл изображения (например, JPEG, PNG).");
            return false;
        }
        
        // Проверка размера файла
        const maxSizeMB = config.LIMITS ? config.LIMITS.MAX_FILE_SIZE_MB : 5;
        if (file.size > maxSizeMB * 1024 * 1024) {
            uiHelpers.showToast(`Размер файла превышает ${maxSizeMB} МБ. Пожалуйста, выберите файл меньшего размера.`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Обрабатывает файл изображения перед отправкой
     * @private
     * @param {File} file - Файл для обработки
     * @returns {Promise<File>} - Обработанный файл
     */
    async function processImageFile(file) {
        // Для iOS особая обработка форматов HEIC/HEIF 
        if (deviceDetect.isIOS && file.name.match(/\.(heic|heif)$/i)) {
            logger.info("Обнаружено изображение в формате HEIC/HEIF от iOS, конвертация не реализована.");
            // Здесь можно добавить конвертацию HEIC в JPEG, если требуется
            // Для этого нужна библиотека, например heic2any
            // Пока просто возвращаем как есть
        }
        
        // Проверяем лимит для сжатия из конфигурации
        const compressionThresholdMB = config.LIMITS ? config.LIMITS.IMAGE_COMPRESSION_THRESHOLD_MB : 3;
        
        // Простая компрессия изображения, если оно слишком большое
        if (file.size > compressionThresholdMB * 1024 * 1024) {
            try {
                logger.info("Файл слишком большой, пытаемся сжать:", file.size / (1024 * 1024), "МБ");
                const compressedFile = await compressImage(file);
                logger.info("Файл сжат до:", compressedFile.size / (1024 * 1024), "МБ");
                return compressedFile;
            } catch (error) {
                logger.warn("Не удалось сжать изображение:", error);
                // Если не удалось сжать, возвращаем оригинальный файл
                return file;
            }
        }
        
        // Возвращаем файл без изменений, если он не требует обработки
        return file;
    }
    
    /**
     * Сжимает изображение для уменьшения размера
     * @private
     * @param {File} file - Файл для сжатия
     * @returns {Promise<File>} - Сжатый файл
     */
    async function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function(event) {
                const img = new Image();
                img.src = event.target.result;
                img.onload = function() {
                    // Создаем canvas для сжатия
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Берем настройки из конфигурации или используем значения по умолчанию
                    const MAX_WIDTH = config.LIMITS ? config.LIMITS.COMPRESS_MAX_WIDTH : 1920;
                    const MAX_HEIGHT = config.LIMITS ? config.LIMITS.COMPRESS_MAX_HEIGHT : 1920;
                    
                    // Рассчитываем новый размер, сохраняя пропорции
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Качество сжатия
                    const quality = config.LIMITS ? config.LIMITS.COMPRESS_QUALITY : 0.85;
                    
                    // Конвертируем обратно в Blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            // Создаем новый File объект со сжатым изображением
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg', // Всегда конвертируем в JPEG для уменьшения размера
                                lastModified: new Date().getTime()
                            });
                            resolve(compressedFile);
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    }, 'image/jpeg', quality);
                };
                img.onerror = function() {
                    reject(new Error('Image loading error'));
                };
            };
            reader.onerror = function() {
                reject(new Error('FileReader error'));
            };
        });
    }
    
    /**
     * Сбрасывает состояние загрузки изображений для одиночного анализа
     */
    function resetSingleImageUpload() {
        if (singlePreviewContainer) {
            singlePreviewContainer.style.display = 'none';
            if (singlePreviewImage) singlePreviewImage.src = '#';
        }
        if (singleUploadArea) singleUploadArea.style.display = 'flex';
        if (singleUploadInput) {
            try {
                singleUploadInput.value = '';
            } catch (e) {
                logger.debug("Не удалось сбросить значение singleUploadInput:", e);
            }
        }
        
        document.dispatchEvent(new CustomEvent('singleImageRemoved'));
    }
    
    /**
     * Сбрасывает состояние загрузки изображений для сравнения
     */
    function resetCompareImageUploads() {
        document.querySelectorAll('.image-slot').forEach((slot, index) => {
            slot.classList.remove('filled');
            slot.innerHTML = `
                <div class="upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><use href="#upload-svg-icon"></use></svg></div>
                <input type="file" class="compare-upload-input" accept="image/*" data-slot="${index}">`;
                
            const newInput = slot.querySelector('.compare-upload-input');
            if (newInput) {
                 newInput.addEventListener('change', (e) => 
                     handleCompareImageUpload(e.target.files[0], parseInt(e.target.dataset.slot)));
                     
                 if (deviceDetect.isIOS) {
                     newInput.addEventListener('input', (e) => 
                         handleCompareImageUpload(e.target.files[0], parseInt(e.target.dataset.slot)));
                 }
                 
                 setupDragAndDrop(slot, newInput, handleCompareImageUpload, index);
            }
        });
        
        document.dispatchEvent(new CustomEvent('allCompareImagesRemoved'));
    }
    
    /**
     * Сбрасывает состояние загрузки изображений для примерки
     */
    function resetTryOnUploads() {
        // Сброс фото пользователя
        if (yourPhotoContainer) { 
            yourPhotoContainer.style.display = 'none'; 
            if (yourPhotoPreview) yourPhotoPreview.src = '#'; 
        }
        if (yourPhotoUploadArea) yourPhotoUploadArea.style.display = 'flex';
        if (yourPhotoInput) {
            try { yourPhotoInput.value = ''; } catch (e) { }
        }
        
        // Сброс фото образа
        if (outfitPhotoContainer) { 
            outfitPhotoContainer.style.display = 'none'; 
            if (outfitPhotoPreview) outfitPhotoPreview.src = '#'; 
        }
        if (outfitPhotoUploadArea) outfitPhotoUploadArea.style.display = 'flex';
        if (outfitPhotoInput) {
            try { outfitPhotoInput.value = ''; } catch (e) { }
        }
        
        document.dispatchEvent(new CustomEvent('allTryOnImagesRemoved'));
    }
    
    /**
     * Проверяет, идет ли в данный момент загрузка изображения
     * @returns {boolean} - true если идет загрузка
     */
    function isUploading() {
        return state.isImageUploading;
    }
    
    // Публичный API модуля
    return {
        init,
        resetSingleImageUpload,
        resetCompareImageUploads,
        resetTryOnUploads,
        isUploading,
        validateImageFile,
        processImageFile
    };
})();
