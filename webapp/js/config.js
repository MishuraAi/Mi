/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Конфигурация (config.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

НАЗНАЧЕНИЕ ФАЙЛА:
Содержит константы и общие настройки для всех модулей приложения МИШУРА.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.config = (function() {
    'use strict';
    
    // Возвращаем объект конфигурации
    return {
        // Версия приложения
        VERSION: '0.4.0',
        
        // Настройки API
        API: {
            BASE_URL: '', // На Render это будет относительный путь к тому же домену
            ANALYZE_ENDPOINT: '/analyze-outfit',
            COMPARE_ENDPOINT: '/compare-outfits'
        },
        
        // Лимиты и ограничения
        LIMITS: {
            MAX_FILE_SIZE_MB: 5,       // Максимальный размер файла в МБ
            MAX_COMPARE_ITEMS: 4,      // Максимальное количество предметов для сравнения
            MIN_COMPARE_ITEMS: 2,      // Минимальное количество предметов для сравнения
            IMAGE_COMPRESSION_THRESHOLD_MB: 3, // Порог для компрессии изображений
            TOAST_DURATION: 3000,      // Длительность показа уведомлений (мс)
            COMPRESS_MAX_WIDTH: 1920,  // Максимальная ширина при сжатии
            COMPRESS_MAX_HEIGHT: 1920, // Максимальная высота при сжатии
            COMPRESS_QUALITY: 0.85     // Качество JPEG при сжатии (0-1)
        },
        
        // Поддерживаемые типы изображений
        ACCEPTED_IMAGE_TYPES: [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'image/heic', 'image/heif'   // iOS специфичные форматы
        ],
        
        // Допустимые расширения файлов (для проверки на iOS)
        VALID_IMAGE_EXTENSIONS: [
            '.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif'
        ],
        
        // ID элементов DOM (для снижения ошибок при поиске)
        DOM: {
            CONSULTATION_BUTTON: 'consultation-button',
            TRY_ON_BUTTON: 'try-on-button',
            FAB_BUTTON: 'fab-button',
            CONSULTATION_OVERLAY: 'consultation-overlay',
            RESULTS_OVERLAY: 'results-overlay',
            TRY_ON_OVERLAY: 'try-on-overlay',
            LOADING_OVERLAY: 'loading-overlay',
            // И другие ID...
        },
        
        // CSS классы для манипуляций с DOM
        CSS: {
            ACTIVE: 'active',
            HIDDEN: 'hidden',
            FILLED: 'filled',
            DRAG_OVER: 'drag-over'
        }
    };
})();