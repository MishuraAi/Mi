/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API утилиты (utils/api.js)
ВЕРСИЯ: 1.0.0
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
            
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('mode', mode);
            formData.append('occasion', occasion);
            formData.append('preferences', preferences);
            
            const response = await apiService.processStylistConsultation(formData);
            
            logger.debug('Utils API: Ответ получен', response);
            
            // Преобразуем ответ в ожидаемый формат
            if (response && response.analysis) {
                return {
                    status: 'success',
                    advice: response.analysis
                };
            } else if (response && response.advice) {
                return {
                    status: 'success',
                    advice: response.advice
                };
            } else {
                throw new Error('Неверный формат ответа от сервера');
            }
            
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
            
            const formData = new FormData();
            
            // Добавляем все изображения
            imageFiles.forEach((file, index) => {
                if (file) {
                    formData.append(`image${index + 1}`, file);
                }
            });
            
            formData.append('occasion', occasion);
            formData.append('preferences', preferences);
            formData.append('mode', 'compare');
            
            const response = await apiService.processCompareOutfits(formData);
            
            logger.debug('Utils API: Ответ сравнения получен', response);
            
            // Преобразуем ответ в ожидаемый формат
            if (response && response.comparison) {
                return {
                    status: 'success',
                    advice: response.comparison
                };
            } else if (response && response.advice) {
                return {
                    status: 'success',
                    advice: response.advice
                };
            } else {
                throw new Error('Неверный формат ответа от сервера');
            }
            
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
     * Получение истории консультаций
     */
    async function getConsultationHistory(userId) {
        if (!apiService) {
            init();
        }
        
        try {
            const response = await apiService.fetchWithTimeout(
                `${apiService.getBaseUrl()}/history/${userId}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );
            
            return {
                status: 'success',
                data: response.history || []
            };
            
        } catch (error) {
            logger.error('Utils API: Ошибка при получении истории:', error);
            return {
                status: 'error',
                message: 'Не удалось загрузить историю',
                data: []
            };
        }
    }
    
    /**
     * Получение баланса пользователя
     */
    async function getUserBalance(userId) {
        if (!apiService) {
            init();
        }
        
        try {
            const response = await apiService.fetchWithTimeout(
                `${apiService.getBaseUrl()}/balance/${userId}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );
            
            return {
                status: 'success',
                balance: response.balance || 0
            };
            
        } catch (error) {
            logger.error('Utils API: Ошибка при получении баланса:', error);
            return {
                status: 'error',
                message: 'Не удалось загрузить баланс',
                balance: 0
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
            const response = await apiService.fetchWithTimeout(
                `${apiService.getBaseUrl()}/health`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                },
                5000 // 5 секунд таймаут для health check
            );
            
            return {
                status: 'success',
                available: true,
                version: response.version || 'unknown'
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
        getConsultationHistory,
        getUserBalance,
        checkApiHealth,
        isInitialized: () => isInitialized
    };
})();