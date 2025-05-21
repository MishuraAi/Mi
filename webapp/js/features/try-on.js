// В файле js/features/try-on.js

// Замкнутый модуль для избежания конфликтов в глобальной области
MishuraApp.features.tryOn = (function() {
    // Приватные переменные
    let yourPhotoFile = null;
    let outfitPhotoFile = null;
    
    // Инициализация модуля
    function init() {
        initUploadHandlers();
        initButtonHandlers();
    }
    
    // Обработчики загрузки изображений
    function initUploadHandlers() {
        // Обработка загрузки фото пользователя
        const yourPhotoArea = document.getElementById('your-photo-upload-area');
        const yourPhotoInput = document.getElementById('your-photo-input');
        const yourPhotoContainer = document.getElementById('your-photo-container');
        const yourPhotoPreview = document.getElementById('your-photo-preview');
        
        // Клик на область загрузки
        yourPhotoArea.addEventListener('click', function() {
            yourPhotoInput.click();
        });
        
        // Изменение input file
        yourPhotoInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                handleYourPhotoSelection(file);
            }
        });
        
        // Обработка загрузки фото одежды
        const outfitPhotoArea = document.getElementById('outfit-photo-upload-area');
        const outfitPhotoInput = document.getElementById('outfit-photo-input');
        const outfitPhotoContainer = document.getElementById('outfit-photo-container');
        const outfitPhotoPreview = document.getElementById('outfit-photo-preview');
        
        // Клик на область загрузки
        outfitPhotoArea.addEventListener('click', function() {
            outfitPhotoInput.click();
        });
        
        // Изменение input file
        outfitPhotoInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                handleOutfitPhotoSelection(file);
            }
        });
        
        // Обработчики удаления фото
        document.querySelector('.delete-image[data-target="your-photo"]').addEventListener('click', function() {
            resetYourPhoto();
        });
        
        document.querySelector('.delete-image[data-target="outfit-photo"]').addEventListener('click', function() {
            resetOutfitPhoto();
        });
    }
    
    // Обработка выбора фото пользователя
    function handleYourPhotoSelection(file) {
        if (!file.type.match('image.*')) {
            MishuraApp.utils.uiHelpers.showToast('Пожалуйста, выберите изображение');
            return;
        }
        
        yourPhotoFile = file;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('your-photo-preview').src = e.target.result;
            document.getElementById('your-photo-container').classList.remove('hidden');
            document.getElementById('your-photo-upload-area').classList.add('hidden');
        };
        reader.readAsDataURL(file);
        
        // Проверить, можно ли активировать кнопку примерки
        updateTryOnButtonState();
    }
    
    // Обработка выбора фото одежды
    function handleOutfitPhotoSelection(file) {
        if (!file.type.match('image.*')) {
            MishuraApp.utils.uiHelpers.showToast('Пожалуйста, выберите изображение');
            return;
        }
        
        outfitPhotoFile = file;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('outfit-photo-preview').src = e.target.result;
            document.getElementById('outfit-photo-container').classList.remove('hidden');
            document.getElementById('outfit-photo-upload-area').classList.add('hidden');
        };
        reader.readAsDataURL(file);
        
        // Проверить, можно ли активировать кнопку примерки
        updateTryOnButtonState();
    }
    
    // Сброс фото пользователя
    function resetYourPhoto() {
        yourPhotoFile = null;
        document.getElementById('your-photo-upload-area').classList.remove('hidden');
        document.getElementById('your-photo-container').classList.add('hidden');
        document.getElementById('your-photo-input').value = '';
        updateTryOnButtonState();
    }
    
    // Сброс фото одежды
    function resetOutfitPhoto() {
        outfitPhotoFile = null;
        document.getElementById('outfit-photo-upload-area').classList.remove('hidden');
        document.getElementById('outfit-photo-container').classList.add('hidden');
        document.getElementById('outfit-photo-input').value = '';
        updateTryOnButtonState();
    }
    
    // Обновление состояния кнопки примерки
    function updateTryOnButtonState() {
        const submitButton = document.getElementById('try-on-button-submit');
        if (yourPhotoFile && outfitPhotoFile) {
            submitButton.disabled = false;
            submitButton.classList.remove('btn-disabled');
        } else {
            submitButton.disabled = true;
            submitButton.classList.add('btn-disabled');
        }
    }
    
    // Обработчики кнопок
    function initButtonHandlers() {
        const tryOnButton = document.getElementById('try-on-button-submit');
        const cancelButton = document.getElementById('try-on-cancel');
        const resultCloseButton = document.getElementById('try-on-result-close');
        const downloadButton = document.getElementById('try-on-result-download');
        
        tryOnButton.addEventListener('click', function() {
            // В будущем здесь будет отправка на бэкенд и обработка
            // Пока просто имитируем процесс загрузки и показываем результат
            if (yourPhotoFile && outfitPhotoFile) {
                processTryOn();
            } else {
                MishuraApp.utils.uiHelpers.showToast('Пожалуйста, загрузите оба изображения');
            }
        });
        
        cancelButton.addEventListener('click', function() {
            document.getElementById('try-on-overlay').classList.remove('visible');
        });
        
        resultCloseButton.addEventListener('click', function() {
            document.getElementById('try-on-result-overlay').classList.remove('visible');
        });
        
        downloadButton.addEventListener('click', function() {
            // Функция скачивания результата (будет реализована позже)
            MishuraApp.utils.uiHelpers.showToast('Функция скачивания будет доступна в следующей версии');
        });
    }
    
    // Обработка примерки
    function processTryOn() {
        // Показываем индикатор загрузки
        MishuraApp.utils.uiHelpers.showLoading('Обрабатываем ваши фотографии...');
        
        // Имитация задержки обработки (в реальном приложении здесь будет запрос к API)
        setTimeout(function() {
            // Скрываем индикатор загрузки
            MishuraApp.utils.uiHelpers.hideLoading();
            
            // Закрываем диалог примерки
            document.getElementById('try-on-overlay').classList.remove('visible');
            
            // Показываем результат (временно используем фото одежды как результат)
            document.getElementById('try-on-result-image').src = document.getElementById('outfit-photo-preview').src;
            document.getElementById('try-on-result-overlay').classList.add('visible');
            
            // В этом месте будущем будет обработка результата от API
        }, 1500);
    }
    
    // Публичный API модуля
    return {
        init: init
    };
})();