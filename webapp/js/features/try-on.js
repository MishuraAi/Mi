/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Виртуальная примерка (try-on.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

НАЗНАЧЕНИЕ ФАЙЛА:
Управляет функциональностью виртуальной примерки, которая позволяет "примерить"
одежду на загруженное фото пользователя. В текущей версии является заглушкой.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};
window.MishuraApp.features.tryOn = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger, uiHelpers, apiService, modals, imageUpload;
    
    // Текущее состояние модуля
    const state = {
        yourPhoto: null,
        outfitPhoto: null,
        lastApiResponse: null
    };
    
    // Элементы DOM
    let tryOnButton, tryOnOverlay, tryOnResultOverlay;
    let tryOnButtonSubmit, tryOnResultDownload, tryOnResultImage;
    let tryOnStyleSelector, tryOnResultContainer;
    
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
        
        logger.debug("Модуль виртуальной примерки инициализирован");
    }
    
    /**
     * Инициализация элементов DOM
     * @private
     */
    function initDOMElements() {
        tryOnButton = document.getElementById('try-on-button');
        tryOnOverlay = document.getElementById('try-on-overlay');
        tryOnResultOverlay = document.getElementById('try-on-result-overlay');
        tryOnButtonSubmit = document.getElementById('try-on-button-submit');
        tryOnResultDownload = document.getElementById('try-on-result-download');
        tryOnResultImage = document.getElementById('try-on-result-image');
        tryOnStyleSelector = document.getElementById('try-on-style-selector');
        tryOnResultContainer = document.getElementById('try-on-result-container');
        
        if (!tryOnButton) logger.warn("Элемент tryOnButton не найден");
        if (!tryOnOverlay) logger.warn("Элемент tryOnOverlay не найден");
        if (!tryOnResultOverlay) logger.warn("Элемент tryOnResultOverlay не найден");
        if (!tryOnButtonSubmit) logger.warn("Элемент tryOnButtonSubmit не найден");
        if (!tryOnResultDownload) logger.warn("Элемент tryOnResultDownload не найден");
        if (!tryOnResultImage) logger.warn("Элемент tryOnResultImage не найден");
        if (!tryOnStyleSelector) logger.warn("Элемент tryOnStyleSelector не найден");
        if (!tryOnResultContainer) logger.warn("Элемент tryOnResultContainer не найден");
    }
    
    /**
     * Настройка обработчиков событий
     * @private
     */
    function setupEventListeners() {
        // Обработчик клика по кнопке "Примерить" в главном интерфейсе
        if (tryOnButton) {
            tryOnButton.addEventListener('click', handleTryOnButtonClick);
        }
        
        // Обработчик клика по кнопке "Примерить" в модальном окне
        if (tryOnButtonSubmit) {
            tryOnButtonSubmit.addEventListener('click', handleTryOnSubmit);
        }
        
        // Обработчик клика по кнопке "Скачать" в результатах примерки
        if (tryOnResultDownload) {
            tryOnResultDownload.addEventListener('click', handleResultDownload);
        }
        
        // Обработчики загрузки и удаления изображений
        document.addEventListener('yourPhotoUploaded', handleYourPhotoUploaded);
        document.addEventListener('outfitPhotoUploaded', handleOutfitPhotoUploaded);
        document.addEventListener('yourPhotoRemoved', handleYourPhotoRemoved);
        document.addEventListener('outfitPhotoRemoved', handleOutfitPhotoRemoved);
        document.addEventListener('allTryOnImagesRemoved', handleAllTryOnImagesRemoved);
    }
    
    /**
     * Обработчик клика по кнопке "Примерить" в главном интерфейсе
     * @private
     */
    function handleTryOnButtonClick() {
        logger.info("Клик по кнопке 'Примерить' в главном интерфейсе");
        
        // В текущей версии это функционал в разработке
        uiHelpers.showToast("Функция 'Примерить' находится в разработке.");
        
        // Если бы функция была доступна, открывали бы модальное окно
        // openTryOnModal();
    }
    
    /**
     * Открывает модальное окно примерки
     */
    function openTryOnModal() {
        logger.info("Открытие модального окна примерки");
        resetTryOnForm();
        modals.openTryOnModal();
    }
    
    /**
     * Сбрасывает форму примерки
     */
    function resetTryOnForm() {
        logger.debug("Сброс формы примерки");
        
        // Сбрасываем состояние
        state.yourPhoto = null;
        state.outfitPhoto = null;
        
        // Сбрасываем поля формы
        if (tryOnStyleSelector) tryOnStyleSelector.selectedIndex = 0;
        
        // Сбрасываем загруженные изображения
        imageUpload.resetTryOnUploads();
    }
    
    /**
     * Обработчик события загрузки фото пользователя
     * @private
     * @param {CustomEvent} event - Событие yourPhotoUploaded
     */
    function handleYourPhotoUploaded(event) {
        if (event.detail && event.detail.file) {
            state.yourPhoto = event.detail.file;
            logger.debug("Фото пользователя сохранено в state:", 
                {name: state.yourPhoto.name, size: state.yourPhoto.size});
        }
    }
    
    /**
     * Обработчик события загрузки фото образа
     * @private
     * @param {CustomEvent} event - Событие outfitPhotoUploaded
     */
    function handleOutfitPhotoUploaded(event) {
        if (event.detail && event.detail.file) {
            state.outfitPhoto = event.detail.file;
            logger.debug("Фото образа сохранено в state:", 
                {name: state.outfitPhoto.name, size: state.outfitPhoto.size});
        }
    }
    
    /**
     * Обработчик события удаления фото пользователя
     * @private
     */
    function handleYourPhotoRemoved() {
        state.yourPhoto = null;
        logger.debug("Фото пользователя удалено из state");
    }
    
    /**
     * Обработчик события удаления фото образа
     * @private
     */
    function handleOutfitPhotoRemoved() {
        state.outfitPhoto = null;
        logger.debug("Фото образа удалено из state");
    }
    
    /**
     * Обработчик события удаления всех фото для примерки
     * @private
     */
    function handleAllTryOnImagesRemoved() {
        state.yourPhoto = null;
        state.outfitPhoto = null;
        logger.debug("Все фото для примерки удалены");
    }
    
    /**
     * Обработчик клика по кнопке "Примерить" в модальном окне
     * @private
     */
    function handleTryOnSubmit() {
        logger.info("Клик по 'Примерить' в модальном окне примерки");
        
        // Проверка на активную загрузку
        if (imageUpload.isUploading()) {
            uiHelpers.showToast("Пожалуйста, дождитесь завершения загрузки изображения");
            return;
        }
        
        // Проверка наличия необходимых изображений
        if (!state.yourPhoto) {
            uiHelpers.showToast("Пожалуйста, загрузите ваше фото");
            return;
        }
        
        if (!state.outfitPhoto) {
            uiHelpers.showToast("Пожалуйста, загрузите фото образа");
            return;
        }
        
        // В текущей версии это демонстрационный режим, фактически нет настоящей примерки
        tryOnOutfit();
    }
    
    /**
     * Выполняет виртуальную примерку (демо-режим)
     * @private
     */
    async function tryOnOutfit() {
        logger.info("Запуск виртуальной примерки (демо)");
        
        try {
            // В демо-режиме мы используем заглушку API, которая просто возвращает исходное изображение образа
            const response = await apiService.tryOnOutfit(
                state.yourPhoto,
                state.outfitPhoto
            );
            
            logger.info("Результат примерки получен (демо)");
            state.lastApiResponse = response;
            
            // Закрываем модальное окно примерки
            modals.closeOverlay(tryOnOverlay);
            
            // Отображаем результаты
            displayResults(response.resultImage);
            
        } catch (error) {
            logger.error("Ошибка при tryOnOutfit:", error);
            uiHelpers.showToast(`Ошибка примерки: ${error.message}. Попробуйте еще раз.`);
        }
    }
    
    /**
     * Отображает результаты примерки
     * @param {File} resultImage - Файл с результатом примерки
     */
    function displayResults(resultImage) {
        logger.info("Отображение результатов примерки");
        
        if (tryOnResultImage) {
            // Отображаем изображение результата
            const reader = new FileReader();
            reader.onload = function(e) {
                tryOnResultImage.src = e.target.result;
            };
            reader.readAsDataURL(resultImage);
            
            // Открываем модальное окно с результатом
            modals.openTryOnResultModal(tryOnResultImage.src);
        } else {
            logger.error("Не найден элемент для отображения результата примерки");
            uiHelpers.showToast("Не удалось отобразить результат примерки");
        }
    }
    
    /**
     * Обработчик клика по кнопке "Скачать результат"
     * @private
     */
    function handleResultDownload() {
        logger.info("Клик по 'Скачать результат'");
        
        if (!tryOnResultImage || !tryOnResultImage.src || 
            tryOnResultImage.src.startsWith('data:image/svg+xml') || 
            tryOnResultImage.src.endsWith('#')) {
            uiHelpers.showToast("Нет изображения для скачивания");
            return;
        }
        
        try {
            // Создаем элемент для скачивания
            const link = document.createElement('a');
            link.href = tryOnResultImage.src;
            link.download = 'mishura_try_on_result.jpg';
            document.body.appendChild(link); 
            link.click(); 
            document.body.removeChild(link);
            
            uiHelpers.showToast("Изображение сохранено (демо)");
        } catch (e) {
            logger.error("Ошибка при скачивании изображения:", e);
            uiHelpers.showToast("Не удалось скачать изображение");
        }
    }
    
    // Публичный API модуля
    return {
        init,
        openTryOnModal,
        resetTryOnForm
    };
})();