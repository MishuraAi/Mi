window.MishuraApp.services.aiService = (function() {
    'use strict';
    
    let config, logger, apiService;
    
    function init() {
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger;
        apiService = window.MishuraApp.services.apiService;
        
        logger.info('AI Service: Инициализация сервиса ИИ для примерки одежды');
    }
    
    async function processTryOn(personImage, outfitImage, styleType = 'default') {
        logger.info('AI Service: Начало обработки примерки одежды');
        
        if (!personImage || !outfitImage) {
            throw new Error('Необходимо предоставить оба изображения');
        }
        
        try {
            const formData = new FormData();
            formData.append('personImage', personImage);
            formData.append('outfitImage', outfitImage);
            formData.append('styleType', styleType);
            
            const response = await apiService.processTryOn(formData);
            
            if (!response || !response.resultImage) {
                throw new Error('Неверный формат ответа от сервера');
            }
            
            return {
                success: true,
                resultImage: response.resultImage,
                advice: response.advice || null
            };
        } catch (error) {
            logger.error('AI Service: Ошибка при обработке примерки:', error);
            throw error;
        }
    }
    
    return {
        init: init,
        processTryOn: processTryOn
    };
})(); 