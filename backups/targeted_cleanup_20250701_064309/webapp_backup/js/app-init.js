/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Инициализация приложения (app-init.js)
ВЕРСИЯ: 1.0.0 (НОВЫЙ ФАЙЛ)
ДАТА СОЗДАНИЯ: 2025-05-28

НАЗНАЧЕНИЕ: Правильная инициализация всех компонентов приложения с проверкой API
==========================================================================================
*/

(function() {
    'use strict';
    
    let initAttempts = 0;
    const maxInitAttempts = 5;
    let apiCheckInterval;
    
    /**
     * Основная функция инициализации
     */
    function initializeApp() {
        console.info('=== МИШУРА: Запуск инициализации ===');
        
        initAttempts++;
        
        // Проверяем доступность основных компонентов
        if (!checkRequiredComponents()) {
            if (initAttempts < maxInitAttempts) {
                console.warn(`Попытка ${initAttempts}/${maxInitAttempts}: Компоненты не готовы, повтор через 500мс`);
                setTimeout(initializeApp, 500);
                return;
            } else {
                console.error('Критическая ошибка: Не удалось загрузить все компоненты');
                showCriticalError();
                return;
            }
        }
        
        // Инициализируем компоненты в правильном порядке
        try {
            initializeComponents();
            setupGlobalErrorHandling();
            startApiMonitoring();
            
            console.info('=== МИШУРА: Инициализация завершена успешно ===');
            
            // Показываем статус готовности
            showAppReady();
            
        } catch (error) {
            console.error('Ошибка при инициализации:', error);
            showInitError(error);
        }
    }
    
    /**
     * Проверка доступности необходимых компонентов
     */
    function checkRequiredComponents() {
        const required = [
            'window.MishuraApp',
            'window.MishuraApp.config',
            'window.MishuraApp.utils',
            'window.MishuraApp.components'
        ];
        
        return required.every(path => {
            const exists = getNestedProperty(window, path);
            if (!exists) {
                console.warn(`Компонент не найден: ${path}`);
            }
            return exists;
        });
    }
    
    /**
     * Получение вложенного свойства объекта
     */
    function getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }
    
    /**
     * Инициализация всех компонентов
     */
    function initializeComponents() {
        console.info('Инициализация компонентов...');
        
        // 1. Конфигурация (первая всегда)
        if (window.MishuraApp.config && typeof window.MishuraApp.config.init === 'function') {
            window.MishuraApp.config.init();
            console.info('✓ Конфигурация инициализирована');
        }
        
        // 2. Утилиты
        const utils = ['logger', 'deviceDetect', 'uiHelpers', 'api'];
        utils.forEach(util => {
            if (window.MishuraApp.utils[util] && typeof window.MishuraApp.utils[util].init === 'function') {
                window.MishuraApp.utils[util].init();
                console.info(`✓ Утилита ${util} инициализирована`);
            }
        });
        
        // 3. Компоненты
        const components = ['navigation', 'modals', 'imageUpload'];
        components.forEach(component => {
            if (window.MishuraApp.components[component] && typeof window.MishuraApp.components[component].init === 'function') {
                window.MishuraApp.components[component].init();
                console.info(`✓ Компонент ${component} инициализирован`);
            }
        });
        
        // 4. Функции (консультация, сравнение)
        const features = ['consultation', 'comparison'];
        features.forEach(feature => {
            if (window.MishuraApp.features && window.MishuraApp.features[feature] && typeof window.MishuraApp.features[feature].init === 'function') {
                window.MishuraApp.features[feature].init();
                console.info(`✓ Функция ${feature} инициализирована`);
            }
        });
        
        // 5. Основное приложение
        if (window.MishuraApp.app && typeof window.MishuraApp.app.init === 'function') {
            window.MishuraApp.app.init();
            console.info('✓ Основное приложение инициализировано');
        }
    }
    
    /**
     * Настройка глобальной обработки ошибок
     */
    function setupGlobalErrorHandling() {
        // Обработка API ошибок
        document.addEventListener('apiError', function(e) {
            const detail = e.detail;
            console.error('API Ошибка:', detail);
            
            if (detail.code === 'C00' || detail.type === 'connection_error') {
                showApiConnectionError(detail);
            }
        });
        
        // Обработка ошибок JavaScript
        window.addEventListener('error', function(e) {
            console.error('Глобальная ошибка:', e.error);
            
            // Не показываем все ошибки пользователю, только критические
            if (e.error && e.error.message && e.error.message.includes('API')) {
                showError('Ошибка подключения к серверу');
            }
        });
        
        // Обработка необработанных промисов
        window.addEventListener('unhandledrejection', function(e) {
            console.error('Необработанный промис:', e.reason);
            
            if (e.reason && e.reason.message && e.reason.message.includes('API')) {
                showError('Ошибка при обращении к серверу');
            }
        });
    }
    
    /**
     * Запуск мониторинга API
     */
    function startApiMonitoring() {
        // Проверяем API каждые 30 секунд
        apiCheckInterval = setInterval(async function() {
            if (window.MishuraApp.utils.api && typeof window.MishuraApp.utils.api.checkApiHealth === 'function') {
                try {
                    const result = await window.MishuraApp.utils.api.checkApiHealth();
                    if (!result.available) {
                        console.warn('API мониторинг: сервер недоступен');
                    }
                } catch (error) {
                    console.warn('API мониторинг: ошибка проверки', error);
                }
            }
        }, 30000);
        
        console.info('✓ Мониторинг API запущен');
    }
    
    /**
     * Показ ошибки подключения к API
     */
    function showApiConnectionError(detail) {
        const existingError = document.querySelector('.api-error-banner');
        if (existingError) return;
        
        const banner = document.createElement('div');
        banner.className = 'api-error-banner';
        banner.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #b8941f, #d4af37);
                color: #000;
                padding: 12px 20px;
                text-align: center;
                font-size: 14px;
                font-weight: 500;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            ">
                ⚠️ ${detail.message || 'API сервер недоступен (C00)'}
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: #000;
                    margin-left: 15px;
                    cursor: pointer;
                    font-size: 16px;
                ">✕</button>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // Автоматически скрываем через 10 секунд
        setTimeout(() => {
            if (banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
        }, 10000);
    }
    
    /**
     * Показ общих ошибок
     */
    function showError(message) {
        if (window.MishuraApp.utils.uiHelpers && window.MishuraApp.utils.uiHelpers.showToast) {
            window.MishuraApp.utils.uiHelpers.showToast(message);
        } else {
            console.error('UI Error:', message);
        }
    }
    
    /**
     * Показ критической ошибки
     */
    function showCriticalError() {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #1a1a1a;
                border: 2px solid #d4af37;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                color: white;
                max-width: 400px;
                z-index: 9999;
            ">
                <h3 style="color: #d4af37; margin-bottom: 15px;">Ошибка инициализации</h3>
                <p style="margin-bottom: 20px;">Не удалось загрузить компоненты приложения.</p>
                <button onclick="location.reload()" style="
                    background: linear-gradient(135deg, #d4af37, #b8941f);
                    color: #000;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">Перезагрузить</button>
            </div>
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 9998;
            "></div>
        `;
        document.body.appendChild(errorDiv);
    }
    
    /**
     * Показ статуса готовности
     */
    function showAppReady() {
        // Создаем временное уведомление о готовности
        const readyNotification = document.createElement('div');
        readyNotification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #d4af37, #b8941f);
            color: #000;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        readyNotification.textContent = '✓ Приложение готово к работе';
        
        document.body.appendChild(readyNotification);
        
        // Показываем с анимацией
        setTimeout(() => {
            readyNotification.style.opacity = '1';
        }, 100);
        
        // Скрываем через 3 секунды
        setTimeout(() => {
            readyNotification.style.opacity = '0';
            setTimeout(() => {
                if (readyNotification.parentNode) {
                    readyNotification.parentNode.removeChild(readyNotification);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Показ ошибки инициализации
     */
    function showInitError(error) {
        console.error('Ошибка инициализации:', error);
        
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #d32f2f;
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                font-size: 14px;
                max-width: 90%;
                text-align: center;
                z-index: 1000;
            ">
                ⚠️ Ошибка инициализации: ${error.message}
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    /**
     * Очистка ресурсов при выгрузке страницы
     */
    function cleanup() {
        if (apiCheckInterval) {
            clearInterval(apiCheckInterval);
        }
    }
    
    // Запуск инициализации
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        // DOM уже загружен
        setTimeout(initializeApp, 100);
    }
    
    // Очистка при выгрузке
    window.addEventListener('beforeunload', cleanup);
    
    // Экспорт для отладки
    window.MishuraAppInit = {
        reinitialize: initializeApp,
        checkComponents: checkRequiredComponents,
        cleanup: cleanup
    };
    
})();