/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Сравнение (comparison.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

НАЗНАЧЕНИЕ ФАЙЛА:
Управляет функциональностью сравнения нескольких предметов одежды.
Включает интерфейс слотов для сравнения, отправку запросов к API и отображение результатов.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};
window.MishuraApp.features.comparison = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger, uiHelpers, apiService, modals, imageUpload;
    
    // Текущее состояние модуля
    const state = {
        compareImages: [null, null, null, null], // Массив для 4 слотов изображений
        lastApiResponse: null
    };
    
    // Элементы DOM
    let compareAnalysisMode, imageSlots;
    let consultationOverlay, occasionSelector, preferencesInput;
    
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
        
        logger.debug("Модуль сравнения инициализирован");
    }
    
    /**
     * Инициализация элементов DOM
     * @private
     */
    function initDOMElements() {
        compareAnalysisMode = document.getElementById('compare-analysis-mode');
        imageSlots = document.querySelectorAll('.image-slot');
        consultationOverlay = document.getElementById('consultation-overlay');
        occasionSelector = document.getElementById('occasion-selector');
        preferencesInput = document.getElementById('preferences-input');
        
        if (!compareAnalysisMode) logger.warn("Элемент compareAnalysisMode не найден");
        if (imageSlots.length === 0) logger.warn("Элементы imageSlots не найдены");
        if (!consultationOverlay) logger.warn("Элемент consultationOverlay не найден");
        if (!occasionSelector) logger.warn("Элемент occasionSelector не найден");
        if (!preferencesInput) logger.warn("Элемент preferencesInput не найден");
    }
    
    /**
     * Настройка обработчиков событий
     * @private
     */
    function setupEventListeners() {
        // Обработчики загрузки и удаления изображений
        document.addEventListener('compareImageUploaded', handleCompareImageUploaded);
        document.addEventListener('compareImageRemoved', handleCompareImageRemoved);
        document.addEventListener('allCompareImagesRemoved', handleAllCompareImagesRemoved);
        
        // Обработчик события запуска сравнения (от модуля consultation.js)
        document.addEventListener('startCompareAnalysis', handleStartCompareAnalysis);
        
        // Обработчик закрытия оверлея
        document.addEventListener('overlayClose', function(event) {
            if (event.detail && event.detail.id === 'consultation-overlay') {
                // Можно сбросить сравнение при закрытии, если нужно
            }
        });
        
        // Обработчик переключения режима консультации
        document.querySelectorAll('.mode-button').forEach(button => {
            button.addEventListener('click', function(event) {
                const mode = event.currentTarget.dataset.mode;
                if (mode === 'compare') {
                    // Проверяем, нужно ли сбросить состояние при переключении в режим сравнения
                    if (document.querySelector('.mode-button.active').dataset.mode !== 'compare') {
                        resetComparisonState();
                    }
                }
            });
        });
    }
    
    /**
     * Обработчик события загрузки изображения для сравнения
     * @private
     * @param {CustomEvent} event - Событие compareImageUploaded
     */
    function handleCompareImageUploaded(event) {
        if (event.detail && event.detail.file && typeof event.detail.slot === 'number') {
            const { file, slot } = event.detail;
            
            // Сохраняем файл в состоянии
            state.compareImages[slot] = file;
            
            logger.debug(`Изображение для сравнения сохранено в слот ${slot}:`, 
                {name: file.name, size: file.size});
        }
    }
    
    /**
     * Обработчик события удаления изображения для сравнения
     * @private
     * @param {CustomEvent} event - Событие compareImageRemoved
     */
    function handleCompareImageRemoved(event) {
        if (event.detail && typeof event.detail.slot === 'number') {
            const { slot } = event.detail;
            
            // Удаляем файл из состояния
            state.compareImages[slot] = null;
            
            logger.debug(`Изображение для сравнения удалено из слота ${slot}`);
        }
    }
    
    /**
     * Обработчик события удаления всех изображений для сравнения
     * @private
     */
    function handleAllCompareImagesRemoved() {
        // Сбрасываем все слоты
        state.compareImages = [null, null, null, null];
        logger.debug("Все изображения для сравнения удалены");
    }
    
    /**
     * Обработчик запуска анализа сравнения
     * @private
     */
    function handleStartCompareAnalysis() {
        logger.info("Запрос на анализ сравнения");
        
        // Проверка на активную загрузку
        if (imageUpload.isUploading()) {
            uiHelpers.showToast("Пожалуйста, дождитесь завершения загрузки изображения");
            return;
        }
        
        // Собираем все загруженные изображения
        const validImages = state.compareImages.filter(img => img !== null);
        
        if (validImages.length < 2) {
            uiHelpers.showToast("Загрузите минимум 2 изображения для сравнения");
            return;
        }
        
        if (validImages.length > config.LIMITS.MAX_COMPARE_ITEMS) {
            uiHelpers.showToast(`Максимум ${config.LIMITS.MAX_COMPARE_ITEMS} изображения для сравнения`);
            return;
        }
        
        compareOutfits(validImages);
    }
    
    /**
     * Отправляет запрос на сравнение предметов одежды и отображает результат
     * @private
     * @param {Array<File>} images - Массив файлов изображений для сравнения
     */
    async function compareOutfits(images) {
        logger.info(`Начинаем сравнение ${images.length} предметов одежды`);
        
        // Получаем данные формы
        const occasion = occasionSelector ? occasionSelector.value : 'повседневный';
        const preferences = preferencesInput ? preferencesInput.value.trim() : null;
        
        try {
            const response = await apiService.compareOutfits(
                images,
                occasion,
                preferences
            );
            
            logger.info("Результат сравнения успешно получен");
            state.lastApiResponse = response;
            
            // Закрываем модальное окно консультации
            modals.closeOverlay(consultationOverlay);
            
            // Отображаем результаты
            displayResults(response.advice);
            
        } catch (error) {
            logger.error("Ошибка при compareOutfits:", error);
            uiHelpers.showToast(`Ошибка сравнения: ${error.message}. Попробуйте еще раз.`);
        }
    }
    
    /**
     * Отображает результаты сравнения в модальном окне
     * @param {string} adviceMarkdown - Текст советов в формате Markdown
     */
    function displayResults(adviceMarkdown) {
        logger.info("Отображение результатов сравнения");
        
        const parsedHtml = uiHelpers.parseMarkdownToHtml(adviceMarkdown);
        modals.openResultsModal(parsedHtml);
    }
    
    /**
     * Сбрасывает состояние модуля сравнения
     */
    function resetComparisonState() {
        logger.debug("Сброс состояния сравнения");
        
        // Сбрасываем состояние
        state.compareImages = [null, null, null, null];
        
        // Сбрасываем UI
        imageUpload.resetCompareImageUploads();
    }
    
    /**
     * Получает последний ответ API для сравнения
     * @returns {Object|null} - Последний ответ API
     */
    function getLastApiResponse() {
        return state.lastApiResponse;
    }
    
    /**
     * Получает текущие изображения для сравнения
     * @returns {Array<File|null>} - Массив изображений (может содержать null)
     */
    function getCompareImages() {
        return [...state.compareImages]; // Возвращаем копию массива
    }
    
    // Публичный API модуля
    return {
        init,
        resetComparisonState,
        getLastApiResponse,
        getCompareImages
    };
})();