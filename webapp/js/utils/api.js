window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.utils = window.MishuraApp.utils || {};

window.MishuraApp.utils.api = (function() {
    'use strict';
    
    let logger;
    const API_BASE_URL = '/api';
    
    function init() {
        logger = window.MishuraApp.utils.logger;
        logger.debug('Инициализация API модуля');
    }
    
    async function sendRequest(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            logger.error('Ошибка при отправке запроса:', error);
            throw error;
        }
    }
    
    async function analyzeImage(imageData, mode = 'single', occasion = null, preferences = null) {
        try {
            const formData = new FormData();
            formData.append('image', imageData);
            formData.append('mode', mode);
            
            if (occasion) {
                formData.append('occasion', occasion);
            }
            
            if (preferences) {
                formData.append('preferences', preferences);
            }
            
            const response = await fetch(`${API_BASE_URL}/analyze`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            logger.error('Ошибка при анализе изображения:', error);
            throw error;
        }
    }
    
    async function compareImages(images, occasion = null, preferences = null) {
        try {
            const formData = new FormData();
            
            images.forEach((image, index) => {
                formData.append(`image${index + 1}`, image);
            });
            
            if (occasion) {
                formData.append('occasion', occasion);
            }
            
            if (preferences) {
                formData.append('preferences', preferences);
            }
            
            const response = await fetch(`${API_BASE_URL}/compare`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            logger.error('Ошибка при сравнении изображений:', error);
            throw error;
        }
    }
    
    return {
        init,
        sendRequest,
        analyzeImage,
        compareImages
    };
})(); 