/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузка изображений (image-upload.js)
ВЕРСИЯ: 0.4.8 (Исправлена загрузка в режиме сравнения в модальном окне)
ДАТА ОБНОВЛЕНИЯ: 2025-05-24

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
        
        logger.debug("Инициализация модуля загрузки изображений (v0.4.8)");
        initDOMElements(); // Сначала DOM
        initModeButtons();   // Потом режимы
        initSingleImageUpload(); // Потом загрузчики
        initCompareImageUpload();
        isImageUploadInitialized = true;
        logger.info("Модуль загрузки изображений инициализирован (v0.4.8)");
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
        // Теперь у нас нет переключателей режимов в интерфейсе
        // Режим будет устанавливаться программно через события
        logger.debug("ImageUpload: Переключатели режимов отключены. Используется программное управление режимами.");
        
        // Слушаем события изменения режима
        document.addEventListener('modeChanged', function(e) {
            const mode = e.detail.mode;
            console.log(`🎯 ImageUpload: Получено событие modeChanged с режимом '${mode}'`);
            logger.debug(`ImageUpload: Получено событие изменения режима на '${mode}'`);
            
            if (mode === 'single') {
                console.log(`📱 ImageUpload: Переключение на режим single`);
                if (singleAnalysisMode) singleAnalysisMode.classList.remove('hidden');
                if (compareAnalysisMode) compareAnalysisMode.classList.add('hidden');
                resetCompareImageUploads();
                initSingleImageUpload();
                logger.debug('ImageUpload: Режим single активирован');
            } else if (mode === 'compare') {
                console.log(`📷 ImageUpload: Переключение на режим compare`);
                if (singleAnalysisMode) singleAnalysisMode.classList.add('hidden');
                if (compareAnalysisMode) compareAnalysisMode.classList.remove('hidden');
                resetSingleImageUpload();
                logger.debug('ImageUpload: Переключение на режим compare, запуск инициализации...');
                // Реинициализируем compare режим с задержкой
                setTimeout(() => {
                    console.log(`⏰ ImageUpload: Таймер сработал, запуск initCompareImageUpload...`);
                    logger.debug('ImageUpload: Запуск initCompareImageUpload...');
                    imageSlotsContainer = document.querySelector('#compare-analysis-mode .image-slots');
                    if (imageSlotsContainer) {
                        console.log(`✅ ImageUpload: Найден контейнер слотов, слотов: ${imageSlotsContainer.querySelectorAll('.image-slot').length}`);
                        logger.debug(`ImageUpload: Найден контейнер слотов, слотов: ${imageSlotsContainer.querySelectorAll('.image-slot').length}`);
                    } else {
                        console.error(`❌ ImageUpload: Контейнер слотов НЕ НАЙДЕН!`);
                        logger.error('ImageUpload: Контейнер слотов НЕ НАЙДЕН!');
                    }
                    initCompareImageUpload();
                }, 250); // Увеличиваем задержку
            }
        });
        
        // Устанавливаем режим single по умолчанию
        if (singleAnalysisMode && compareAnalysisMode) {
            singleAnalysisMode.classList.remove('hidden');
            compareAnalysisMode.classList.add('hidden');
            logger.debug("ImageUpload: Режим 'single' установлен по умолчанию.");
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
                singlePreviewImage.style.display = 'block';
                singlePreviewContainer.style.display = 'block';
                singlePreviewContainer.classList.remove('hidden');
                singleUploadArea.classList.add('hidden');
                uploadedImages.single = file;
                
                const formContainer = document.getElementById('consultation-overlay');
                if (formContainer) {
                    const occasionSel = formContainer.querySelector('.occasion-selector');
                    const labels = formContainer.querySelectorAll('.input-label');
                    const prefsInput = formContainer.querySelector('.preferences-input');
                    const submitBtn = formContainer.querySelector('#submit-consultation');
                    if (occasionSel) {
                        occasionSel.classList.remove('hidden');
                        occasionSel.disabled = false;
                    }
                    labels.forEach(l => l.classList.remove('hidden'));
                    if (prefsInput) {
                        prefsInput.classList.remove('hidden');
                        prefsInput.disabled = false;
                    }
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.classList.remove('disabled');
                    }
                }
                logger.info(`ImageUpload (Single): Изображение ${file.name} загружено и отображено.`);
                document.dispatchEvent(new CustomEvent('singleImageUploaded', { detail: { file: file } }));
                
                // Закрываем диалог выбора файла после успешной загрузки
                if (singleFileInput) {
                    singleFileInput.value = '';
                }
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
    
    function tryAlternativeMethods(input, slotIndex) {
        console.log(`🔄 Запуск альтернативных методов для слота ${slotIndex}`);
        
        // Способ 1: focus + click
        setTimeout(() => {
            try {
                console.log(`🔄 Способ 1 - focus + click для слота ${slotIndex}`);
                input.focus();
                input.click();
                console.log(`✅ focus + click выполнен для слота ${slotIndex}`);
            } catch (altError1) {
                console.error(`❌ Способ 1 не сработал:`, altError1);
            }
        }, 100);
        
        // Способ 2: dispatchEvent с MouseEvent
        setTimeout(() => {
            try {
                console.log(`🔄 Способ 2 - dispatchEvent для слота ${slotIndex}`);
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                input.dispatchEvent(clickEvent);
                console.log(`✅ dispatchEvent выполнен для слота ${slotIndex}`);
            } catch (altError2) {
                console.error(`❌ Способ 2 не сработал:`, altError2);
            }
        }, 200);
        
        // Способ 3: Создаем временный label и кликаем по нему
        setTimeout(() => {
            try {
                console.log(`🔄 Способ 3 - создаем label для слота ${slotIndex}`);
                const tempLabel = document.createElement('label');
                tempLabel.htmlFor = input.id || `temp-input-${slotIndex}`;
                if (!input.id) input.id = `temp-input-${slotIndex}`;
                
                tempLabel.style.position = 'fixed';
                tempLabel.style.left = '50%';
                tempLabel.style.top = '50%';
                tempLabel.style.width = '100px';
                tempLabel.style.height = '50px';
                tempLabel.style.zIndex = '10000';
                tempLabel.style.backgroundColor = 'red';
                tempLabel.style.color = 'white';
                tempLabel.style.cursor = 'pointer';
                tempLabel.style.display = 'flex';
                tempLabel.style.alignItems = 'center';
                tempLabel.style.justifyContent = 'center';
                tempLabel.textContent = `Загрузить ${slotIndex}`;
                
                document.body.appendChild(tempLabel);
                
                // Автоматически удаляем через 3 секунды
                setTimeout(() => {
                    if (document.body.contains(tempLabel)) {
                        document.body.removeChild(tempLabel);
                        console.log(`⏰ Временный label удален автоматически для слота ${slotIndex}`);
                    }
                }, 3000);
                
                console.log(`✅ Временный label создан для слота ${slotIndex}. Кликните по красной кнопке.`);
                
            } catch (altError3) {
                console.error(`❌ Способ 3 не сработал:`, altError3);
            }
        }, 300);
    }

    function initCompareImageUpload() {
        console.log(`🚀 initCompareImageUpload: Начало инициализации сравнения`);
        // Обновляем ссылку на контейнер слотов - это критично!
        imageSlotsContainer = document.querySelector('#compare-analysis-mode .image-slots');
        
        if (!imageSlotsContainer) {
            console.error(`❌ initCompareImageUpload: imageSlotsContainer НЕ НАЙДЕН!`);
            logger.warn("ImageUpload (Compare): Пропуск инициализации - imageSlotsContainer не найден.");
            return;
        }
        
        const slots = imageSlotsContainer.querySelectorAll('.image-slot');
        if (!slots.length) {
            console.error(`❌ initCompareImageUpload: Слоты (.image-slot) НЕ НАЙДЕНЫ!`);
            logger.warn("ImageUpload (Compare): Слоты (.image-slot) не найдены в контейнере.");
            return;
        }

        console.log(`✅ initCompareImageUpload: Найдено ${slots.length} слотов для инициализации`);
        logger.debug(`ImageUpload (Compare): Найдено ${slots.length} слотов для инициализации`);

        slots.forEach((slot, index) => {
            const slotIndex = parseInt(slot.dataset.slot, 10);
            const input = slot.querySelector('.compare-upload-input');
            
            console.log(`🎰 Обработка слота ${index}, data-slot = ${slotIndex}, input найден = ${!!input}`);
            
            if (!input) {
                console.error(`❌ Слот ${slotIndex}: инпут НЕ НАЙДЕН!`);
                logger.warn(`ImageUpload (Compare): Инпут для слота ${slotIndex} не найден.`);
                return;
            }

            console.log(`🔧 Устанавливаю обработчики для слота ${slotIndex}`);
            logger.debug(`ImageUpload (Compare): Инициализация слота ${slotIndex}`);
            
            // Очищаем все старые обработчики, полностью пересоздавая слот
            const newSlot = slot.cloneNode(true);
            slot.parentNode.replaceChild(newSlot, slot);
            
            // Получаем ссылки на элементы нового слота
            const newInput = newSlot.querySelector('.compare-upload-input');
            
            // НОВЫЙ ПОДХОД: Создаем невидимый label, который покрывает весь слот
            const slotLabel = document.createElement('label');
            slotLabel.style.position = 'absolute';
            slotLabel.style.top = '0';
            slotLabel.style.left = '0';
            slotLabel.style.right = '0';
            slotLabel.style.bottom = '0';
            slotLabel.style.cursor = 'pointer';
            slotLabel.style.zIndex = '10';
            slotLabel.style.backgroundColor = 'transparent';
            
            // Связываем label с input
            if (!newInput.id) newInput.id = `compare-input-${slotIndex}`;
            slotLabel.htmlFor = newInput.id;
            
            // Делаем слот относительно позиционированным
            newSlot.style.position = 'relative';
            
            // Добавляем label в слот
            newSlot.appendChild(slotLabel);
            
            console.log(`🏷️ Создан label для слота ${slotIndex}, связанный с input ${newInput.id}`);
            
            // Добавляем обработчик клика на label для блокировки заполненных слотов
            slotLabel.addEventListener('click', function(e) {
                if (newSlot.classList.contains('filled')) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`⚠️ Слот ${slotIndex} уже заполнен, клик заблокирован`);
                } else {
                    console.log(`👆 Клик на label слота ${slotIndex} - передается на input`);
                    resetFileInput(newInput); // Сбрасываем input перед открытием диалога
                }
            });
            
            console.log(`✅ Label настроен для слота ${slotIndex}, программные клики больше не нужны`);

            // Обработчик change для инпута 
            newInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                console.log(`📁 CHANGE событие для слота ${slotIndex}, файл:`, file ? file.name : 'нет');
                logger.debug(`ImageUpload (Compare): Change event для слота ${slotIndex}, файл:`, file ? file.name : 'нет');
                
                if (file) {
                    console.log(`✅ Файл выбран для слота ${slotIndex}: ${file.name}`);
                    logger.debug(`ImageUpload (Compare): Файл выбран для слота ${slotIndex}: ${file.name}`);
                    handleCompareImageSelection(file, slotIndex);
                } else {
                    console.log(`❌ Выбор файла отменен для слота ${slotIndex}`);
                    logger.debug(`ImageUpload (Compare): Выбор файла отменен для слота ${slotIndex}`);
                }
            });

            // Drag & Drop обработчики
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
                if (!newSlot.classList.contains('filled') && e.dataTransfer.files.length) {
                    logger.debug(`ImageUpload (Compare): Файл перетащен для слота ${slotIndex}: ${e.dataTransfer.files[0].name}`);
                    handleCompareImageSelection(e.dataTransfer.files[0], slotIndex);
                }
            });
        });
        
        logger.debug("ImageUpload (Compare): Инициализация слотов завершена успешно");
    }
    
    function handleCompareImageSelection(file, slotIndex) {
        logger.debug(`ImageUpload (Compare): Обработка изображения для слота ${slotIndex}: ${file.name}`);
        if (!isValidImageFile(file)) return;

        isUploadingActive = true;
        const reader = new FileReader();
        reader.onload = (e) => {
            // Находим слот по актуальному селектору 
            const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
            if (!slot) {
                logger.error(`ImageUpload (Compare): Слот ${slotIndex} не найден в DOM.`);
                isUploadingActive = false;
                return;
            }

            const previewImg = slot.querySelector('.preview-image');
            const uploadIconElement = slot.querySelector('.upload-icon');
            let removeBtn = slot.querySelector('.delete-image');

            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                logger.debug(`ImageUpload (Compare): Превью установлено для слота ${slotIndex}`);
            }
            
            if (uploadIconElement) {
                uploadIconElement.style.display = 'none';
                logger.debug(`ImageUpload (Compare): Иконка загрузки скрыта для слота ${slotIndex}`);
            }

            // Создаем кнопку удаления если её нет
            if (!removeBtn) {
                removeBtn = document.createElement('button');
                removeBtn.className = 'delete-image';
                removeBtn.innerHTML = '×';
                removeBtn.title = 'Удалить изображение';
                slot.appendChild(removeBtn);
                
                // Добавляем обработчик для новой кнопки
                removeBtn.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    logger.debug(`ImageUpload (Compare): Нажата кнопка удаления для слота ${slotIndex}.`);
                    resetSlot(slotIndex);
                });
                
                logger.debug(`ImageUpload (Compare): Кнопка удаления создана для слота ${slotIndex}`);
            }

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
                    const submitBtn = formContainer.querySelector('#submit-consultation');
                    if (occasionSel) {
                        occasionSel.classList.remove('hidden');
                        occasionSel.disabled = false;
                    }
                    labels.forEach(l => l.classList.remove('hidden'));
                    if (prefsInput) {
                        prefsInput.classList.remove('hidden');
                        prefsInput.disabled = false;
                    }
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.classList.remove('disabled');
                    }
                    logger.debug(`ImageUpload (Compare): Форма активирована (≥2 изображений)`);
                }
            }
            
            logger.info(`ImageUpload (Compare): Изображение ${file.name} успешно загружено в слот ${slotIndex}.`);
            document.dispatchEvent(new CustomEvent('compareImageUploaded', { detail: { file: file, slot: slotIndex } }));
            
            // Очищаем input после успешной загрузки
            const fileInput = slot.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.value = '';
            }
            
            isUploadingActive = false;
        };
        reader.onerror = (error) => {
            logger.error("ImageUpload (Compare): Ошибка FileReader:", error);
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
    
    function resetSingleImageUpload() {
        logger.debug('ImageUpload: Сброс одиночного изображения (resetSingleImageUpload)...');
        resetFileInput(singleFileInput);
        if (singlePreviewContainer) {
            singlePreviewContainer.classList.add('hidden');
            singlePreviewContainer.style.display = 'none';
        }
        if (singlePreviewImage) {
            singlePreviewImage.src = '';
            singlePreviewImage.style.display = 'none';
        }
        if (singleUploadArea) {
            singleUploadArea.classList.remove('hidden');
            singleUploadArea.style.display = 'block';
        }
        uploadedImages.single = null;

        const formContainer = document.getElementById('consultation-overlay');
        if(formContainer){
            const occasionSel = formContainer.querySelector('.occasion-selector');
            const labels = formContainer.querySelectorAll('.input-label');
            const prefsInput = formContainer.querySelector('.preferences-input');
            const submitBtn = formContainer.querySelector('#submit-consultation');
            if (occasionSel) {
                occasionSel.classList.add('hidden');
                occasionSel.disabled = true;
            }
            labels.forEach(l => l.classList.add('hidden'));
            if (prefsInput) {
                prefsInput.classList.add('hidden');
                prefsInput.disabled = true;
            }
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('disabled');
            }
        }
        document.dispatchEvent(new CustomEvent('singleImageRemoved'));
        logger.debug('ImageUpload: Одиночное изображение сброшено.');
    }
    
    function resetSlot(slotIndex) {
        logger.debug(`ImageUpload: Сброс слота сравнения ${slotIndex}...`);
        const slot = document.querySelector(`#compare-analysis-mode .image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return logger.error(`ImageUpload: Слот ${slotIndex} не найден в DOM для сброса.`);
        
        const img = slot.querySelector('.preview-image');
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
        const removeBtn = slot.querySelector('.delete-image');
        if (removeBtn) removeBtn.remove();
        
        const uploadIconElement = slot.querySelector('.upload-icon');
        if (uploadIconElement) uploadIconElement.style.display = 'flex';
        
        slot.classList.remove('filled');
        const input = slot.querySelector('.compare-upload-input');
        resetFileInput(input);
        uploadedImages.compare[slotIndex] = null;
        
        const filledSlotsCount = document.querySelectorAll('#compare-analysis-mode .image-slot.filled').length;
        logger.debug(`ImageUpload: Кол-во заполненных слотов после сброса слота ${slotIndex}: ${filledSlotsCount}`);
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
        document.dispatchEvent(new CustomEvent('compareImageRemoved', { detail: { slot: slotIndex } }));
        logger.debug(`ImageUpload: Слот сравнения ${slotIndex} сброшен.`);
    }
    
    function resetCompareImageUploads() { /* ... как в версии 0.4.6 ... */ 
        logger.debug('ImageUpload: Сброс всех слотов сравнения...');
        // Обновляем ссылку на контейнер перед сбросом
        imageSlotsContainer = document.querySelector('#compare-analysis-mode .image-slots');
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