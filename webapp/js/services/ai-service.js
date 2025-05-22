// Создаем объект services, если его еще нет
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.services = window.MishuraApp.services || {};

window.MishuraApp.services.aiService = (function() {
    'use strict';
    
    let config, logger, apiService;
    
    function init() {
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger;
        apiService = window.MishuraApp.api.service;
        
        if (!apiService) {
            logger.error('AI Service: API сервис не найден');
            return;
        }
        
        logger.info('AI Service: Инициализация сервиса ИИ для примерки одежды');
    }
    
    async function processTryOn(personImage, outfitImage, styleType = 'default') {
        if (!logger) {
            console.error('AI Service: Логгер не инициализирован');
            return;
        }
        
        logger.info('AI Service: Начало обработки примерки одежды');
        
        if (!personImage || !outfitImage) {
            throw new Error('Необходимо предоставить оба изображения');
        }
        
        try {
            // Проверяем, что изображение человека в полный рост
            const personImageValid = await validatePersonImage(personImage);
            if (!personImageValid) {
                throw new Error('Пожалуйста, загрузите фотографию в полный рост');
            }

            const formData = new FormData();
            formData.append('personImage', personImage);
            formData.append('outfitImage', outfitImage);
            formData.append('styleType', styleType);
            
            if (!apiService) {
                throw new Error('API сервис не инициализирован');
            }
            
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

    async function validatePersonImage(imageFile) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                // Проверяем соотношение сторон
                const aspectRatio = img.width / img.height;
                const minRatio = 0.2;  // Минимальное соотношение (ширина/высота)
                const maxRatio = 1.0;  // Максимальное соотношение (ширина/высота)
                
                logger.info(`AI Service: Проверка фото - размеры: ${img.width}x${img.height}, соотношение: ${aspectRatio.toFixed(2)}`);
                
                // Проверяем минимальные размеры
                const minWidth = 300;
                const minHeight = 400;
                const sizeValid = img.width >= minWidth && img.height >= minHeight;
                
                if (!sizeValid) {
                    logger.warn(`AI Service: Фото слишком маленькое: ${img.width}x${img.height}, минимум: ${minWidth}x${minHeight}`);
                    resolve(false);
                    return;
                }
                
                // Проверяем соотношение сторон
                const ratioValid = aspectRatio >= minRatio && aspectRatio <= maxRatio;
                
                if (!ratioValid) {
                    logger.warn(`AI Service: Неверное соотношение сторон: ${aspectRatio.toFixed(2)}, допустимый диапазон: ${minRatio}-${maxRatio}`);
                } else {
                    logger.info(`AI Service: Фото прошло проверку - соотношение сторон: ${aspectRatio.toFixed(2)}`);
                }
                
                resolve(ratioValid);
            };
            img.onerror = function() {
                logger.error('AI Service: Ошибка при проверке изображения');
                resolve(false);
            };
            img.src = URL.createObjectURL(imageFile);
        });
    }
    
    return {
        init: init,
        processTryOn: processTryOn
    };
})(); 