// Исправление в webapp/js/features/try-on.js

function initDOMElements() {
    // Используем правильные ID элементов в соответствии с HTML
    const yourPhotoUpload = document.getElementById('your-photo-input');
    const outfitPhotoUpload = document.getElementById('outfit-photo-input');
    const yourPhotoPreview = document.getElementById('your-photo-preview');
    const outfitPhotoPreview = document.getElementById('outfit-photo-preview');
    const yourPhotoContainer = document.getElementById('your-photo-container');
    const outfitPhotoContainer = document.getElementById('outfit-photo-container');
    const tryOnButton = document.getElementById('try-on-button-submit');
    
    // Обновляем ссылки на элементы
    fittingImageUpload = {
        yourPhoto: yourPhotoUpload,
        outfitPhoto: outfitPhotoUpload
    };
    
    fittingResults = document.getElementById('try-on-result-container');
    fittingResultImage = document.getElementById('try-on-result-image');
    fittingSubmitButton = tryOnButton;
    
    // Прикрепляем контейнеры и превью для удобства
    fittingPreviews = {
        yourPhoto: yourPhotoPreview,
        outfitPhoto: outfitPhotoPreview,
        yourPhotoContainer: yourPhotoContainer,
        outfitPhotoContainer: outfitPhotoContainer
    };
}

function initEventListeners() {
    // Обработчик загрузки фото пользователя
    if (fittingImageUpload.yourPhoto) {
        fittingImageUpload.yourPhoto.addEventListener('change', function(e) {
            handlePhotoUpload(e, 'yourPhoto');
        });
    }
    
    // Обработчик загрузки фото одежды
    if (fittingImageUpload.outfitPhoto) {
        fittingImageUpload.outfitPhoto.addEventListener('change', function(e) {
            handlePhotoUpload(e, 'outfitPhoto');
        });
    }
    
    // Обработка кликов на области загрузки
    const uploadAreas = document.querySelectorAll('.tryon-upload-area');
    uploadAreas.forEach(area => {
        area.addEventListener('click', function(e) {
            const id = this.id;
            if (id === 'your-photo-upload-area' && fittingImageUpload.yourPhoto) {
                fittingImageUpload.yourPhoto.click();
            } else if (id === 'outfit-photo-upload-area' && fittingImageUpload.outfitPhoto) {
                fittingImageUpload.outfitPhoto.click();
            }
        });
    });
    
    // Обработчики удаления фото
    const deleteButtons = document.querySelectorAll('.delete-image[data-target]');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            if (target === 'your-photo') {
                resetPhoto('yourPhoto');
            } else if (target === 'outfit-photo') {
                resetPhoto('outfitPhoto');
            }
        });
    });
    
    // Обработчик кнопки примерки
    if (fittingSubmitButton) {
        fittingSubmitButton.addEventListener('click', handleTryOnSubmit);
    }
}

// Функция обработки загрузки фото
function handlePhotoUpload(e, type) {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    if (!isValidImageFile(file)) {
        if (uiHelpers) {
            uiHelpers.showToast('Пожалуйста, выберите изображение');
        }
        return;
    }
    
    // Сохраняем файл
    if (type === 'yourPhoto') {
        uploadedImages.yourPhoto = file;
    } else if (type === 'outfitPhoto') {
        uploadedImages.outfitPhoto = file;
    }
    
    // Отображаем превью
    const reader = new FileReader();
    reader.onload = function(e) {
        if (fittingPreviews[type]) {
            fittingPreviews[type].src = e.target.result;
            fittingPreviews[type + 'Container'].classList.remove('hidden');
        }
        
        // Скрываем область загрузки
        const areaId = type === 'yourPhoto' ? 'your-photo-upload-area' : 'outfit-photo-upload-area';
        const area = document.getElementById(areaId);
        if (area) {
            area.classList.add('hidden');
        }
        
        // Обновляем состояние кнопки
        updateButtonState();
    };
    reader.readAsDataURL(file);
}

// Функция сброса фото
function resetPhoto(type) {
    // Сбрасываем файл
    if (type === 'yourPhoto') {
        if (fittingImageUpload.yourPhoto) {
            fittingImageUpload.yourPhoto.value = '';
        }
        uploadedImages.yourPhoto = null;
    } else if (type === 'outfitPhoto') {
        if (fittingImageUpload.outfitPhoto) {
            fittingImageUpload.outfitPhoto.value = '';
        }
        uploadedImages.outfitPhoto = null;
    }
    
    // Скрываем превью
    if (fittingPreviews[type + 'Container']) {
        fittingPreviews[type + 'Container'].classList.add('hidden');
    }
    
    // Показываем область загрузки
    const areaId = type === 'yourPhoto' ? 'your-photo-upload-area' : 'outfit-photo-upload-area';
    const area = document.getElementById(areaId);
    if (area) {
        area.classList.remove('hidden');
    }
    
    // Обновляем состояние кнопки
    updateButtonState();
}

// Обновление состояния кнопки примерки
function updateButtonState() {
    if (fittingSubmitButton) {
        fittingSubmitButton.disabled = !(uploadedImages.yourPhoto && uploadedImages.outfitPhoto);
    }
}

// Функция обработки нажатия на кнопку примерки
function handleTryOnSubmit() {
    if (!uploadedImages.yourPhoto || !uploadedImages.outfitPhoto) {
        if (uiHelpers) {
            uiHelpers.showToast('Пожалуйста, загрузите оба изображения для примерки');
        }
        return;
    }
    
    // Демо-режим пока функция в разработке
    showLoading(true);
    setTimeout(() => {
        showLoading(false);
        
        // Показываем результат (в демо-режиме просто открываем модалку с результатом)
        const resultModal = document.getElementById('try-on-result-overlay');
        if (resultModal) {
            if (window.MishuraApp.utils.modals) {
                window.MishuraApp.utils.modals.openModal('try-on-result-overlay');
            } else {
                resultModal.classList.add('active');
            }
        }
        
        if (uiHelpers) {
            uiHelpers.showToast('Функция виртуальной примерки в разработке');
        }
    }, 1500);
}

// Проверка на валидный формат изображения
function isValidImageFile(file) {
    return file && file.type && file.type.match('image.*');
}

// Вызывается при инициализации
function init() {
    // Получаем ссылки на модули
    config = window.MishuraApp.config;
    logger = window.MishuraApp.utils.logger;
    uiHelpers = window.MishuraApp.utils.uiHelpers;
    apiService = window.MishuraApp.api.service;
    
    // Инициализируем данные
    uploadedImages = {
        yourPhoto: null,
        outfitPhoto: null
    };
    
    // Инициализируем DOM элементы
    initDOMElements();
    
    // Настраиваем обработчики событий
    initEventListeners();
    
    if (logger) {
        logger.info('Модуль Виртуальная примерка инициализирован');
    } else {
        console.log('Модуль Виртуальная примерка инициализирован');
    }
}