/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Сравнение образов на главной странице (comparison.js)
ВЕРСИЯ: 1.0.1 (Исправлена двойная инициализация)
ДАТА ОБНОВЛЕНИЯ: 2025-05-26

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает функциональность сравнения образов на отдельной странице.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};

// Проверяем, не был ли модуль уже определен
if (!window.MishuraApp.features.comparison) {
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
            
            logger = window.MishuraApp.utils.logger || { 
                debug: (...args) => console.debug("Comparison:", ...args), 
                info: (...args) => console.info("Comparison:", ...args), 
                warn: (...args) => console.warn("Comparison:", ...args), 
                error: (...args) => console.error("Comparison:", ...args) 
            };
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
                return;
            }
            
            if (compareSlots.length === 0) {
                logger.warn("Слоты для сравнения не найдены");
                return;
            }
            
            // Проверяем каждый слот
            compareSlots.forEach((slot, index) => {
                const input = slot.querySelector('.compare-upload-input');
                const uploadIcon = slot.querySelector('.upload-icon');
                const previewImg = slot.querySelector('.preview-image');
                
                logger.debug(`Слот ${index}: input=${input ? 'есть' : 'НЕТ'}, uploadIcon=${uploadIcon ? 'есть' : 'НЕТ'}, previewImg=${previewImg ? 'есть' : 'НЕТ'}`);
            });
        }
        
        function initEventHandlers() {
            if (!compareSlots || !compareSlots.length) {
                logger.warn("Слоты для сравнения не найдены");
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
            }
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
        
        function onComparePageActivated() {
            logger.debug("Страница сравнения активирована");
            
            // Переинициализируем DOM элементы
            initDOMElements();
            initEventHandlers();
            
            // Сбрасываем состояние
            uploadedImages = [null, null, null, null];
            updateFormVisibility();
        }
        
        function renderComparisonResults(resultText) {
            const resultsContainer = document.getElementById('results-container');
            if (resultsContainer) {
                resultsContainer.innerHTML = resultText;
                resultsContainer.classList.add('active');
                if (window.MishuraApp && window.MishuraApp.app && typeof window.MishuraApp.app.activateLuxuryBlocks === 'function') {
                    window.MishuraApp.app.activateLuxuryBlocks();
                }
            }
        }
        
        return {
            init,
            reset,
            isInitialized: () => isComparisonInitialized
        };
    })();
}