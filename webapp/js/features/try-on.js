/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Виртуальная примерка (try-on.js)
ВЕРСИЯ: 0.4.1 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

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
    let fittingForm, fittingImageUpload, clothesSelection, fittingSubmitButton;
    let fittingResults, fittingResultImage;
    
    // Текущие данные
    let uploadedImage = null;
    let selectedClothes = [];
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        if (window.MishuraApp.config) {
            config = window.MishuraApp.config;
        }
        
        if (window.MishuraApp.utils) {
            logger = window.MishuraApp.utils.logger;
            uiHelpers = window.MishuraApp.utils.uiHelpers;
        }
        
        if (window.MishuraApp.api) {
            apiService = window.MishuraApp.api.service;
        }
        
        // Инициализация элементов DOM
        initDOMElements();
        
        // Настройка обработчиков событий
        initEventListeners();
        
        if (logger) {
            logger.info('Модуль Виртуальная примерка инициализирован');
        } else {
            console.log('Модуль Виртуальная примерка инициализирован');
        }
    }
    
    /**
     * Инициализация элементов DOM
     * @private
     */
    function initDOMElements() {
        fittingForm = document.getElementById('fitting-form');
        fittingImageUpload = document.getElementById('fitting-image-upload');
        clothesSelection = document.getElementById('clothes-selection');
        fittingSubmitButton = document.getElementById('submit-fitting');
        fittingResults = document.getElementById('fitting-results');
        fittingResultImage = document.getElementById('fitting-result-image');
    }
    
    /**
     * Инициализация обработчиков событий
     * @private
     */
    function initEventListeners() {
        // Обработчик загрузки изображения
        if (fittingImageUpload) {
            fittingImageUpload.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    uploadedImage = e.target.files[0];
                    
                    // Отображаем превью загруженного изображения
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const preview = document.getElementById('fitting-image-preview');
                        if (preview) {
                            preview.src = e.target.result;
                            preview.classList.remove('hidden');
                        }
                    };
                    reader.readAsDataURL(uploadedImage);
                    
                    // Обновляем состояние кнопки отправки
                    updateSubmitButtonState();
                }
            });
        }
        
        // Обработчики выбора предметов одежды
        if (clothesSelection) {
            const clothesItems = clothesSelection.querySelectorAll('.clothes-item');
            
            clothesItems.forEach(item => {
                item.addEventListener('click', function() {
                    const clothesId = this.getAttribute('data-id');
                    const isSelected = this.classList.toggle('selected');
                    
                    // Обновляем список выбранных предметов
                    if (isSelected) {
                        selectedClothes.push(clothesId);
                    } else {
                        const index = selectedClothes.indexOf(clothesId);
                        if (index !== -1) {
                            selectedClothes.splice(index, 1);
                        }
                    }
                    
                    // Обновляем состояние кнопки отправки
                    updateSubmitButtonState();
                });
            });
        }
        
        // Обработчик отправки формы
        if (fittingForm) {
            fittingForm.addEventListener('submit', handleFittingSubmit);
        }
    }
    
    /**
     * Обновление состояния кнопки отправки
     * @private
     */
    function updateSubmitButtonState() {
        if (!fittingSubmitButton) return;
        
        // Проверяем, загружено ли изображение и выбран ли хотя бы один предмет одежды
        fittingSubmitButton.disabled = !uploadedImage || selectedClothes.length === 0;
    }
    
    /**
     * Обработка отправки формы примерки
     * @private
     * @param {Event} e - событие отправки формы
     */
    function handleFittingSubmit(e) {
        e.preventDefault();
        
        if (!uploadedImage || selectedClothes.length === 0) {
            if (uiHelpers) {
                uiHelpers.showToast('Пожалуйста, загрузите фото и выберите предметы одежды');
            }
            return;
        }
        
        // Формируем данные для отправки
        const formData = new FormData();
        formData.append('image', uploadedImage);
        formData.append('clothes', JSON.stringify(selectedClothes));
        
        if (config) {
            formData.append('userId', config.userId || '');
        }
        
        // Показываем загрузку
        showLoading(true);
        
        // Отправляем запрос на сервер
        if (apiService) {
            apiService.sendVirtualFittingRequest(formData)
                .then(handleFittingResponse)
                .catch(handleFittingError)
                .finally(() => showLoading(false));
        } else {
            // Эмуляция задержки для демонстрации
            setTimeout(() => {
                showLoading(false);
                
                if (uiHelpers) {
                    uiHelpers.showToast('Демо-режим: Функция виртуальной примерки временно недоступна');
                }
            }, 2000);
        }
    }
    
    /**
     * Обработка ответа сервера на запрос примерки
     * @private
     * @param {Object} response - ответ от сервера
     */
    function handleFittingResponse(response) {
        if (!response || !response.success) {
            handleFittingError(new Error('Неизвестная ошибка при виртуальной примерке'));
            return;
        }
        
        // Отображаем результаты
        renderFittingResults(response.data);
        
        if (logger) {
            logger.info('Виртуальная примерка успешно выполнена');
        }
    }
    
    /**
     * Обработка ошибки при запросе примерки
     * @private
     * @param {Error} error - объект ошибки
     */
    function handleFittingError(error) {
        if (logger) {
            logger.error('Ошибка при запросе виртуальной примерки:', error);
        }
        
        if (uiHelpers) {
            uiHelpers.showToast('Произошла ошибка при виртуальной примерке. Пожалуйста, попробуйте позже.');
        }
        
        // Скрываем загрузку
        showLoading(false);
    }
    
    /**
     * Управление отображением индикатора загрузки
     * @private
     * @param {boolean} isLoading - флаг отображения загрузки
     */
    function showLoading(isLoading) {
        const loadingIndicator = document.getElementById('fitting-loading');
        
        if (loadingIndicator) {
            loadingIndicator.classList.toggle('active', isLoading);
        }
        
        if (fittingSubmitButton) {
            fittingSubmitButton.disabled = isLoading;
        }
        
        if (fittingResults) {
            fittingResults.classList.toggle('hidden', isLoading);
        }
    }
    
    /**
     * Отображение результатов примерки
     * @private
     * @param {Object} data - данные примерки
     */
    function renderFittingResults(data) {
        if (!fittingResults || !fittingResultImage) return;
        
        // Временная заглушка для демонстрации
        const message = document.createElement('div');
        message.className = 'fitting-message';
        message.textContent = 'Функция виртуальной примерки находится в разработке. Скоро вы сможете примерять одежду на ваши фотографии!';
        
        fittingResults.innerHTML = '';
        fittingResults.appendChild(message);
        fittingResults.classList.remove('hidden');
    }
    
    /**
     * Сброс формы примерки
     * @public
     */
    function resetFittingForm() {
        // Сбрасываем поля формы
        if (fittingForm) {
            fittingForm.reset();
        }
        
        // Сбрасываем изображение
        uploadedImage = null;
        
        // Скрываем превью
        const preview = document.getElementById('fitting-image-preview');
        if (preview) {
            preview.classList.add('hidden');
        }
        
        // Сбрасываем выбранные предметы одежды
        selectedClothes = [];
        
        // Удаляем выделение с предметов одежды
        if (clothesSelection) {
            const clothesItems = clothesSelection.querySelectorAll('.clothes-item');
            clothesItems.forEach(item => {
                item.classList.remove('selected');
            });
        }
        
        // Отключаем кнопку отправки
        if (fittingSubmitButton) {
            fittingSubmitButton.disabled = true;
        }
        
        // Скрываем результаты
        if (fittingResults) {
            fittingResults.classList.add('hidden');
        }
    }
    
    // Публичный API
    return {
        init,
        resetFittingForm
    };
})();