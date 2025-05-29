/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Сравнение образов (comparison.js)
ВЕРСИЯ: 1.3.0 (ИСПРАВЛЕН - работает с модальным окном)
ДАТА ОБНОВЛЕНИЯ: 2025-05-29

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает функциональность сравнения образов в модальном окне и на отдельной странице.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};

window.MishuraApp.features.comparison = (function() {
    'use strict';
    
    console.log('DEBUG: Модуль comparison.js загружается...');
    
    let logger, uiHelpers, apiService;
    let compareContainer, compareSlots, compareForm, compareSubmitBtn, compareCancelBtn;
    let modalCompareSlots; // Слоты в модальном окне
    let uploadedImages = [null, null, null, null];
    let isComparisonInitialized = false;
    let currentMode = 'page'; // 'page' или 'modal'
    
    function init() {
        console.log('DEBUG: comparison.init() вызвана, isComparisonInitialized =', isComparisonInitialized);
        if (isComparisonInitialized) return;
        
        logger = window.MishuraApp.utils.logger || createFallbackLogger();
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        // Инициализация API сервиса
        if (window.MishuraApp.api) {
            apiService = window.MishuraApp.api;
            logger.info("Comparison: API сервис найден");
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
                currentMode = 'page';
                onComparePageActivated();
            }
        });
        
        // Слушаем события модального окна
        document.addEventListener('modalOpened', (e) => {
            if (e.detail.modalId === 'consultation-overlay') {
                logger.debug('modalOpened: модальное окно консультации открыто');
                initModalCompare();
            }
        });
        
        // Слушаем события смены режима в модальном окне
        document.addEventListener('modeChanged', (e) => {
            if (e.detail.mode === 'compare') {
                logger.debug('modeChanged: режим сравнения в модальном окне');
                currentMode = 'modal';
                initModalCompareSlots();
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
        // Ищем элементы на странице сравнения
        compareContainer = document.getElementById('compare-section');
        if (!compareContainer) {
            logger.warn("Секция сравнения не найдена");
            return false;
        }
        
        compareSlots = compareContainer.querySelectorAll('.image-slot');
        compareForm = compareContainer.querySelector('.compare-form');
        compareSubmitBtn = document.getElementById('compare-submit');
        compareCancelBtn = document.getElementById('compare-cancel');
        
        logger.debug(`initDOMElements: найдено ${compareSlots.length} слотов для сравнения на странице`);
        
        return compareSlots.length > 0;
    }
    
    function initModalCompare() {
        // Ищем слоты в модальном окне
        const modal = document.getElementById('consultation-overlay');
        if (!modal) {
            logger.warn("Модальное окно консультации не найдено");
            return;
        }
        
        modalCompareSlots = modal.querySelectorAll('#compare-analysis-mode .image-slot');
        logger.debug(`initModalCompare: найдено ${modalCompareSlots.length} слотов в модальном окне`);
        
        if (modalCompareSlots.length > 0) {
            currentMode = 'modal';
            initModalCompareSlots();
        }
    }
    
    function initModalCompareSlots() {
        if (!modalCompareSlots || modalCompareSlots.length === 0) {
            const modal = document.getElementById('consultation-overlay');
            if (modal) {
                modalCompareSlots = modal.querySelectorAll('#compare-analysis-mode .image-slot');
                logger.debug(`initModalCompareSlots: повторный поиск, найдено ${modalCompareSlots.length} слотов`);
            }
        }
        
        if (!modalCompareSlots || modalCompareSlots.length === 0) {
            logger.warn("Слоты для сравнения в модальном окне не найдены");
            return;
        }
        
        // Инициализация каждого слота в модальном окне
        modalCompareSlots.forEach((slot, index) => {
            initSlot(slot, index, 'modal');
        });
        
        logger.debug(`initModalCompareSlots: инициализировано ${modalCompareSlots.length} слотов в модальном окне`);
    }
    
    function initEventHandlers() {
        if (!compareSlots || !compareSlots.length) {
            logger.warn("Слоты для сравнения не найдены при инициализации обработчиков");
            return;
        }
        
        // Инициализация каждого слота на странице
        compareSlots.forEach((slot, index) => {
            initSlot(slot, index, 'page');
        });
        
        // Обработчик кнопки сравнения
        if (compareSubmitBtn) {
            compareSubmitBtn.removeEventListener('click', handleCompareSubmit);
            compareSubmitBtn.addEventListener('click', handleCompareSubmit);
            logger.debug("Обработчик кнопки сравнения установлен");
        }
        
        // Обработчик кнопки отмены
        if (compareCancelBtn) {
            compareCancelBtn.removeEventListener('click', handleCompareCancel);
            compareCancelBtn.addEventListener('click', handleCompareCancel);
            logger.debug("Обработчик кнопки отмены установлен");
        }
    }
    
    function initSlot(slot, index, mode = 'page') {
        const input = slot.querySelector('.compare-upload-input, input[type="file"]');
        
        if (!input) {
            logger.warn(`Слот ${index} (${mode}): input не найден`);
            return;
        }
        
        // Удаляем старые обработчики
        slot.removeEventListener('click', slot._clickHandler);
        input.removeEventListener('change', input._changeHandler);
        
        // Клик по слоту
        const clickHandler = (e) => {
            if (e.target.classList.contains('delete-image') || e.target.closest('.delete-image')) {
                e.preventDefault();
                e.stopPropagation();
                resetSlot(index, mode);
                return;
            }
            
            if (!slot.classList.contains('filled')) {
                e.preventDefault();
                e.stopPropagation();
                input.click();
            }
        };
        
        // Изменение файла
        const changeHandler = (e) => {
            const file = e.target.files[0];
            if (file && isValidImageFile(file)) {
                handleImageUpload(file, index, mode);
            }
        };
        
        slot.addEventListener('click', clickHandler);
        input.addEventListener('change', changeHandler);
        
        // Сохраняем ссылки на обработчики для удаления
        slot._clickHandler = clickHandler;
        input._changeHandler = changeHandler;
        
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
                    handleImageUpload(file, index, mode);
                }
            }
        });
        
        logger.debug(`Слот ${index} (${mode}): обработчики установлены`);
    }
    
    function handleImageUpload(file, slotIndex, mode = 'page') {
        logger.debug(`Загрузка файла в слот ${slotIndex} (${mode}): ${file.name}`);
        
        uploadedImages[slotIndex] = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            let slot;
            if (mode === 'modal') {
                slot = modalCompareSlots ? modalCompareSlots[slotIndex] : null;
            } else {
                slot = compareSlots ? compareSlots[slotIndex] : null;
            }
            
            if (!slot) {
                logger.warn(`Слот ${slotIndex} не найден для режима ${mode}`);
                return;
            }
            
            const previewImg = slot.querySelector('.preview-image');
            const uploadIcon = slot.querySelector('.upload-icon');
            
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                logger.debug(`Превью установлено для слота ${slotIndex} (${mode})`);
            } else {
                logger.warn(`Превью элемент не найден для слота ${slotIndex} (${mode})`);
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
            
            updateFormVisibility(mode);
            
            // Отправляем событие для consultation.js
            document.dispatchEvent(new CustomEvent('compareImageUploaded', {
                detail: { slotIndex, fileName: file.name, mode }
            }));
        };
        
        reader.onerror = () => {
            logger.error(`Ошибка чтения файла ${file.name}`);
            if (uiHelpers) uiHelpers.showToast('Ошибка чтения файла');
        };
        
        reader.readAsDataURL(file);
    }
    
    function resetSlot(slotIndex, mode = 'page') {
        logger.debug(`Сброс слота ${slotIndex} (${mode})`);
        
        let slot;
        if (mode === 'modal') {
            slot = modalCompareSlots ? modalCompareSlots[slotIndex] : null;
        } else {
            slot = compareSlots ? compareSlots[slotIndex] : null;
        }
        
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
        
        updateFormVisibility(mode);
        
        // Отправляем событие для consultation.js
        document.dispatchEvent(new CustomEvent('compareImageRemoved', {
            detail: { slotIndex, mode }
        }));
    }
    
    function updateFormVisibility(mode = 'page') {
        const filledCount = uploadedImages.filter(img => img !== null).length;
        
        if (mode === 'page' && compareForm) {
            if (filledCount >= 2) {
                compareForm.style.display = 'block';
                if (compareSubmitBtn) compareSubmitBtn.disabled = false;
            } else {
                compareForm.style.display = 'none';
                if (compareSubmitBtn) compareSubmitBtn.disabled = true;
            }
        }
        
        // Для модального окна обновляем состояние через consultation.js
        if (mode === 'modal') {
            document.dispatchEvent(new CustomEvent('compareImagesChanged', {
                detail: { count: filledCount, images: uploadedImages.filter(img => img !== null) }
            }));
        }
        
        logger.debug(`Форма сравнения (${mode}): ${filledCount >= 2 ? 'показана' : 'скрыта'} (изображений: ${filledCount})`);
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
            
            const result = await apiService.compareImages(filledImages, { occasion, preferences });
            
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
    
    function handleCompareCancel() {
        logger.debug("Отмена сравнения");
        reset();
        
        // Переход на главную страницу
        const homeNavItem = document.querySelector('.nav-item[data-page="home"]');
        if (homeNavItem) {
            homeNavItem.click();
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
    
    function reset() {
        logger.debug("Сброс модуля сравнения");
        
        // Сбрасываем загруженные изображения
        uploadedImages = [null, null, null, null];
        
        // Сбрасываем все слоты (и на странице, и в модальном окне)
        for (let i = 0; i < 4; i++) {
            resetSlot(i, 'page');
            resetSlot(i, 'modal');
        }
        
        // Скрываем форму
        updateFormVisibility('page');
        updateFormVisibility('modal');
        
        // Сбрасываем форму
        if (compareForm) {
            const occasionSelect = document.getElementById('compare-occasion-selector');
            const preferencesInput = document.getElementById('compare-preferences-input');
            
            if (occasionSelect) occasionSelect.value = 'повседневный';
            if (preferencesInput) preferencesInput.value = '';
        }
        
        logger.debug("Модуль сравнения сброшен");
    }
    
    // Публичные методы для использования из consultation.js
    function getUploadedImages() {
        return uploadedImages.filter(img => img !== null);
    }
    
    function getImageCount() {
        return uploadedImages.filter(img => img !== null).length;
    }
    
    return {
        init,
        reset,
        getUploadedImages,
        getImageCount,
        initModalCompareSlots,
        isInitialized: () => isComparisonInitialized
    };