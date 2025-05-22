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
        let apiBaseUrl = 'http://localhost:8000/api/v1'; // Дефолт, если конфиг не загружен
        let isInitializedLocal = false;
        
        function getLogger() {
            return window.MishuraApp?.logger || console;
        }

        function init(config) {
            if (config && config.apiSettings) {
                configModule = config;
                if (config.apiSettings.baseUrl) {
                    apiBaseUrl = config.apiSettings.baseUrl;
                }
            }
            isInitializedLocal = true;
        }
        
        function processStylistConsultation(formData) {
            if (!isInitializedLocal) init(); 
            const currentLogger = getLogger();
            currentLogger.debug('API_Service: Отправка запроса на /analyze-outfit');
            const endpoint = (configModule && configModule.apiSettings && configModule.apiSettings.endpoints && configModule.apiSettings.endpoints.consultation)
                             ? configModule.apiSettings.endpoints.consultation
                             : '/analyze-outfit';
            const url = `${apiBaseUrl}${endpoint}`;
            currentLogger.debug(`API_Service: Полный URL запроса: ${url}`);
            return fetchWithTimeout(url, { 
                method: 'POST', 
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            }, 60000); // Увеличиваем таймаут до 60 секунд для обработки изображений
        }

        function processCompareOutfits(formData) {
            if (!isInitializedLocal) init();
            const currentLogger = getLogger();
            currentLogger.debug('API_Service: Отправка запроса на /compare-outfits');
            const endpoint = (configModule && configModule.apiSettings && configModule.apiSettings.endpoints && configModule.apiSettings.endpoints.compare)
                             ? configModule.apiSettings.endpoints.compare
                             : '/compare-outfits';
            const url = `${apiBaseUrl}${endpoint}`;
            currentLogger.debug(`API_Service: Полный URL запроса: ${url}`);
            return fetchWithTimeout(url, { 
                method: 'POST', 
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
        }
        
        function processTryOn(formData) {
            if (!isInitializedLocal) init();
            const currentLogger = getLogger();
            currentLogger.debug('API_Service: Отправка запроса на /virtual-fitting');
            const endpoint = (configModule && configModule.apiSettings && configModule.apiSettings.endpoints && configModule.apiSettings.endpoints.virtualFitting)
                                ? configModule.apiSettings.endpoints.virtualFitting
                                : '/virtual-fitting'; 
            const url = `${apiBaseUrl}${endpoint}`;
            currentLogger.debug(`API_Service: Полный URL запроса: ${url}`);
            return fetchWithTimeout(url, { method: 'POST', body: formData });
        }
        
        async function fetchWithTimeout(url, options, timeout = 30000) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    headers: {
                        ...options.headers,
                        'Accept': 'application/json'
                    },
                    mode: 'cors',
                    credentials: 'include'
                });
                clearTimeout(id);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
                
                return response.json();
            } catch (error) {
                clearTimeout(id);
                const currentLogger = getLogger();
                currentLogger.error(`API_Service: Ошибка запроса к ${url}: ${error.message}`);
                throw error;
            }
        }
                
        return {
            init,
            isInitialized: () => isInitializedLocal,
            getBaseUrl: () => apiBaseUrl,
            processStylistConsultation,
            processCompareOutfits,
            processTryOn,
            fetchWithTimeout
        };
    })();
}