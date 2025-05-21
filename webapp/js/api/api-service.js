/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API Сервис (api-service.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает коммуникацию с серверным API. Содержит функции для отправки запросов
на анализ одежды, сравнения предметов и обработки ответов от сервера.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.api = window.MishuraApp.api || {};
window.MishuraApp.api.service = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger, uiHelpers;
    
    // Базовый URL для API запросов
    const API_BASE_URL = ''; // На Render это будет относительный путь к тому же домену
    
    /**
     * Отправляет запрос на анализ одного предмета одежды
     * @param {File} imageFile - Файл изображения для анализа
     * @param {string} occasion - Повод/случай для одежды
     * @param {string} preferences - Предпочтения пользователя (опционально)
     * @returns {Promise<Object>} - Объект с результатами анализа
     */
    async function analyzeSingleOutfit(imageFile, occasion, preferences) {
        logger.info("Отправка запроса на анализ одного предмета");
        uiHelpers.showLoading("Анализируем вашу одежду...");
        
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('occasion', occasion || 'повседневный');
        if (preferences && preferences.trim()) {
            formData.append('preferences', preferences.trim());
        }

        try {
            const response = await fetch(`${API_BASE_URL}/analyze-outfit`, { 
                method: 'POST', 
                body: formData 
            });
            
            return await handleApiResponse(response, "анализ");
        } catch (error) {
            logger.error("Ошибка при analyzeSingleOutfit:", error);
            uiHelpers.hideLoading();
            throw error;
        }
    }

    /**
     * Отправляет запрос на сравнение нескольких предметов одежды
     * @param {Array<File>} imageFiles - Массив файлов изображений для сравнения
     * @param {string} occasion - Повод/случай для одежды
     * @param {string} preferences - Предпочтения пользователя (опционально)
     * @returns {Promise<Object>} - Объект с результатами сравнения
     */
    async function compareOutfits(imageFiles, occasion, preferences) {
        logger.info(`Отправка запроса на сравнение ${imageFiles.length} предметов`);
        uiHelpers.showLoading("Сравниваем предметы одежды...");
        
        const formData = new FormData();
        imageFiles.forEach(file => {
            if (file) formData.append('images', file);
        });
        formData.append('occasion', occasion || 'повседневный');
        if (preferences && preferences.trim()) {
            formData.append('preferences', preferences.trim());
        }

        try {
            const response = await fetch(`${API_BASE_URL}/compare-outfits`, { 
                method: 'POST', 
                body: formData 
            });
            
            return await handleApiResponse(response, "сравнение");
        } catch (error) {
            logger.error("Ошибка при compareOutfits:", error);
            uiHelpers.hideLoading();
            throw error;
        }
    }
    
    /**
     * Заглушка для будущей функции виртуальной примерки
     * @param {File} personPhoto - Фото человека
     * @param {File} outfitPhoto - Фото одежды
     * @returns {Promise<Object>} - Результат примерки
     */
    async function tryOnOutfit(personPhoto, outfitPhoto) {
        logger.info("Отправка запроса на примерку (заглушка)");
        uiHelpers.showLoading("Создаем виртуальную примерку...");
        
        // Это демо-заглушка, в будущем здесь будет реальный API-запрос
        return new Promise((resolve) => {
            setTimeout(() => {
                uiHelpers.hideLoading();
                logger.info("Виртуальная примерка (демо) завершена");
                resolve({
                    status: 'success',
                    resultImage: outfitPhoto, // В реальном API здесь будет обработанное изображение
                    message: 'Примерка завершена (демо)'
                });
            }, 2000);
        });
    }
    
    /**
     * Обрабатывает ответ от API
     * @private
     * @param {Response} response - Ответ fetch
     * @param {string} operationType - Тип операции (для формирования сообщений об ошибках)
     * @returns {Promise<Object>} - Обработанные данные ответа
     */
    async function handleApiResponse(response, operationType) {
        uiHelpers.hideLoading();
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ошибка: ${response.status}`;
            
            try {
                // Пытаемся распарсить JSON, если ответ содержит JSON
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Если не JSON, используем текст как есть
                if (errorText) errorMessage = errorText;
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        if (data.status === 'success') {
            logger.info(`${operationType} успешно получен от API.`);
            return data;
        } else {
            throw new Error(data.message || `Не удалось выполнить ${operationType} (ответ API).`);
        }
    }
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger;
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        logger.debug("API-сервис инициализирован");
    }
    
    // Публичный API модуля
    return {
        init,
        analyzeSingleOutfit,
        compareOutfits,
        tryOnOutfit
    };
})();