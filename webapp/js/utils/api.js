/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API утилиты (utils/api.js)
ВЕРСИЯ: 1.0.0 (ИСПРАВЛЕН)
ДАТА ОБНОВЛЕНИЯ: 2025-05-27

НАЗНАЧЕНИЕ ФАЙЛА:
Связующее звено между компонентами приложения и API сервисом.
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
        }
        
        isInitialized = true;
        logger.info('Utils API инициализирован');
    }
    
    /**
     * Анализ одиночного изображения
     */
    async function analyzeImage(imageFile, mode = 'single', occasion = 'повседневный', preferences = '') {
        if (!apiService) {
            init();
        }
        
        try {
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
            
            // Проверяем тип ошибки
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                return {
                    status: 'error',
                    message: 'Не удается подключиться к серверу. Проверьте соединение с интернетом.',
                    error_type: 'connection_error'
                };
            }
            
            return {
                status: 'error',
                message: error.message || 'Произошла ошибка при анализе изображения',
                error_type: 'general_error'
            };
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
            logger.debug('Utils API: Отправка изображений на сравнение', {
                count: imageFiles.length,
                occasion: occasion
            });
            
            const response = await apiService.compareImages(imageFiles, occasion, preferences);
            
            logger.debug('Utils API: Ответ сравнения получен', response);
            
            return response;
            
        } catch (error) {
            logger.error('Utils API: Ошибка при сравнении изображений:', error);
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                return {
                    status: 'error',
                    message: 'Не удается подключиться к серверу. Проверьте соединение с интернетом.',
                    error_type: 'connection_error'
                };
            }
            
            return {
                status: 'error',
                message: error.message || 'Произошла ошибка при сравнении изображений',
                error_type: 'general_error'
            };
        }
    }
    
    /**
     * Проверка доступности API
     */
    async function checkApiHealth() {
        if (!apiService) {
            init();
        }
        
        try {
            const response = await apiService.checkHealth();
            
            return {
                status: 'success',
                available: true,
                data: response
            };
            
        } catch (error) {
            logger.error('Utils API: Сервер недоступен:', error);
            return {
                status: 'error',
                available: false,
                message: 'API сервер недоступен'
            };
        }
    }
    
    // Публичный API
    return {
        init,
        analyzeImage,
        compareImages,
        checkApiHealth,
        isInitialized: () => isInitialized
    };
})();