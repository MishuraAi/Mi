/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Консультация (consultation.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

НАЗНАЧЕНИЕ ФАЙЛА:
Управляет функциональностью получения консультации для одного предмета одежды.
Включает форму консультации, отправку запросов к API и отображение результатов.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};
window.MishuraApp.features.consultation = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger, uiHelpers, apiService, modals, imageUpload;
    
    // Текущее состояние модуля
    const state = {
        singleImage: null,
        lastApiResponse: null
    };
    
    // Элементы DOM
    let consultationButton, consultationOverlay;
    let fabButton, analyzeButton;
    let occasionSelector, preferencesInput;
    let singleAnalysisMode, resultsContainer;
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger;
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        apiService = window.MishuraApp.api.service;
        modals = window.MishuraApp.components.modals;
        imageUpload = window.MishuraApp.components.imageUpload;
        
        // Инициализация элементов DOM
        initDOMElements();
        
        // Настройка обработчиков событий
        setupEventListeners();
        
        logger.debug("Модуль консультации инициализирован");
    }
    
    /**
     * Инициализация элементов DOM
     * @private
     */
    function initDOMElements() {
        consultationButton = document.getElementById('consultation-button');
        consultationOverlay = document.getElementById('consultation-overlay');
        fabButton = document.getElementById('fab-button');
        analyzeButton = document.getElementById('analyze-button');
        occasionSelector = document.getElementById('occasion-selector');
        preferencesInput = document.getElementById('preferences-input');
        singleAnalysisMode = document.getElementById('single-analysis-mode');
        resultsContainer = document.getElementById('results-container');
        
        if (!consultationButton) logger.warn("Элемент consultationButton не найден");
        if (!consultationOverlay) logger.warn("Элемент consultationOverlay не найден");
        if (!fabButton) logger.warn("Элемент fabButton не найден");
        if (!analyzeButton) logger.warn("Элемент analyzeButton не найден");
        if (!occasionSelector) logger.warn("Элемент occasionSelector не найден");
        if (!preferencesInput) logger.warn("Элемент preferencesInput не найден");
        if (!singleAnalysisMode) logger.warn("Элемент singleAnalysisMode не найден");
        if (!resultsContainer) logger.warn("Элемент resultsContainer не найден");
    }
    
    /**
     * Настройка обработчиков событий
     * @private
     */
    function setupEventListeners() {
        // Обработчики кнопок для открытия модального окна консультации
        if (consultationButton) {
            consultationButton.addEventListener('click', openConsultationModal);
        }
        
        if (fabButton) {
            fabButton.addEventListener('click', openConsultationModal);
        }
        
        // Обработчик кнопки анализа
        if (analyzeButton) {
            analyzeButton.addEventListener('click', handleAnalyzeClick);
        }
        
        // Обработчики событий загрузки и удаления изображений
        document.addEventListener('singleImageUploaded', handleSingleImageUploaded);
        document.addEventListener('singleImageRemoved', handleSingleImageRemoved);
        
        // Обработчик закрытия оверлея для сброса формы
        document.addEventListener('overlayClose', function(event) {
            if (event.detail && event.detail.id === 'consultation-overlay') {
                // Можно сбросить форму, если нужно при закрытии
                // resetConsultationForm();
            }
        });
    }
    
    /**
     * Открывает модальное окно консультации
     */
    function openConsultationModal() {
        logger.info("Открытие модального окна консультации");
        resetConsultationForm();
        modals.openConsultationModal();
    }
    
    /**
     * Сбрасывает форму консультации в начальное состояние
     */
    function resetConsultationForm() {
        logger.debug("Сброс формы консультации");
        
        // Сбрасываем состояние
        state.singleImage = null;
        
        // Сбрасываем поля формы
        if (preferencesInput) preferencesInput.value = '';
        if (occasionSelector) occasionSelector.selectedIndex = 0;
        
        // Сбрасываем загруженное изображение
        imageUpload.resetSingleImageUpload();
    }
    
    /**
     * Обработчик события загрузки одиночного изображения
     * @private
     * @param {CustomEvent} event - Событие singleImageUploaded
     */
    function handleSingleImageUploaded(event) {
        if (event.detail && event.detail.file) {
            state.singleImage = event.detail.file;
            logger.debug("Одиночное изображение сохранено в state:", 
                {name: state.singleImage.name, size: state.singleImage.size});
        }
    }
    
    /**
     * Обработчик события удаления одиночного изображения
     * @private
     */
    function handleSingleImageRemoved() {
        state.singleImage = null;
        logger.debug("Одиночное изображение удалено из state");
    }
    
    /**
     * Обработчик нажатия на кнопку "Проанализировать"
     * @private
     */
    function handleAnalyzeClick() {
        logger.info("Клик по 'Проанализировать'");
        
        // Получаем активный режим от родительского компонента через состояние модального окна
        const consultationModeElement = document.querySelector('.mode-button.active');
        const consultationMode = consultationModeElement ? consultationModeElement.dataset.mode : 'single';
        
        // Проверка на активную загрузку
        if (imageUpload.isUploading()) {
            uiHelpers.showToast("Пожалуйста, дождитесь завершения загрузки изображения");
            return;
        }
        
        if (consultationMode === 'single') {
            if (!state.singleImage) { 
                uiHelpers.showToast("Пожалуйста, загрузите изображение одежды"); 
                return; 
            }
            
            analyzeSingleOutfit();
            
        } else {
            // Для режима сравнения используем модуль comparison
            // Отправляем событие, что нужно выполнить сравнение
            document.dispatchEvent(new CustomEvent('startCompareAnalysis'));
        }
    }
    
    /**
     * Отправляет запрос на анализ одиночного предмета одежды и отображает результат
     * @private
     */
    async function analyzeSingleOutfit() {
        logger.info("Начинаем анализ одиночного предмета одежды");
        
        // Получаем данные формы
        const occasion = occasionSelector ? occasionSelector.value : 'повседневный';
        const preferences = preferencesInput ? preferencesInput.value.trim() : null;
        
        try {
            const response = await apiService.analyzeSingleOutfit(
                state.singleImage,
                occasion,
                preferences
            );
            
            logger.info("Анализ одиночного предмета успешно получен");
            state.lastApiResponse = response;
            
            // Закрываем модальное окно консультации
            modals.closeOverlay(consultationOverlay);
            
            // Отображаем результаты
            displayResults(response.advice);
            
        } catch (error) {
            logger.error("Ошибка при analyzeSingleOutfit:", error);
            uiHelpers.showToast(`Ошибка анализа: ${error.message}. Попробуйте еще раз.`);
        }
    }
    
    /**
     * Отображает результаты анализа в модальном окне
     * @param {string} adviceMarkdown - Текст советов в формате Markdown
     */
    function displayResults(adviceMarkdown) {
        logger.info("Отображение результатов анализа");
        
        const parsedHtml = uiHelpers.parseMarkdownToHtml(adviceMarkdown);
        modals.openResultsModal(parsedHtml);
    }
    
    // Публичный API модуля
    return {
        init,
        openConsultationModal,
        resetConsultationForm
    };
})();