/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Виртуальная примерка (try-on.js)
ВЕРСИЯ: 0.5.0 (Реализация полного функционала примерки)
ДАТА ОБНОВЛЕНИЯ: 2025-05-22

НАЗНАЧЕНИЕ ФАЙЛА:
Реализует функциональность виртуальной примерки одежды.
Обрабатывает загрузку фотографий и наложение выбранных предметов одежды.
Интегрируется с API для создания композитных изображений.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};
window.MishuraApp.features.tryOn = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger, uiHelpers, apiService;
    
    // Элементы DOM
    let tryOnButton, tryOnCancelButton, tryOnResultCloseButton;
    let yourPhotoInput, outfitPhotoInput;
    let yourPhotoPreview, outfitPhotoPreview;
    let yourPhotoContainer, outfitPhotoContainer;
    let yourPhotoUploadArea, outfitPhotoUploadArea;
    let deleteYourPhotoButton, deleteOutfitPhotoButton;
    let tryOnSubmitButton, tryOnStyleSelector;
    let tryOnResultContainer, tryOnResultImage;
    let tryOnDownloadButton, tryOnShareButton;
    
    // Текущие данные
    let uploadedImages = {
        yourPhoto: null,
        outfitPhoto: null
    };
    
    // Результат примерки
    let tryOnResult = null;
    
    /**
     * Инициализация модуля
     */
    function init() {
        console.log("Инициализация модуля виртуальной примерки");
        
        // Получаем ссылки на другие модули
        if (window.MishuraApp && window.MishuraApp.config) {
            config = window.MishuraApp.config;
        }
        
        if (window.MishuraApp && window.MishuraApp.utils) {
            logger = window.MishuraApp.utils.logger;
            uiHelpers = window.MishuraApp.utils.uiHelpers;
        }
        
        if (window.MishuraApp && window.MishuraApp.api) {
            apiService = window.MishuraApp.api.service;
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
        initEventListeners();
        
        logger.info('Модуль Виртуальная примерка инициализирован');
    }
    
    /**
     * Инициализация элементов DOM
     * @private
     */
    function initDOMElements() {
        console.log("Инициализация DOM элементов виртуальной примерки");
        
        // Кнопки
        tryOnButton = document.getElementById('try-on-button');
        tryOnCancelButton = document.getElementById('try-on-cancel');
        tryOnResultCloseButton = document.getElementById('try-on-result-close');
        tryOnSubmitButton = document.getElementById('try-on-button-submit');
        
        // Инпуты для фото
        yourPhotoInput = document.getElementById('your-photo-input');
        outfitPhotoInput = document.getElementById('outfit-photo-input');
        
        // Превью
        yourPhotoPreview = document.getElementById('your-photo-preview');
        outfitPhotoPreview = document.getElementById('outfit-photo-preview');
        
        // Контейнеры
        yourPhotoContainer = document.getElementById('your-photo-container');
        outfitPhotoContainer = document.getElementById('outfit-photo-container');
        
        // Области загрузки
        yourPhotoUploadArea = document.getElementById('your-photo-upload-area');
        outfitPhotoUploadArea = document.getElementById('outfit-photo-upload-area');
        
        // Кнопки удаления
        deleteYourPhotoButton = document.querySelector('.delete-image[data-target="your-photo"]');
        deleteOutfitPhotoButton = document.querySelector('.delete-image[data-target="outfit-photo"]');
        
        // Селектор стиля
        tryOnStyleSelector = document.getElementById('try-on-style-selector');
        
        // Результаты
        tryOnResultContainer = document.getElementById('try-on-result-container');
        tryOnResultImage = document.getElementById('try-on-result-image');
        
        // Кнопки для действий с результатом
        tryOnDownloadButton = document.getElementById('try-on-download');
        tryOnShareButton = document.getElementById('try-on-share');
        
        // Логирование ошибок, если элементы не найдены
        if (!yourPhotoInput) console.warn('Элемент yourPhotoInput не найден');
        if (!outfitPhotoInput) console.warn('Элемент outfitPhotoInput не найден');
        if (!yourPhotoUploadArea) console.warn('Элемент yourPhotoUploadArea не найден');
        if (!outfitPhotoUploadArea) console.warn('Элемент outfitPhotoUploadArea не найден');
        if (!tryOnSubmitButton) console.warn('Элемент tryOnSubmitButton не найден');
        if (!tryOnResultImage) console.warn('Элемент tryOnResultImage не найден');
    }
    
    /**
     * Инициализация обработчиков событий
     * @private
     */
    function initEventListeners() {
        console.log("Инициализация обработчиков событий виртуальной примерки");
        
        // Обработчик нажатия кнопки "Примерить" в главном меню
        if (tryOnButton) {
            const newButton = tryOnButton.cloneNode(true);
            tryOnButton.parentNode.replaceChild(newButton, tryOnButton);
            tryOnButton = newButton;
            
            tryOnButton.addEventListener('click', function() {
                console.log("Кнопка примерки в меню нажата");
                if (window.MishuraApp && window.MishuraApp.components && window.MishuraApp.components.modals) {
                    window.MishuraApp.components.modals.openTryOnModal();
                } else {
                    const tryOnOverlay = document.getElementById('try-on-overlay');
                    if (tryOnOverlay) {
                        tryOnOverlay.classList.add('active');
                    }
                }
            });
        }
        
        // Обработчики загрузки фото (ваше фото)
        if (yourPhotoInput) {
            const newInput = yourPhotoInput.cloneNode(true);
            yourPhotoInput.parentNode.replaceChild(newInput, yourPhotoInput);
            yourPhotoInput = newInput;
            
            yourPhotoInput.addEventListener('change', function(e) {
                console.log("Выбрано ваше фото");
                handlePhotoUpload(e, 'yourPhoto');
            });
        }
        
        // Обработчики загрузки фото (фото образа)
        if (outfitPhotoInput) {
            const newInput = outfitPhotoInput.cloneNode(true);
            outfitPhotoInput.parentNode.replaceChild(newInput, outfitPhotoInput);
            outfitPhotoInput = newInput;
            
            outfitPhotoInput.addEventListener('change', function(e) {
                console.log("Выбрано фото образа");
                handlePhotoUpload(e, 'outfitPhoto');
            });
        }
        
        // Обработчики кликов на области загрузки (ваше фото)
        if (yourPhotoUploadArea) {
            const newArea = yourPhotoUploadArea.cloneNode(true);
            yourPhotoUploadArea.parentNode.replaceChild(newArea, yourPhotoUploadArea);
            yourPhotoUploadArea = newArea;
            
            yourPhotoUploadArea.addEventListener('click', function() {
                console.log("Клик на область загрузки вашего фото");
                if (yourPhotoInput) yourPhotoInput.click();
            });
            
            // Настройка перетаскивания для вашего фото
            yourPhotoUploadArea.addEventListener('dragover', function(e) {
                e.preventDefault();
                yourPhotoUploadArea.classList.add('dragover');
            });
            
            yourPhotoUploadArea.addEventListener('dragleave', function() {
                yourPhotoUploadArea.classList.remove('dragover');
            });
            
            yourPhotoUploadArea.addEventListener('drop', function(e) {
                console.log("Файл перетащен в область загрузки вашего фото");
                e.preventDefault();
                yourPhotoUploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    const file = e.dataTransfer.files[0];
                    handlePhotoUpload({ target: { files: [file] } }, 'yourPhoto');
                }
            });
        }
        
        // Обработчики кликов на области загрузки (фото образа)
        if (outfitPhotoUploadArea) {
            const newArea = outfitPhotoUploadArea.cloneNode(true);
            outfitPhotoUploadArea.parentNode.replaceChild(newArea, outfitPhotoUploadArea);
            outfitPhotoUploadArea = newArea;
            
            outfitPhotoUploadArea.addEventListener('click', function() {
                console.log("Клик на область загрузки фото образа");
                if (outfitPhotoInput) outfitPhotoInput.click();
            });
            
            // Настройка перетаскивания для фото образа
            outfitPhotoUploadArea.addEventListener('dragover', function(e) {
                e.preventDefault();
                outfitPhotoUploadArea.classList.add('dragover');
            });
            
            outfitPhotoUploadArea.addEventListener('dragleave', function() {
                outfitPhotoUploadArea.classList.remove('dragover');
            });
            
            outfitPhotoUploadArea.addEventListener('drop', function(e) {
                console.log("Файл перетащен в область загрузки фото образа");
                e.preventDefault();
                outfitPhotoUploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    const file = e.dataTransfer.files[0];
                    handlePhotoUpload({ target: { files: [file] } }, 'outfitPhoto');
                }
            });
        }
        
        // Обработчики удаления фото (ваше фото)
        if (deleteYourPhotoButton) {
            const newButton = deleteYourPhotoButton.cloneNode(true);
            deleteYourPhotoButton.parentNode.replaceChild(newButton, deleteYourPhotoButton);
            deleteYourPhotoButton = newButton;
            
            deleteYourPhotoButton.addEventListener('click', function() {
                console.log("Кнопка удаления вашего фото нажата");
                resetPhoto('yourPhoto');
            });
        }
        
        // Обработчики удаления фото (фото образа)
        if (deleteOutfitPhotoButton) {
            const newButton = deleteOutfitPhotoButton.cloneNode(true);
            deleteOutfitPhotoButton.parentNode.replaceChild(newButton, deleteOutfitPhotoButton);
            deleteOutfitPhotoButton = newButton;
            
            deleteOutfitPhotoButton.addEventListener('click', function() {
                console.log("Кнопка удаления фото образа нажата");
                resetPhoto('outfitPhoto');
            });
        }
        
        // Обработчик кнопки примерки
        if (tryOnSubmitButton) {
            const newButton = tryOnSubmitButton.cloneNode(true);
            tryOnSubmitButton.parentNode.replaceChild(newButton, tryOnSubmitButton);
            tryOnSubmitButton = newButton;
            
            tryOnSubmitButton.addEventListener('click', function() {
                console.log("Кнопка примерки нажата");
                handleTryOnSubmit();
            });
        }
        
        // Обработчик кнопки скачивания результата
        if (tryOnDownloadButton) {
            tryOnDownloadButton.addEventListener('click', handleDownload);
        }
        
        // Обработчик кнопки поделиться результатом
        if (tryOnShareButton) {
            tryOnShareButton.addEventListener('click', handleShare);
        }
        
        console.log("Обработчики событий виртуальной примерки инициализированы");
    }
    
    /**
     * Обработка загрузки фото
     * @private
     * @param {Event} e - событие изменения инпута
     * @param {string} type - тип фото ('yourPhoto' или 'outfitPhoto')
     */
    function handlePhotoUpload(e, type) {
        if (!e.target.files || !e.target.files[0]) {
            console.warn(`Нет файлов для загрузки ${type}`);
            return;
        }
        
        const file = e.target.files[0];
        if (!isValidImageFile(file)) {
            console.warn(`Файл ${file.name} не является изображением`);
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Пожалуйста, выберите изображение');
            } else {
                alert('Пожалуйста, выберите изображение');
            }
            return;
        }
        
        console.log(`Обработка загрузки фото типа ${type}:`, file);
        
        // Сохраняем файл
        uploadedImages[type] = file;
        
        // Отображаем превью
        const reader = new FileReader();
        reader.onload = function(e) {
            let preview, container, uploadArea;
            
            if (type === 'yourPhoto') {
                preview = yourPhotoPreview;
                container = yourPhotoContainer;
                uploadArea = yourPhotoUploadArea;
            } else {
                preview = outfitPhotoPreview;
                container = outfitPhotoContainer;
                uploadArea = outfitPhotoUploadArea;
            }
            
            if (preview) {
                preview.src = e.target.result;
                console.log(`Превью для ${type} установлено`);
            }
            
            if (container) {
                container.classList.remove('hidden');
                console.log(`Контейнер для ${type} показан`);
            }
            
            if (uploadArea) {
                uploadArea.classList.add('hidden');
                console.log(`Область загрузки для ${type} скрыта`);
            }
            
            // Обновляем состояние кнопки примерки
            updateTryOnButtonState();
        };
        
        reader.onerror = function(error) {
            console.error(`Ошибка при чтении файла ${type}:`, error);
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Ошибка при чтении файла');
            } else {
                alert('Ошибка при чтении файла');
            }
        };
        
        reader.readAsDataURL(file);
    }
    
    /**
     * Сброс фото
     * @private
     * @param {string} type - тип фото ('yourPhoto' или 'outfitPhoto')
     */
    function resetPhoto(type) {
        console.log(`Сброс фото типа ${type}`);
        
        let input, container, uploadArea;
        
        if (type === 'yourPhoto') {
            input = yourPhotoInput;
            container = yourPhotoContainer;
            uploadArea = yourPhotoUploadArea;
        } else {
            input = outfitPhotoInput;
            container = outfitPhotoContainer;
            uploadArea = outfitPhotoUploadArea;
        }
        
        // Сбрасываем файл
        if (input) {
            input.value = '';
            console.log(`Значение инпута для ${type} сброшено`);
        }
        
        uploadedImages[type] = null;
        
        // Обновляем UI
        if (container) {
            container.classList.add('hidden');
            console.log(`Контейнер для ${type} скрыт`);
        }
        
        if (uploadArea) {
            uploadArea.classList.remove('hidden');
            console.log(`Область загрузки для ${type} показана`);
        }
        
        // Обновляем состояние кнопки примерки
        updateTryOnButtonState();
    }
    
    /**
     * Обновление состояния кнопки примерки
     * @private
     */
    function updateTryOnButtonState() {
        if (tryOnSubmitButton) {
            const isEnabled = (uploadedImages.yourPhoto && uploadedImages.outfitPhoto);
            tryOnSubmitButton.disabled = !isEnabled;
            console.log(`Кнопка примерки ${isEnabled ? 'активирована' : 'деактивирована'}`);
        }
    }
    
    /**
     * Обработка нажатия на кнопку примерки
     * @private
     */
    function handleTryOnSubmit() {
        console.log("Обработка запроса на примерку");
        
        if (!uploadedImages.yourPhoto || !uploadedImages.outfitPhoto) {
            console.warn("Не все необходимые изображения загружены");
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Пожалуйста, загрузите оба изображения для примерки');
            } else {
                alert('Пожалуйста, загрузите оба изображения для примерки');
            }
            return;
        }
        
        // Получаем выбранный стиль примерки
        let styleType = "natural";
        if (tryOnStyleSelector && tryOnStyleSelector.value) {
            styleType = tryOnStyleSelector.value;
        }
        
        console.log(`Выбранный стиль примерки: ${styleType}`);
        
        // Показываем загрузку
        showLoading(true);
        
        // Формируем данные для отправки на сервер
        const formData = new FormData();
        formData.append('personImage', uploadedImages.yourPhoto);
        formData.append('outfitImage', uploadedImages.outfitPhoto);
        formData.append('styleType', styleType);
        
        // Проверяем наличие API сервиса
        if (apiService && typeof apiService.processTryOn === 'function') {
            console.log("Отправка запроса на API");
            
            apiService.processTryOn(formData)
                .then(result => {
                    console.log("Получен результат примерки от API");
                    tryOnResult = result;
                    
                    // Отображаем результат
                    showTryOnResult(result.resultImage);
                    
                    // Скрываем загрузку
                    showLoading(false);
                })
                .catch(error => {
                    console.error("Ошибка при получении результата примерки:", error);
                    
                    // Скрываем загрузку
                    showLoading(false);
                    
                    if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                        uiHelpers.showToast('Произошла ошибка при обработке примерки');
                    } else {
                        alert('Произошла ошибка при обработке примерки');
                    }
                });
        } else {
            // Эмуляция задержки для демонстрации (для случая, когда API не доступен)
            console.log("API не доступен, использую эмуляцию для демонстрации");
            
            setTimeout(() => {
                // Создаем композитное изображение локально
                createCompositeImage(
                    uploadedImages.yourPhoto, 
                    uploadedImages.outfitPhoto
                ).then(compositeDataUrl => {
                    // Сохраняем результат
                    tryOnResult = { resultImage: compositeDataUrl };
                    
                    // Отображаем результат
                    showTryOnResult(compositeDataUrl);
                    
                    // Скрываем загрузку
                    showLoading(false);
                }).catch(error => {
                    console.error("Ошибка при создании композитного изображения:", error);
                    
                    // Скрываем загрузку
                    showLoading(false);
                    
                    if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                        uiHelpers.showToast('Произошла ошибка при обработке примерки');
                    } else {
                        alert('Произошла ошибка при обработке примерки');
                    }
                });
            }, 1500);
        }
    }
    
    /**
     * Создание композитного изображения (локальная версия для демонстрации)
     * @private
     * @param {File} personImageFile - файл с изображением человека
     * @param {File} outfitImageFile - файл с изображением образа
     * @returns {Promise<string>} - Promise с data URL результирующего изображения
     */
    function createCompositeImage(personImageFile, outfitImageFile) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Загружаем оба изображения
            const personImage = new Image();
            const outfitImage = new Image();
            let personLoaded = false;
            let outfitLoaded = false;
            
            // Функция для проверки, оба ли изображения загружены
            function checkBothLoaded() {
                if (personLoaded && outfitLoaded) {
                    try {
                        // Установка размеров канваса
                        canvas.width = personImage.width;
                        canvas.height = personImage.height;
                        
                        // Рисуем фото человека
                        ctx.drawImage(personImage, 0, 0);
                        
                        // Масштабируем образ
                        const scale = Math.min(
                            personImage.width / outfitImage.width * 0.9,
                            personImage.height / outfitImage.height * 0.9
                        );
                        
                        const outfitWidth = outfitImage.width * scale;
                        const outfitHeight = outfitImage.height * scale;
                        
                        // Позиционируем образ в центре нижней части
                        const outfitX = (personImage.width - outfitWidth) / 2;
                        const outfitY = personImage.height - outfitHeight;
                        
                        // Рисуем образ с прозрачностью
                        ctx.globalAlpha = 0.8;
                        ctx.drawImage(outfitImage, outfitX, outfitY, outfitWidth, outfitHeight);
                        ctx.globalAlpha = 1.0;
                        
                        // Возвращаем результат
                        resolve(canvas.toDataURL('image/jpeg'));
                    } catch (error) {
                        reject(error);
                    }
                }
            }
            
            // Загружаем изображение человека
            personImage.onload = function() {
                personLoaded = true;
                checkBothLoaded();
            };
            personImage.onerror = reject;
            
            // Загружаем изображение образа
            outfitImage.onload = function() {
                outfitLoaded = true;
                checkBothLoaded();
            };
            outfitImage.onerror = reject;
            
            // Конвертируем File в URL
            const personReader = new FileReader();
            personReader.onload = function(e) {
                personImage.src = e.target.result;
            };
            personReader.onerror = reject;
            personReader.readAsDataURL(personImageFile);
            
            const outfitReader = new FileReader();
            outfitReader.onload = function(e) {
                outfitImage.src = e.target.result;
            };
            outfitReader.onerror = reject;
            outfitReader.readAsDataURL(outfitImageFile);
        });
    }
    
    /**
     * Отображение результата примерки
     * @private
     * @param {string} imageDataUrl - data URL изображения результата
     */
    function showTryOnResult(imageDataUrl) {
        console.log("Отображение результата примерки");
        
        // Устанавливаем изображение
        if (tryOnResultImage) {
            tryOnResultImage.src = imageDataUrl;
            console.log("Изображение результата установлено");
        }
        
        // Открываем модальное окно с результатом
        if (window.MishuraApp && window.MishuraApp.components && window.MishuraApp.components.modals) {
            window.MishuraApp.components.modals.openTryOnResultModal();
            console.log("Модальное окно результатов примерки открыто");
        } else {
            const tryOnResultOverlay = document.getElementById('try-on-result-overlay');
            if (tryOnResultOverlay) {
                tryOnResultOverlay.classList.add('active');
                console.log("Модальное окно результатов примерки открыто (без модуля modals)");
            }
        }
    }
    
    /**
     * Обработка скачивания результата
     * @private
     */
    function handleDownload() {
        console.log("Обработка скачивания результата");
        
        if (!tryOnResult || !tryOnResult.resultImage) {
            console.warn("Нет результата для скачивания");
            return;
        }
        
        // Создаем временную ссылку
        const link = document.createElement('a');
        link.href = tryOnResult.resultImage;
        link.download = 'mishura-try-on-result.jpg';
        document.body.appendChild(link);
        
        // Эмулируем клик
        link.click();
        
        // Удаляем ссылку
        document.body.removeChild(link);
        
        console.log("Скачивание инициировано");
    }
    
    /**
     * Обработка поделиться результатом
     * @private
     */
    function handleShare() {
        console.log("Обработка поделиться результатом");
        
        if (!tryOnResult || !tryOnResult.resultImage) {
            console.warn("Нет результата для того, чтобы поделиться");
            return;
        }
        
        // Проверяем поддержку Web Share API
        if (navigator.share) {
            // Конвертируем data URL в Blob
            fetch(tryOnResult.resultImage)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], 'mishura-try-on-result.jpg', { type: 'image/jpeg' });
                    
                    navigator.share({
                        title: 'Мой образ от МИШУРА',
                        text: 'Посмотрите, как я примерил(-а) этот образ с помощью приложения МИШУРА!',
                        files: [file]
                    })
                    .then(() => console.log('Успешно поделились'))
                    .catch((error) => console.error('Ошибка при попытке поделиться:', error));
                })
                .catch(error => {
                    console.error('Ошибка при конвертации изображения:', error);
                    
                    if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                        uiHelpers.showToast('Ошибка при подготовке изображения');
                    } else {
                        alert('Ошибка при подготовке изображения');
                    }
                });
        } else {
            console.warn("Web Share API не поддерживается");
            
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Функция поделиться не поддерживается вашим браузером');
            } else {
                alert('Функция поделиться не поддерживается вашим браузером');
            }
        }
    }
    
    /**
     * Управление отображением индикатора загрузки
     * @private
     * @param {boolean} isLoading - флаг отображения загрузки
     */
    function showLoading(isLoading) {
        console.log(`${isLoading ? 'Показываем' : 'Скрываем'} индикатор загрузки`);
        
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (loadingOverlay) {
            loadingOverlay.classList.toggle('active', isLoading);
        }
        
        if (tryOnSubmitButton) {
            tryOnSubmitButton.disabled = isLoading;
        }
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
     * Сброс формы примерки
     * @public
     */
    function resetFittingForm() {
        console.log('Сброс формы примерки');
        
        resetPhoto('yourPhoto');
        resetPhoto('outfitPhoto');
        
        if (tryOnStyleSelector) {
            tryOnStyleSelector.selectedIndex = 0;
        }
    }
    
    // Публичный API
    return {
        init,
        resetFittingForm,
        handlePhotoUpload,
        createCompositeImage
    };
})();