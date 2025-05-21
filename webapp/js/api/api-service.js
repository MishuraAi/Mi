/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API сервис (service.js)
ВЕРСИЯ: 0.5.2 (Более строгое управление инициализацией, улучшенное логирование ошибок fetch)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Предоставляет интерфейс для взаимодействия с серверным API.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.api = window.MishuraApp.api || {};

if (window.MishuraApp.api.service && window.MishuraApp.api.service.isInitialized && window.MishuraApp.api.service.isInitialized()) {
    // console.warn("API сервис (api.service) уже был инициализирован. Повторная инициализация пропускается.");
} else {
    window.MishuraApp.api.service = (function() {
        'use strict';
        
        let configModule, loggerModule; // Избегаем прямого использования config, logger до их инициализации
        let apiBaseUrl = '/api/v1'; // Дефолт, если конфиг не загружен
        let isInitializedLocal = false;
        
        function getLogger() {
            if (!loggerModule && window.MishuraApp && window.MishuraApp.utils && window.MishuraApp.utils.logger) {
                loggerModule = window.MishuraApp.utils.logger;
            }
            return loggerModule || { 
                debug: (...args) => console.debug('[DEBUG] API_Service(fallback):', ...args), 
                info: (...args) => console.info('[INFO] API_Service(fallback):', ...args), 
                warn: (...args) => console.warn('[WARN] API_Service(fallback):', ...args), 
                error: (...args) => console.error('[ERROR] API_Service(fallback):', ...args) 
            };
        }

        function init() {
            const currentLogger = getLogger();
            if (isInitializedLocal) {
                currentLogger.debug("API сервис уже инициализирован. Пропуск.");
                return;
            }
            
            if (window.MishuraApp && window.MishuraApp.config) {
                configModule = window.MishuraApp.config;
                // Убедимся, что сам config.init() был вызван
                if (typeof configModule.init === 'function' && (typeof configModule.appSettings === 'undefined')) { // Проверяем, если appSettings еще нет
                    // currentLogger.debug("API_Service: Вызов config.init(), так как он мог быть не вызван ранее.");
                    // configModule.init(); // Вызывать init другого модуля здесь может быть рискованно. Предполагаем, что app.js это сделал.
                }

                if (configModule.appSettings && configModule.appSettings.apiUrl) {
                    apiBaseUrl = configModule.appSettings.apiUrl;
                } else if (configModule.apiSettings && configModule.apiSettings.baseUrl) { 
                    apiBaseUrl = configModule.apiSettings.baseUrl;
                }
            } else {
                currentLogger.warn("API сервис: модуль конфигурации не найден. Используется URL API по умолчанию:", apiBaseUrl);
            }
            
            isInitializedLocal = true; // Устанавливаем флаг в конце, после всех проверок
            currentLogger.info(`API сервис инициализирован (v0.5.2) с базовым URL: ${apiBaseUrl}`);
        }
        
        function processStylistConsultation(formData) {
            if (!isInitializedLocal) init(); 
            const currentLogger = getLogger();
            currentLogger.debug('API_Service: Отправка запроса на /analyze-outfit');
            const endpoint = (configModule && configModule.apiSettings && configModule.apiSettings.endpoints && configModule.apiSettings.endpoints.consultation)
                             ? configModule.apiSettings.endpoints.consultation
                             : '/analyze-outfit';
            return fetchWithTimeout(`${apiBaseUrl}${endpoint}`, { method: 'POST', body: formData });
        }

        function processCompareOutfits(formData) {
            if (!isInitializedLocal) init();
            const currentLogger = getLogger();
            currentLogger.debug('API_Service: Отправка запроса на /compare-outfits');
            const endpoint = (configModule && configModule.apiSettings && configModule.apiSettings.endpoints && configModule.apiSettings.endpoints.compare)
                             ? configModule.apiSettings.endpoints.compare
                             : '/compare-outfits';
            return fetchWithTimeout(`${apiBaseUrl}${endpoint}`, { method: 'POST', body: formData });
        }
        
        function processTryOn(formData) {
            if (!isInitializedLocal) init();
            const currentLogger = getLogger();
            currentLogger.debug('API_Service: Отправка запроса на /virtual-fitting');
            const endpoint = (configModule && configModule.apiSettings && configModule.apiSettings.endpoints && configModule.apiSettings.endpoints.virtualFitting)
                                ? configModule.apiSettings.endpoints.virtualFitting
                                : '/virtual-fitting'; 
            return fetchWithTimeout(`${apiBaseUrl}${endpoint}`, { method: 'POST', body: formData });
        }
        
        function fetchWithTimeout(url, options, customTimeout) {
            const currentLogger = getLogger();
            if (!isInitializedLocal && url.indexOf('/debug/info') === -1) { 
                currentLogger.warn("API_Service (fetchWithTimeout): вызван до полной инициализации. Попытка инициализации...");
                init(); 
            }

            const controller = new AbortController();
            const signal = controller.signal;
            
            const effectiveTimeout = customTimeout || (configModule && configModule.apiSettings && configModule.apiSettings.timeout) || 30000;
            currentLogger.debug(`Workspace: ${options.method || 'GET'} ${url} (таймаут: ${effectiveTimeout}мс)`);

            const timeoutId = setTimeout(() => {
                currentLogger.warn(`Workspace: Таймаут запроса к ${url} (${effectiveTimeout}мс)`);
                controller.abort();
            }, effectiveTimeout);
            
            return fetch(url, { ...options, signal })
                .then(response => {
                    clearTimeout(timeoutId);
                    currentLogger.debug(`Workspace: Ответ от ${url} статус: ${response.status}`);
                    if (!response.ok) {
                        return response.text().then(text => {
                            let errorData = { 
                                status: "error_http",
                                httpStatus: response.status,
                                message: `Ошибка HTTP: ${response.status} ${response.statusText}.`,
                                details: text 
                            };
                            try {
                                const parsedError = JSON.parse(text);
                                errorData.message = parsedError.message || errorData.message;
                                errorData.details = parsedError.detail || parsedError.details || text;
                            } catch (e) { /* text уже в details */ }
                            currentLogger.error(`Workspace: Ошибка HTTP ${response.status} для ${url}`, errorData);
                            return Promise.reject(errorData); 
                        });
                    }
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        return response.json();
                    } else {
                        currentLogger.warn(`Workspace: Ответ от ${url} не JSON (Content-Type: ${contentType}). Возврат как текст.`);
                        // Для try-on API может вернуть URL картинки как text/plain или image/*
                        // Оборачиваем в объект для консистентности, если это простой текст
                        if (contentType && (contentType.startsWith("text/") || !contentType.startsWith("image/"))) {
                           return response.text().then(text => ({ 
                                advice: text, // Предполагаем, что текстовый ответ - это 'advice'
                                resultImage: text, // Для try-on, где resultImage может быть URL
                                status: "success_text_response" 
                            }));
                        }
                        // Если это изображение, то как его обработать здесь? Promise<Blob> ?
                        // Пока что, если это не json и не текст, вернем сырой response, чтобы вызывающий код решил.
                        // Это не идеально. Лучше, чтобы API всегда возвращал JSON статус.
                        currentLogger.warn(`Workspace: Ответ от ${url} с Content-Type: ${contentType}. Возвращаем как Blob (потенциально).`);
                        return response.blob().then(blob => ({
                            blob: blob,
                            contentType: contentType,
                            status: "success_blob_response"
                        }));

                    }
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    if (error && error.status === "error_http") { // Уже обработанная HTTP ошибка
                        currentLogger.error(`Workspace: Перехвачена ошибка HTTP для ${url}:`, error.message, error.details);
                        return Promise.reject(error);
                    }
                    const errorMessage = error.name === 'AbortError' ? 'Превышено время ожидания ответа от сервера.' : (error.message || 'Ошибка сети или выполнения запроса.');
                    currentLogger.error(`Workspace: Ошибка сети/выполнения для ${url}: ${errorMessage}`, error.name, error);
                    return Promise.reject({ 
                        status: "error_network", 
                        message: errorMessage,
                        details: error.toString(),
                        name: error.name
                    });
                });
        }
                
        return {
            init,
            isInitialized: () => isInitializedLocal,
            processStylistConsultation,
            processCompareOutfits,
            processTryOn
        };
    })();
}