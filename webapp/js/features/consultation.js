/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Консультации (consultation.js)
ВЕРСИЯ: 0.4.1 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Реализует функциональность консультаций с ИИ-стилистом.
Обрабатывает запросы пользователя, управляет формой и взаимодействует с API.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};
window.MishuraApp.features.consultation = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger, uiHelpers, modals, imageUpload, api;
    
    // Элементы DOM
    let consultationForm, occasionSelector, preferencesInput, submitButton;
    let loadingIndicator, consultationResults, consultationResultsContainer;
    let consultationTriggers;
    
    // Текущие данные
    let currentConsultationData = null;
    let uploadedImage = null;
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger;
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        modals = window.MishuraApp.components.modals;
        imageUpload = window.MishuraApp.components.imageUpload;
        api = window.MishuraApp.api.service;
        
        // Инициализация элементов DOM
        initDOMElements();
        
        // Настройка обработчиков событий
        initEventListeners();
        
        logger.debug("Модуль консультаций инициализирован");
    }
    
    /**
     * Инициализация элементов DOM
     * @private
     */
    function initDOMElements() {
        // Элементы формы
        consultationForm = document.getElementById('consultation-form');
        occasionSelector = document.getElementById('occasion-selector');
        preferencesInput = document.getElementById('preferences-input');
        submitButton = document.getElementById('submit-consultation');
        
        // Элементы результатов
        loadingIndicator = document.getElementById('consultation-loading');
        consultationResults = document.getElementById('consultation-results');
        consultationResultsContainer = document.getElementById('consultation-results-container');
        
        // Триггеры для открытия модального окна
        consultationTriggers = document.querySelectorAll('.consultation-trigger');
        
        // Логирование ошибок, если элементы не найдены
        if (!consultationForm) logger.warn("Элемент consultationForm не найден");
        if (!occasionSelector) logger.warn("Элемент occasionSelector не найден");
        if (!preferencesInput) logger.warn("Элемент preferencesInput не найден");
        if (!submitButton) logger.warn("Элемент submitButton не найден");
    }
    
    /**
     * Инициализация обработчиков событий
     * @private
     */
    function initEventListeners() {
        // Обработчики для триггеров открытия консультации
        if (consultationTriggers) {
            consultationTriggers.forEach(trigger => {
                trigger.addEventListener('click', openConsultationModal);
            });
        }
        
        // Обработчик отправки формы
        if (consultationForm) {
            consultationForm.addEventListener('submit', handleConsultationSubmit);
        }
        
        // Обработчик загрузки изображения
        document.addEventListener('singleImageUploaded', function(e) {
            uploadedImage = e.detail.file;
            logger.debug('Изображение загружено для консультации');
            
            // Включаем кнопку отправки
            if (submitButton) {
                submitButton.disabled = false;
            }
        });
        
        // Обработчик удаления изображения
        document.addEventListener('singleImageRemoved', function() {
            uploadedImage = null;
            logger.debug('Изображение удалено из консультации');
            
            // Отключаем кнопку отправки
            if (submitButton) {
                submitButton.disabled = true;
            }
        });
        
        // Обработчик закрытия модального окна для сброса формы
        document.addEventListener('modalClosed', function(e) {
            if (e.detail.modalId === 'consultation-modal') {
                resetConsultationForm();
            }
        });
    }
    
    /**
     * Открытие модального окна консультации
     * @public
     */
    function openConsultationModal() {
        logger.info('Открытие модального окна консультации');
        
        // Используем полный путь к модулю модальных окон
        window.MishuraApp.components.modals.openConsultationModal();
        
        // Сбросим форму перед открытием
        resetConsultationForm();
    }
    
    /**
     * Обработка отправки формы консультации
     * @private
     * @param {Event} e - событие отправки формы
     */
    function handleConsultationSubmit(e) {
        e.preventDefault();
        
        if (!uploadedImage) {
            uiHelpers.showToast('Пожалуйста, загрузите изображение');
            return;
        }
        
        // Получаем данные формы
        const occasion = occasionSelector ? occasionSelector.value : '';
        const preferences = preferencesInput ? preferencesInput.value : '';
        
        // Валидация
        if (occasion === '') {
            uiHelpers.showToast('Пожалуйста, выберите повод');
            return;
        }
        
        // Формируем данные для отправки
        const formData = new FormData();
        formData.append('image', uploadedImage);
        formData.append('occasion', occasion);
        formData.append('preferences', preferences);
        formData.append('userId', config.userId || '');
        
        // Показываем загрузку
        showLoading(true);
        
        // Отправляем запрос на сервер
        api.sendConsultationRequest(formData)
            .then(handleConsultationResponse)
            .catch(handleConsultationError)
            .finally(() => showLoading(false));
    }
    
    /**
     * Обработка ответа сервера на запрос консультации
     * @private
     * @param {Object} response - ответ от сервера
     */
    function handleConsultationResponse(response) {
        if (!response || !response.success) {
            handleConsultationError(new Error('Неизвестная ошибка при получении консультации'));
            return;
        }
        
        // Сохраняем результаты
        currentConsultationData = response.data;
        
        // Отображаем результаты
        renderConsultationResults(currentConsultationData);
        
        // Логируем успешную консультацию
        logger.info('Консультация успешно получена');
    }
    
    /**
     * Обработка ошибки при запросе консультации
     * @private
     * @param {Error} error - объект ошибки
     */
    function handleConsultationError(error) {
        logger.error('Ошибка при запросе консультации:', error);
        uiHelpers.showToast('Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.');
        
        // Скрываем загрузку
        showLoading(false);
    }
    
    /**
     * Управление отображением индикатора загрузки
     * @private
     * @param {boolean} isLoading - флаг отображения загрузки
     */
    function showLoading(isLoading) {
        if (loadingIndicator) {
            loadingIndicator.classList.toggle('active', isLoading);
        }
        
        if (submitButton) {
            submitButton.disabled = isLoading;
        }
        
        if (consultationResultsContainer) {
            consultationResultsContainer.classList.toggle('hidden', isLoading);
        }
    }
    
    /**
     * Отображение результатов консультации
     * @private
     * @param {Object} data - данные консультации
     */
    function renderConsultationResults(data) {
        if (!consultationResults || !data) return;
        
        // Очищаем контейнер результатов
        consultationResults.innerHTML = '';
        
        // Создаем элементы для отображения результатов
        const resultTitle = document.createElement('h3');
        resultTitle.className = 'result-title';
        resultTitle.textContent = 'Рекомендации стилиста';
        
        const resultDescription = document.createElement('div');
        resultDescription.className = 'result-description';
        resultDescription.innerHTML = data.advice || '';
        
        const resultRecommendations = document.createElement('div');
        resultRecommendations.className = 'result-recommendations';
        
        // Добавляем рекомендации по предметам одежды
        if (data.recommendations && Array.isArray(data.recommendations)) {
            const recommendationsList = document.createElement('ul');
            recommendationsList.className = 'recommendations-list';
            
            data.recommendations.forEach(item => {
                const listItem = document.createElement('li');
                listItem.className = 'recommendation-item';
                
                // Создаем карточку рекомендации
                const card = document.createElement('div');
                card.className = 'recommendation-card';
                
                // Изображение
                if (item.imageUrl) {
                    const image = document.createElement('img');
                    image.src = item.imageUrl;
                    image.alt = item.name || 'Рекомендуемый предмет одежды';
                    image.className = 'recommendation-image';
                    card.appendChild(image);
                }
                
                // Информация
                const info = document.createElement('div');
                info.className = 'recommendation-info';
                
                const name = document.createElement('h4');
                name.textContent = item.name || '';
                info.appendChild(name);
                
                if (item.description) {
                    const description = document.createElement('p');
                    description.textContent = item.description;
                    info.appendChild(description);
                }
                
                if (item.price) {
                    const price = document.createElement('div');
                    price.className = 'recommendation-price';
                    price.textContent = `${item.price} ₽`;
                    info.appendChild(price);
                }
                
                // Кнопка просмотра
                if (item.url) {
                    const viewButton = document.createElement('a');
                    viewButton.href = item.url;
                    viewButton.className = 'btn btn-outline view-recommendation';
                    viewButton.textContent = 'Посмотреть';
                    viewButton.target = '_blank';
                    viewButton.rel = 'noopener noreferrer';
                    info.appendChild(viewButton);
                }
                
                card.appendChild(info);
                listItem.appendChild(card);
                recommendationsList.appendChild(listItem);
            });
            
            resultRecommendations.appendChild(recommendationsList);
        }
        
        // Добавляем все элементы в контейнер результатов
        consultationResults.appendChild(resultTitle);
        consultationResults.appendChild(resultDescription);
        consultationResults.appendChild(resultRecommendations);
        
        // Показываем контейнер результатов
        if (consultationResultsContainer) {
            consultationResultsContainer.classList.remove('hidden');
        }
    }
    
    /**
     * Сброс формы консультации
     * @private
     */
    function resetConsultationForm() {
        logger.debug('Сброс формы консультации');
        
        // Сбрасываем поля формы
        if (consultationForm) {
            consultationForm.reset();
        }
        
        // Скрываем результаты
        if (consultationResultsContainer) {
            consultationResultsContainer.classList.add('hidden');
        }
        
        // Сбрасываем изображение
        if (imageUpload && typeof imageUpload.resetSingleImageUpload === 'function') {
            imageUpload.resetSingleImageUpload();
        }
        
        // Сбрасываем текущие данные
        currentConsultationData = null;
        uploadedImage = null;
        
        // Отключаем кнопку отправки
        if (submitButton) {
            submitButton.disabled = true;
        }
    }
    
    /**
     * Получение текущих данных консультации
     * @public
     * @returns {Object|null} - данные последней консультации
     */
    function getCurrentConsultationData() {
        return currentConsultationData;
    }
    
    // Публичный API
    return {
        init,
        openConsultationModal,
        getCurrentConsultationData,
        resetConsultationForm
    };
})();