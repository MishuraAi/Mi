// Исправление в webapp/js/components/image-upload.js

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

// Добавляем этот код для переключения между режимами
function initModeButtons() {
    const modeButtons = document.querySelectorAll('.mode-button');
    const singleAnalysisMode = document.getElementById('single-analysis-mode');
    const compareAnalysisMode = document.getElementById('compare-analysis-mode');
    
    if (modeButtons.length && singleAnalysisMode && compareAnalysisMode) {
        modeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const mode = this.getAttribute('data-mode');
                
                // Убираем активный класс со всех кнопок
                modeButtons.forEach(btn => btn.classList.remove('active'));
                
                // Добавляем активный класс на текущую кнопку
                this.classList.add('active');
                
                // Отображаем соответствующий режим
                if (mode === 'single') {
                    singleAnalysisMode.classList.remove('hidden');
                    compareAnalysisMode.classList.add('hidden');
                } else if (mode === 'compare') {
                    singleAnalysisMode.classList.add('hidden');
                    compareAnalysisMode.classList.remove('hidden');
                }
                
                // Отправляем событие смены режима
                document.dispatchEvent(new CustomEvent('consultationModeChanged', {
                    detail: { mode: mode }
                }));
            });
        });
    } else {
        if (logger) logger.warn("Не найдены элементы для переключения режимов консультации");
    }
}

// В функции init добавляем инициализацию переключателей режима
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
    initModeButtons(); // Добавляем эту строку
    
    logger.debug("Модуль загрузки изображений инициализирован");
}