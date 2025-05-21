/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Виртуальная примерка (try-on.js)
ВЕРСИЯ: 0.4.2 (Исправлена загрузка фотографий и функция примерки)
ДАТА ОБНОВЛЕНИЯ: 2025-05-22

НАЗНАЧЕНИЕ ФАЙЛА:
Реализует функциональность виртуальной примерки одежды.
Обрабатывает загрузку фотографий и наложение выбранных предметов одежды.
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
    
    // Текущие данные
    let uploadedImages = {
        yourPhoto: null,
        outfitPhoto: null
    };
    
    /**
     * Инициализация модуля
     */
    function init() {
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
        
        if (logger) {
            logger.info('Модуль Виртуальная примерка инициализирован');
        }
    }
    
    /**
     * Инициализация элементов DOM
     * @private
     */
    function initDOMElements() {
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
        
        // Логирование ошибок, если элементы не найдены
        if (!yourPhotoInput) logger.warn('Элемент yourPhotoInput не найден');
        if (!outfitPhotoInput) logger.warn('Элемент outfitPhotoInput не найден');
        if (!yourPhotoUploadArea) logger.warn('Элемент yourPhotoUploadArea не найден');
        if (!outfitPhotoUploadArea) logger.warn('Элемент outfitPhotoUploadArea не найден');
        if (!tryOnSubmitButton) logger.warn('Элемент tryOnSubmitButton не найден');
    }
    
    /**
     * Инициализация обработчиков событий
     * @private
     */
    function initEventListeners() {
        // Обработчик нажатия кнопки "Примерить" в главном меню
        if (tryOnButton) {
            tryOnButton.addEventListener('click', function() {
                if (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.modals) {
                    window.MishuraApp.utils.modals.openTryOnModal();
                } else {
                    const tryOnOverlay = document.getElementById('try-on-overlay');
                    if (tryOnOverlay) {
                        tryOnOverlay.classList.add('active');
                    }
                }
            });
        }
        
        // Обработчики загрузки фото
        if (yourPhotoInput) {
            yourPhotoInput.addEventListener('change', function(e) {
                handlePhotoUpload(e, 'yourPhoto');
            });
        }
        
        if (outfitPhotoInput) {
            outfitPhotoInput.addEventListener('change', function(e) {
                handlePhotoUpload(e, 'outfitPhoto');
            });
        }
        
        // Обработчики кликов на области загрузки
        if (yourPhotoUploadArea) {
            yourPhotoUploadArea.addEventListener('click', function() {
                if (yourPhotoInput) yourPhotoInput.click();
            });
        }
        
        if (outfitPhotoUploadArea) {
            outfitPhotoUploadArea.addEventListener('click', function() {
                if (outfitPhotoInput) outfitPhotoInput.click();
            });
        }
        
        // Обработчики удаления фото
        if (deleteYourPhotoButton) {
            deleteYourPhotoButton.addEventListener('click', function() {
                resetPhoto('yourPhoto');
            });
        }
        
        if (deleteOutfitPhotoButton) {
            deleteOutfitPhotoButton.addEventListener('click', function() {
                resetPhoto('outfitPhoto');
            });
        }
        
        // Обработчик кнопки примерки
        if (tryOnSubmitButton) {
            tryOnSubmitButton.addEventListener('click', handleTryOnSubmit);
        }
        
        // Обработчики закрытия модальных окон
        if (tryOnCancelButton) {
            tryOnCancelButton.addEventListener('click', function() {
                if (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.modals) {
                    window.MishuraApp.utils.modals.closeModal('try-on-overlay');
                } else {
                    const tryOnOverlay = document.getElementById('try-on-overlay');
                    if (tryOnOverlay) {
                        tryOnOverlay.classList.remove('active');
                    }
                }
            });
        }
        
        if (tryOnResultCloseButton) {
            tryOnResultCloseButton.addEventListener('click', function() {
                if (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.modals) {
                    window.MishuraApp.utils.modals.closeModal('try-on-result-overlay');
                } else {
                    const tryOnResultOverlay = document.getElementById('try-on-result-overlay');
                    if (tryOnResultOverlay) {
                        tryOnResultOverlay.classList.remove('active');
                    }
                }
            });
        }
    }
    
    /**
     * Обработка загрузки фото
     * @private
     * @param {Event} e - событие изменения инпута
     * @param {string} type - тип фото ('yourPhoto' или 'outfitPhoto')
     */
    function handlePhotoUpload(e, type) {
        if (!e.target.files || !e.target.files[0]) return;
        
        const file = e.target.files[0];
        if (!isValidImageFile(file)) {
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Пожалуйста, выберите изображение');
            } else {
                alert('Пожалуйста, выберите изображение');
            }
            return;
        }
        
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
            
            if (preview) preview.src = e.target.result;
            if (container) container.classList.remove('hidden');
            if (uploadArea) uploadArea.classList.add('hidden');
            
            // Обновляем состояние кнопки примерки
            updateTryOnButtonState();
        };
        
        reader.onerror = function() {
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
        if (input) input.value = '';
        uploadedImages[type] = null;
        
        // Обновляем UI
        if (container) container.classList.add('hidden');
        if (uploadArea) uploadArea.classList.remove('hidden');
        
        // Обновляем состояние кнопки примерки
        updateTryOnButtonState();
    }
    
    /**
     * Обновление состояния кнопки примерки
     * @private
     */
    function updateTryOnButtonState() {
        if (tryOnSubmitButton) {
            tryOnSubmitButton.disabled = !(uploadedImages.yourPhoto && uploadedImages.outfitPhoto);
        }
    }
    
    /**
     * Обработка нажатия на кнопку примерки
     * @private
     */
    function handleTryOnSubmit() {
        if (!uploadedImages.yourPhoto || !uploadedImages.outfitPhoto) {
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Пожалуйста, загрузите оба изображения для примерки');
            } else {
                alert('Пожалуйста, загрузите оба изображения для примерки');
            }
            return;
        }
        
        // Показываем загрузку
        showLoading(true);
        
        // Эмуляция задержки для демонстрации (в реальном приложении здесь будет запрос к API)
        setTimeout(() => {
            // Скрываем загрузку
            showLoading(false);
            
            // Открываем окно с результатом примерки
            if (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.modals) {
                window.MishuraApp.utils.modals.openModal('try-on-result-overlay');
            } else {
                const tryOnResultOverlay = document.getElementById('try-on-result-overlay');
                if (tryOnResultOverlay) {
                    tryOnResultOverlay.classList.add('active');
                }
            }
            
            // Показываем уведомление о том, что функция в разработке
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Функция виртуальной примерки в разработке');
            }
        }, 1500);
    }
    
    /**
     * Управление отображением индикатора загрузки
     * @private
     * @param {boolean} isLoading - флаг отображения загрузки
     */
    function showLoading(isLoading) {
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
        resetPhoto('yourPhoto');
        resetPhoto('outfitPhoto');
        
        if (tryOnStyleSelector) {
            tryOnStyleSelector.selectedIndex = 0;
        }
    }
    
    // Публичный API
    return {
        init,
        resetFittingForm
    };
})();