window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.services = window.MishuraApp.services || {};

window.MishuraApp.services.api = (function() {
    'use strict';
    
    let logger;
    let uiHelpers;
    
    // Константы
    const API_BASE_URL = '/api';
    const ENDPOINTS = {
        CONSULTATION: '/consultation',
        TRY_ON: '/try-on'
    };
    
    function init() {
        logger = window.MishuraApp.utils.logger;
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        logger.debug('Инициализация API сервиса');
    }
    
    async function sendConsultationRequest(formData) {
        try {
            uiHelpers.showLoading('Анализируем ваш запрос...');
            
            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.CONSULTATION}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            logger.error('Ошибка при отправке запроса на консультацию:', error);
            uiHelpers.showToast('Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.');
            throw error;
        } finally {
            uiHelpers.hideLoading();
        }
    }
    
    async function sendTryOnRequest(formData) {
        try {
            uiHelpers.showLoading('Создаем виртуальную примерку...');
            
            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.TRY_ON}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            logger.error('Ошибка при отправке запроса на виртуальную примерку:', error);
            uiHelpers.showToast('Произошла ошибка при создании виртуальной примерки. Пожалуйста, попробуйте позже.');
            throw error;
        } finally {
            uiHelpers.hideLoading();
        }
    }
    
    return {
        init,
        sendConsultationRequest,
        sendTryOnRequest
    };
})(); 