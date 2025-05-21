/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Сравнение образов (comparison.js)
ВЕРСИЯ: 0.4.1 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Реализует функциональность сравнения нескольких образов.
Обрабатывает загрузку изображений и отображение результатов сравнения.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};
window.MishuraApp.features.comparison = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger, uiHelpers, modals, imageUpload, apiService;
    
    // Элементы DOM
    let compareForm, compareSubmitButton, compareResults;
    
    // Текущие данные
    let uploadedImages = [];
    
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
        
        if (window.MishuraApp.components) {
            modals = window.MishuraApp.components.modals;
            imageUpload = window.MishuraApp.components.imageUpload;
        }
        
        if (window.MishuraApp.api) {
            apiService = window.MishuraApp.api.service;
        }
        
        // Инициализация элементов DOM
        initDOMElements();
        
        // Настройка обработчиков событий
        initEventListeners();
        
        if (logger) {
            logger.info('Модуль Сравнение инициализирован');
        } else {
            console.log('Модуль Сравнение инициализирован');
        }
    }
    
    /**
     * Инициализация элементов DOM
     * @private
     */
    function initDOMElements() {
        compareForm = document.getElementById('compare-form');
        compareSubmitButton = document.getElementById('submit-compare');
        compareResults = document.getElementById('compare-results');
    }
    
    /**
     * Инициализация обработчиков событий
     * @private
     */
    function initEventListeners() {
        // Обработчик загрузки изображения
        document.addEventListener('compareImageUploaded', function(e) {
            const { file, slot } = e.detail;
            uploadedImages[slot] = file;
            updateSubmitButtonState();
        });
        
        // Обработчик удаления изображения
        document.addEventListener('compareImageRemoved', function(e) {
            const { slot } = e.detail;
            uploadedImages[slot] = null;
            updateSubmitButtonState();
        });
        
        // Обработчик удаления всех изображений
        document.addEventListener('allCompareImagesRemoved', function() {
            uploadedImages = [];
            updateSubmitButtonState();
        });
        
        // Обработчик отправки формы
        if (compareForm) {
            compareForm.addEventListener('submit', handleCompareSubmit);
        }
        
        // Обработчики для кнопок сравнения
        const compareTriggers = document.querySelectorAll('.compare-trigger');
        if (compareTriggers) {
            compareTriggers.forEach(trigger => {
                trigger.addEventListener('click', function() {
                    if (modals) {
                        modals.openCompareModal();
                    }
                });
            });
        }
    }
    
    /**
     * Обновление состояния кнопки отправки
     * @private
     */
    function updateSubmitButtonState() {
        if (!compareSubmitButton) return;
        
        // Проверяем, загружено ли хотя бы 2 изображения
        const validImagesCount = uploadedImages.filter(img => img !== null && img !== undefined).length;
        compareSubmitButton.disabled = validImagesCount < 2;
    }
    
    /**
     * Обработка отправки формы сравнения
     * @private
     * @param {Event} e - событие отправки формы
     */
    function handleCompareSubmit(e) {
        e.preventDefault();
        
        // Проверяем, загружено ли хотя бы 2 изображения
        const validImages = uploadedImages.filter(img => img !== null && img !== undefined);
        
        if (validImages.length < 2) {
            if (uiHelpers) {
                uiHelpers.showToast('Пожалуйста, загрузите не менее 2 изображений для сравнения');
            }
            return;
        }
        
        // Формируем данные для отправки
        const formData = new FormData();
        
        validImages.forEach((image, index) => {
            formData.append(`image_${index}`, image);
        });
        
        if (config) {
            formData.append('userId', config.userId || '');
        }
        
        // Показываем загрузку
        showLoading(true);
        
        // Отправляем запрос на сервер
        if (apiService) {
            apiService.sendCompareRequest(formData)
                .then(handleCompareResponse)
                .catch(handleCompareError)
                .finally(() => showLoading(false));
        } else {
            // Эмуляция задержки для демонстрации
            setTimeout(() => {
                showLoading(false);
                
                if (uiHelpers) {
                    uiHelpers.showToast('Демо-режим: Функция сравнения временно недоступна');
                }
            }, 2000);
        }
    }
    
    /**
     * Обработка ответа сервера на запрос сравнения
     * @private
     * @param {Object} response - ответ от сервера
     */
    function handleCompareResponse(response) {
        if (!response || !response.success) {
            handleCompareError(new Error('Неизвестная ошибка при сравнении'));
            return;
        }
        
        // Отображаем результаты
        renderCompareResults(response.data);
        
        if (logger) {
            logger.info('Сравнение успешно выполнено');
        }
    }
    
    /**
     * Обработка ошибки при запросе сравнения
     * @private
     * @param {Error} error - объект ошибки
     */
    function handleCompareError(error) {
        if (logger) {
            logger.error('Ошибка при запросе сравнения:', error);
        }
        
        if (uiHelpers) {
            uiHelpers.showToast('Произошла ошибка при сравнении. Пожалуйста, попробуйте позже.');
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
        const loadingIndicator = document.getElementById('compare-loading');
        
        if (loadingIndicator) {
            loadingIndicator.classList.toggle('active', isLoading);
        }
        
        if (compareSubmitButton) {
            compareSubmitButton.disabled = isLoading;
        }
        
        if (compareResults) {
            compareResults.classList.toggle('hidden', isLoading);
        }
    }
    
    /**
     * Отображение результатов сравнения
     * @private
     * @param {Object} data - данные сравнения
     */
    function renderCompareResults(data) {
        if (!compareResults || !data) return;
        
        // Очищаем контейнер результатов
        compareResults.innerHTML = '';
        
        // Временная заглушка для демонстрации
        const resultContent = document.createElement('div');
        resultContent.className = 'compare-results-content';
        
        const resultTitle = document.createElement('h3');
        resultTitle.textContent = 'Результаты сравнения';
        resultContent.appendChild(resultTitle);
        
        const resultText = document.createElement('p');
        resultText.textContent = 'Функция сравнения находится в разработке. В скором времени вы сможете получить детальное сравнение ваших образов!';
        resultContent.appendChild(resultText);
        
        compareResults.appendChild(resultContent);
        compareResults.classList.remove('hidden');
    }
    
    /**
     * Сброс формы сравнения
     * @public
     */
    function resetCompareForm() {
        // Сбрасываем поля формы
        if (compareForm) {
            compareForm.reset();
        }
        
        // Сбрасываем изображения
        if (imageUpload && typeof imageUpload.resetCompareImageUploads === 'function') {
            imageUpload.resetCompareImageUploads();
        }
        
        // Сбрасываем текущие данные
        uploadedImages = [];
        
        // Отключаем кнопку отправки
        if (compareSubmitButton) {
            compareSubmitButton.disabled = true;
        }
        
        // Скрываем результаты
        if (compareResults) {
            compareResults.classList.add('hidden');
        }
    }
    
    // Публичный API
    return {
        init,
        resetCompareForm
    };
})();