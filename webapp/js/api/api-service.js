/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API сервис (service.js)
ВЕРСИЯ: 0.5.0 (Реализация API для примерки)
ДАТА ОБНОВЛЕНИЯ: 2025-05-22

НАЗНАЧЕНИЕ ФАЙЛА:
Предоставляет интерфейс для взаимодействия с серверным API.
Обрабатывает запросы к стилисту и виртуальной примерке.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.api = window.MishuraApp.api || {};
window.MishuraApp.api.service = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger;
    
    // Базовый URL API
    let apiBaseUrl = '/api/v1';
    
    /**
     * Инициализация модуля
     */
    function init() {
        console.log("Инициализация API сервиса");
        
        // Получаем ссылки на другие модули
        if (window.MishuraApp && window.MishuraApp.config) {
            config = window.MishuraApp.config;
            
            // Получаем базовый URL из конфигурации, если есть
            if (config.apiBaseUrl) {
                apiBaseUrl = config.apiBaseUrl;
                console.log(`Базовый URL API установлен: ${apiBaseUrl}`);
            }
        }
        
        if (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.logger) {
            logger = window.MishuraApp.utils.logger;
        } else {
            // Используем временный логгер, если основной недоступен
            logger = {
                debug: function(msg) { console.log('[DEBUG] ' + msg); },
                info: function(msg) { console.log('[INFO] ' + msg); },
                warn: function(msg) { console.warn('[WARN] ' + msg); },
                error: function(msg) { console.error('[ERROR] ' + msg); }
            };
        }
        
        logger.info('API сервис инициализирован');
    }
    
    /**
     * Отправка запроса на анализ стиля
     * @param {FormData} formData - данные формы
     * @returns {Promise<Object>} - Promise с результатом запроса
     */
    function processStylistConsultation(formData) {
        logger.debug('Отправка запроса на консультацию стилиста');
        
        return fetchWithTimeout(`${apiBaseUrl}/stylist/analyze`, {
            method: 'POST',
            body: formData,
            // Без 'Content-Type' для FormData
        });
    }
    
    /**
     * Отправка запроса на примерку
     * @param {FormData} formData - данные формы
     * @returns {Promise<Object>} - Promise с результатом запроса
     */
    function processTryOn(formData) {
        logger.debug('Отправка запроса на примерку');
        
        return fetchWithTimeout(`${apiBaseUrl}/try-on/process`, {
            method: 'POST',
            body: formData,
            // Без 'Content-Type' для FormData
        });
    }
    
    /**
     * Запрос с таймаутом
     * @private
     * @param {string} url - URL запроса
     * @param {Object} options - опции fetch
     * @param {number} timeout - таймаут в миллисекундах
     * @returns {Promise<Object>} - Promise с результатом запроса
     */
    function fetchWithTimeout(url, options, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const signal = controller.signal;
            
            const timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error('Превышено время ожидания ответа от сервера'));
            }, timeout);
            
            fetch(url, { ...options, signal })
                .then(response => {
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`Ошибка HTTP: ${response.status}`);
                    }
                    
                    return response.json();
                })
                .then(data => resolve(data))
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }
    
    /**
     * Получение URL для эмуляции API (для тестирования)
     * @param {string} endpoint - конечная точка API
     * @returns {string} - URL для эмуляции
     */
    function getMockApiUrl(endpoint) {
        return `/mock-api/${endpoint}.json`;
    }
    
    // Публичный API
    return {
        init,
        processStylistConsultation,
        processTryOn
    };
})();