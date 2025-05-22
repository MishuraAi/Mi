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
    
    async function processTryOn(formData) {
        if (!logger) {
            console.error('AI Service: Логгер не инициализирован');
            return;
        }
        
        logger.info('AI Service: Начало обработки примерки одежды');
        
        if (!formData || !(formData instanceof FormData)) {
            throw new Error('Необходимо предоставить FormData с изображениями');
        }
        
        const personImage = formData.get('person_image');
        const outfitImage = formData.get('outfit_image');
        const styleType = formData.get('style_type') || 'default';
        
        if (!personImage || !outfitImage) {
            throw new Error('Необходимо предоставить оба изображения');
        }
        
        try {
            // Проверяем, что изображение человека в полный рост
            const personImageValid = await validatePersonImage(personImage);
            if (!personImageValid) {
                throw new Error('Пожалуйста, загрузите фотографию в полный рост');
            }
            
            if (!apiService) {
                throw new Error('API сервис не инициализирован');
            }
            
            const response = await apiService.processTryOn(formData);
            
            // Проверяем структуру ответа
            if (!response || typeof response !== 'object') {
                throw new Error('Неверный формат ответа от API сервиса');
            }

            // Проверяем успешность операции
            if (response.status !== 'ok') {
                throw new Error(response.message || 'Ошибка при обработке примерки');
            }

            // Проверяем наличие результата
            if (!response.resultImage) {
                throw new Error('В ответе отсутствует изображение результата');
            }
            
            return {
                status: 'ok',
                resultImage: response.resultImage,
                advice: response.advice || null,
                metadata: response.metadata || {}
            };
        } catch (error) {
            logger.error('AI Service: Ошибка при обработке примерки:', error);
            throw error;
        }
    }

    function validatePersonImage(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                const aspectRatio = img.width / img.height;
                logger.info(`AI Service: Размеры изображения: ${img.width}x${img.height}, соотношение сторон: ${aspectRatio.toFixed(2)}`);
                
                // Проверяем минимальные размеры
                const minWidth = 300;
                const minHeight = 400;
                
                if (img.width < minWidth || img.height < minHeight) {
                    logger.warn(`AI Service: Изображение слишком маленькое: ${img.width}x${img.height}`);
                    resolve(false);
                    return;
                }
                
                // Более гибкая проверка соотношения сторон
                // Для фото в полный рост обычно соотношение от 0.2 до 1.0
                if (aspectRatio < 0.2 || aspectRatio > 1.0) {
                    logger.warn(`AI Service: Неподходящее соотношение сторон: ${aspectRatio.toFixed(2)}`);
                    resolve(false);
                    return;
                }
                
                logger.info(`AI Service: Изображение прошло валидацию: ${img.width}x${img.height}, соотношение ${aspectRatio.toFixed(2)}`);
                resolve(true);
            };
            img.onerror = function() {
                logger.error("AI Service: Ошибка загрузки изображения для проверки");
                resolve(false);
            };
            img.src = URL.createObjectURL(file);
        });
    }
    
    return {
        init: init,
        processTryOn: processTryOn
    };
})(); 