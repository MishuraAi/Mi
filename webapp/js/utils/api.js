/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API утилиты (utils/api.js)
ВЕРСИЯ: 1.0.1 (ИСПРАВЛЕНА ОБРАБОТКА ОШИБОК И ПОДКЛЮЧЕНИЕ)
ДАТА ОБНОВЛЕНИЯ: 2025-05-28

НАЗНАЧЕНИЕ ФАЙЛА:
Связующее звено между компонентами приложения и API сервисом.
ИСПРАВЛЕНИЯ: улучшенная обработка ошибок C00, автоматическое переподключение
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.utils = window.MishuraApp.utils || {};

window.MishuraApp.utils.api = (function() {
    'use strict';
    
    let logger;
    let apiService;
    let config;
    let isInitialized = false;
    let connectionStatus = { connected: false, lastCheck: null };
    
    function init() {
        if (isInitialized) return;
        
        logger = window.MishuraApp.utils.logger || console;
        config = window.MishuraApp.config;
        
        // Получаем ссылку на основной API сервис
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            apiService = window.MishuraApp.api.service;
            logger.debug('Utils API: Связь с API сервисом установлена');
        } else {
            logger.error('Utils API: API сервис не найден!');
            // Попытка отложенной инициализации
            setTimeout(() => {
                if (window.MishuraApp.api && window.MishuraApp.api.service) {
                    apiService = window.MishuraApp.api.service;
                    logger.info('Utils API: Связь с API сервисом восстановлена');
                }
            }, 1000);
        }
        
        // Слушаем события подключения/отключения API
        setupConnectionListeners();
        
        isInitialized = true;
        logger.info('Utils API инициализирован');
    }
    
    function setupConnectionListeners() {
        document.addEventListener('apiConnected', (e) => {
            connectionStatus.connected = true;
            connectionStatus.lastCheck = Date.now();
            logger.info('Utils API: Соединение с API восстановлено');
        });
        
        document.addEventListener('apiConnectionFailed', (e) => {
            connectionStatus.connected = false;
            connectionStatus.lastCheck = Date.now();
            logger.warn('Utils API: Соединение с API потеряно');
            
            // Показываем уведомление пользователю
            showConnectionError(e.detail);
        });
    }
    
    function showConnectionError(detail) {
        const errorMsg = detail.message || 'API сервер недоступен (C00)';
        
        // Показываем toast уведомление
        if (window.MishuraApp.utils.uiHelpers && window.MishuraApp.utils.uiHelpers.showToast) {
            window.MishuraApp.utils.uiHelpers.showToast(errorMsg);
        }
        
        // Отправляем событие для других компонентов
        document.dispatchEvent(new CustomEvent('apiError', {
            detail: {
                type: 'connection',
                message: errorMsg,
                suggestion: detail.suggestion
            }
        }));
    }
    
    /**
     * Проверка доступности API перед запросом
     */
    async function ensureApiConnection() {
        if (!config) {
            throw new Error('Конфигурация не инициализирована');
        }
        
        // Проверяем кэшированный статус (актуален 30 секунд)
        const now = Date.now();
        if (connectionStatus.lastCheck && (now - connectionStatus.lastCheck) < 30000) {
            if (connectionStatus.connected) {
                return true;
            }
        }
        
        // Проверяем соединение
        try {
            const result = await config.checkApiAvailability();
            connectionStatus.connected = result.available;
            connectionStatus.lastCheck = now;
            
            if (!result.available) {
                throw new Error(result.error || 'API недоступен (C00)');
            }
            
            return true;
        } catch (error) {
            connectionStatus.connected = false;
            connectionStatus.lastCheck = now;
            throw error;
        }
    }
    
    /**
     * Анализ одиночного изображения
     */
    async function analyzeImage(imageFile, mode = 'single', occasion = 'повседневный', preferences = '') {
        if (!apiService) {
            init();
        }
        
        try {
            // Проверяем соединение
            await ensureApiConnection();
            
            logger.debug('Utils API: Отправка изображения на анализ', {
                fileName: imageFile.name,
                fileSize: imageFile.size,
                mode: mode,
                occasion: occasion
            });
            
            const response = await apiService.analyzeImage(imageFile, mode, occasion, preferences);
            
            logger.debug('Utils API: Ответ получен', response);
            
            return response;
            
        } catch (error) {
            logger.error('Utils API: Ошибка при анализе изображения:', error);
            
            return handleApiError(error, 'анализе изображения');
        }
    }
    
    /**
     * Сравнение нескольких изображений
     */
    async function compareImages(imageFiles, occasion = 'повседневный', preferences = '') {
        if (!apiService) {
            init();
        }
        
        try {
            // Проверяем соединение
            await ensureApiConnection();
            
            logger.debug('Utils API: Отправка изображений на сравнение', {
                count: imageFiles.length,
                occasion: occasion
            });
            
            const response = await apiService.compareImages(imageFiles, occasion, preferences);
            
            logger.debug('Utils API: Ответ сравнения получен', response);
            
            return response;
            
        } catch (error) {
            logger.error('Utils API: Ошибка при сравнении изображений:', error);
            
            return handleApiError(error, 'сравнении изображений');
        }
    }
    
    /**
     * Обработка ошибок API
     */
    function handleApiError(error, operation) {
        let errorMessage = `Произошла ошибка при ${operation}`;
        let errorCode = 'C00';
        let errorType = 'general_error';
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = 'Не удается подключиться к серверу. Проверьте соединение с интернетом.';
            errorCode = 'C01';
            errorType = 'connection_error';
        } else if (error.message.includes('timeout') || error.message.includes('AbortError')) {
            errorMessage = 'Превышено время ожидания ответа от сервера.';
            errorCode = 'C02';
            errorType = 'timeout_error';
        } else if (error.message.includes('404')) {
            errorMessage = 'API сервер не найден. Проверьте настройки подключения.';
            errorCode = 'C03';
            errorType = 'not_found_error';
        } else if (error.message.includes('500')) {
            errorMessage = 'Внутренняя ошибка сервера. Попробуйте позже.';
            errorCode = 'C04';
            errorType = 'server_error';
        } else if (error.message.includes('API недоступен')) {
            errorMessage = 'API сервер недоступен. Убедитесь, что сервер запущен.';
            errorCode = 'C00';
            errorType = 'connection_error';
        }
        
        // Отправляем событие об ошибке
        document.dispatchEvent(new CustomEvent('apiError', {
            detail: {
                type: errorType,
                code: errorCode,
                message: errorMessage,
                originalError: error.message
            }
        }));
        
        return {
            status: 'error',
            message: `${errorMessage} (${errorCode})`,
            error_type: errorType,
            error_code: errorCode
        };
    }
    
    /**
     * Проверка доступности API
     */
    async function checkApiHealth() {
        if (!config) {
            init();
        }
        
        try {
            const response = await config.checkApiAvailability();
            
            if (response.available) {
                connectionStatus.connected = true;
                connectionStatus.lastCheck = Date.now();
                
                return {
                    status: 'success',
                    available: true,
                    data: response.data
                };
            } else {
                connectionStatus.connected = false;
                connectionStatus.lastCheck = Date.now();
                
                return {
                    status: 'error',
                    available: false,
                    message: response.error || 'API сервер недоступен',
                    code: response.code || 'C00'
                };
            }
            
        } catch (error) {
            logger.error('Utils API: Сервер недоступен:', error);
            connectionStatus.connected = false;
            connectionStatus.lastCheck = Date.now();
            
            return {
                status: 'error',
                available: false,
                message: 'API сервер недоступен (C00)',
                error: error.message
            };
        }
    }
    
    /**
     * Получение статуса соединения
     */
    function getConnectionStatus() {
        return {
            connected: connectionStatus.connected,
            lastCheck: connectionStatus.lastCheck,
            timeSinceLastCheck: connectionStatus.lastCheck ? Date.now() - connectionStatus.lastCheck : null
        };
    }
    
    /**
     * Принудительная проверка соединения
     */
    async function forceConnectionCheck() {
        logger.debug('Utils API: Принудительная проверка соединения');
        
        connectionStatus.lastCheck = null; // Сбрасываем кэш
        
        try {
            await ensureApiConnection();
            return { connected: true };
        } catch (error) {
            return { 
                connected: false, 
                error: error.message 
            };
        }
    }
    
    /**
     * Повторная инициализация при обнаружении API сервиса
     */
    function reinitialize() {
        logger.debug('Utils API: Повторная инициализация');
        
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            apiService = window.MishuraApp.api.service;
            logger.info('Utils API: API сервис подключен');
            return true;
        }
        
        return false;
    }
    
    // Публичный API
    return {
        init,
        analyzeImage,
        compareImages,
        checkApiHealth,
        getConnectionStatus,
        forceConnectionCheck,
        reinitialize,
        isInitialized: () => isInitialized
    };
})();