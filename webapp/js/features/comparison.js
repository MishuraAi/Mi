/*
==========================================================================================
ПРОЕКТ: МИШУРА - Модуль сравнения для features
КОМПОНЕНТ: Сравнение образов (features/comparison.js)
ВЕРСИЯ: 1.0.0 - Интеграция с консультациями
ДАТА СОЗДАНИЯ: 2025-05-30

НАЗНАЧЕНИЕ: Модуль для управления сравнением образов в системе features
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};

window.MishuraApp.features.comparison = (function() {
    'use strict';
    
    let logger;
    let isInitialized = false;
    let uploadedImages = []; // Массив загруженных изображений
    
    function init() {
        if (isInitialized) {
            return;
        }
        
        logger = window.MishuraApp.utils?.logger || createFallbackLogger();
        logger.info("🚀 Инициализация модуля сравнения (features)");
        
        // Слушаем события загрузки изображений
        setupEventListeners();
        
        isInitialized = true;
        logger.info("✅ Модуль сравнения (features) готов");
    }
    
    function createFallbackLogger() {
        return {
            debug: (...args) => console.debug("Comparison:", ...args),
            info: (...args) => console.info("Comparison:", ...args),
            warn: (...args) => console.warn("Comparison:", ...args),
            error: (...args) => console.error("Comparison:", ...args)
        };
    }
    
    function setupEventListeners() {
        // Слушаем события загрузки изображений для сравнения
        document.addEventListener('compareImageUploaded', (e) => {
            const { file, slot } = e.detail;
            if (file && slot !== undefined) {
                addImage(file, slot);
                logger.debug(`Изображение добавлено в слот ${slot}: ${file.name}`);
            }
        });
        
        // Слушаем события удаления изображений
        document.addEventListener('compareImageRemoved', (e) => {
            const { slot } = e.detail;
            if (slot !== undefined) {
                removeImage(slot);
                logger.debug(`Изображение удалено из слота ${slot}`);
            }
        });
        
        // Слушаем сброс всех изображений
        document.addEventListener('allCompareImagesRemoved', () => {
            clearAllImages();
            logger.debug("Все изображения сравнения очищены");
        });
    }
    
    function addImage(file, slotIndex) {
        // Расширяем массив если нужно
        while (uploadedImages.length <= slotIndex) {
            uploadedImages.push(null);
        }
        
        uploadedImages[slotIndex] = file;
        logger.debug(`Файл добавлен в слот ${slotIndex}: ${file.name}`);
    }
    
    function removeImage(slotIndex) {
        if (slotIndex >= 0 && slotIndex < uploadedImages.length) {
            uploadedImages[slotIndex] = null;
            logger.debug(`Файл удален из слота ${slotIndex}`);
        }
    }
    
    function clearAllImages() {
        uploadedImages = [];
        logger.debug("Все изображения очищены");
    }
    
    function getUploadedImages() {
        // Возвращаем только не-null файлы
        return uploadedImages.filter(file => file !== null);
    }
    
    function getImageCount() {
        return getUploadedImages().length;
    }
    
    function hasImages() {
        return getImageCount() > 0;
    }
    
    function hasMinimumImages() {
        return getImageCount() >= 2;
    }
    
    // Публичный API
    return {
        init,
        getUploadedImages,
        getImageCount,
        hasImages,
        hasMinimumImages,
        addImage,
        removeImage,
        clearAllImages,
        isInitialized: () => isInitialized
    };
})();