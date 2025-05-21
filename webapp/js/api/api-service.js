/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API сервис (service.js)
ВЕРСИЯ: 0.5.1 (Добавлены методы для сравнения и примерки, улучшена инициализация)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Предоставляет интерфейс для взаимодействия с серверным API.
Обрабатывает запросы к стилисту, на сравнение и виртуальную примерку.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.api = window.MishuraApp.api || {};

// Проверяем, не был ли сервис уже инициализирован
if (window.MishuraApp.api.service && window.MishuraApp.api.service.isInitialized && window.MishuraApp.api.service.isInitialized()) { //
    // Если да, ничего не делаем, чтобы избежать повторной инициализации
    console.warn("API сервис уже был инициализирован. Повторная инициализация пропускается.");
} else {
    window.MishuraApp.api.service = (function() {
        'use strict';
        
        // Локальные ссылки на другие модули
        let config, logger;
        
        // Базовый URL API из конфигурации или значение по умолчанию
        let apiBaseUrl = '/api/v1'; // FastAPI сервер слушает на этом относительном пути
        let isInitialized = false;
        
        /**
         * Инициализация модуля
         */
        function init() {
            if (isInitialized) {
                // logger может быть еще не определен здесь, если init вызывается несколько раз до инициализации logger
                (logger || console).debug("API сервис уже инициализирован. Пропуск.");
                return;
            }
            // console.log("Инициализация API сервиса (v0.5.1)"); // Дублируется с логгером ниже
            
            // Получаем ссылки на другие модули
            if (window.MishuraApp && window.MishuraApp.config) {
                config = window.MishuraApp.config;
                
                if (config.appSettings && config.appSettings.apiUrl) {
                    apiBaseUrl = config.appSettings.apiUrl;
                    // console.log(`API сервис: базовый URL API установлен из config.appSettings: ${apiBaseUrl}`);
                } else if (config.apiSettings && config.apiSettings.baseUrl) { 
                    apiBaseUrl = config.apiSettings.baseUrl;
                    //  console.log(`API сервис: базовый URL API установлен из config.apiSettings: ${apiBaseUrl}`);
                } else {
                    //  console.log(`API сервис: используется базовый URL API по умолчанию: ${apiBaseUrl}`);
                }
            } else {
                // console.warn("API сервис: модуль конфигурации не найден. Используется URL API по умолчанию.");
            }
            
            if (window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.logger) {
                logger = window.MishuraApp.utils.logger;
            } else {
                // Резервный логгер, если основной еще не инициализирован
                logger = {
                    debug: function(...args) { console.debug('[DEBUG] API_Service:', ...args); },
                    info: function(...args) { console.info('[INFO] API_Service:', ...args); },
                    warn: function(...args) { console.warn('[WARN] API_Service:', ...args); },
                    error: function(...args) { console.error('[ERROR] API_Service:', ...args); }
                };
                logger.warn("Основной логгер не найден, используется резервный для API_Service.");
            }
            
            logger.info(`API сервис инициализирован (v0.5.1) с базовым URL: ${apiBaseUrl}`);
            isInitialized = true;
        }
        
        /**
         * Отправка запроса на анализ стиля (одиночная консультация)
         * @param {FormData} formData - данные формы (image, occasion, preferences)
         * @returns {Promise<Object>} - Promise с результатом запроса
         */
        function processStylistConsultation(formData) {
            if (!isInitialized) init(); 
            logger.debug('Отправка запроса на консультацию стилиста (одиночный анализ)');
            return fetchWithTimeout(`${apiBaseUrl}/analyze-outfit`, {
                method: 'POST',
                body: formData,
            });
        }

        /**
         * Отправка запроса на сравнение образов
         * @param {FormData} formData - данные формы (images, occasion, preferences)
         * @returns {Promise<Object>} - Promise с результатом запроса
         */
        function processCompareOutfits(formData) {
            if (!isInitialized) init();
            logger.debug('Отправка запроса на сравнение образов');
            return fetchWithTimeout(`${apiBaseUrl}/compare-outfits`, {
                method: 'POST',
                body: formData,
            });
        }
        
        /**
         * Отправка запроса на виртуальную примерку
         * @param {FormData} formData - данные формы (personImage, outfitImage, styleType)
         * @returns {Promise<Object>} - Promise с результатом запроса
         */
        function processTryOn(formData) {
            if (!isInitialized) init();
            logger.debug('Отправка запроса на виртуальную примерку');
            
            const tryOnEndpoint = (config && config.apiSettings && config.apiSettings.endpoints && config.apiSettings.endpoints.virtualFitting)
                                ? config.apiSettings.endpoints.virtualFitting
                                : '/virtual-fitting'; 

            return fetchWithTimeout(`${apiBaseUrl}${tryOnEndpoint}`, { 
                method: 'POST',
                body: formData,
            });
        }
        
        /**
         * Общий метод для fetch с таймаутом и обработкой ответа как JSON.
         * @private
         * @param {string} url - URL запроса
         * @param {Object} options - опции fetch
         * @param {number} customTimeout - таймаут в миллисекундах (по умолчанию из config или 30000)
         * @returns {Promise<Object>} - Promise с результатом запроса (JSON)
         */
        function fetchWithTimeout(url, options, customTimeout) {
            // Гарантируем, что логгер доступен, даже если init() не был вызван явно (например, при самом первом вызове fetchWithTimeout)
            const currentLogger = logger || { debug: console.debug, info: console.info, warn: console.warn, error: console.error };

            if (!isInitialized && url.indexOf('/debug/info') === -1) { 
                currentLogger.warn("API сервис вызван до полной инициализации (fetchWithTimeout). Попытка инициализации...");
                init(); // Убедимся, что logger внутри init теперь будет доступен
            }

            const controller = new AbortController();
            const signal = controller.signal;
            
            const effectiveTimeout = customTimeout || (config && config.apiSettings && config.apiSettings.timeout) || 30000;
            currentLogger.debug(`Выполнение fetch запроса: ${options.method || 'GET'} ${url} с таймаутом ${effectiveTimeout}мс`);

            const timeoutId = setTimeout(() => {
                currentLogger.warn(`Таймаут запроса к ${url} (${effectiveTimeout}мс)`);
                controller.abort();
            }, effectiveTimeout);
            
            return fetch(url, { ...options, signal })
                .then(response => {
                    clearTimeout(timeoutId);
                    currentLogger.debug(`Ответ от ${url} получен со статусом: ${response.status}`);
                    if (!response.ok) {
                        return response.text().then(text => {
                            let errorData = { 
                                message: `Ошибка HTTP: ${response.status} ${response.statusText}.`,
                                details: text 
                            };
                            try {
                                const parsedText = JSON.parse(text);
                                if (parsedText && parsedText.message) errorData.message = parsedText.message;
                                if (parsedText && parsedText.details) errorData.details = parsedText.details;
                                else if (parsedText && !parsedText.details) errorData.details = parsedText;

                            } catch (e) { /* Оставляем текстовое сообщение в details, если не JSON */ }
                            currentLogger.error(`Ошибка HTTP при запросе к ${url}: ${response.status}`, errorData);
                            // throw new Error(errorData.message); // Это приведет к попаданию в .catch ниже, но с простым Error
                            return Promise.reject(errorData); // Отклоняем Promise с объектом ошибки
                        });
                    }
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        return response.json();
                    } else {
                        currentLogger.warn(`Ответ от ${url} не является JSON (Content-Type: ${contentType}). Возвращаем как текст.`);
                        return response.text().then(text => ({ resultImage: text, status: "success_text_response" })); // Для try-on, API может вернуть URL картинки как text/plain
                    }
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    // Если error уже наш объект {message, details}, то просто передаем его дальше
                    if (error && typeof error.message === 'string') {
                        currentLogger.error(`Ошибка (уже обработанная HTTP или другая) для ${url}:`, error.message, error.details || '');
                        return Promise.reject(error);
                    }
                    // Иначе это AbortError или другая сетевая ошибка
                    const errorMessage = error.name === 'AbortError' ? 'Превышено время ожидания ответа от сервера.' : (error.message || 'Ошибка сети или выполнения запроса.');
                    currentLogger.error(`Ошибка сети или выполнения fetch для ${url}:`, errorMessage, error);
                    return Promise.reject({ 
                        status: "error", 
                        message: errorMessage,
                        details: error.toString()
                    });
                });
        }
                
        // Публичный API
        return {
            init,
            isInitialized: () => isInitialized,
            processStylistConsultation,
            processCompareOutfits,
            processTryOn
        };
    })();
}