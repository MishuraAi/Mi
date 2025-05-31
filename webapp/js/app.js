/**
 * МИШУРА - ИИ Стилист
 * Главный файл приложения (app.js)
 * Версия: 2.0.0 (ИСПРАВЛЕНЫ ОШИБКИ СРАВНЕНИЯ)
 * Дата: 2025-05-31
 */

class MishuraApp {
    constructor() {
        this.currentMode = null;
        this.singleImage = null;
        this.compareImages = new Array(4).fill(null);
        this.minCompareImages = 2;
        
        this.logger = new Logger('MishuraApp');
        this.api = new MishuraAPI();
        
        this.initializeApp();
    }

    initializeApp() {
        this.logger.info('🚀 Инициализация приложения МИШУРА');
        
        // Основные кнопки режимов
        document.getElementById('single-mode-btn').addEventListener('click', () => {
            this.logger.info('Нажата кнопка анализа одного образа (single mode)');
            this.openConsultationModal('single');
        });
        
        document.getElementById('compare-mode-btn').addEventListener('click', () => {
            this.logger.info('Нажата кнопка сравнения образов (compare mode)');
            this.openConsultationModal('compare');
        });

        // Кнопки закрытия модального окна
        document.getElementById('consultation-cancel').addEventListener('click', () => {
            this.closeConsultationModal();
        });
        
        document.getElementById('form-cancel').addEventListener('click', () => {
            this.closeConsultationModal();
        });

        // Кнопка отправки формы
        document.getElementById('form-submit').addEventListener('click', () => {
            this.submitConsultation();
        });

        // Закрытие по клику на overlay
        document.getElementById('consultation-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'consultation-overlay') {
                this.closeConsultationModal();
            }
        });

        this.logger.info('✅ Приложение инициализировано');
    }

    openConsultationModal(mode) {
        this.logger.info(`🚀 Открытие модального окна консультации в режиме: ${mode}`);
        
        this.currentMode = mode;
        this.resetForm();
        
        // Открываем модальное окно
        const overlay = document.getElementById('consultation-overlay');
        overlay.classList.add('active');
        
        // Устанавливаем заголовок
        const title = document.getElementById('modal-title');
        if (mode === 'single') {
            title.textContent = 'Анализ одного образа';
        } else {
            title.textContent = 'Сравнение образов';
        }
        
        // Переключаем режимы
        this.switchMode(mode);
        
        // Инициализируем обработчики загрузки
        this.initializeUploadHandlers();
    }

    closeConsultationModal() {
        this.logger.debug('🔒 Закрытие модального окна консультации');
        
        const overlay = document.getElementById('consultation-overlay');
        overlay.classList.remove('active');
        
        // Сбрасываем состояние
        this.resetForm();
    }

    switchMode(mode) {
        this.logger.debug(`Смена режима на: ${mode}`);
        
        // Скрываем все режимы
        document.getElementById('single-mode').classList.remove('active');
        document.getElementById('compare-mode').classList.remove('active');
        
        // Показываем нужный режим
        document.getElementById(`${mode}-mode`).classList.add('active');
        
        // Сбрасываем данные предыдущего режима
        if (mode === 'single') {
            this.resetCompareMode();
        } else {
            this.resetSingleMode();
        }
        
        this.updateSubmitButton();
        this.logger.debug(`Режим изменен на: ${mode}`);
    }

    resetForm() {
        // Сбрасываем изображения
        this.singleImage = null;
        this.compareImages = new Array(4).fill(null);
        
        // Сбрасываем форму
        document.getElementById('occasion').value = '';
        document.getElementById('preferences').value = '';
        
        // Скрываем результат и форму
        document.getElementById('consultation-form').classList.remove('active');
        document.getElementById('result').classList.remove('active');
        document.getElementById('loading').classList.remove('active');
        
        this.updateSubmitButton();
    }

    resetSingleMode() {
        this.logger.debug('Сброс single режима');
        this.singleImage = null;
        
        const preview = document.getElementById('single-preview');
        const uploadText = document.getElementById('single-upload-text');
        const uploadArea = document.getElementById('single-upload-area');
        
        preview.innerHTML = '';
        uploadText.textContent = 'Нажмите или перетащите фото одежды';
        uploadArea.classList.remove('has-image');
        
        this.logger.debug('Single изображение удалено');
        this.updateSubmitButton();
    }

    resetCompareMode() {
        this.logger.debug('Сброс compare режима');
        this.compareImages = new Array(4).fill(null);
        
        // Сбрасываем все слоты
        for (let i = 0; i < 4; i++) {
            const slot = document.querySelector(`[data-slot="${i}"]`);
            slot.innerHTML = `
                <span class="slot-number">${i + 1}</span>
                <span class="add-icon">+</span>
            `;
            slot.classList.remove('has-image');
        }
        
        this.logger.debug('Compare изображения удалены');
        this.updateSubmitButton();
    }

    initializeUploadHandlers() {
        this.logger.debug('Инициализация обработчиков загрузки');
        
        if (this.currentMode === 'single') {
            this.initializeSingleMode();
        } else if (this.currentMode === 'compare') {
            this.initializeCompareMode();
        }
    }

    initializeSingleMode() {
        this.logger.debug('Инициализация single режима');
        
        const uploadArea = document.getElementById('single-upload-area');
        const fileInput = document.getElementById('single-file-input');
        
        // Клик по области загрузки
        uploadArea.addEventListener('click', () => {
            this.logger.debug('🖱️ Клик по области single загрузки');
            fileInput.click();
        });
        
        // Обработка выбора файла
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleSingleImageUpload(e.target.files[0]);
            }
        });
        
        // Drag & Drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4facfe';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#ddd';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#ddd';
            
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                this.handleSingleImageUpload(e.dataTransfer.files[0]);
            }
        });
        
        this.logger.debug('✅ Single режим инициализирован');
    }

    initializeCompareMode() {
        this.logger.debug('Инициализация compare режима');
        
        const slots = document.querySelectorAll('.compare-slot');
        this.logger.debug(`Compare режим: найдено ${slots.length} слотов`);
        
        slots.forEach((slot, index) => {
            const fileInput = document.getElementById(`compare-file-input-${index}`);
            
            // Клик по слоту
            slot.addEventListener('click', () => {
                this.logger.debug(`🖱️ Клик по слоту ${index}`);
                fileInput.click();
            });
            
            // Обработка выбора файла
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleCompareImageUpload(e.target.files[0], index);
                }
            });
            
            // Drag & Drop для слотов
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.style.borderColor = '#43e97b';
            });
            
            slot.addEventListener('dragleave', (e) => {
                e.preventDefault();
                slot.style.borderColor = '#ddd';
            });
            
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.style.borderColor = '#ddd';
                
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    this.handleCompareImageUpload(e.dataTransfer.files[0], index);
                }
            });
        });
        
        this.logger.debug('✅ Compare режим инициализирован');
    }

    handleSingleImageUpload(file) {
        this.logger.debug(`Single файл выбран: ${file.name}`);
        
        if (!this.validateImageFile(file)) {
            return;
        }
        
        this.singleImage = file;
        
        // Показываем превью
        const preview = document.getElementById('single-preview');
        const uploadText = document.getElementById('single-upload-text');
        const uploadArea = document.getElementById('single-upload-area');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" class="image-preview" alt="Превью">`;
            uploadText.textContent = `Выбрано: ${file.name}`;
            uploadArea.classList.add('has-image');
            
            // Показываем форму
            this.showConsultationForm();
            
            this.logger.debug(`Single изображение загружено: ${file.name}`);
            this.updateSubmitButton();
        };
        reader.readAsDataURL(file);
    }

    handleCompareImageUpload(file, slotIndex) {
        this.logger.debug(`Compare файл выбран для слота ${slotIndex}: ${file.name}`);
        
        if (!this.validateImageFile(file)) {
            return;
        }
        
        this.compareImages[slotIndex] = file;
        
        // Показываем превью в слоте
        const slot = document.querySelector(`[data-slot="${slotIndex}"]`);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            slot.innerHTML = `
                <span class="slot-number">${slotIndex + 1}</span>
                <img src="${e.target.result}" alt="Превью ${slotIndex + 1}">
            `;
            slot.classList.add('has-image');
            
            this.logger.debug(`Compare изображение загружено в слот ${slotIndex}: ${file.name}`);
            
            // Проверяем, достаточно ли изображений для показа формы
            const uploadedCount = this.compareImages.filter(img => img !== null).length;
            if (uploadedCount >= this.minCompareImages) {
                this.showConsultationForm();
            }
            
            this.updateSubmitButton();
        };
        reader.readAsDataURL(file);
    }

    validateImageFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (!allowedTypes.includes(file.type)) {
            alert('Пожалуйста, выберите изображение в формате JPG, PNG или WebP');
            return false;
        }
        
        if (file.size > maxSize) {
            alert('Размер файла не должен превышать 10MB');
            return false;
        }
        
        return true;
    }

    showConsultationForm() {
        this.logger.debug('Показ формы консультации');
        document.getElementById('consultation-form').classList.add('active');
    }

    updateSubmitButton() {
        const submitBtn = document.getElementById('form-submit');
        let canSubmit = false;
        
        if (this.currentMode === 'single') {
            canSubmit = this.singleImage !== null;
        } else if (this.currentMode === 'compare') {
            const uploadedCount = this.compareImages.filter(img => img !== null).length;
            canSubmit = uploadedCount >= this.minCompareImages;
        }
        
        submitBtn.disabled = !canSubmit;
        
        const status = canSubmit ? 'активирована' : 'деактивирована';
        this.logger.debug(`Кнопка отправки: ${status}`);
    }

    async submitConsultation() {
        this.logger.info('🚀 Отправка запроса на консультацию');
        
        const occasion = document.getElementById('occasion').value.trim();
        const preferences = document.getElementById('preferences').value.trim();
        
        if (!occasion) {
            alert('Пожалуйста, укажите повод/мероприятие');
            return;
        }
        
        // Показываем загрузку
        this.showLoading();
        
        try {
            let result;
            
            if (this.currentMode === 'single') {
                this.logger.info('Отправка single анализа');
                result = await this.api.analyzeSingle(this.singleImage, occasion, preferences);
            } else {
                const images = this.compareImages.filter(img => img !== null);
                this.logger.info(`Отправка compare анализа с ${images.length} изображениями`);
                result = await this.api.analyzeCompare(images, occasion, preferences);
            }
            
            this.showResult(result);
            this.logger.info('✅ Консультация успешно получена');
            
        } catch (error) {
            this.logger.error('❌ Ошибка при получении консультации:', error);
            this.showError(error.message);
        }
    }

    showLoading() {
        document.getElementById('loading').classList.add('active');
        document.getElementById('consultation-form').classList.remove('active');
        document.getElementById('result').classList.remove('active');
    }

    showResult(result) {
        document.getElementById('loading').classList.remove('active');
        document.getElementById('consultation-form').classList.remove('active');
        
        const resultSection = document.getElementById('result');
        const resultContent = document.getElementById('result-content');
        
        if (result.status === 'success') {
            resultContent.innerHTML = this.formatAdvice(result.advice);
        } else {
            resultContent.innerHTML = `<p style="color: #e74c3c;">Ошибка: ${result.message}</p>`;
        }
        
        resultSection.classList.add('active');
    }

    showError(message) {
        document.getElementById('loading').classList.remove('active');
        
        const resultSection = document.getElementById('result');
        const resultContent = document.getElementById('result-content');
        
        resultContent.innerHTML = `
            <p style="color: #e74c3c; font-weight: 600;">Произошла ошибка:</p>
            <p style="color: #666;">${message}</p>
            <p style="color: #666; font-size: 0.9rem; margin-top: 15px;">
                Попробуйте еще раз или обратитесь в поддержку.
            </p>
        `;
        
        resultSection.classList.add('active');
    }

    formatAdvice(advice) {
        // Простое форматирование текста
        return advice
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            .replace(/💡 Совет от МИШУРЫ:/g, '<strong>💡 Совет от МИШУРЫ:</strong>');
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('App.js: DOM загружен, инициализация приложения');
    window.mishuraApp = new MishuraApp();
});