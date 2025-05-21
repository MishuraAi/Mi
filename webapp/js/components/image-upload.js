// В файле js/components/image-upload.js

// Найдите функцию, которая обрабатывает загрузку одиночного изображения
function initSingleImageUpload() {
    const uploadArea = document.getElementById('single-upload-area');
    const fileInput = document.getElementById('single-upload-input');
    const previewContainer = document.getElementById('single-preview-container');
    const previewImage = document.getElementById('single-preview-image');
    
    // Исправить обработчик клика
    uploadArea.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        fileInput.click(); // Убедитесь, что это вызывается
    });
    
    // Исправить обработчик изменения файла
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            handleImageSelection(file, previewImage, previewContainer, uploadArea);
        }
    });
    
    // Добавить и обработчик drop, если его нет
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            const file = e.dataTransfer.files[0];
            handleImageSelection(file, previewImage, previewContainer, uploadArea);
        }
    });
}

// Функция обработки выбранного изображения (переиспользуется)
function handleImageSelection(file, previewImage, previewContainer, uploadArea) {
    if (!file.type.match('image.*')) {
        MishuraApp.utils.uiHelpers.showToast('Пожалуйста, выберите изображение');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImage.src = e.target.result;
        previewContainer.classList.remove('hidden');
        uploadArea.classList.add('hidden');
        
        // Убедитесь, что это активирует правильные состояния UI
        document.querySelector('.occasion-selector').classList.remove('hidden');
        document.querySelectorAll('.input-label').forEach(label => label.classList.remove('hidden'));
        document.querySelector('.preferences-input').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Убедитесь, что функция инициализации вызывается в init
function init() {
    initSingleImageUpload();
    initCompareImageUpload();
    initDeleteButtons();
}