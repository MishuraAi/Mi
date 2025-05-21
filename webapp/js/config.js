/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Конфигурация (config.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Содержит конфигурационные параметры, константы и глобальные настройки приложения.
Инициализирует основную структуру объекта MishuraApp.
==========================================================================================
*/

// Создаем глобальный объект приложения, если он еще не существует
window.MishuraApp = window.MishuraApp || {};

// Создаем подразделы для организации кода
MishuraApp.utils = MishuraApp.utils || {};
MishuraApp.api = MishuraApp.api || {};
MishuraApp.components = MishuraApp.components || {};
MishuraApp.features = MishuraApp.features || {};
MishuraApp.config = MishuraApp.config || {};

// Конфигурационный модуль
MishuraApp.config = (function() {
    // Константы и настройки приложения
    const API_BASE_URL = 'https://api.mishura-ai.ru';
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const APP_VERSION = '0.4.0';
    
    // Другие настройки
    const DEBUG_MODE = true;
    const DEFAULT_OCCASION = 'повседневный';
    
    // Настройки безопасности
    const API_TIMEOUT = 30000; // 30 секунд
    const MAX_UPLOAD_RETRIES = 3;
    
    // Пути к ресурсам
    const ASSETS = {
        LOGO: 'images/logo.png',
        PLACEHOLDER: 'images/placeholder.jpg',
        LOADING_ANIMATION: 'images/loading.gif'
    };
    
    // Лимиты и ограничения
    const LIMITS = {
        MAX_COMPARE_ITEMS: 4,
        MIN_COMPARE_ITEMS: 2,
        MAX_TEXT_LENGTH: 500,
        MAX_CONSULTATION_HISTORY: 20
    };
    
    // Тексты ошибок
    const ERROR_MESSAGES = {
        FILE_TOO_LARGE: 'Файл слишком большой (максимум 5 МБ)',
        INVALID_FILE_TYPE: 'Неподдерживаемый формат. Пожалуйста, загрузите JPEG, PNG или WebP',
        UPLOAD_FAILED: 'Ошибка загрузки файла. Пожалуйста, попробуйте еще раз',
        API_ERROR: 'Ошибка сервера. Пожалуйста, попробуйте позже',
        CONNECTION_ERROR: 'Проблемы с подключением. Проверьте интернет'
    };
    
    // Инициализация модуля
    function init() {
        console.log('Инициализация конфигурации...');
        
        // Проверка и создание всех необходимых подразделов приложения
        ensureAppStructure();
        
        // Настройка режима отладки
        if (DEBUG_MODE) {
            console.log('МИШУРА запущена в режиме отладки (DEBUG_MODE=true)');
            console.log('Версия приложения:', APP_VERSION);
        }
    }
    
    // Функция для проверки и создания структуры приложения
    function ensureAppStructure() {
        // Убедимся, что все подразделы существуют
        MishuraApp.utils = MishuraApp.utils || {};
        MishuraApp.api = MishuraApp.api || {};
        MishuraApp.components = MishuraApp.components || {};
        MishuraApp.features = MishuraApp.features || {};
        
        // Создаем подразделы для утилит, если они не существуют
        MishuraApp.utils.logger = MishuraApp.utils.logger || { 
            init: function() { console.log('Логгер инициализирован (заглушка)'); },
            info: function(msg) { console.log('[INFO]', msg); },
            error: function(msg) { console.error('[ERROR]', msg); },
            warn: function(msg) { console.warn('[WARN]', msg); },
            debug: function(msg) { if (DEBUG_MODE) console.debug('[DEBUG]', msg); }
        };
        
        MishuraApp.utils.deviceDetect = MishuraApp.utils.deviceDetect || { 
            init: function() { console.log('Определение устройства инициализировано (заглушка)'); }
        };
        
        MishuraApp.utils.uiHelpers = MishuraApp.utils.uiHelpers || { 
            init: function() { console.log('UI-хелперы инициализированы (заглушка)'); },
            showToast: function(message) { 
                console.log('showToast:', message);
                // Простая реализация на случай, если основной модуль не загрузился
                const toast = document.getElementById('toast');
                if (toast) {
                    toast.textContent = message;
                    toast.classList.add('visible');
                    setTimeout(() => toast.classList.remove('visible'), 3000);
                }
            },
            showLoading: function(message) {
                const loadingOverlay = document.getElementById('loading-overlay');
                const loadingText = document.getElementById('loading-text');
                if (loadingOverlay && loadingText) {
                    loadingText.textContent = message || 'Загрузка...';
                    loadingOverlay.classList.add('visible');
                }
            },
            hideLoading: function() {
                const loadingOverlay = document.getElementById('loading-overlay');
                if (loadingOverlay) {
                    loadingOverlay.classList.remove('visible');
                }
            }
        };
        
        // Создаем заглушки для API-сервисов, если они не существуют
        MishuraApp.api.service = MishuraApp.api.service || { 
            init: function() { console.log('API-сервис инициализирован (заглушка)'); }
        };
        
        // Создаем заглушки для компонентов, если они не существуют
        MishuraApp.components.navigation = MishuraApp.components.navigation || { 
            init: function() { console.log('Навигация инициализирована (заглушка)'); }
        };
        
        MishuraApp.components.modals = MishuraApp.components.modals || { 
            init: function() { console.log('Модальные окна инициализированы (заглушка)'); },
            openModal: function(modal) {
                if (modal && typeof modal === 'string') {
                    const modalElement = document.getElementById(modal);
                    if (modalElement) modalElement.classList.add('visible');
                } else if (modal) {
                    modal.classList.add('visible');
                }
            },
            closeModal: function(modal) {
                if (modal && typeof modal === 'string') {
                    const modalElement = document.getElementById(modal);
                    if (modalElement) modalElement.classList.remove('visible');
                } else if (modal) {
                    modal.classList.remove('visible');
                }
            }
        };
        
        MishuraApp.components.imageUpload = MishuraApp.components.imageUpload || { 
            init: function() { console.log('Загрузка изображений инициализирована (заглушка)'); }
        };
        
        // Создаем заглушки для функциональных модулей, если они не существуют
        MishuraApp.features.consultation = MishuraApp.features.consultation || { 
            init: function() { console.log('Модуль консультации инициализирован (заглушка)'); }
        };
        
        MishuraApp.features.comparison = MishuraApp.features.comparison || { 
            init: function() { console.log('Модуль сравнения инициализирован (заглушка)'); }
        };
        
        MishuraApp.features.tryOn = MishuraApp.features.tryOn || { 
            init: function() { console.log('Модуль виртуальной примерки инициализирован (заглушка)'); }
        };
        
        // Основной модуль
        MishuraApp.main = MishuraApp.main || { 
            init: function() { console.log('Основной модуль инициализирован (заглушка)'); }
        };
    }
    
    // Полезные вспомогательные функции
    function isValidImageType(type) {
        return ALLOWED_IMAGE_TYPES.includes(type);
    }
    
    function isValidFileSize(size) {
        return size <= MAX_FILE_SIZE;
    }
    
    // Публичный API модуля
    return {
        init: init,
        API_BASE_URL: API_BASE_URL,
        MAX_FILE_SIZE: MAX_FILE_SIZE,
        ALLOWED_IMAGE_TYPES: ALLOWED_IMAGE_TYPES,
        APP_VERSION: APP_VERSION,
        DEBUG_MODE: DEBUG_MODE,
        DEFAULT_OCCASION: DEFAULT_OCCASION,
        API_TIMEOUT: API_TIMEOUT,
        MAX_UPLOAD_RETRIES: MAX_UPLOAD_RETRIES,
        ASSETS: ASSETS,
        LIMITS: LIMITS,
        ERROR_MESSAGES: ERROR_MESSAGES,
        isValidImageType: isValidImageType,
        isValidFileSize: isValidFileSize
    };
})();