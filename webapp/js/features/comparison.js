/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Сравнение образов (comparison.js)
ВЕРСИЯ: 1.1.0 (ИСПРАВЛЕН - добавлена функция reset)
ДАТА ОБНОВЛЕНИЯ: 2025-05-27

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает функциональность сравнения образов на отдельной странице.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};

window.MishuraApp.features.comparison = (function() {
    'use strict';
    
    console.log('DEBUG: Модуль comparison.js загружается...');
    
    let logger, uiHelpers, apiService;
    let compareContainer, compareSlots, compareForm, compareSubmitBtn;
    let uploadedImages = [null, null, null, null];
    let isComparisonInitialized = false;
    
    function init() {
        console.log('DEBUG: comparison.init() вызвана, isComparisonInitialized =', isComparisonInitialized);
        if (isComparisonInitialized) return;
        
        logger = window.MishuraApp.utils.logger || createFallbackLogger();
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        // Инициализация API сервиса
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            apiService = window.MishuraApp.api.service;
            if (typeof apiService.init === 'function' && (!apiService.isInitialized || !apiService.isInitialized())) {
                apiService.init(window.MishuraApp.config);
            }
            logger.info("Comparison: API сервис успешно инициализирован");
        } else {
            logger.error("Comparison: API сервис НЕ НАЙДЕН! Запросы не будут работать.");
            if (uiHelpers) uiHelpers.showToast("Ошибка: Сервис API не загружен (C00).", 5000);
        }
        
        logger.debug("Инициализация модуля сравнения образов");
        
        // Слушаем события навигации
        document.addEventListener('navigationChanged', (e) => {
            logger.debug(`navigationChanged: получено событие для страницы ${e.detail.page}`);
            if (e.detail.page === 'compare') {
                logger.debug('navigationChanged: активация страницы сравнения');
                onComparePageActivated();
            }
        });
        
        isComparisonInitialized = true;
        logger.info("Модуль сравнения образов инициализирован");
    }
    
    function createFallbackLogger() {
        return {
            debug: (...args) => console.debug("Comparison:", ...args),
            info: (...args) => console.info("Comparison:", ...args),
            warn: (...args) => console.warn("Comparison:", ...args),
            error: (...args) => console.error("Comparison:", ...args)
        };
    }
    
    function initDOMElements() {
        compareContainer = document.getElementById('compare-section');
        compareSlots = document.querySelectorAll('#compare-section .image-slot');
        compareForm = document.querySelector('#compare-section .compare-form');
        compareSubmitBtn = document.getElementById('compare-submit');
        
        logger.debug(`initDOMElements: compareContainer = ${compareContainer ? 'найден' : 'НЕ НАЙДЕН'}`);
        logger.debug(`initDOMElements: найдено ${compareSlots.length} слотов для сравнения`);
        logger.debug(`initDOMElements: compareForm = ${compareForm ? 'найдена' : 'НЕ НАЙДЕНА'}`);
        logger.debug(`initDOMElements: compareSubmitBtn = ${compareSubmitBtn ? 'найдена' : 'НЕ НАЙДЕНА'}`);
        
        if (!compareContainer) {
            logger.warn("Секция сравнения не найдена");
            return false;
        }
        
        if (compareSlots.length === 0) {
            logger.warn("Слоты для сравнения не найдены");
            return false;
        }
        
        // Проверяем каждый слот
        compareSlots.forEach((slot, index) => {
            const input = slot.querySelector('.compare-upload-input, input[type="file"]');
            const uploadIcon = slot.querySelector('.upload-icon');
            const previewImg = slot.querySelector('.preview-image');
            
            logger.debug(`Слот ${index}: input=${input ? 'есть' : 'НЕТ'}, uploadIcon=${uploadIcon ? 'есть' : 'НЕТ'}, previewImg=${previewImg ? 'есть' : 'НЕТ'}`);
        });
        
        return true;
    }
    
    function initEventHandlers() {
        if (!compareSlots || !compareSlots.length) {
            logger.warn("Слоты для сравнения не найдены при инициализации обработчиков");
            return;
        }
        
        // Инициализация каждого слота
        compareSlots.forEach((slot, index) => {
            initSlot(slot, index);
        });
        
        // Обработчик кнопки сравнения
        if (compareSubmitBtn) {
            // Убираем старый обработчик
            compareSubmitBtn.removeEventListener('click', handleCompareSubmit);
            compareSubmitBtn.addEventListener('click', handleCompareSubmit);
            logger.debug("Обработчик кнопки сравнения установлен");
        }
    }
    
    function initSlot(slot, index) {
        const input = slot.querySelector('.compare-upload-input, input[type="file"]');
        
        if (!input) {
            logger.warn(`Слот ${index}: input не найден`);
            return;
        }
        
        // Клик по слоту
        slot.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-image') || e.target.closest('.delete-image')) {
                e.preventDefault();
                e.stopPropagation();
                resetSlot(index);
                return;
            }
            
            if (!slot.classList.contains('filled')) {
                e.preventDefault();
                e.stopPropagation();
                input.click();
            }
        });
        
        // Изменение файла
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && isValidImageFile(file)) {
                handleImageUpload(file, index);
            }
        });
        
        // Drag & Drop
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!slot.classList.contains('filled')) {
                slot.classList.add('dragover');
            }
        });
        
        slot.addEventListener('dragleave', () => {
            slot.classList.remove('dragover');
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('dragover');
            
            if (!slot.classList.contains('filled') && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (isValidImageFile(file)) {
                    handleImageUpload(file, index);
                }
            }
        });
    }
    
    function handleImageUpload(file, slotIndex) {
        logger.debug(`Загрузка файла в слот ${slotIndex}: ${file.name}`);
        
        uploadedImages[slotIndex] = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const slot = compareSlots[slotIndex];
            if (!slot) return;
            
            const previewImg = slot.querySelector('.preview-image');
            const uploadIcon = slot.querySelector('.upload-icon');
            
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            }
            
            if (uploadIcon) {
                uploadIcon.style.display = 'none';
            }
            
            slot.classList.add('filled');
            
            // Добавляем кнопку удаления
            if (!slot.querySelector('.delete-image')) {
                const deleteBtn = document.createElement('div');
                deleteBtn.className = 'delete-image';
                deleteBtn.innerHTML = '✕';
                deleteBtn.setAttribute('role', 'button');
                deleteBtn.setAttribute('tabindex', '0');
                deleteBtn.setAttribute('aria-label', `Удалить изображение ${slotIndex + 1}`);
                slot.appendChild(deleteBtn);
            }
            
            updateFormVisibility();
        };
        
        reader.readAsDataURL(file);
    }
    
    function resetSlot(slotIndex) {
        logger.debug(`Сброс слота ${slotIndex}`);
        
        const slot = compareSlots[slotIndex];
        if (!slot) return;
        
        const img = slot.querySelector('.preview-image');
        const deleteBtn = slot.querySelector('.delete-image');
        const uploadIcon = slot.querySelector('.upload-icon');
        const input = slot.querySelector('input[type="file"]');
        
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
        if (deleteBtn) deleteBtn.remove();
        if (uploadIcon) uploadIcon.style.display = 'flex';
        if (input) input.value = '';
        
        slot.classList.remove('filled');
        uploadedImages[slotIndex] = null;
        
        updateFormVisibility();
    }
    
    function updateFormVisibility() {
        const filledCount = uploadedImages.filter(img => img !== null).length;
        
        if (compareForm) {
            if (filledCount >= 2) {
                compareForm.style.display = 'block';
                if (compareSubmitBtn) compareSubmitBtn.disabled = false;
            } else {
                compareForm.style.display = 'none';
                if (compareSubmitBtn) compareSubmitBtn.disabled = true;
            }
        }
        
        logger.debug(`Форма сравнения: ${filledCount >= 2 ? 'показана' : 'скрыта'} (изображений: ${filledCount})`);
    }
    
    async function handleCompareSubmit() {
        logger.debug("Запуск сравнения образов");
        
        const filledImages = uploadedImages.filter(img => img !== null);
        if (filledImages.length < 2) {
            if (uiHelpers) uiHelpers.showToast('Загрузите минимум 2 изображения для сравнения');
            return;
        }
        
        const occasion = document.getElementById('compare-occasion-selector')?.value || 'повседневный';
        const preferences = document.getElementById('compare-preferences-input')?.value || '';
        
        if (uiHelpers) uiHelpers.showLoading('Сравниваем образы...');
        
        try {
            if (!apiService) {
                throw new Error('API сервис не доступен');
            }
            
            const result = await apiService.compareImages(filledImages, occasion, preferences);
            
            if (uiHelpers) {
                uiHelpers.hideLoading();
                uiHelpers.showResults(result);
            }
            
            logger.info("Сравнение образов завершено успешно");
        } catch (error) {
            logger.error("Ошибка при сравнении образов:", error);
            if (uiHelpers) {
                uiHelpers.hideLoading();
                uiHelpers.showToast('Ошибка при сравнении образов. Попробуйте снова.');
            }
        }
    }
    
    function isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (!file || !file.type) {
            if (uiHelpers) uiHelpers.showToast('Файл не определен');
            return false;
        }
        
        if (!validTypes.includes(file.type.toLowerCase())) {
            if (uiHelpers) uiHelpers.showToast('Поддерживаются только JPG, PNG, WEBP форматы');
            return false;
        }
        
        if (file.size > maxSize) {
            const sizeMB = (file.size / (1024*1024)).toFixed(1);
            if (uiHelpers) uiHelpers.showToast(`Файл слишком большой (${sizeMB}МБ). Максимум 10МБ`);
            return false;
        }
        
        return true;
    }
    
    function onComparePageActivated() {
        logger.debug("Страница сравнения активирована");
        
        // Переинициализируем DOM элементы
        if (initDOMElements()) {
            initEventHandlers();
        }
        
        // Сбрасываем состояние
        reset();
    }
    
    // ИСПРАВЛЕНИЕ: Добавляем функцию reset
    function reset() {
        logger.debug("Сброс модуля сравнения");
        
        // Сбрасываем загруженные изображения
        uploadedImages = [null, null, null, null];
        
        // Сбрасываем все слоты
        for (let i = 0; i < 4; i++) {
            resetSlot(i);
        }
        
        // Скрываем форму
        updateFormVisibility();
        
        logger.debug("Модуль сравнения сброшен");
    }
    
    function renderComparisonResults(resultText) {
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.innerHTML = resultText;
            resultsContainer.classList.add('active');
        }
    }
    
    return {
        init,
        reset, // ИСПРАВЛЕНИЕ: Экспортируем функцию reset
        isInitialized: () => isComparisonInitialized,
        isInitializedInternal: () => isComparisonInitialized // Альтернативное название
    };
})();