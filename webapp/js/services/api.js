/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API Service - интеграция с Gemini AI (api.js)
ВЕРСИЯ: 1.0.8 (ПОЛНАЯ ИНТЕГРАЦИЯ)
ДАТА ОБНОВЛЕНИЯ: 2025-05-29

ФУНКЦИИ: Прямая работа с Gemini API через бэкенд на порту 8001
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.services = window.MishuraApp.services || {};

window.MishuraApp.services.api = (function() {
    'use strict';
    
    let logger;
    let isInitialized = false;
    
    // Конфигурация API с автоопределением
    const CONFIG = {
        possibleUrls: [
            'http://localhost:8001/api/v1',  // Основной адрес
            'http://localhost:8000/api/v1',  // Резервный
            'https://style-ai-bot.onrender.com/api/v1'  // Продакшн
        ],
        baseUrl: null, // Будет определен автоматически
        timeout: 30000,
        retries: 3
    };
    
    // Endpoints
    const ENDPOINTS = {
        health: '/health',
        singleAnalysis: '/analyze/single',
        compareAnalysis: '/analyze/compare',
        geminiDirect: '/gemini/analyze'
    };
    
    // Функция автоопределения рабочего API URL
    async function detectWorkingApiUrl() {
        logger.debug('🔍 Автоопределение рабочего API адреса...');
        
        for (const url of CONFIG.possibleUrls) {
            try {
                logger.debug(`⏳ Проверка ${url}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(`${url}/health`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    CONFIG.baseUrl = url;
                    logger.info(`✅ Найден рабочий API: ${url}`);
                    return { url, data };
                }
            } catch (error) {
                logger.debug(`❌ ${url} недоступен: ${error.message}`);
            }
        }
        
        throw new Error('Все API адреса недоступны');
    }
    
    async function init() {
        if (isInitialized) {
            return;
        }
        
        logger = window.MishuraApp.utils?.logger || createFallbackLogger();
        logger.info("🚀 Инициализация API Service v1.0.9 (Auto-detect)");
        
        try {
            // Автоопределяем рабочий API URL
            const apiInfo = await detectWorkingApiUrl();
            
            logger.info(`✅ API Service подключен к: ${CONFIG.baseUrl}`);
            logger.debug("API Info:", apiInfo.data);
            
            isInitialized = true;
            
            // Регистрируем в глобальном объекте
            window.MishuraApp.api = {
                analyzeImage,
                compareImages,
                isHealthy: () => checkBackendConnection(),
                isInitialized: () => isInitialized,
                getApiUrl: () => CONFIG.baseUrl
            };
            
            // Уведомляем другие компоненты
            document.dispatchEvent(new CustomEvent('apiServiceReady', {
                detail: { apiUrl: CONFIG.baseUrl, apiInfo: apiInfo.data }
            }));
            
        } catch (error) {
            logger.error("❌ Не удалось найти рабочий API:", error);
            logger.warn("🎭 Переключение в режим демонстрации...");
            setupMockMode();
        }
    }
    
    function createFallbackLogger() {
        return {
            debug: (...args) => console.debug("API:", ...args),
            info: (...args) => console.info("API:", ...args),
            warn: (...args) => console.warn("API:", ...args),
            error: (...args) => console.error("API:", ...args)
        };
    }
    
    async function checkBackendConnection() {
        if (!CONFIG.baseUrl) {
            throw new Error('API URL не определен');
        }
        
        try {
            logger.debug("🔍 Проверка соединения с API...");
            
            const response = await fetchWithTimeout(`${CONFIG.baseUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            logger.debug("✅ API доступен:", data);
            
            return data;
        } catch (error) {
            logger.error("❌ API недоступен:", error);
            throw error;
        }
    }
    
    async function fetchWithTimeout(url, options = {}, timeout = CONFIG.timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Timeout: запрос превысил лимит времени');
            }
            throw error;
        }
    }
    
    async function analyzeImage(imageFile, options = {}) {
        logger.info("📸 Анализ одного изображения");
        logger.debug("Параметры:", { 
            fileName: imageFile.name, 
            fileSize: imageFile.size,
            options 
        });
        
        try {
            // Создаем FormData для отправки файла
            const formData = new FormData();
            formData.append('image', imageFile);
            
            // Добавляем метаданные
            const metadata = {
                occasion: options.occasion || '',
                preferences: options.preferences || '',
                analysis_type: 'single',
                timestamp: new Date().toISOString()
            };
            
            formData.append('metadata', JSON.stringify(metadata));
            
            logger.debug("📤 Отправка запроса на анализ...");
            
            const response = await fetchWithTimeout(`${CONFIG.baseUrl}${ENDPOINTS.singleAnalysis}`, {
                method: 'POST',
                body: formData
                // НЕ устанавливаем Content-Type для FormData!
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка анализа: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            logger.info("✅ Анализ завершен успешно");
            logger.debug("Результат:", result);
            
            return result;
            
        } catch (error) {
            logger.error("❌ Ошибка анализа изображения:", error);
            
            // Если бэкенд недоступен, возвращаем mock данные
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                logger.warn("🔄 Переключение в режим демонстрации");
                return getMockSingleAnalysis(imageFile, options);
            }
            
            throw error;
        }
    }
    
    async function compareImages(imageFiles, options = {}) {
        logger.info("🔍 Сравнение изображений");
        logger.debug("Параметры:", { 
            imageCount: imageFiles.length,
            options 
        });
        
        try {
            // Создаем FormData для отправки файлов
            const formData = new FormData();
            
            // Добавляем каждое изображение
            imageFiles.forEach((file, index) => {
                formData.append(`image_${index}`, file);
            });
            
            // Добавляем метаданные
            const metadata = {
                occasion: options.occasion || '',
                preferences: options.preferences || '',
                analysis_type: 'compare',
                image_count: imageFiles.length,
                timestamp: new Date().toISOString()
            };
            
            formData.append('metadata', JSON.stringify(metadata));
            
            logger.debug("📤 Отправка запроса на сравнение...");
            
            const response = await fetchWithTimeout(`${CONFIG.baseUrl}${ENDPOINTS.compareAnalysis}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка сравнения: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            logger.info("✅ Сравнение завершено успешно");
            logger.debug("Результат:", result);
            
            return result;
            
        } catch (error) {
            logger.error("❌ Ошибка сравнения изображений:", error);
            
            // Если бэкенд недоступен, возвращаем mock данные
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                logger.warn("🔄 Переключение в режим демонстрации");
                return getMockCompareAnalysis(imageFiles, options);
            }
            
            throw error;
        }
    }
    
    // Mock данные для демонстрации (когда бэкенд недоступен)
    function setupMockMode() {
        logger.warn("🎭 Активирован режим демонстрации (Mock API)");
        
        window.MishuraApp.api = {
            analyzeImage: (imageFile, options) => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(getMockSingleAnalysis(imageFile, options));
                    }, 2000); // Имитируем задержку API
                });
            },
            compareImages: (imageFiles, options) => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(getMockCompareAnalysis(imageFiles, options));
                    }, 3000); // Имитируем задержку API
                });
            },
            isHealthy: () => Promise.resolve({ status: 'mock', mode: 'demonstration' }),
            isInitialized: () => true
        };
        
        isInitialized = true;
        document.dispatchEvent(new CustomEvent('apiServiceReady'));
    }
    
    function getMockSingleAnalysis(imageFile, options) {
        const occasionText = options.occasion ? ` для случая "${options.occasion}"` : '';
        
        return {
            success: true,
            analysis_type: 'single',
            image_name: imageFile.name,
            style_analysis: `Анализ образа${occasionText}: Вы выбрали стильное сочетание, которое отлично подходит для вашего типа фигуры. Цветовая гамма гармонична и создает приятное визуальное впечатление.`,
            
            recommendations: `Рекомендации по улучшению: Попробуйте добавить яркий аксессуар для создания акцента. Возможно, стоит рассмотреть обувь на небольшом каблуке для более элегантного силуэта.`,
            
            rating: `Общая оценка: 8.5/10. Отличный базовый образ с потенциалом для небольших улучшений. Вы выглядите стильно и уверенно!`,
            
            color_analysis: "Цветовая палитра подходит к вашему цветотипу и создает гармоничный образ.",
            
            style_tips: [
                "Добавьте контрастный аксессуар",
                "Рассмотрите другую обувь", 
                "Попробуйте слегка другой силуэт"
            ],
            
            timestamp: new Date().toISOString(),
            mode: 'demonstration'
        };
    }
    
    function getMockCompareAnalysis(imageFiles, options) {
        const occasionText = options.occasion ? ` для случая "${options.occasion}"` : '';
        
        return {
            success: true,
            analysis_type: 'compare',
            image_count: imageFiles.length,
            
            best_outfit: `Лучший образ${occasionText}: Образ №2 (${imageFiles[1]?.name || 'второе изображение'}) выигрывает благодаря более гармоничному сочетанию цветов и лучшей посадке по фигуре.`,
            
            comparison: `Детальное сравнение:
            
            🥇 Образ №1: Хорошие пропорции, но цветовая гамма могла бы быть более яркой. Оценка: 7.5/10
            
            🏆 Образ №2: Отличное сочетание цветов, идеальная посадка, стильные аксессуары. Оценка: 9/10
            
            ${imageFiles[2] ? '🥉 Образ №3: Интересный выбор, но стиль немного не соответствует случаю. Оценка: 7/10' : ''}`,
            
            improvement_tips: `Советы по улучшению:
            • Для образа №1: добавьте яркий аксессуар или шарф
            • Для образа №2: уже отлично, возможно другая обувь
            ${imageFiles[2] ? '• Для образа №3: смените верх на более подходящий к случаю' : ''}`,
            
            winner_index: 1,
            scores: imageFiles.map((_, i) => ({ 
                image_index: i, 
                score: i === 1 ? 9.0 : (7.5 - Math.random() * 0.5)
            })),
            
            timestamp: new Date().toISOString(),
            mode: 'demonstration'
        };
    }
    
    // Публичный API
    return {
        init,
        analyzeImage,
        compareImages,
        checkBackendConnection,
        isInitialized: () => isInitialized,
        
        // Для отладки
        CONFIG,
        ENDPOINTS
    };
})();

// Автоинициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.MishuraApp.services.api.init();
    });
} else {
    window.MishuraApp.services.api.init();
}