/**
 * Модуль консультаций - обработка запросов к API
 */

import { Logger } from './logger.js';
import { ApiService } from './api.js';

const logger = new Logger('Consultation');

export class ConsultationModule {
    constructor() {
        this.apiService = null;
        this.currentMode = 'single';
        this.uploadedImages = new Map();
        this.compareImages = new Map();
        this.singleImage = null;
        this.submitHandler = null;
        this.cancelHandlers = [];
        this.isInitialized = false;
    }

    async init() {
        try {
            logger.debug('⏳ Проверка http://localhost:8001/api/v1...');
            const response = await fetch('http://localhost:8001/api/v1/health');
            if (response.ok) {
                logger.info('✅ Локальный API найден на порту 8001');
                this.apiService = new ApiService('http://localhost:8001/api/v1');
                await this.apiService.init();
                logger.info('✅ Реальный API подключен');
                this.setupEventHandlers();
                this.isInitialized = true;
                logger.info('✅ Модуль консультаций готов к работе');
                return;
            }
        } catch (error) {
            logger.debug('❌ http://localhost:8001/api/v1 недоступен:', error.message);
        }

        try {
            logger.debug('⏳ Проверка http://localhost:8000/api/v1...');
            const response = await fetch('http://localhost:8000/api/v1/health');
            if (response.ok) {
                logger.info('✅ Локальный API найден на порту 8000');
                this.apiService = new ApiService('http://localhost:8000/api/v1');
                await this.apiService.init();
                logger.info('✅ Реальный API подключен');
                this.setupEventHandlers();
                this.isInitialized = true;
                logger.info('✅ Модуль консультаций готов к работе');
                return;
            }
        } catch (error) {
            logger.debug('❌ http://localhost:8000/api/v1 недоступен:', error.message);
        }

        try {
            logger.debug('⏳ Проверка https://style-ai-bot.onrender.com/api/v1...');
            const response = await fetch('https://style-ai-bot.onrender.com/api/v1/health');
            if (response.ok) {
                const data = await response.json();
                logger.info('✅ API найден: https://style-ai-bot.onrender.com/api/v1', data);
                this.apiService = new ApiService('https://style-ai-bot.onrender.com/api/v1');
                await this.apiService.init();
                logger.info('✅ Реальный API подключен');
                this.setupEventHandlers();
                this.isInitialized = true;
                logger.info('✅ Модуль консультаций готов к работе');
                return;
            }
        } catch (error) {
            logger.debug('❌ https://style-ai-bot.onrender.com/api/v1 недоступен:', error.message);
        }

        logger.warn('⚠️ API сервер недоступен, используются mock данные');
        this.setupEventHandlers();
        this.isInitialized = true;
        logger.info('✅ Модуль консультаций готов к работе (mock режим)');
    }

    async analyzeImage(imageData, imageName, occasion, preferences) {
        const apiBaseUrl = this.apiService ? this.apiService.baseUrl : null;
        
        if (!apiBaseUrl) {
            logger.warn('🔄 Переключение на mock данные');
            return this.getMockAnalysisResult();
        }

        try {
            logger.info('📸 Анализ изображения через API');
            
            const formData = new FormData();
            
            const blob = this.dataURLtoBlob(imageData);
            formData.append('image', blob, imageName);
            formData.append('occasion', occasion || '');
            formData.append('preferences', preferences || '');
            formData.append('analysis_type', 'single');

            const response = await fetch(`${apiBaseUrl}/analyze`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            logger.info('✅ Анализ получен от API');
            return result;

        } catch (error) {
            logger.error('❌ Ошибка API анализа:', error);
            logger.warn('🔄 Переключение на mock данные');
            logger.info('🎭 Mock анализ изображения');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return this.getMockAnalysisResult();
        }
    }

    async compareImages(images, occasion, preferences) {
        const apiBaseUrl = this.apiService ? this.apiService.baseUrl : null;
        
        if (!apiBaseUrl) {
            logger.warn('🔄 Переключение на mock данные');
            return this.getMockComparisonResult();
        }

        try {
            logger.info('🔍 Сравнение изображений через API');
            
            const formData = new FormData();
            
            images.forEach((imageData, index) => {
                const blob = this.dataURLtoBlob(imageData.data);
                formData.append('images', blob, imageData.name);
            });
            
            formData.append('occasion', occasion || '');
            formData.append('preferences', preferences || '');
            formData.append('analysis_type', 'compare');

            const response = await fetch(`${apiBaseUrl}/analyze`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            logger.info('✅ Сравнение получено от API');
            return result;

        } catch (error) {
            logger.error('❌ Ошибка API сравнения:', error);
            logger.warn('🔄 Переключение на mock данные');
            logger.info('🎭 Mock сравнение изображений');
            await new Promise(resolve => setTimeout(resolve, 3000));
            return this.getMockComparisonResult();
        }
    }

    dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    getMockAnalysisResult() {
        return {
            analysis: {
                style: "Элегантный вечерний стиль",
                colors: ["Черный", "Золотой", "Серебряный"],
                occasion_fit: 95,
                recommendations: [
                    "Отличный выбор для вечернего мероприятия",
                    "Рекомендуем добавить аксессуары золотого цвета",
                    "Подходящая обувь: классические туфли на каблуке"
                ],
                overall_score: 92
            },
            status: "success"
        };
    }

    getMockComparisonResult() {
        return {
            comparison: {
                best_choice: {
                    index: 0,
                    reason: "Лучше всего подходит для данного случая"
                },
                analysis: [
                    {
                        style: "Классический деловой",
                        score: 95,
                        pros: ["Элегантность", "Универсальность"],
                        cons: ["Может быть слишком формальным"]
                    },
                    {
                        style: "Повседневный шик",
                        score: 78,
                        pros: ["Комфорт", "Стильность"],
                        cons: ["Менее подходит для официальных мероприятий"]
                    }
                ],
                recommendations: [
                    "Первый образ лучше подходит для вечеринки",
                    "Добавьте яркие аксессуары к первому образу",
                    "Второй образ больше подходит для дневных мероприятий"
                ]
            },
            status: "success"
        };
    }

    setupEventHandlers() {
        document.addEventListener('consultationSubmit', this.handleConsultationSubmit.bind(this));
        document.addEventListener('consultationCancel', this.handleConsultationCancel.bind(this));
        document.addEventListener('modeChanged', this.handleModeChange.bind(this));
        document.addEventListener('singleImageUploaded', this.handleSingleImageUploaded.bind(this));
        document.addEventListener('singleImageRemoved', this.handleSingleImageRemoved.bind(this));
        document.addEventListener('compareImageUploaded', this.handleCompareImageUploaded.bind(this));
        document.addEventListener('compareImageRemoved', this.handleCompareImageRemoved.bind(this));
        
        this.setupSubmitHandler();
        this.setupCancelHandlers();
        logger.debug('🔧 Настройка обработчиков кнопок консультации');
        logger.debug('✅ Обработчик consultation submit установлен');
        logger.debug(`✅ ${this.cancelHandlers.length} обработчиков отмены установлено`);
    }

    setupSubmitHandler() {
        const form = document.getElementById('consultation-form');
        if (form) {
            if (this.submitHandler) {
                form.removeEventListener('submit', this.submitHandler);
            }
            
            this.submitHandler = (e) => {
                e.preventDefault();
                
                const mode = form.dataset.mode || this.currentMode;
                logger.info(`🚀 Обработчик submit формы, режим '${mode}'`);
                
                document.dispatchEvent(new CustomEvent('consultationSubmit', {
                    detail: { mode }
                }));
            };
            
            form.addEventListener('submit', this.submitHandler);
        }
    }

    setupCancelHandlers() {
        this.cancelHandlers.forEach(({ element, handler }) => {
            element.removeEventListener('click', handler);
        });
        this.cancelHandlers = [];

        const cancelButtons = document.querySelectorAll('.modal-close, .cancel-consultation');
        cancelButtons.forEach(button => {
            const handler = () => {
                document.dispatchEvent(new CustomEvent('consultationCancel'));
            };
            
            button.addEventListener('click', handler);
            this.cancelHandlers.push({ element: button, handler });
        });
    }

    async handleConsultationSubmit(event) {
        const { mode } = event.detail;
        
        if (mode === 'single') {
            await this.handleSingleConsultationSubmit();
        } else if (mode === 'compare') {
            await this.handleCompareConsultationSubmit();
        }
    }

    async handleSingleConsultationSubmit() {
        if (!this.singleImage) {
            logger.warn('❌ Нет изображения для анализа');
            return;
        }

        const submitButton = document.querySelector('#consultation-submit');
        const loadingIndicator = document.querySelector('.loading-indicator');
        
        if (submitButton) {
            submitButton.disabled = true;
            logger.debug('Consultation: Кнопка submit (single mode) деактивирована');
        }
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            logger.debug('Показан индикатор загрузки');
        }

        try {
            const occasionSelect = document.getElementById('occasion');
            const preferencesInput = document.getElementById('preferences');
            
            const occasion = occasionSelect ? occasionSelect.value : '';
            const preferences = preferencesInput ? preferencesInput.value : '';
            
            logger.debug('Отправка на анализ:', {
                imageSize: this.singleImage.data.length,
                imageName: this.singleImage.name,
                occasion,
                preferences
            });

            const result = await this.analyzeImage(
                this.singleImage.data,
                this.singleImage.name,
                occasion,
                preferences
            );

            this.displayAnalysisResult(result);

        } catch (error) {
            logger.error('❌ Ошибка при отправке на анализ:', error);
            this.displayError('Произошла ошибка при анализе изображения');
        } finally {
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
                logger.debug('Скрыт индикатор загрузки');
            }
            
            if (submitButton) {
                submitButton.disabled = false;
                logger.debug('Consultation: Кнопка submit (single mode) активирована');
            }
        }
    }

    async handleCompareConsultationSubmit() {
        if (this.compareImages.size < 2) {
            logger.warn('❌ Недостаточно изображений для сравнения');
            return;
        }

        const submitButton = document.querySelector('#consultation-submit');
        const loadingIndicator = document.querySelector('.loading-indicator');
        
        if (submitButton) {
            submitButton.disabled = true;
            logger.debug(`Consultation: Кнопка submit (compare mode) деактивирована (изображений: ${this.compareImages.size})`);
        }
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            logger.debug('Показан индикатор загрузки');
        }

        try {
            const occasionSelect = document.getElementById('occasion');
            const preferencesInput = document.getElementById('preferences');
            
            const occasion = occasionSelect ? occasionSelect.value : '';
            const preferences = preferencesInput ? preferencesInput.value : '';
            
            logger.debug('Отправка на сравнение:', {
                imageCount: this.compareImages.size,
                occasion,
                preferences
            });

            const images = Array.from(this.compareImages.values());
            const result = await this.compareImages(images, occasion, preferences);

            this.displayComparisonResult(result);

        } catch (error) {
            logger.error('❌ Ошибка при отправке на сравнение:', error);
            this.displayError('Произошла ошибка при сравнении изображений');
        } finally {
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
                logger.debug('Скрыт индикатор загрузки');
            }
            
            if (submitButton) {
                submitButton.disabled = false;
                logger.debug(`Consultation: Кнопка submit (compare mode) активирована (изображений: ${this.compareImages.size})`);
            }
        }
    }

    handleConsultationCancel() {
        logger.debug('Отмена консультации');
        this.closeModal();
    }

    handleModeChange(event) {
        const { mode } = event.detail;
        this.currentMode = mode;
        
        logger.debug(`Consultation (event modeChanged): режим ${mode}. Обновление кнопки.`);
        this.updateSubmitButton();
    }

    handleSingleImageUploaded(event) {
        const { imageData, imageName } = event.detail;
        this.singleImage = { data: imageData, name: imageName };
        
        logger.debug(`Consultation (event singleImageUploaded): Изображение загружено, файл ${imageName}`);
        this.updateSubmitButton();
    }

    handleSingleImageRemoved(event) {
        this.singleImage = null;
        
        logger.debug('Consultation (event singleImageRemoved): Изображение для одиночного анализа удалено.');
        this.updateSubmitButton();
    }

    handleCompareImageUploaded(event) {
        const { slot, imageData, imageName } = event.detail;
        this.compareImages.set(slot, { data: imageData, name: imageName });
        
        logger.debug(`Consultation (event compareImageUploaded): Изображение загружено в слот ${slot}, файл ${imageName}`);
        this.updateSubmitButton();
    }

    handleCompareImageRemoved(event) {
        const { slot } = event.detail;
        this.compareImages.delete(slot);
        
        logger.debug(`Consultation (event compareImageRemoved): Изображение удалено из слота ${slot}`);
        this.updateSubmitButton();
    }

    updateSubmitButton() {
        const submitButton = document.querySelector('#consultation-submit');
        if (!submitButton) return;

        if (this.currentMode === 'single') {
            const hasImage = this.singleImage !== null;
            submitButton.disabled = !hasImage;
            
            if (hasImage) {
                logger.debug('Consultation: Кнопка submit (single mode) активирована');
            } else {
                logger.debug('Consultation: Кнопка submit (single mode) деактивирована');
            }
        } else if (this.currentMode === 'compare') {
            const imageCount = this.compareImages.size;
            const hasEnoughImages = imageCount >= 2;
            submitButton.disabled = !hasEnoughImages;
            
            if (hasEnoughImages) {
                logger.debug(`Consultation: Кнопка submit (compare mode) активирована (изображений: ${imageCount})`);
            } else {
                logger.debug(`Consultation: Кнопка submit (compare mode) деактивирована (изображений: ${imageCount})`);
            }
        }
    }

    displayAnalysisResult(result) {
        logger.info('Отображение результата анализа');
        
        const resultContainer = document.querySelector('.consultation-result');
        if (!resultContainer) {
            logger.error('❌ Контейнер результатов не найден');
            return;
        }

        const analysis = result.analysis || {};
        
        const html = `
            <div class="analysis-result">
                <h3>📊 Анализ образа</h3>
                <div class="result-section">
                    <h4>🎨 Стиль</h4>
                    <p>${analysis.style || 'Не определен'}</p>
                </div>
                <div class="result-section">
                    <h4>🌈 Цвета</h4>
                    <p>${(analysis.colors || []).join(', ') || 'Не определены'}</p>
                </div>
                <div class="result-section">
                    <h4>🎯 Соответствие случаю</h4>
                    <p>${analysis.occasion_fit || 0}%</p>
                </div>
                <div class="result-section">
                    <h4>💡 Рекомендации</h4>
                    <ul>
                        ${(analysis.recommendations || []).map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                <div class="result-section">
                    <h4>⭐ Общая оценка</h4>
                    <p>${analysis.overall_score || 0}/100</p>
                </div>
            </div>
        `;
        
        resultContainer.innerHTML = html;
        resultContainer.style.display = 'block';
    }

    displayComparisonResult(result) {
        logger.info('Отображение результата сравнения');
        
        const resultContainer = document.querySelector('.consultation-result');
        if (!resultContainer) {
            logger.error('❌ Контейнер результатов не найден');
            return;
        }

        const comparison = result.comparison || {};
        const bestChoice = comparison.best_choice || {};
        const analysis = comparison.analysis || [];
        
        const html = `
            <div class="comparison-result">
                <h3>🔍 Сравнение образов</h3>
                <div class="result-section">
                    <h4>🏆 Лучший выбор</h4>
                    <p>Образ ${(bestChoice.index || 0) + 1}: ${bestChoice.reason || 'Не указано'}</p>
                </div>
                <div class="result-section">
                    <h4>📊 Анализ образов</h4>
                    ${analysis.map((item, index) => `
                        <div class="outfit-analysis">
                            <h5>Образ ${index + 1} - ${item.style || 'Не определен'}</h5>
                            <p><strong>Оценка:</strong> ${item.score || 0}/100</p>
                            <p><strong>Плюсы:</strong> ${(item.pros || []).join(', ')}</p>
                            <p><strong>Минусы:</strong> ${(item.cons || []).join(', ')}</p>
                        </div>
                    `).join('')}
                </div>
                <div class="result-section">
                    <h4>💡 Рекомендации</h4>
                    <ul>
                        ${(comparison.recommendations || []).map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        resultContainer.innerHTML = html;
        resultContainer.style.display = 'block';
    }

    displayError(message) {
        const resultContainer = document.querySelector('.consultation-result');
        if (!resultContainer) return;

        resultContainer.innerHTML = `
            <div class="error-result">
                <h3>❌ Ошибка</h3>
                <p>${message}</p>
            </div>
        `;
        resultContainer.style.display = 'block';
    }

    closeModal() {
        const modal = document.getElementById('consultation-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        this.singleImage = null;
        this.compareImages.clear();
        
        const resultContainer = document.querySelector('.consultation-result');
        if (resultContainer) {
            resultContainer.style.display = 'none';
            resultContainer.innerHTML = '';
        }
    }

    openConsultationModal(mode = 'single') {
        logger.info('Consultation: вызов openConsultationModal()');
        
        const modal = document.getElementById('consultation-modal');
        if (!modal) {
            logger.error('❌ Модальное окно консультации не найдено');
            return;
        }

        this.currentMode = mode;
        modal.style.display = 'flex';
        
        const form = document.getElementById('consultation-form');
        if (form) {
            form.dataset.mode = mode;
        }
        
        document.dispatchEvent(new CustomEvent('modeChanged', {
            detail: { mode }
        }));
        
        this.setupSubmitHandler();
        this.setupCancelHandlers();
        this.updateSubmitButton();
    }
}