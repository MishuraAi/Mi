/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Консультации со встроенным API (consultation.js)
ВЕРСИЯ: 1.1.0 (ВСТРОЕННЫЙ API)
ДАТА ОБНОВЛЕНИЯ: 2025-05-29

ИСПРАВЛЕНИЯ: API интегрирован напрямую в модуль консультаций
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.features = window.MishuraApp.features || {};

window.MishuraApp.features.consultation = (function() {
    'use strict';
    
    let logger, uiHelpers, modalManager, imageUpload;
    let isConsultationInitialized = false;
    let currentMode = 'single';
    let isSubmitting = false;
    
    // ==== ВСТРОЕННЫЙ API ====
    const API_SERVICE = {
        baseUrl: null,
        isReady: false,
        
        async init() {
            logger.info("🚀 Инициализация встроенного API Service");
            
            // Пробуем найти рабочий API
            const urls = [
                'http://localhost:8001/api/v1',
                'http://localhost:8000/api/v1',
                'https://style-ai-bot.onrender.com/api/v1'
            ];
            
            for (const url of urls) {
                try {
                    logger.debug(`⏳ Проверка ${url}...`);
                    
                    const response = await fetch(`${url}/health`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(5000)
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.baseUrl = url;
                        this.isReady = true;
                        logger.info(`✅ API найден: ${url}`, data);
                        
                        // Регистрируем глобально
                        window.MishuraApp.api = {
                            analyzeImage: this.analyzeImage.bind(this),
                            compareImages: this.compareImages.bind(this),
                            isInitialized: () => this.isReady
                        };
                        
                        return true;
                    }
                } catch (error) {
                    logger.debug(`❌ ${url} недоступен: ${error.message}`);
                }
            }
            
            // Если API недоступен, используем mock
            logger.warn("🎭 API недоступен, активирован режим демонстрации");
            this.setupMockApi();
            return false;
        },
        
        setupMockApi() {
            this.isReady = true;
            window.MishuraApp.api = {
                analyzeImage: this.mockAnalyzeImage.bind(this),
                compareImages: this.mockCompareImages.bind(this),
                isInitialized: () => true
            };
            logger.info("✅ Mock API активирован");
        },
        
        async analyzeImage(imageFile, options = {}) {
            if (!this.baseUrl) {
                return this.mockAnalyzeImage(imageFile, options);
            }
            
            logger.info("📸 Анализ изображения через API");
            
            try {
                const formData = new FormData();
                formData.append('image', imageFile);
                formData.append('metadata', JSON.stringify({
                    occasion: options.occasion || '',
                    preferences: options.preferences || '',
                    analysis_type: 'single',
                    timestamp: new Date().toISOString()
                }));
                
                const response = await fetch(`${this.baseUrl}/analyze/single`, {
                    method: 'POST',
                    body: formData,
                    signal: AbortSignal.timeout(30000)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                logger.info("✅ Анализ завершен");
                return result;
                
            } catch (error) {
                logger.error("❌ Ошибка API анализа:", error);
                logger.warn("🔄 Переключение на mock данные");
                return this.mockAnalyzeImage(imageFile, options);
            }
        },
        
        async compareImages(imageFiles, options = {}) {
            if (!this.baseUrl) {
                return this.mockCompareImages(imageFiles, options);
            }
            
            logger.info("🔍 Сравнение изображений через API");
            
            try {
                const formData = new FormData();
                
                imageFiles.forEach((file, index) => {
                    formData.append(`image_${index}`, file);
                });
                
                formData.append('metadata', JSON.stringify({
                    occasion: options.occasion || '',
                    preferences: options.preferences || '',
                    analysis_type: 'compare',
                    image_count: imageFiles.length,
                    timestamp: new Date().toISOString()
                }));
                
                const response = await fetch(`${this.baseUrl}/analyze/compare`, {
                    method: 'POST',
                    body: formData,
                    signal: AbortSignal.timeout(45000)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                logger.info("✅ Сравнение завершено");
                return result;
                
            } catch (error) {
                logger.error("❌ Ошибка API сравнения:", error);
                logger.warn("🔄 Переключение на mock данные");
                return this.mockCompareImages(imageFiles, options);
            }
        },
        
        async mockAnalyzeImage(imageFile, options) {
            logger.info("🎭 Mock анализ изображения");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
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
                mode: 'mock'
            };
        },
        
        async mockCompareImages(imageFiles, options) {
            logger.info("🎭 Mock сравнение изображений");
            await new Promise(resolve => setTimeout(resolve, 3000));
            
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
                mode: 'mock'
            };
        }
    };
    
    function init() {
        if (isConsultationInitialized) {
            logger?.debug("Модуль консультаций уже инициализирован");
            return;
        }

        logger = window.MishuraApp.utils.logger || createFallbackLogger();
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        modalManager = window.MishuraApp.components.modalManager;
        imageUpload = window.MishuraApp.components.imageUpload;

        logger.info("🚀 Инициализация модуля консультаций v1.1.0 (Embedded API)");
        
        // Инициализируем встроенный API
        API_SERVICE.init().then((hasRealApi) => {
            logger.info(hasRealApi ? "✅ Реальный API подключен" : "🎭 Работаем в режиме демонстрации");
            setupEventListeners();
            setupButtonHandlers();
            isConsultationInitialized = true;
            logger.info("✅ Модуль консультаций готов к работе");
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
    
    function setupEventListeners() {
        // Слушаем смену режима
        document.addEventListener('modeChanged', (e) => {
            currentMode = e.detail.mode;
            logger.debug(`Consultation (event modeChanged): режим ${currentMode}. Обновление кнопки.`);
            updateSubmitButtonState();
            // Восстанавливаем обработчики после смены режима
            setTimeout(setupButtonHandlers, 100);
        });

        // Слушаем загрузку изображений
        document.addEventListener('singleImageUploaded', (e) => {
            logger.debug(`Consultation (event singleImageUploaded): Изображение загружено - ${e.detail.file.name}`);
            updateSubmitButtonState();
        });

        document.addEventListener('singleImageRemoved', () => {
            logger.debug("Consultation (event singleImageRemoved): Изображение для одиночного анализа удалено.");
            updateSubmitButtonState();
        });

        document.addEventListener('compareImageUploaded', (e) => {
            logger.debug(`Consultation (event compareImageUploaded): Изображение загружено в слот ${e.detail.slot} - ${e.detail.file.name}`);
            updateSubmitButtonState();
        });

        document.addEventListener('compareImageRemoved', (e) => {
            logger.debug(`Consultation (event compareImageRemoved): Изображение удалено из слота ${e.detail.slot}`);
            updateSubmitButtonState();
        });

        // Слушаем открытие модальных окон
        document.addEventListener('modalOpened', (e) => {
            if (e.detail.modalId === 'consultation-overlay') {
                logger.debug(`Consultation (event modalOpened '${e.detail.modalId}'): Обновление состояния кнопки.`);
                updateSubmitButtonState();
                setTimeout(setupButtonHandlers, 100);
            }
        });
    }
    
    function setupButtonHandlers() {
        logger.debug("🔧 Настройка обработчиков кнопок консультации");
        
        // Кнопка отправки single консультации
        const submitSingleBtn = document.querySelector('#submit-consultation');
        if (submitSingleBtn) {
            // Удаляем старые обработчики
            const newBtn = submitSingleBtn.cloneNode(true);
            submitSingleBtn.parentNode.replaceChild(newBtn, submitSingleBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isSubmitting) {
                    handleSingleConsultationSubmit();
                }
            });
            logger.debug("✅ Обработчик single consultation установлен");
        }

        // Кнопка отправки compare консультации  
        const submitCompareBtn = document.querySelector('#submit-comparison');
        if (submitCompareBtn) {
            // Удаляем старые обработчики
            const newBtn = submitCompareBtn.cloneNode(true);
            submitCompareBtn.parentNode.replaceChild(newBtn, submitCompareBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isSubmitting) {
                    handleCompareConsultationSubmit();
                }
            });
            logger.debug("✅ Обработчик compare consultation установлен");
        }

        // Кнопки отмены
        const cancelBtns = document.querySelectorAll('#consultation-cancel, #compare-cancel');
        cancelBtns.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCancelConsultation();
            });
        });
        
        if (cancelBtns.length > 0) {
            logger.debug(`✅ ${cancelBtns.length} обработчиков отмены установлено`);
        }
    }
    
    function updateSubmitButtonState() {
        const submitSingleBtn = document.querySelector('#submit-consultation');
        const submitCompareBtn = document.querySelector('#submit-comparison');
        
        if (currentMode === 'single') {
            const hasImage = imageUpload?.getUploadedImages()?.single !== null;
            
            if (submitSingleBtn) {
                if (hasImage && !isSubmitting) {
                    submitSingleBtn.disabled = false;
                    submitSingleBtn.classList.remove('disabled');
                    logger.debug("Consultation: Кнопка submit (single mode) активирована");
                } else {
                    submitSingleBtn.disabled = true;
                    submitSingleBtn.classList.add('disabled');
                    logger.debug("Consultation: Кнопка submit (single mode) деактивирована");
                }
            }
        } else if (currentMode === 'compare') {
            const images = imageUpload?.getUploadedImages()?.compare || [];
            const imageCount = images.filter(img => img !== null).length;
            
            if (submitCompareBtn) {
                if (imageCount >= 2 && !isSubmitting) {
                    submitCompareBtn.disabled = false;
                    submitCompareBtn.classList.remove('disabled');
                    logger.debug(`Consultation: Кнопка submit (compare mode) активирована (изображений: ${imageCount})`);
                } else {
                    submitCompareBtn.disabled = true;
                    submitCompareBtn.classList.add('disabled');
                    logger.debug(`Consultation: Кнопка submit (compare mode) деактивирована (изображений: ${imageCount})`);
                }
            }
        }
    }
    
    async function handleSingleConsultationSubmit() {
        logger.info("🚀 Обработчик submit формы, режим 'single'");
        
        if (isSubmitting) {
            logger.warn("Уже идет процесс отправки");
            return;
        }
        
        // Проверяем доступность API
        const apiService = window.MishuraApp.api;
        if (!apiService) {
            logger.error("API Service недоступен!");
            showErrorMessage("Ошибка: API не инициализирован. Попробуйте обновить страницу.");
            return;
        }
        
        try {
            isSubmitting = true;
            updateSubmitButtonState();
            
            showLoadingIndicator("Анализируем ваш образ...");
            
            const uploadedImages = imageUpload?.getUploadedImages();
            const singleImage = uploadedImages?.single;
            
            if (!singleImage) {
                throw new Error("Изображение не найдено");
            }
            
            const occasion = getSelectedOccasion();
            const preferences = getPreferences();
            
            logger.debug("Отправка на анализ:", { 
                imageSize: singleImage.size,
                imageName: singleImage.name,
                occasion,
                preferences 
            });
            
            const result = await apiService.analyzeImage(singleImage, { occasion, preferences });
            displayAnalysisResult(result);
            
        } catch (error) {
            logger.error("Ошибка при отправке:", error);
            showErrorMessage(`Ошибка анализа: ${error.message}`);
        } finally {
            isSubmitting = false;
            hideLoadingIndicator();
            updateSubmitButtonState();
        }
    }
    
    async function handleCompareConsultationSubmit() {
        logger.info("🚀 Обработчик submit формы, режим 'compare'");
        
        if (isSubmitting) {
            logger.warn("Уже идет процесс отправки");
            return;
        }
        
        // Проверяем доступность API
        const apiService = window.MishuraApp.api;
        if (!apiService) {
            logger.error("API Service недоступен!");
            showErrorMessage("Ошибка: API не инициализирован. Попробуйте обновить страницу.");
            return;
        }

        // Получаем изображения из comparison
        const comparison = window.MishuraApp.features.comparison;
        if (!comparison || typeof comparison.getUploadedImages !== 'function') {
            logger.error("Модуль сравнения не найден или не реализует getUploadedImages");
            showErrorMessage("Ошибка: Модуль сравнения не найден.");
            return;
        }
        const images = comparison.getUploadedImages ? comparison.getUploadedImages() : [];
        if (!images || images.length < 2) {
            if (uiHelpers) uiHelpers.showToast('Загрузите минимум 2 изображения для сравнения');
            return;
        }

        const occasion = document.getElementById('occasion-selector')?.value || 'повседневный';
        const preferences = document.getElementById('preferences-input')?.value || '';

        if (uiHelpers) uiHelpers.showLoading('Сравниваем образы...');

        try {
            const result = await apiService.compareImages(images, { occasion, preferences });
            if (uiHelpers) {
                uiHelpers.hideLoading();
                if (uiHelpers.closeModal) uiHelpers.closeModal('consultation-overlay');
                if (uiHelpers.showResults) uiHelpers.showResults(result);
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
    
    function handleCancelConsultation() {
        logger.debug("Отмена консультации");
        
        if (modalManager) {
            modalManager.closeModal('consultation-overlay');
        } else {
            const modal = document.querySelector('#consultation-overlay');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        }
    }
    
    // Утилиты для работы с формой
    function getSelectedOccasion() {
        const select = document.querySelector('.occasion-selector select');
        return select?.value || '';
    }
    
    function getPreferences() {
        const textarea = document.querySelector('.preferences-input textarea');
        return textarea?.value || '';
    }
    
    // UI функции
    function showLoadingIndicator(message = "Обработка...") {
        if (uiHelpers?.showLoadingIndicator) {
            uiHelpers.showLoadingIndicator(message);
        } else {
            let loader = document.getElementById('loading-indicator');
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'loading-indicator';
                loader.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    color: white;
                    font-size: 18px;
                `;
                document.body.appendChild(loader);
            }
            loader.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 16px;">⏳</div>
                    <div>${message}</div>
                </div>
            `;
            loader.style.display = 'flex';
        }
        logger.debug("Показан индикатор загрузки");
    }
    
    function hideLoadingIndicator() {
        if (uiHelpers?.hideLoadingIndicator) {
            uiHelpers.hideLoadingIndicator();
        } else {
            const loader = document.getElementById('loading-indicator');
            if (loader) {
                loader.style.display = 'none';
            }
        }
        logger.debug("Скрыт индикатор загрузки");
    }
    
    function showErrorMessage(message) {
        if (uiHelpers?.showToast) {
            uiHelpers.showToast(message, 'error');
        } else {
            alert(message);
        }
    }
    
    function displayAnalysisResult(result) {
        logger.info("Отображение результата анализа");
        
        if (modalManager) {
            modalManager.closeModal('consultation-overlay');
        }
        
        const resultHtml = formatAnalysisResult(result);
        showResultModal('Анализ вашего образа', resultHtml);
    }
    
    function displayComparisonResult(result) {
        logger.info("Отображение результата сравнения");
        
        if (modalManager) {
            modalManager.closeModal('consultation-overlay');
        }
        
        const resultHtml = formatComparisonResult(result);
        showResultModal('Сравнение ваших образов', resultHtml);
    }
    
    function formatAnalysisResult(result) {
        const modeLabel = result.mode === 'mock' ? '<p style="color: #7f8c8d; font-size: 0.9em;">📝 Демонстрационный режим</p>' : '';
        
        return `
            <div class="analysis-result" style="padding: 20px; line-height: 1.6;">
                <div class="result-section" style="margin-bottom: 20px;">
                    <h3 style="color: #2c3e50; margin-bottom: 10px;">🎯 Стиль и образ</h3>
                    <p>${result.style_analysis || 'Анализ стиля...'}</p>
                </div>
                <div class="result-section" style="margin-bottom: 20px;">
                    <h3 style="color: #2c3e50; margin-bottom: 10px;">💡 Рекомендации</h3>
                    <p>${result.recommendations || 'Персональные рекомендации...'}</p>
                </div>
                <div class="result-section" style="margin-bottom: 20px;">
                    <h3 style="color: #2c3e50; margin-bottom: 10px;">🌟 Оценка</h3>
                    <p>${result.rating || 'Общая оценка образа...'}</p>
                </div>
                ${modeLabel}
            </div>
        `;
    }
    
    function formatComparisonResult(result) {
        const modeLabel = result.mode === 'mock' ? '<p style="color: #7f8c8d; font-size: 0.9em; margin-top: 20px;">📝 Демонстрационный режим</p>' : '';
        
        return `
            <div class="comparison-result" style="padding: 20px; line-height: 1.6;">
                <div class="result-section" style="margin-bottom: 20px;">
                    <h3 style="color: #2c3e50; margin-bottom: 10px;">🏆 Лучший образ</h3>
                    <p>${result.best_outfit || 'Определение лучшего образа...'}</p>
                </div>
                <div class="result-section" style="margin-bottom: 20px;">
                    <h3 style="color: #2c3e50; margin-bottom: 10px;">📊 Сравнительный анализ</h3>
                    <p style="white-space: pre-line;">${result.comparison || 'Детальное сравнение образов...'}</p>
                </div>
                <div class="result-section" style="margin-bottom: 20px;">
                    <h3 style="color: #2c3e50; margin-bottom: 10px;">💡 Рекомендации по улучшению</h3>
                    <p style="white-space: pre-line;">${result.improvement_tips || 'Советы по улучшению образов...'}</p>
                </div>
                ${modeLabel}
            </div>
        `;
    }
    
    function showResultModal(title, content) {
        let resultModal = document.getElementById('result-modal');
        if (!resultModal) {
            resultModal = document.createElement('div');
            resultModal.id = 'result-modal';
            resultModal.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                    <div style="background: white; border-radius: 12px; max-width: 700px; max-height: 80vh; overflow-y: auto; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                        <div style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; border-radius: 12px 12px 0 0;">
                            <h2 id="result-title" style="margin: 0; color: #2c3e50;"></h2>
                            <button onclick="document.getElementById('result-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #7f8c8d; padding: 0;">✕</button>
                        </div>
                        <div id="result-content"></div>
                        <div style="padding: 20px; border-top: 1px solid #eee; text-align: right; background: #f8f9fa; border-radius: 0 0 12px 12px;">
                            <button onclick="document.getElementById('result-modal').remove()" style="background: #3498db; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px;">Закрыть</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(resultModal);
        }
        
        document.getElementById('result-title').textContent = title;
        document.getElementById('result-content').innerHTML = content;
    }
    
    // Публичный API
    function openConsultationModal(mode = 'single') {
        logger.info("Consultation: вызов openConsultationModal()");
        currentMode = mode;
        
        if (modalManager) {
            modalManager.openModal('consultation-overlay');
        } else {
            const modal = document.querySelector('#consultation-overlay');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'block';
            }
        }
        
        // Обновляем состояние кнопок и восстанавливаем обработчики
        setTimeout(() => {
            updateSubmitButtonState();
            setupButtonHandlers();
        }, 200);
    }
    
    function getCurrentMode() {
        return currentMode;
    }

    function handleConsultationSubmit() {
        const mode = getCurrentMode();
        if (mode === 'compare') {
            handleCompareConsultationSubmit();
        } else {
            handleSingleConsultationSubmit();
        }
    }
    
    return {
        init,
        openConsultationModal,
        updateSubmitButtonState,
        setupButtonHandlers,
        isInitialized: () => isConsultationInitialized
    };
})();