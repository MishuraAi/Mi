/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Основной API сервис (api-service.js)
ВЕРСИЯ: 1.1.0 (ИСПРАВЛЕН)
ДАТА ОБНОВЛЕНИЯ: 2025-05-27

НАЗНАЧЕНИЕ ФАЙЛА:
Основной API сервис для взаимодействия с backend сервером.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.api = window.MishuraApp.api || {};

window.MishuraApp.api.service = (function() {
    'use strict';
    
    let logger, config;
    let baseUrl = '';
    let isServiceInitialized = false;
    
    function init(configModule) {
        if (isServiceInitialized) return;
        
        logger = window.MishuraApp.utils.logger || console;
        config = configModule || window.MishuraApp.config;
        
        if (config && config.apiSettings) {
            baseUrl = config.apiSettings.baseUrl;
        } else {
            // Fallback URL
            const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            baseUrl = isDev ? 'http://localhost:8001/api/v1' : 'https://style-ai-bot.onrender.com/api/v1';
        }
        
        logger.info('API Service инициализирован с URL:', baseUrl);
        isServiceInitialized = true;
    }
    
    async function fetchWithTimeout(url, options = {}, timeout = 30000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Превышено время ожидания ответа от сервера');
            }
            throw error;
        }
    }
    
    async function analyzeImage(imageFile, mode = 'single', occasion = 'повседневный', preferences = '') {
        if (!baseUrl) {
            throw new Error('API сервис не инициализирован');
        }
        
        logger.debug('API Service: Анализ изображения', {
            fileName: imageFile.name,
            mode: mode,
            occasion: occasion
        });
        
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('occasion', occasion);
        formData.append('preferences', preferences);
        
        try {
            const response = await fetchWithTimeout(`${baseUrl}/analyze-outfit`, {
                method: 'POST',
                body: formData
            });
            
            return response;
        } catch (error) {
            logger.error('API Service: Ошибка при анализе изображения:', error);
            throw error;
        }
    }
    
    async function compareImages(imageFiles, occasion = 'повседневный', preferences = '') {
        if (!baseUrl) {
            throw new Error('API сервис не инициализирован');
        }
        
        logger.debug('API Service: Сравнение изображений', {
            count: imageFiles.length,
            occasion: occasion
        });
        
        const formData = new FormData();
        imageFiles.forEach((file, index) => {
            if (file) {
                formData.append('images', file);
            }
        });
        formData.append('occasion', occasion);
        formData.append('preferences', preferences);
        
        try {
            const response = await fetchWithTimeout(`${baseUrl}/compare-outfits`, {
                method: 'POST',
                body: formData
            });
            
            return response;
        } catch (error) {
            logger.error('API Service: Ошибка при сравнении изображений:', error);
            throw error;
        }
    }
    
    async function checkHealth() {
        try {
            const response = await fetchWithTimeout(`${baseUrl}/health`, {
                method: 'GET'
            }, 5000);
            
            return {
                status: 'success',
                available: true,
                data: response
            };
        } catch (error) {
            logger.error('API Service: Сервер недоступен:', error);
            return {
                status: 'error',
                available: false,
                message: error.message
            };
        }
    }
    
    function getBaseUrl() {
        return baseUrl;
    }
    
    return {
        init,
        analyzeImage,
        compareImages,
        checkHealth,
        getBaseUrl,
        fetchWithTimeout,
        isInitialized: () => isServiceInitialized
    };
})();