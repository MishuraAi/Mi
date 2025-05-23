/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Сравнение образов на главной странице (comparison.js)
ВЕРСИЯ: 1.0.0
ДАТА ОБНОВЛЕНИЯ: 2025-05-23

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
        
        logger = window.MishuraApp.utils.logger || { 
            debug: (...args) => console.debug("Comparison:", ...args), 
            info: (...args) => console.info("Comparison:", ...args), 
            warn: (...args) => console.warn("Comparison:", ...args), 
            error: (...args) => console.error("Comparison:", ...args) 
        };
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        apiService = window.MishuraApp.services.api;
        
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
    
    function initSlot(slot, slotIndex) {
        logger.debug(`initSlot: Инициализация слота ${slotIndex}`);
        
        const input = slot.querySelector('.compare-upload-input');
        const uploadIcon = slot.querySelector('.upload-icon');
        const previewImg = slot.querySelector('.preview-image');
        
        if (!input) {
            logger.warn(`Input не найден для слота ${slotIndex}`);
            return;
        }
        
        logger.debug(`initSlot ${slotIndex}: Все элементы найдены, добавляем обработчики событий`);
        
        // Создаем обработчики с замыканием для текущего слота
        const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            logger.debug(`clickHandler: Клик по слоту ${slotIndex}, filled: ${slot.classList.contains('filled')}`);
            if (!slot.classList.contains('filled')) {
                resetFileInput(input);
                logger.debug(`clickHandler: Вызываем input.click() для слота ${slotIndex}`);
                input.click();
            }
        };
        
        const changeHandler = (e) => {
            logger.debug(`changeHandler: Выбран файл в слоте ${slotIndex}, files.length: ${e.target.files.length}`);
            const file = e.target.files[0];
            if (file) {
                logger.debug(`changeHandler: Файл ${file.name} выбран для слота ${slotIndex}`);
                handleImageSelection(file, slotIndex, slot);
            }
        };
        
        const dragoverHandler = (e) => {
            e.preventDefault();
            if (!slot.classList.contains('filled')) {
                slot.classList.add('dragover');
            }
        };
        
        const dragleaveHandler = () => {
            slot.classList.remove('dragover');
        };
        
        const dropHandler = (e) => {
            e.preventDefault();
            slot.classList.remove('dragover');
            if (!slot.classList.contains('filled') && e.dataTransfer.files.length) {
                handleImageSelection(e.dataTransfer.files[0], slotIndex, slot);
            }
        };
        
        // Удаляем старые обработчики если они есть
        slot.removeEventListener('click', clickHandler);
        input.removeEventListener('change', changeHandler);
        slot.removeEventListener('dragover', dragoverHandler);
        slot.removeEventListener('dragleave', dragleaveHandler);
        slot.removeEventListener('drop', dropHandler);
        
        // Добавляем новые обработчики
        slot.addEventListener('click', clickHandler);
        input.addEventListener('change', changeHandler);
        slot.addEventListener('dragover', dragoverHandler);
        slot.addEventListener('dragleave', dragleaveHandler);
        slot.addEventListener('drop', dropHandler);
    }
    
    function handleImageSelection(file, slotIndex, slot) {
        logger.debug(`Загрузка файла в слот ${slotIndex}: ${file.name}`);
        
        if (!isValidImageFile(file)) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImg = slot.querySelector('.preview-image');
            const uploadIcon = slot.querySelector('.upload-icon');
            
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            }
            
            if (uploadIcon) {
                uploadIcon.style.display = 'none';
            }
            
            // Создаем кнопку удаления
            let deleteBtn = slot.querySelector('.delete-image');
            if (!deleteBtn) {
                deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-image';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = 'Удалить изображение';
                slot.appendChild(deleteBtn);
                
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeImage(slotIndex, slot);
                });
            }
            
            slot.classList.add('filled');
            uploadedImages[slotIndex] = file;
            
            updateFormVisibility();
            logger.info(`Файл ${file.name} загружен в слот ${slotIndex}`);
        };
        
        reader.onerror = (error) => {
            logger.error("Ошибка FileReader:", error);
            if (uiHelpers) uiHelpers.showToast('Ошибка при чтении файла');
        };
        
        reader.readAsDataURL(file);
    }
    
    function removeImage(slotIndex, slot) {
        logger.debug(`Удаление изображения из слота ${slotIndex}`);
        
        const previewImg = slot.querySelector('.preview-image');
        const uploadIcon = slot.querySelector('.upload-icon');
        const deleteBtn = slot.querySelector('.delete-image');
        const input = slot.querySelector('.compare-upload-input');
        
        if (previewImg) {
            previewImg.src = '';
            previewImg.style.display = 'none';
        }
        
        if (uploadIcon) {
            uploadIcon.style.display = 'flex';
        }
        
        if (deleteBtn) {
            deleteBtn.remove();
        }
        
        if (input) {
            resetFileInput(input);
        }
        
        slot.classList.remove('filled');
        uploadedImages[slotIndex] = null;
        
        updateFormVisibility();
        logger.debug(`Изображение удалено из слота ${slotIndex}`);
    }
    
    function updateFormVisibility() {
        const filledCount = uploadedImages.filter(img => img !== null).length;
        
        if (compareForm) {
            if (filledCount >= 2) {
                compareForm.style.display = 'block';
            } else {
                compareForm.style.display = 'none';
            }
        }
        
        if (compareSubmitBtn) {
            compareSubmitBtn.disabled = filledCount < 2;
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
            
            const result = await apiService.compareOutfits(filledImages, occasion, preferences);
            
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
    
    function isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!validTypes.includes(file.type.toLowerCase())) {
            logger.warn(`Недопустимый тип файла: ${file.type}`);
            if (uiHelpers) uiHelpers.showToast(`Тип файла не поддерживается. Используйте: JPG, PNG, WEBP`);
            return false;
        }
        
        if (file.size > maxSize) {
            const fileSizeMB = (file.size / (1024*1024)).toFixed(1);
            logger.warn(`Файл слишком большой: ${fileSizeMB}MB`);
            if (uiHelpers) uiHelpers.showToast(`Файл слишком большой (${fileSizeMB}МБ). Максимум 5МБ.`);
            return false;
        }
        
        return true;
    }
    
    function resetFileInput(input) {
        if (input) {
            input.value = '';
        }
    }
    
    function reset() {
        logger.debug("Сброс состояния сравнения");
        
        compareSlots.forEach((slot, index) => {
            if (uploadedImages[index]) {
                removeImage(index, slot);
            }
        });
        
        updateFormVisibility();
    }
    
    return {
        init,
        reset,
        isInitialized: () => isComparisonInitialized
    };
})();