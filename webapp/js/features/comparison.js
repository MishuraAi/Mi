// comparison.js - Полная версия с исправлениями
class ComparisonModule {
    constructor() {
        this.apiService = null;
        this.maxRetries = 4;
        this.retryDelay = 500;
        this.currentRetry = 0;
        this.isInitialized = false;
        
        // Логгер
        this.logger = window.Logger || console;
    }

    async init(apiService) {
        this.apiService = apiService;
        this.logger.info('🔄 Инициализация модуля сравнения...');
        
        // Пытаемся инициализировать с повторными попытками
        await this.initializeWithRetry();
    }

    async initializeWithRetry() {
        this.currentRetry++;
        this.logger.debug(`🔄 Попытка инициализации ${this.currentRetry}/${this.maxRetries} (задержка ${this.retryDelay}мс)`);
        
        if (await this.initializeSlots()) {
            this.isInitialized = true;
            this.logger.info('✅ Модуль сравнения успешно инициализирован');
            return;
        }
        
        if (this.currentRetry < this.maxRetries) {
            setTimeout(() => this.initializeWithRetry(), this.retryDelay);
            this.retryDelay *= 2; // Увеличиваем задержку
        } else {
            this.logger.error('❌ Не удалось инициализировать модуль сравнения после всех попыток');
        }
    }

    async initializeSlots() {
        this.logger.debug('🔍 DEBUG: Поиск слотов в модальном окне...');
        
        const modal = document.getElementById('consultation-overlay');
        if (!modal) {
            this.logger.debug('❌ Модальное окно не найдено');
            return false;
        }
        this.logger.debug('✅ Модальное окно найдено');

        const compareSection = modal.querySelector('#compare-analysis-mode');
        if (!compareSection) {
            this.logger.debug('❌ Секция сравнения не найдена');
            return false;
        }
        this.logger.debug('✅ Секция сравнения найдена');

        const isVisible = compareSection.offsetParent !== null;
        this.logger.debug(`📋 Секция сравнения видима: ${isVisible}`);

        const slots = compareSection.querySelectorAll('.image-slot');
        this.logger.debug(`🔍 Найдено ${slots.length} слотов в секции сравнения`);

        if (slots.length === 0) {
            return false;
        }

        // Проверяем каждый слот и инициализируем
        let successCount = 0;
        slots.forEach((slot, index) => {
            if (this.setupSlot(slot, index)) {
                successCount++;
            }
        });

        if (successCount > 0) {
            this.logger.info(`✅ Инициализировано ${successCount} слотов в модальном окне`);
            return true;
        }

        return false;
    }

    setupSlot(slot, index) {
        const input = slot.querySelector('input[type="file"]');
        const previewImg = slot.querySelector('.preview-image');
        const uploadIcon = slot.querySelector('.upload-icon');

        this.logger.debug(`🔧 Слот ${index}: input=${!!input}, preview=${!!previewImg}, icon=${!!uploadIcon}`);

        if (previewImg) {
            this.logger.debug(`  📸 Превью элемент: tagName=${previewImg.tagName}, className="${previewImg.className}", style.display="${previewImg.style.display}"`);
        }

        if (!input) {
            this.logger.debug(`❌ Input не найден для слота ${index}`);
            return false;
        }

        if (!previewImg) {
            this.logger.debug(`🆕 Превью-элемент создан для слота ${index}`);
            const newPreviewImg = document.createElement('img');
            newPreviewImg.className = 'preview-image';
            newPreviewImg.style.display = 'none';
            slot.appendChild(newPreviewImg);
        }

        this.logger.debug(`🔧 Инициализация слота ${index}...`);
        this.logger.debug(`🔧 DEBUG: Настройка слота ${index}`);

        // Настраиваем input с правильными стилями
        input.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            opacity: 0 !important;
            cursor: pointer !important;
            z-index: 10 !important;
            pointer-events: auto !important;
        `;

        // Убеждаемся что атрибуты правильные
        input.accept = 'image/*';
        input.disabled = false;

        // Очищаем старые обработчики и создаем новые
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        // Добавляем обработчик изменения файла
        newInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.logger.debug(`Compare файл выбран для слота ${index}: ${file.name}`);
                this.handleFileSelection(index, file, slot);
            }
        });

        // Обработчик клика по слоту
        slot.addEventListener('click', (e) => {
            // Предотвращаем двойной клик если клик был по input
            if (e.target === newInput) return;
            
            this.logger.debug(`🖱️ Клик по видимой кнопке слота ${index}`);
            this.logger.debug(`🖱️ Клик по слоту ${index}`);
            this.logger.debug(`📂 Открываем файловый диалог для слота ${index}`);
            newInput.click();
        });

        const currentInput = slot.querySelector('input[type="file"]');
        const currentPreview = slot.querySelector('.preview-image');
        const currentIcon = slot.querySelector('.upload-icon');

        this.logger.debug(`  Слот ${index}: input=${!!currentInput}, preview=${!!currentPreview}, icon=${!!currentIcon}`);
        this.logger.debug(`✅ Слот ${index} настроен`);

        return true;
    }

    handleFileSelection(slotIndex, file, slot) {
        this.logger.debug(`Обработка compare изображения для слота ${slotIndex}: ${file.name}`);
        
        if (!file.type.startsWith('image/')) {
            this.logger.error(`Неподдерживаемый тип файла: ${file.type}`);
            return;
        }

        // Показываем превью
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImg = slot.querySelector('.preview-image');
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                slot.classList.add('filled');
                this.logger.debug(`✅ Превью установлено для слота ${slotIndex}`);
                
                // Показываем элементы формы если загружено хотя бы одно изображение
                this.showFormElements();
                
                // Отправляем событие о загрузке изображения
                this.notifyImageUploaded(slotIndex, file);
            }
        };
        
        reader.onerror = () => {
            this.logger.error(`Ошибка чтения файла для слота ${slotIndex}`);
        };
        
        reader.readAsDataURL(file);
    }

    showFormElements() {
        const formElements = document.querySelector('.consultation-form-elements');
        if (formElements) {
            formElements.style.display = 'block';
            this.logger.debug('Элементы формы показаны');
        }
    }

    notifyImageUploaded(slotIndex, file) {
        // Создаем событие для других модулей
        const event = new CustomEvent('compareImageUploaded', {
            detail: { slotIndex, file }
        });
        document.dispatchEvent(event);
        
        this.logger.debug(`Consultation (event compareImageUploaded): Изображение загружено в слот ${slotIndex}, файл ${file.name}`);
    }

    // Метод для получения загруженных изображений
    getUploadedImages() {
        const modal = document.getElementById('consultation-overlay');
        if (!modal) return [];
        
        const slots = modal.querySelectorAll('#compare-analysis-mode .image-slot');
        const images = [];

        slots.forEach((slot, index) => {
            const previewImg = slot.querySelector('.preview-image');
            const input = slot.querySelector('input[type="file"]');
            
            if (previewImg && previewImg.src && previewImg.style.display !== 'none' && input && input.files[0]) {
                images.push({
                    slot: index,
                    file: input.files[0],
                    preview: previewImg.src
                });
            }
        });

        return images;
    }

    // Метод для очистки слота
    clearSlot(slotIndex) {
        const modal = document.getElementById('consultation-overlay');
        if (!modal) return;
        
        const slots = modal.querySelectorAll('#compare-analysis-mode .image-slot');
        
        if (slots[slotIndex]) {
            const slot = slots[slotIndex];
            const previewImg = slot.querySelector('.preview-image');
            const input = slot.querySelector('input[type="file"]');
            
            if (previewImg) {
                previewImg.src = '';
                previewImg.style.display = 'none';
            }
            
            if (input) {
                input.value = '';
            }
            
            slot.classList.remove('filled');
            this.logger.debug(`🗑️ Слот ${slotIndex} очищен`);
        }
    }

    // Метод для очистки всех слотов
    clearAllSlots() {
        const images = this.getUploadedImages();
        images.forEach(img => this.clearSlot(img.slot));
        
        // Скрываем элементы формы
        const formElements = document.querySelector('.consultation-form-elements');
        if (formElements) {
            formElements.style.display = 'none';
        }
    }

    // Проверка готовности к отправке
    isReadyForAnalysis() {
        const images = this.getUploadedImages();
        return images.length >= 2; // Минимум 2 изображения для сравнения
    }
}

// Экспорт для использования в других модулях
window.ComparisonModule = ComparisonModule;