/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Консультации (consultation.js)
ВЕРСИЯ: 0.4.2 (Исправлено имя вызываемого API метода)
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
        modals = window.MishuraApp.components.modals; // Убедимся, что путь правильный
        imageUpload = window.MishuraApp.components.imageUpload; // Убедимся, что путь правильный
        api = window.MishuraApp.api.service; // Это сервис API
        
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
        loadingIndicator = document.getElementById('consultation-loading'); // Может быть внутри модалки или глобальный
        consultationResults = document.getElementById('results-container'); // ID из index.html для результатов
        consultationResultsContainer = document.getElementById('results-overlay'); // ID оверлея для результатов
        
        // Триггеры для открытия модального окна
        consultationTriggers = document.querySelectorAll('.consultation-trigger'); // Если есть такие кнопки на странице
        
        // Логирование ошибок, если элементы не найдены
        if (!consultationForm) logger.warn("Элемент consultationForm не найден");
        if (!occasionSelector) logger.warn("Элемент occasionSelector не найден");
        if (!preferencesInput) logger.warn("Элемент preferencesInput не найден");
        if (!submitButton) logger.warn("Элемент submitButton не найден");
        if (!consultationResults) logger.warn("Элемент results-container (для вывода результатов) не найден");
        if (!consultationResultsContainer) logger.warn("Элемент results-overlay (контейнер модалки результатов) не найден");

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
            logger.debug('Изображение загружено для консультации:', uploadedImage ? uploadedImage.name : 'файл отсутствует');
            
            // Включаем кнопку отправки, если она была отключена
            if (submitButton) {
                submitButton.disabled = false;
            }
        });
        
        // Обработчик удаления изображения
        document.addEventListener('singleImageRemoved', function() {
            uploadedImage = null;
            logger.debug('Изображение удалено из консультации');
            
            // Отключаем кнопку отправки, так как изображение обязательно
            if (submitButton) {
                submitButton.disabled = true;
            }
        });
        
        // Обработчик закрытия модального окна для сброса формы
        document.addEventListener('modalClosed', function(e) {
            // Проверяем, что закрылось именно модальное окно консультации
            if (e.detail.modalId === 'consultation-overlay') { 
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
        
        // Сбросим форму перед открытием
        resetConsultationForm(); // Важно сбросить ДО открытия, чтобы не было видно старых данных

        if (modals && typeof modals.openConsultationModal === 'function') {
            modals.openConsultationModal();
        } else {
            logger.error("Не удалось открыть модальное окно консультации: модуль modals или метод openConsultationModal не найдены.");
            // Можно показать alert или toast, если uiHelpers доступен
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast("Ошибка: функция консультации недоступна.");
            }
        }
    }
    
    /**
     * Обработка отправки формы консультации
     * @private
     * @param {Event} e - событие отправки формы
     */
    function handleConsultationSubmit(e) {
        e.preventDefault();
        logger.debug('Попытка отправки формы консультации.');

        if (!uploadedImage) {
            if (uiHelpers) uiHelpers.showToast('Пожалуйста, загрузите изображение для анализа.');
            else alert('Пожалуйста, загрузите изображение для анализа.');
            logger.warn('Отправка формы консультации прервана: изображение не загружено.');
            return;
        }
        
        // Получаем данные формы
        const occasion = occasionSelector ? occasionSelector.value : '';
        const preferences = preferencesInput ? preferencesInput.value : '';
        
        // Валидация
        if (occasion === '') {
            if (uiHelpers) uiHelpers.showToast('Пожалуйста, выберите повод для консультации.');
            else alert('Пожалуйста, выберите повод для консультации.');
            logger.warn('Отправка формы консультации прервана: повод не выбран.');
            return;
        }
        
        // Формируем данные для отправки
        const formData = new FormData();
        formData.append('image', uploadedImage);
        formData.append('occasion', occasion);
        formData.append('preferences', preferences);
        // formData.append('userId', (config && config.userId) ? config.userId : ''); // Если нужно передавать ID пользователя

        logger.info('Отправка запроса на консультацию с данными:', {occasion, preferencesLength: preferences.length, imageName: uploadedImage.name});
        
        // Показываем загрузку
        if (uiHelpers) uiHelpers.showLoading('Мишура анализирует ваш образ...');
        
        // Проверяем, что API сервис и нужный метод доступны
        if (!api || typeof api.processStylistConsultation !== 'function') {
            logger.error('API сервис или метод processStylistConsultation не найдены.');
            if (uiHelpers) {
                uiHelpers.hideLoading();
                uiHelpers.showToast('Ошибка: сервис анализа временно недоступен.');
            } else {
                alert('Ошибка: сервис анализа временно недоступен.');
            }
            return;
        }

        // Отправляем запрос на сервер
        // ИСПРАВЛЕНО: api.sendConsultationRequest -> api.processStylistConsultation
        api.processStylistConsultation(formData)
            .then(handleConsultationResponse)
            .catch(handleConsultationError)
            .finally(() => {
                if (uiHelpers) uiHelpers.hideLoading();
            });
    }
    
    /**
     * Обработка ответа сервера на запрос консультации
     * @private
     * @param {Object} response - ответ от сервера
     */
    function handleConsultationResponse(response) {
        logger.info('Получен ответ от сервера на запрос консультации:', response);
        
        // Предполагаем, что ответ содержит { status: "success", advice: "..." }
        // или { status: "error", message: "..." }
        if (!response || response.status !== 'success' || !response.advice) {
            const errorMessage = response && response.message ? response.message : 'Некорректный ответ от сервера.';
            logger.error('Ошибка в ответе сервера на консультацию:', errorMessage);
            if (uiHelpers) uiHelpers.showToast(`Ошибка: ${errorMessage}`);
            else alert(`Ошибка: ${errorMessage}`);
            // Не отображаем "пустые" результаты в этом случае
            if (consultationResults) consultationResults.innerHTML = `<p>Произошла ошибка при получении совета от Мишуры.</p>`;
            if (consultationResultsContainer && modals && typeof modals.openResultsModal === 'function') {
                modals.openResultsModal(); // Открываем окно с сообщением об ошибке
            }
            return;
        }
        
        // Сохраняем результаты
        currentConsultationData = response.advice; // Сохраняем непосредственно текст совета
        
        // Отображаем результаты
        renderConsultationResults(currentConsultationData); // Передаем текст совета
        
        // Закрываем модальное окно консультации и открываем окно результатов
        if (modals) {
            if (typeof modals.closeModal === 'function') modals.closeModal('consultation-overlay');
            if (typeof modals.openResultsModal === 'function') modals.openResultsModal();
        }
        
        logger.info('Консультация успешно получена и отображена.');
    }
    
    /**
     * Обработка ошибки при запросе консультации
     * @private
     * @param {Error} error - объект ошибки
     */
    function handleConsultationError(error) {
        logger.error('Ошибка при запросе консультации:', error.message || error);
        if (uiHelpers) {
            uiHelpers.showToast('Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.');
        } else {
            alert('Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.');
        }
        
        // Можно также отобразить ошибку в контейнере результатов, если он уже открыт
        if (consultationResults) {
            consultationResults.innerHTML = `<p>Не удалось связаться с сервером для получения совета. Попробуйте еще раз.</p>`;
        }
        // Не вызываем hideLoading здесь, т.к. он уже в .finally()
    }
        
    /**
     * Отображение результатов консультации
     * @private
     * @param {string} adviceText - текст с советом от ИИ (уже в HTML или Markdown)
     */
    function renderConsultationResults(adviceText) {
        if (!consultationResults) {
            logger.warn("Элемент для отображения результатов консультации (results-container) не найден.");
            return;
        }
        
        // Очищаем контейнер результатов
        consultationResults.innerHTML = '';
        
        // Если uiHelpers и parseMarkdownToHtml доступны, используем их
        // Иначе просто вставляем текст как HTML (предполагая, что сервер может вернуть HTML)
        if (uiHelpers && typeof uiHelpers.parseMarkdownToHtml === 'function') {
            consultationResults.innerHTML = uiHelpers.parseMarkdownToHtml(adviceText);
            logger.debug("Результаты консультации отрендерены с использованием parseMarkdownToHtml.");
        } else {
            // Прямая вставка, если парсер Markdown недоступен.
            // Убедитесь, что сервер экранирует HTML, если adviceText приходит из ненадежного источника!
            // В данном случае, мы доверяем нашему Gemini AI и промптам.
            consultationResults.innerHTML = adviceText; 
            logger.debug("Результаты консультации отрендерены как HTML (парсер Markdown не использовался).");
        }
        
        // Показываем контейнер результатов (модальное окно результатов)
        if (consultationResultsContainer && modals && typeof modals.openResultsModal === 'function') {
             // Открытие модального окна результатов теперь обрабатывается в handleConsultationResponse
        } else {
            logger.warn("Контейнер результатов (results-overlay) или модуль modals не найден для его показа.");
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
        
        // Очищаем и скрываем результаты, если они были показаны в этом же окне (маловероятно с текущей логикой)
        if (consultationResults) {
            consultationResults.innerHTML = '';
        }
        // if (consultationResultsContainer) { // Это модальное окно результатов, его не нужно скрывать отсюда
        //     consultationResultsContainer.classList.remove('active'); // или add('hidden')
        // }
        
        // Сбрасываем изображение через модуль imageUpload
        if (imageUpload && typeof imageUpload.resetSingleImageUpload === 'function') {
            imageUpload.resetSingleImageUpload(); // Это сбросит uploadedImage через событие 'singleImageRemoved'
        } else {
            // Ручной сброс, если imageUpload недоступен
            uploadedImage = null;
            // Также нужно вручную обновить UI для загрузки фото, если imageUpload.resetSingleImageUpload не отработал
            const singlePreviewContainer = document.getElementById('single-preview-container');
            const singleUploadArea = document.getElementById('single-upload-area');
            if (singlePreviewContainer) singlePreviewContainer.classList.add('hidden');
            if (singleUploadArea) singleUploadArea.classList.remove('hidden');
        }
        
        // Сбрасываем текущие данные
        currentConsultationData = null;
        // uploadedImage уже сброшен выше или через событие
        
        // Отключаем кнопку отправки, т.к. изображение обязательно
        if (submitButton) {
            submitButton.disabled = true;
        }

        // Скрываем поля формы, которые появляются после загрузки фото
        const occasionElement = document.querySelector('.occasion-selector');
        const inputLabels = document.querySelectorAll('.input-label'); // Может быть несколько
        const preferencesElement = document.querySelector('.preferences-input');

        if (occasionElement && !occasionElement.classList.contains('hidden')) occasionElement.classList.add('hidden');
        inputLabels.forEach(label => { if (!label.classList.contains('hidden')) label.classList.add('hidden'); });
        if (preferencesElement && !preferencesElement.classList.contains('hidden')) preferencesElement.classList.add('hidden');

        logger.debug('Форма консультации сброшена в начальное состояние.');
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
        openConsultationModal, // Публичный метод для вызова извне, например, из app.js
        getCurrentConsultationData,
        resetConsultationForm // Может быть полезен для сброса извне
    };
})();