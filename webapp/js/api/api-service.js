/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API-сервис (api-service.js)
ВЕРСИЯ: 0.4.1 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает взаимодействие с серверным API приложения.
Реализует методы для отправки запросов и обработки ответов.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.api = window.MishuraApp.api || {};
window.MishuraApp.api.service = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger;
    
    // Счетчик попыток повторного запроса
    let retryCounters = {};
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        if (window.MishuraApp.config) {
            config = window.MishuraApp.config;
        } else {
            config = {
                appSettings: {
                    apiUrl: 'https://api.mishura-stylist.ru/v1'
                },
                apiSettings: {
                    timeout: 30000,
                    retryAttempts: 3,
                    endpoints: {
                        consultation: '/consultation',
                        compare: '/compare',
                        virtualFitting: '/virtual-fitting',
                        feedback: '/feedback',
                        user: '/user'
                    },
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept-Language': 'ru'
                    }
                },
                userId: localStorage.getItem('mishura_user_id') || 'anonymous'
            };
        }
        
        if (window.MishuraApp.utils && window.MishuraApp.utils.logger) {
            logger = window.MishuraApp.utils.logger;
        } else {
            logger = {
                debug: function(msg) { console.log('[DEBUG] ' + msg); },
                info: function(msg) { console.log('[INFO] ' + msg); },
                warn: function(msg) { console.warn('[WARN] ' + msg); },
                error: function(msg) { console.error('[ERROR] ' + msg); }
            };
        }
        
        logger.info('Модуль API-сервис инициализирован');
    }
    
    /**
     * Базовый метод для выполнения API-запроса
     * @private
     * @param {string} endpoint - конечная точка API
     * @param {string} method - HTTP-метод
     * @param {Object|FormData|null} data - данные для отправки
     * @param {boolean} isFormData - флаг для FormData
     * @returns {Promise} - промис с результатом запроса
     */
    function apiRequest(endpoint, method = 'GET', data = null, isFormData = false) {
        const url = config.appSettings.apiUrl + endpoint;
        const requestId = `${method}-${endpoint}-${Date.now()}`;
        
        // Инициализация счетчика попыток для этого запроса
        if (!retryCounters[requestId]) {
            retryCounters[requestId] = 0;
        }
        
        const options = {
            method: method,
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        };
        
        // Добавляем заголовки и тело запроса в зависимости от типа данных
        if (isFormData) {
            // Для FormData не устанавливаем Content-Type, браузер сделает это сам
            if (data) {
                options.body = data;
            }
        } else {
            options.headers = { ...config.apiSettings.headers };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
        }
        
        logger.debug(`API запрос: ${method} ${url}`);
        
        return new Promise((resolve, reject) => {
            // Создаем таймаут для запроса
            const timeoutId = setTimeout(() => {
                logger.warn(`API запрос истек по таймауту: ${method} ${url}`);
                handleRetry(requestId, endpoint, method, data, isFormData, resolve, reject);
            }, config.apiSettings.timeout);
            
            fetch(url, options)
                .then(response => {
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`Ошибка HTTP: ${response.status}`);
                    }
                    
                    return response.json();
                })
                .then(data => {
                    logger.debug(`API ответ получен: ${method} ${url}`);
                    resolve(data);
                    // Очищаем счетчик попыток после успешного запроса
                    delete retryCounters[requestId];
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    logger.error(`API ошибка: ${error.message}`);
                    handleRetry(requestId, endpoint, method, data, isFormData, resolve, reject);
                });
        });
    }
    
    /**
     * Обработка повторных попыток запроса при ошибке
     * @private
     */
    function handleRetry(requestId, endpoint, method, data, isFormData, resolve, reject) {
        retryCounters[requestId]++;
        
        if (retryCounters[requestId] <= config.apiSettings.retryAttempts) {
            logger.warn(`Повторная попытка запроса (${retryCounters[requestId]}/${config.apiSettings.retryAttempts}): ${method} ${endpoint}`);
            
            // Экспоненциальная задержка перед повторной попыткой
            const delay = Math.pow(2, retryCounters[requestId] - 1) * 1000;
            
            setTimeout(() => {
                apiRequest(endpoint, method, data, isFormData)
                    .then(resolve)
                    .catch(reject);
            }, delay);
        } else {
            logger.error(`Исчерпаны все попытки запроса: ${method} ${endpoint}`);
            delete retryCounters[requestId];
            reject(new Error('Превышено количество попыток запроса'));
        }
    }
    
    /**
     * Отправка запроса на консультацию
     * @public
     * @param {FormData} formData - данные формы
     * @returns {Promise} - промис с результатом запроса
     */
    function sendConsultationRequest(formData) {
        return apiRequest(config.apiSettings.endpoints.consultation, 'POST', formData, true);
    }
    
    /**
     * Отправка запроса на сравнение
     * @public
     * @param {FormData} formData - данные формы
     * @returns {Promise} - промис с результатом запроса
     */
    function sendCompareRequest(formData) {
        return apiRequest(config.apiSettings.endpoints.compare, 'POST', formData, true);
    }
    
    /**
     * Отправка запроса на виртуальную примерку
     * @public
     * @param {FormData} formData - данные формы
     * @returns {Promise} - промис с результатом запроса
     */
    function sendVirtualFittingRequest(formData) {
        return apiRequest(config.apiSettings.endpoints.virtualFitting, 'POST', formData, true);
    }
    
    /**
     * Отправка отзыва
     * @public
     * @param {Object} feedbackData - данные отзыва
     * @returns {Promise} - промис с результатом запроса
     */
    function sendFeedback(feedbackData) {
        return apiRequest(config.apiSettings.endpoints.feedback, 'POST', feedbackData);
    }
    
    /**
     * Получение информации о пользователе
     * @public
     * @returns {Promise} - промис с результатом запроса
     */
    function getUserInfo() {
        return apiRequest(config.apiSettings.endpoints.user, 'GET');
    }
    
    /**
     * Обновление информации о пользователе
     * @public
     * @param {Object} userData - данные пользователя
     * @returns {Promise} - промис с результатом запроса
     */
    function updateUserInfo(userData) {
        return apiRequest(config.apiSettings.endpoints.user, 'PUT', userData);
    }
    
    // Временный метод для эмуляции работы API в демо-режиме
    function getDemoResponse(type) {
        // Эмуляция задержки для реалистичности
        return new Promise((resolve) => {
            setTimeout(() => {
                switch (type) {
                    case 'consultation':
                        resolve({
                            success: true,
                            data: {
                                advice: "Ваш образ отлично смотрится для повседневного стиля! Для дополнительной выразительности рекомендую добавить аксессуары в виде минималистичных украшений и подобрать сумку под обувь для гармоничного сочетания.",
                                recommendations: [
                                    {
                                        name: "Кожаная сумка",
                                        description: "Классическая кожаная сумка подойдет для вашего образа",
                                        price: "5990",
                                        imageUrl: "https://via.placeholder.com/150",
                                        url: "#"
                                    },
                                    {
                                        name: "Серьги-кольца",
                                        description: "Минималистичные серьги дополнят повседневный образ",
                                        price: "1990",
                                        imageUrl: "https://via.placeholder.com/150",
                                        url: "#"
                                    }
                                ]
                            }
                        });
                        break;
                    default:
                        resolve({
                            success: true,
                            data: {
                                message: "Демо-ответ сгенерирован успешно"
                            }
                        });
                }
            }, 1500);
        });
    }
    
    // Публичный API
    return {
        init,
        sendConsultationRequest: getDemoResponse.bind(null, 'consultation'), // Используем демо-ответ для тестирования
        sendCompareRequest,
        sendVirtualFittingRequest,
        sendFeedback,
        getUserInfo,
        updateUserInfo
    };
})();