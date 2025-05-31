/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Модуль консультаций (consultation.js)
ВЕРСИЯ: 1.1.0 (ИСПРАВЛЕНО: убраны ES6 imports)
ДАТА ОБНОВЛЕНИЯ: 2025-05-31

ИСПРАВЛЕНИЯ:
- Убраны ES6 import statements (причина SyntaxError)
- Приведено к формату window.MishuraApp модулей
- Исправлена интеграция с другими компонентами
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};

window.MishuraApp.features.consultation = (function() {
    'use strict';
    
    let logger;
    let uiHelpers;
    let modals;
    let apiService;
    let isInitialized = false;
    let currentMode = 'single';
    let singleImage = null;
    let compareImages = new Map();
    
    function init() {
        if (isInitialized) {
            return;
        }
        
        logger = window.MishuraApp.utils?.logger || createFallbackLogger();
        uiHelpers = window.MishuraApp.utils?.uiHelpers;
        modals = window.MishuraApp.components?.modals;
        
        logger.info("🚀 Инициализация модуля консультаций");
        
        // Ждем инициализации API Service
        waitForApiService().then(() => {
            setupEventHandlers();
            isInitialized = true;
            logger.info("✅ Модуль консультаций готов к работе");
        }).catch(error => {
            logger.warn("⚠️ API Service недоступен, работаем в режиме демонстрации");
            setupEventHandlers();
            isInitialized = true;
        });
    }
    
    function createFallbackLogger() {
        return {
            debug: (...args) => console.debug("Consultation:", ...args),
            info: (...args) => console.info("Consultation:", ...args),
            warn: (...args) => console.warn("Consultation:", ...args),
            error: (...args) => console.error("Consultation:", ...args)
        };
    }
    
    async function waitForApiService() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 10;
            
            function checkApi() {
                if (window.MishuraApp.api && window.MishuraApp.api.analyzeImage) {
                    apiService = window.MishuraApp.api;
                    logger.info("✅ API Service найден");
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkApi, 500);
                } else {
                    reject(new Error('API Service не найден'));
                }
            }
            
            checkApi();
        });
    }
    
    function setupEventHandlers() {
        logger.debug("🔧 Настройка обработчиков событий консультации");
        
        // Слушаем события загрузки изображений
        document.addEventListener('singleImageUploaded', handleSingleImageUploaded);
        document.addEventListener('singleImageRemoved', handleSingleImageRemoved);
        document.addEventListener('compareImageUploaded', handleCompareImageUploaded);
        document.addEventListener('compareImageRemoved', handleCompareImageRemoved);
        document.addEventListener('modeChanged', handleModeChange);
        
        // Настраиваем обработчики форм
        setupFormHandlers();
    }
    
    function setupFormHandlers() {
        const form = document.getElementById('consultation-form');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                logger.debug("📤 Отправка формы консультации");
                
                if (currentMode === 'single') {
                    await handleSingleConsultationSubmit();
                } else if (currentMode === 'compare') {
                    await handleCompareConsultationSubmit();
                }
            });
        }
        
        // Кнопки отмены
        const cancelButtons = document.querySelectorAll('#consultation-cancel, .cancel-consultation');
        cancelButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                closeModal();
            });
        });
    }
    
    function handleModeChange(event) {
        const { mode } = event.detail;
        currentMode = mode;
        logger.debug(`Режим изменен на: ${mode}`);
        updateSubmitButton();
    }
    
    function handleSingleImageUploaded(event) {
        const { file } = event.detail;
        singleImage = file;
        logger.debug(`Single изображение загружено: ${file.name}`);
        updateSubmitButton();
    }
    
    function handleSingleImageRemoved() {
        singleImage = null;
        logger.debug("Single изображение удалено");
        updateSubmitButton();
    }
    
    function handleCompareImageUploaded(event) {
        const { file, slot } = event.detail;
        compareImages.set(slot, file);
        logger.debug(`Compare изображение загружено в слот ${slot}: ${file.name}`);
        updateSubmitButton();
    }
    
    function handleCompareImageRemoved(event) {
        const { slot } = event.detail;
        compareImages.delete(slot);
        logger.debug(`Compare изображение удалено из слота ${slot}`);
        updateSubmitButton();
    }
    
    function updateSubmitButton() {
        const submitButton = document.querySelector('#submit-consultation');
        if (!submitButton) return;
        
        let canSubmit = false;
        
        if (currentMode === 'single') {
            canSubmit = singleImage !== null;
        } else if (currentMode === 'compare') {
            canSubmit = compareImages.size >= 2;
        }
        
        submitButton.disabled = !canSubmit;
        
        if (canSubmit) {
            submitButton.classList.remove('disabled');
        } else {
            submitButton.classList.add('disabled');
        }
        
        logger.debug(`Кнопка отправки: ${canSubmit ? 'активирована' : 'деактивирована'}`);
    }
    
    async function handleSingleConsultationSubmit() {
        if (!singleImage) {
            logger.warn("❌ Нет изображения для анализа");
            return;
        }
        
        const occasionSelect = document.getElementById('occasion-selector');
        const preferencesInput = document.getElementById('preferences-input');
        
        const occasion = occasionSelect ? occasionSelect.value : '';
        const preferences = preferencesInput ? preferencesInput.value : '';
        
        logger.info("📸 Начало анализа single изображения");
        
        if (uiHelpers) {
            uiHelpers.showLoading('МИШУРА анализирует ваш образ...');
        }
        
        try {
            let result;
            
            if (apiService && typeof apiService.analyzeImage === 'function') {
                result = await apiService.analyzeImage(singleImage, {
                    occasion: occasion,
                    preferences: preferences
                });
            } else {
                // Mock данные если API недоступен
                result = await getMockSingleAnalysis(singleImage, { occasion, preferences });
            }
            
            displayAnalysisResult(result);
            
        } catch (error) {
            logger.error("❌ Ошибка при анализе:", error);
            displayError("Произошла ошибка при анализе изображения. Попробуйте еще раз.");
        } finally {
            if (uiHelpers) {
                uiHelpers.hideLoading();
            }
        }
    }
    
    async function handleCompareConsultationSubmit() {
        if (compareImages.size < 2) {
            logger.warn("❌ Недостаточно изображений для сравнения");
            return;
        }
        
        const occasionSelect = document.getElementById('occasion-selector');
        const preferencesInput = document.getElementById('preferences-input');
        
        const occasion = occasionSelect ? occasionSelect.value : '';
        const preferences = preferencesInput ? preferencesInput.value : '';
        
        logger.info(`📊 Начало сравнения ${compareImages.size} изображений`);
        
        if (uiHelpers) {
            uiHelpers.showLoading('МИШУРА сравнивает образы...');
        }
        
        try {
            const imageFiles = Array.from(compareImages.values());
            let result;
            
            if (apiService && typeof apiService.compareImages === 'function') {
                result = await apiService.compareImages(imageFiles, {
                    occasion: occasion,
                    preferences: preferences
                });
            } else {
                // Mock данные если API недоступен
                result = await getMockCompareAnalysis(imageFiles, { occasion, preferences });
            }
            
            displayComparisonResult(result);
            
        } catch (error) {
            logger.error("❌ Ошибка при сравнении:", error);
            displayError("Произошла ошибка при сравнении изображений. Попробуйте еще раз.");
        } finally {
            if (uiHelpers) {
                uiHelpers.hideLoading();
            }
        }
    }
    
    function displayAnalysisResult(result) {
        logger.info("✅ Отображение результата анализа");
        
        if (uiHelpers && typeof uiHelpers.showResults === 'function') {
            uiHelpers.showResults(result);
        } else {
            // Fallback отображение
            alert(`Результат анализа: ${JSON.stringify(result, null, 2)}`);
        }
        
        // Закрываем модальное окно консультации
        closeModal();
    }
    
    function displayComparisonResult(result) {
        logger.info("✅ Отображение результата сравнения");
        
        if (uiHelpers && typeof uiHelpers.showResults === 'function') {
            uiHelpers.showResults(result);
        } else {
            // Fallback отображение
            alert(`Результат сравнения: ${JSON.stringify(result, null, 2)}`);
        }
        
        // Закрываем модальное окно консультации
        closeModal();
    }
    
    function displayError(message) {
        logger.error(`Ошибка: ${message}`);
        
        if (uiHelpers && typeof uiHelpers.showToast === 'function') {
            uiHelpers.showToast(message);
        } else {
            alert(`Ошибка: ${message}`);
        }
    }
    
    // Mock данные для демонстрации
    async function getMockSingleAnalysis(imageFile, options) {
        // Имитируем задержку API
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const occasionText = options.occasion ? ` для случая "${options.occasion}"` : '';
        
        return {
            status: 'success',
            advice: `
# 🎨 Анализ образа от МИШУРЫ

**Повод**: ${options.occasion || 'Не указан'}

## Общая оценка
Ваш образ${occasionText} выглядит стильно и гармонично! 

## 🌈 Цветовая гамма
Выбранная цветовая палитра отлично подходит к вашему цветотипу и создает приятное визуальное впечатление.

## 👗 Стиль и силуэт
Сочетание предметов создает удачный баланс и подчеркивает достоинства фигуры.

## 💡 Рекомендации
- Попробуйте добавить яркий аксессуар для создания акцента
- Рассмотрите обувь на небольшом каблуке для более элегантного силуэта
- Дополните образ подходящей сумочкой

## ⭐ Итоговая оценка: 8.5/10

Отличный базовый образ с потенциалом для небольших улучшений!

💡 **Совет от МИШУРЫ**: Для еще более точного анализа в следующий раз попробуйте сфотографировать одежду при дневном свете
            `.trim(),
            mode: 'demonstration'
        };
    }
    
    async function getMockCompareAnalysis(imageFiles, options) {
        // Имитируем задержку API
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const occasionText = options.occasion ? ` для случая "${options.occasion}"` : '';
        
        return {
            status: 'success',
            advice: `
# 🏆 Сравнение образов от МИШУРЫ

**Повод**: ${options.occasion || 'Не указан'}

## Результат сравнения
**Лучший образ${occasionText}**: Образ №2 выигрывает благодаря более гармоничному сочетанию цветов и лучшей посадке по фигуре.

## 📊 Детальное сравнение

### 🥇 Образ №1 - Оценка: 7.5/10
- **Плюсы**: Хорошие пропорции, классический стиль
- **Минусы**: Цветовая гамма могла бы быть более яркой
- **Совет**: Добавьте яркий аксессуар или шарф

### 🏆 Образ №2 - Оценка: 9/10
- **Плюсы**: Отличное сочетание цветов, идеальная посадка
- **Минусы**: Практически идеален
- **Совет**: Уже отлично, возможно другая обувь

${imageFiles.length > 2 ? `
### 🥉 Образ №3 - Оценка: 7/10
- **Плюсы**: Интересный выбор, оригинальность
- **Минусы**: Стиль немного не соответствует случаю
- **Совет**: Смените верх на более подходящий к случаю
` : ''}

## 💡 Общие рекомендации
Все образы имеют свои достоинства. Выбирайте исходя из конкретной ситуации и своего настроения!

💡 **Совет от МИШУРЫ**: Отличные фото для сравнения! В следующий раз убедитесь, что все образы сняты в одинаковых условиях освещения
            `.trim(),
            mode: 'demonstration'
        };
    }
    
    function openConsultationModal(mode = 'single') {
        logger.info(`🚀 Открытие модального окна консультации в режиме: ${mode}`);
        
        if (modals && typeof modals.openConsultationModal === 'function') {
            modals.openConsultationModal();
            
            // Устанавливаем режим через событие
            setTimeout(() => {
                document.dispatchEvent(new CustomEvent('modeChanged', {
                    detail: { mode: mode }
                }));
            }, 100);
        } else {
            logger.error("❌ Модуль modals не найден");
        }
    }
    
    function closeModal() {
        logger.debug("🔒 Закрытие модального окна консультации");
        
        if (modals && typeof modals.closeModalById === 'function') {
            modals.closeModalById('consultation-overlay');
        }
        
        // Сбрасываем данные
        singleImage = null;
        compareImages.clear();
        currentMode = 'single';
    }
    
    // Публичный API
    return {
        init,
        openConsultationModal,
        closeModal,
        isInitialized: () => isInitialized
    };
})();