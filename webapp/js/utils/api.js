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
            console.log('🚀 API: Отправка запроса на анализ', {
                image: imageData.name,
                mode,
                occasion, 
                preferences,
                endpoint: `${API_BASE_URL}/analyze`
            });
            
            // Временное решение для демо - возвращаем mock ответ
            console.log('⚠️ API сервер не запущен. Возвращаю демо-ответ...');
            
            return new Promise((resolve) => {
                setTimeout(() => {
                    const mockResponse = {
                        status: 'success',
                        advice: `# 🎨 Анализ образа\n\n**Изображение:** ${imageData.name}\n**Повод:** ${occasion || 'Не указан'}\n\n## 📋 Оценка стиля:\n\n✅ **Цветовая гамма:** Гармоничная и подходящая\n✅ **Крой:** Современный и стильный\n✅ **Сочетание элементов:** Удачное\n\n## 🎯 Подходит для:\n- ${occasion || 'Различных пововодов'}\n- Повседневной носки\n- Деловых встреч\n\n## 💡 Рекомендации:\n\n1. **Аксессуары:** Добавьте минималистичные украшения\n2. **Обувь:** Классические туфли или стильные кроссовки\n3. **Дополнения:** ${preferences ? `Учитывая ваши предпочтения "${preferences}", рекомендую...` : 'Можно дополнить легким жакетом'}\n\n---\n*Это демо-ответ. Для полного анализа требуется подключение к ИИ-сервису.*`
                    };
                    resolve(mockResponse);
                }, 1500); // Имитируем задержку API
            });
            
            // Закомментирован реальный API запрос:
            /*
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
            */
        } catch (error) {
            logger.error('Ошибка при анализе изображения:', error);
            throw error;
        }
    }
    
    async function compareImages(images, occasion = null, preferences = null) {
        try {
            console.log('🚀 API: Отправка запроса на сравнение', {
                images: images.map(img => img ? img.name : null),
                occasion, 
                preferences,
                endpoint: `${API_BASE_URL}/compare`
            });
            
            const formData = new FormData();
            
            images.forEach((image, index) => {
                formData.append(`image${index + 1}`, image);
                console.log(`📎 Добавлено изображение ${index + 1}: ${image.name}`);
            });
            
            if (occasion) {
                formData.append('occasion', occasion);
                console.log(`🎯 Повод: ${occasion}`);
            }
            
            if (preferences) {
                formData.append('preferences', preferences);
                console.log(`💭 Предпочтения: ${preferences}`);
            }

            // Временное решение для демо - возвращаем mock ответ
            console.log('⚠️ API сервер не запущен. Возвращаю демо-ответ...');
            
            return new Promise((resolve) => {
                setTimeout(() => {
                    const mockResponse = {
                        status: 'success',
                        advice: `# 🎨 Сравнение образов\n\n**Повод:** ${occasion || 'Не указан'}\n\n## 📸 Анализ ${images.length} изображений:\n\n${images.map((img, i) => `**Образ ${i+1}:** ${img.name}\n- Стиль: Современный\n- Подходит для: ${occasion || 'различных случаев'}\n`).join('\n')}\n\n## 🏆 Рекомендации:\n\n1. **Лучший выбор:** Образ 1 идеально подходит для ${occasion || 'выбранного повода'}\n2. **Альтернатива:** Образ 2 можно использовать как запасной вариант\n3. **Стилистический совет:** Попробуйте комбинировать элементы из разных образов\n\n---\n*Это демо-ответ. Для полного анализа требуется подключение к ИИ-сервису.*`
                    };
                    resolve(mockResponse);
                }, 2000); // Имитируем задержку API
            });
            
            // Закомментирован реальный API запрос:
            /*
            const response = await fetch(`${API_BASE_URL}/compare`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
            */
        } catch (error) {
            logger.error('Ошибка при сравнении изображений:', error);
            throw error;
        }
    }
    
    async function processCompareOutfits(formData) {
        try {
            const response = await fetch(`${API_BASE_URL}/compare`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            logger.error('Ошибка при сравнении образов:', error);
            throw error;
        }
    }
    
    return {
        init,
        sendRequest,
        analyzeImage,
        compareImages,
        processCompareOutfits
    };
})(); 