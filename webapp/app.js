// 🎯 УЛЬТИМАТИВНОЕ ПРИЛОЖЕНИЕ - webapp/app.js
// Версия: 3.0.0 - Лучший TMA в мире с премиум функциями
console.log('🚀 Ультимативное приложение загружается...');

class MishuraApp {
    constructor() {
        console.log('🔧 Инициализация премиум MishuraApp');
        
        // Основные компоненты
        this.api = new window.MishuraAPIService();
        this.currentMode = null; // 'single' или 'compare'
        this.compareImages = [null, null, null, null];
        this.singleImage = null;
        
        // Варианты поводов
        this.occasionOptions = [
            '💼 Деловая встреча',
            '❤️ Свидание', 
            '🚶 Повседневная прогулка',
            '🎉 Вечеринка',
            '👔 Собеседование',
            '🍽️ Ужин в ресторане',
            '🎭 Театр/концерт',
            '🏋️ Спортзал/тренировка',
            '🛍️ Шоппинг',
            '✈️ Путешествие',
            '🎓 Учеба/университет',
            '🏠 Дома/отдых',
            '🌞 Пляж/отпуск',
            '❄️ Зимняя прогулка',
            '🌧️ Дождливая погода',
            '🎪 Мероприятие на свежем воздухе'
        ];
        
        // Состояние приложения
        this.isLoading = false;
        this.lastAnalysisResult = null;
        this.analytics = {
            sessionsStarted: 0,
            imagesUploaded: 0,
            analysisRequested: 0,
            successfulAnalysis: 0,
            errors: 0
        };
        
        // Настройки
        this.settings = {
            autoOptimizeImages: true,
            hapticFeedback: true,
            animationsEnabled: true,
            debugMode: false
        };
        
        this.init();
    }

    async init() {
        console.log('🔗 Установка обработчиков событий и инициализация');
        
        // Telegram WebApp интеграция
        this.initTelegramWebApp();
        
        // Основные обработчики
        this.setupModeButtons();
        this.setupCloseButtons();
        this.setupSubmitButton();
        this.initUploaders();
        
        // Дополнительные функции
        this.setupKeyboardShortcuts();
        this.setupDragAndDrop();
        this.setupContextMenu();
        this.setupOccasionDropdown();
        
        // Системные проверки
        await this.performSystemChecks();
        
        // Аналитика
        this.trackSession();
        
        console.log('✅ Премиум MishuraApp готово к работе');
        this.showWelcomeAnimation();
    }

    // 📱 Интеграция с Telegram WebApp
    initTelegramWebApp() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Настройка внешнего вида
            tg.ready();
            tg.expand();
            
            // Настройка темы
            if (tg.colorScheme === 'dark') {
                document.body.classList.add('dark-theme');
            }
            
            // Обработчики Telegram событий
            tg.onEvent('themeChanged', () => {
                document.body.classList.toggle('dark-theme', tg.colorScheme === 'dark');
            });
            
            tg.onEvent('viewportChanged', (data) => {
                console.log('📱 Viewport изменен:', data);
                this.handleViewportChange(data);
            });
            
            // Настройка главной кнопки
            tg.MainButton.setText('Получить совет стилиста');
            tg.MainButton.onClick(() => {
                if (this.currentMode) {
                    this.submit();
                }
            });
            
            console.log('📱 Telegram WebApp интеграция активирована');
        }
    }

    handleViewportChange(data) {
        // Адаптируем интерфейс под изменения viewport
        if (data.isStateStable) {
            this.optimizeLayoutForViewport();
        }
    }

    optimizeLayoutForViewport() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    // 🎭 Анимации и эффекты
    showWelcomeAnimation() {
        if (!this.settings.animationsEnabled) return;
        
        const header = document.querySelector('.header');
        const buttons = document.querySelectorAll('.action-btn');
        
        // Анимация заголовка
        header.style.transform = 'translateY(-50px)';
        header.style.opacity = '0';
        
        setTimeout(() => {
            header.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            header.style.transform = 'translateY(0)';
            header.style.opacity = '1';
        }, 100);
        
        // Последовательная анимация кнопок
        buttons.forEach((btn, index) => {
            btn.style.transform = 'translateY(30px)';
            btn.style.opacity = '0';
            
            setTimeout(() => {
                btn.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                btn.style.transform = 'translateY(0)';
                btn.style.opacity = '1';
            }, 300 + index * 200);
        });
    }

    triggerHapticFeedback(type = 'light') {
        if (!this.settings.hapticFeedback) return;
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            switch (type) {
                case 'light':
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                    break;
                case 'medium':
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                    break;
                case 'heavy':
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
                    break;
                case 'success':
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                    break;
                case 'error':
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
                    break;
                case 'warning':
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
                    break;
            }
        } else if (navigator.vibrate) {
            // Fallback для устройств без Telegram
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [30],
                success: [10, 50, 10],
                error: [100, 50, 100],
                warning: [50, 30, 50]
            };
            navigator.vibrate(patterns[type] || [10]);
        }
    }

    // 🚀 Системные проверки
    async performSystemChecks() {
        console.log('🔍 Выполнение системных проверок...');
        
        // Проверка API
        const apiHealth = await this.api.healthCheck();
        if (!apiHealth.isHealthy) {
            this.showNotification('⚠️ Сервер временно недоступен', 'warning', 5000);
        }
        
        // Проверка браузера
        this.checkBrowserCompatibility();
        
        // Проверка подключения
        this.setupConnectionMonitoring();
        
        console.log('✅ Системные проверки завершены');
    }

    checkBrowserCompatibility() {
        const requiredFeatures = {
            'File API': window.File,
            'FormData': window.FormData,
            'Fetch API': window.fetch,
            'Promises': window.Promise,
            'ES6 Classes': class {},
            'Canvas': document.createElement('canvas').getContext,
            'Local Storage': window.localStorage
        };
        
        const unsupported = Object.entries(requiredFeatures)
            .filter(([name, feature]) => !feature)
            .map(([name]) => name);
        
        if (unsupported.length > 0) {
            console.warn('⚠️ Неподдерживаемые функции:', unsupported);
            this.showNotification(`Ваш браузер не поддерживает: ${unsupported.join(', ')}`, 'warning', 8000);
        }
    }

    setupConnectionMonitoring() {
        window.addEventListener('online', () => {
            this.showNotification('✅ Подключение восстановлено', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('❌ Нет подключения к интернету', 'error');
        });
    }

    // ⌨️ Клавиатурные сокращения
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Проверяем, что фокус не на input элементе
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.openSingleModal();
                    break;
                case '2':
                    e.preventDefault();
                    this.openCompareModal();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.closeModal();
                    break;
                case 'Enter':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (this.currentMode && !this.isLoading) {
                            this.submit();
                        }
                    }
                    break;
            }
        });
    }

    // 📋 Настройка выпадающего списка поводов
    setupOccasionDropdown() {
        const occasionInput = document.getElementById('occasion');
        const optionsContainer = document.getElementById('occasion-options');
        
        if (!occasionInput || !optionsContainer) return;
        
        // Создаем опции
        this.occasionOptions.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'occasion-option';
            optionElement.textContent = option;
            optionElement.addEventListener('click', () => {
                occasionInput.value = option;
                optionsContainer.classList.remove('active');
                this.triggerHapticFeedback('light');
            });
            optionsContainer.appendChild(optionElement);
        });
        
        // Показываем/скрываем опции
        occasionInput.addEventListener('click', () => {
            optionsContainer.classList.toggle('active');
            this.triggerHapticFeedback('light');
        });
        
        // Скрываем при клике вне
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.occasion-dropdown')) {
                optionsContainer.classList.remove('active');
            }
        });
        
        // Позволяем ввод custom значения
        occasionInput.addEventListener('input', () => {
            if (occasionInput.value.length > 0) {
                occasionInput.removeAttribute('readonly');
            }
        });
        
        occasionInput.addEventListener('focus', () => {
            if (occasionInput.hasAttribute('readonly')) {
                optionsContainer.classList.add('active');
            }
        });
    }
    // 🖱️ Drag & Drop функциональность
    setupDragAndDrop() {
        const dropZones = [
            document.getElementById('single-preview'),
            ...document.querySelectorAll('.compare-slot')
        ].filter(Boolean);
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', this.handleDragOver.bind(this));
            zone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            zone.addEventListener('drop', this.handleDrop.bind(this));
        });
        
        // Предотвращаем дефолтное поведение на всем документе
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            this.showNotification('Пожалуйста, перетащите изображения', 'warning');
            return;
        }
        
        // Определяем куда загружать
        if (e.currentTarget.id === 'single-preview') {
            this.handleSingleUpload(imageFiles[0]);
        } else if (e.currentTarget.classList.contains('compare-slot')) {
            const slotIndex = parseInt(e.currentTarget.dataset.slot);
            this.handleCompareUpload(imageFiles[0], slotIndex);
        }
        
        this.triggerHapticFeedback('light');
    }

    // 🎯 Контекстное меню
    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            // Для изображений показываем кастомное меню
            if (e.target.tagName === 'IMG' && e.target.closest('.upload-area, .compare-slot')) {
                e.preventDefault();
                this.showImageContextMenu(e);
            }
        });
    }

    showImageContextMenu(e) {
        // Простое контекстное меню для изображений
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="context-item" data-action="remove">Удалить</div>
            <div class="context-item" data-action="replace">Заменить</div>
        `;
        
        menu.style.cssText = `
            position: fixed;
            top: ${e.clientY}px;
            left: ${e.clientX}px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            overflow: hidden;
        `;
        
        document.body.appendChild(menu);
        
        // Закрытие меню
        const closeMenu = () => {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        };
        
        setTimeout(() => document.addEventListener('click', closeMenu), 100);
        
        // Обработка действий
        menu.addEventListener('click', (event) => {
            const action = event.target.dataset.action;
            if (action === 'remove') {
                this.removeImage(e.target);
            } else if (action === 'replace') {
                this.replaceImage(e.target);
            }
            closeMenu();
        });
    }

    // 🖼️ Управление изображениями
    removeImage(imgElement) {
        const container = imgElement.closest('.upload-area, .compare-slot');
        
        if (container.classList.contains('compare-slot')) {
            const slotIndex = parseInt(container.dataset.slot);
            this.compareImages[slotIndex] = null;
            container.innerHTML = `
                <span class="slot-number">${slotIndex + 1}</span>
                <span class="add-icon">+</span>
            `;
            container.classList.remove('has-image');
            this.updateCompareSubmitButton();
        } else if (container.id === 'single-preview') {
            this.singleImage = null;
            container.innerHTML = '<div class="upload-text">Нажмите для выбора фото</div>';
            container.classList.remove('has-image');
            this.updateSingleSubmitButton();
        }
        
        this.triggerHapticFeedback('light');
    }

    replaceImage(imgElement) {
        const container = imgElement.closest('.upload-area, .compare-slot');
        
        if (container.classList.contains('compare-slot')) {
            const slotIndex = parseInt(container.dataset.slot);
            const input = document.getElementById(`compare-file-input-${slotIndex}`);
            input.click();
        } else if (container.id === 'single-preview') {
            const input = document.getElementById('single-file-input');
            input.click();
        }
    }

    // 🔧 Настройка обработчиков
    setupModeButtons() {
        const singleBtn = document.getElementById('single-mode-btn');
        const compareBtn = document.getElementById('compare-mode-btn');
        
        if (singleBtn) {
            singleBtn.addEventListener('click', () => {
                console.log('🔥 Single Mode button clicked');
                this.triggerHapticFeedback('light');
                this.openSingleModal();
            });
        }

        if (compareBtn) {
            compareBtn.addEventListener('click', () => {
                console.log('🔄 Compare Mode button clicked');
                this.triggerHapticFeedback('light');
                this.openCompareModal();
            });
        }
    }

    setupCloseButtons() {
        const cancelBtns = ['consultation-cancel', 'form-cancel'];
        cancelBtns.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.triggerHapticFeedback('light');
                    this.closeModal();
                });
            }
        });
    }

    setupSubmitButton() {
        const submitBtn = document.getElementById('form-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.triggerHapticFeedback('medium');
                this.submit();
            });
        }
    }

    // 🚀 Основная логика приложения
    openSingleModal() {
        console.log('🔥 Opening Single Modal');
        this.currentMode = 'single';
        this.openModal();
        this.activateSingleMode();
        this.clearForm();
        this.updateTelegramMainButton();
        console.log('✅ Single режим открыт');
    }

    openCompareModal() {
        console.log('🔄 Opening Compare Modal');
        this.currentMode = 'compare';
        this.openModal();
        this.activateCompareMode();
        this.clearForm();
        this.updateTelegramMainButton();
        console.log('✅ Compare режим открыт');
    }

    openModal() {
        const modal = document.getElementById('consultation-overlay');
        if (modal) {
            modal.classList.add('active');
            console.log('✅ Modal открыт');
        }
    }

    activateSingleMode() {
        const singleMode = document.getElementById('single-mode');
        const compareMode = document.getElementById('compare-mode');
        const modalTitle = document.getElementById('modal-title');
        
        if (singleMode) singleMode.classList.add('active');
        if (compareMode) compareMode.classList.remove('active');
        if (modalTitle) modalTitle.textContent = '📷 Анализ одного образа';
    }

    activateCompareMode() {
        const singleMode = document.getElementById('single-mode');
        const compareMode = document.getElementById('compare-mode');
        const modalTitle = document.getElementById('modal-title');
        
        if (compareMode) compareMode.classList.add('active');
        if (singleMode) singleMode.classList.remove('active');
        if (modalTitle) modalTitle.textContent = '🔄 Сравнение образов';
    }

    closeModal() {
        const modal = document.getElementById('consultation-overlay');
        if (modal) {
            modal.classList.remove('active');
            console.log('✅ Modal закрыт');
        }
        this.currentMode = null;
        this.clearForm();
        this.updateTelegramMainButton();
    }

    updateTelegramMainButton() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            if (this.currentMode) {
                tg.MainButton.show();
                tg.MainButton.enable();
            } else {
                tg.MainButton.hide();
            }
        }
    }

    clearForm() {
        // Очищаем поля формы
        const occasionInput = document.getElementById('occasion');
        const preferencesInput = document.getElementById('preferences');
        
        if (occasionInput) occasionInput.value = '';
        if (preferencesInput) preferencesInput.value = '';
        
        // Скрываем секции
        const sections = ['consultation-form', 'loading', 'result'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) section.classList.remove('active');
        });
        
        // Очищаем изображения
        this.clearImages();
        
        console.log('🧹 Форма очищена');
    }

    clearImages() {
        // Single изображение
        this.singleImage = null;
        const singlePreview = document.getElementById('single-preview');
        if (singlePreview) {
            singlePreview.innerHTML = '<div class="upload-text">Нажмите для выбора фото</div>';
            singlePreview.classList.remove('has-image');
        }

        // Compare изображения
        this.compareImages = [null, null, null, null];
        for (let i = 0; i < 4; i++) {
            const slot = document.querySelector(`[data-slot="${i}"]`);
            if (slot) {
                slot.innerHTML = `
                    <span class="slot-number">${i + 1}</span>
                    <span class="add-icon">+</span>
                `;
                slot.classList.remove('has-image');
            }
        }
    }

    // 📁 Инициализация загрузчиков файлов
    initUploaders() {
        this.initSingleUploader();
        this.initCompareUploaders();
        console.log('✅ Загрузчики файлов настроены');
    }

    initSingleUploader() {
        const singlePreview = document.getElementById('single-preview');
        const singleInput = document.getElementById('single-file-input');
        
        if (singlePreview && singleInput) {
            singlePreview.addEventListener('click', () => {
                console.log('📁 Выбор файла для Single режима');
                singleInput.click();
            });
            
            singleInput.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.handleSingleUpload(e.target.files[0]);
                }
            });
        }
    }

    initCompareUploaders() {
        for (let i = 0; i < 4; i++) {
            const slot = document.querySelector(`[data-slot="${i}"]`);
            const input = document.getElementById(`compare-file-input-${i}`);
            
            if (slot && input) {
                slot.addEventListener('click', () => {
                    console.log(`📁 Выбор файла для слота ${i + 1}`);
                    input.click();
                });
                
                input.addEventListener('change', (e) => {
                    if (e.target.files[0]) {
                        this.handleCompareUpload(e.target.files[0], i);
                    }
                });
            }
        }
    }

    // 🖼️ Обработка загрузки изображений
    async handleSingleUpload(file) {
        console.log(`📷 Single файл загружен: ${file.name}`);
        
        // Валидация
        const validation = this.api.validateImage(file);
        if (!validation.isValid) {
            this.showNotification(validation.errors[0], 'error');
            return;
        }
        
        this.singleImage = file;
        this.analytics.imagesUploaded++;
        
        // Показ превью
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('single-preview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Превью" class="upload-preview">`;
                preview.classList.add('has-image');
            }
            
            this.updateSingleSubmitButton();
            this.showForm();
            this.triggerHapticFeedback('success');
        };
        reader.readAsDataURL(file);
    }

    async handleCompareUpload(file, index) {
        console.log(`📷 Файл загружен в слот ${index + 1}: ${file.name}`);
        
        // Валидация
        const validation = this.api.validateImage(file);
        if (!validation.isValid) {
            this.showNotification(validation.errors[0], 'error');
            return;
        }
        
        this.compareImages[index] = file;
        this.analytics.imagesUploaded++;
        
        // Показ превью
        const reader = new FileReader();
        reader.onload = (e) => {
            const slot = document.querySelector(`[data-slot="${index}"]`);
            if (slot) {
                slot.innerHTML = `
                    <span class="slot-number">${index + 1}</span>
                    <img src="${e.target.result}" alt="Превью ${index + 1}">
                `;
                slot.classList.add('has-image');
            }
            
            this.updateCompareSubmitButton();
            this.showForm();
            this.triggerHapticFeedback('success');
        };
        reader.readAsDataURL(file);
    }

    // 🔘 Управление кнопками
    updateSingleSubmitButton() {
        const btn = document.getElementById('form-submit');
        if (btn) {
            btn.disabled = !this.singleImage;
            console.log(`🔘 Single submit кнопка: ${btn.disabled ? 'неактивна' : 'АКТИВНА'}`);
        }
        this.updateTelegramMainButton();
    }

    updateCompareSubmitButton() {
        const uploadedCount = this.compareImages.filter(img => img !== null).length;
        const btn = document.getElementById('form-submit');
        
        if (btn) {
            btn.disabled = uploadedCount < 2;
            console.log(`🔘 Compare submit кнопка: ${btn.disabled ? 'неактивна' : 'АКТИВНА'} (${uploadedCount}/4 изображений)`);
        }
        this.updateTelegramMainButton();
    }

    showForm() {
        const form = document.getElementById('consultation-form');
        if (form && !form.classList.contains('active')) {
            form.classList.add('active');
            console.log('✅ Форма показана');
        }
    }

    // 🚀 Отправка данных
    async submit() {
        if (this.isLoading) {
            console.log('⏳ Запрос уже выполняется');
            return;
        }
        
        const occasion = document.getElementById('occasion')?.value?.trim() || '';
        const preferences = document.getElementById('preferences')?.value?.trim() || '';
        
        if (!occasion) {
            this.showNotification('Пожалуйста, укажите повод', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        this.analytics.analysisRequested++;
        
        if (this.currentMode === 'single') {
            await this.submitSingle(occasion, preferences);
        } else if (this.currentMode === 'compare') {
            await this.submitCompare(occasion, preferences);
        }
    }

    async submitSingle(occasion, preferences) {
        console.log('🚀 Single submit начался');
        
        if (!this.singleImage) {
            this.showNotification('Загрузите изображение', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        this.showLoading();
        this.triggerHapticFeedback('medium');
        
        try {
            const result = await this.api.analyzeSingle(this.singleImage, occasion, preferences);
            console.log('✅ Single результат получен:', result);
            
            this.lastAnalysisResult = result;
            this.analytics.successfulAnalysis++;
            this.showResult(result);
            this.triggerHapticFeedback('success');
            
        } catch (error) {
            console.error('❌ Single ошибка:', error);
            this.analytics.errors++;
            this.showError(error.message);
            this.triggerHapticFeedback('error');
        }
    }

    async submitCompare(occasion, preferences) {
        const images = this.compareImages.filter(img => img !== null);
        
        if (images.length < 2) {
            this.showNotification('Загрузите минимум 2 изображения', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        console.log(`🚀 Compare submit: отправка ${images.length} изображений`);
        this.showLoading();
        this.triggerHapticFeedback('medium');
        
        try {
            const result = await this.api.analyzeCompare(images, occasion, preferences);
            console.log('✅ Compare результат получен:', result);
            
            this.lastAnalysisResult = result;
            this.analytics.successfulAnalysis++;
            this.showResult(result);
            this.triggerHapticFeedback('success');
            
        } catch (error) {
            console.error('❌ Compare ошибка:', error);
            this.analytics.errors++;
            this.showError(error.message);
            this.triggerHapticFeedback('error');
        }
    }

    // 📱 Отображение состояний
    showLoading() {
        this.isLoading = true;
        
        const sections = {
            loading: true,
            'consultation-form': false,
            result: false
        };
        
        Object.entries(sections).forEach(([id, show]) => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.toggle('active', show);
            }
        });
        
        // Обновляем Telegram кнопку
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.MainButton.showProgress();
        }
    }

    showResult(result) {
        this.isLoading = false;
        
        const sections = {
            loading: false,
            'consultation-form': false,
            result: true
        };
        
        Object.entries(sections).forEach(([id, show]) => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.toggle('active', show);
            }
        });
        
        // Контент результата
        const content = document.getElementById('result-content');
        if (content) {
            const advice = result.advice || result.message || 'Анализ получен';
            content.innerHTML = this.formatAdvice(advice);
        }
        
        // Обновляем Telegram кнопку
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.MainButton.hideProgress();
            tg.MainButton.setText('Новая консультация');
        }
    }

    showError(message) {
        this.isLoading = false;
        
        const sections = {
            loading: false,
            'consultation-form': false,
            result: true
        };
        
        Object.entries(sections).forEach(([id, show]) => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.toggle('active', show);
            }
        });
        
        const content = document.getElementById('result-content');
        if (content) {
            content.innerHTML = `<div class="error-message">❌ ${message}</div>`;
        }
        
        // Обновляем Telegram кнопку
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.MainButton.hideProgress();
            tg.MainButton.setText('Попробовать снова');
        }
    }

    formatAdvice(advice) {
        // Определяем названия образов на основе цветов в тексте
        const colorMapping = {
            'синий': 'Синий образ',
            'синем': 'Синий образ', 
            'синяя': 'Синий образ',
            'красный': 'Красный образ',
            'красном': 'Красный образ',
            'красная': 'Красный образ',
            'белый': 'Белый образ',
            'белом': 'Белый образ',
            'белая': 'Белый образ',
            'черный': 'Черный образ',
            'черном': 'Черный образ',
            'черная': 'Черный образ',
            'зеленый': 'Зеленый образ',
            'зеленом': 'Зеленый образ',
            'зеленая': 'Зеленый образ',
            'желтый': 'Желтый образ',
            'желтом': 'Желтый образ',
            'желтая': 'Желтый образ',
            'розовый': 'Розовый образ',
            'розовом': 'Розовый образ',
            'розовая': 'Розовый образ',
            'серый': 'Серый образ',
            'сером': 'Серый образ',
            'серая': 'Серый образ',
            'коричневый': 'Коричневый образ',
            'коричневом': 'Коричневый образ',
            'коричневая': 'Коричневый образ',
            'оранжевый': 'Оранжевый образ',
            'оранжевом': 'Оранжевый образ',
            'оранжевая': 'Оранжевый образ',
            'фиолетовый': 'Фиолетовый образ',
            'фиолетовом': 'Фиолетовый образ',
            'фиолетовая': 'Фиолетовый образ'
        };
        
        let processedAdvice = advice;
        
        // Убираем избыточные описания того, что надето
        const descriptionsToRemove = [
            /На первом.*?изображении.*?\./gi,
            /На втором.*?изображении.*?\./gi,
            /На третьем.*?изображении.*?\./gi,
            /На четвертом.*?изображении.*?\./gi,
            /На фото.*?вы.*?одеты.*?\./gi,
            /Я вижу.*?что.*?на.*?\./gi,
            /Рассматривая.*?изображение.*?\./gi
        ];
        
        descriptionsToRemove.forEach(pattern => {
            processedAdvice = processedAdvice.replace(pattern, '');
        });
        
        // Заменяем цветовые описания на короткие названия образов
        Object.entries(colorMapping).forEach(([color, title]) => {
            const regex = new RegExp(`(в|на)\\s+${color}[а-я]*\\s+(платье|рубашке|футболке|блузке|костюме|жакете|пиджаке|брюках|джинсах|юбке|шортах|топе|кардигане|свитере|пальто|куртке)`, 'gi');
            processedAdvice = processedAdvice.replace(regex, `<span class="outfit-title">${title}</span>`);
        });
        
        // Разбиваем на логические блоки и добавляем заголовки
        const sections = processedAdvice.split(/\n\n|\. [А-ЯЁ]/).map(section => section.trim()).filter(s => s.length > 10);
        
        let formattedAdvice = '';
        sections.forEach((section, index) => {
            if (section.toLowerCase().includes('рекомендую') || section.toLowerCase().includes('советую')) {
                formattedAdvice += `<h4>💡 Рекомендации</h4><p>${section}</p>`;
            } else if (section.toLowerCase().includes('подойдет') || section.toLowerCase().includes('лучше')) {
                formattedAdvice += `<h4>✨ Что подойдет</h4><p>${section}</p>`;
            } else if (section.toLowerCase().includes('аксессуары') || section.toLowerCase().includes('украшения')) {
                formattedAdvice += `<h4>💎 Аксессуары</h4><p>${section}</p>`;
            } else if (section.toLowerCase().includes('цвет') || section.toLowerCase().includes('оттенок')) {
                formattedAdvice += `<h4>🎨 Цветовые решения</h4><p>${section}</p>`;
            } else if (section.toLowerCase().includes('обувь') || section.toLowerCase().includes('туфли')) {
                formattedAdvice += `<h4>👠 Обувь</h4><p>${section}</p>`;
            } else if (index === 0) {
                formattedAdvice += `<h4>📋 Общий анализ</h4><p>${section}</p>`;
            } else {
                formattedAdvice += `<p>${section}</p>`;
            }
        });
        
        // Дополнительное форматирование
        return formattedAdvice
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/([.!?])\s+([А-ЯЁ])/g, '$1</p><p>$2');
    }

    // 🔔 Система уведомлений
    showNotification(message, type = 'info', duration = 3000) {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Автоудаление
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => notification.remove(), 400);
        }, duration);
        
        // CSS анимация выхода
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideOutRight {
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 📊 Аналитика и отслеживание
    trackSession() {
        this.analytics.sessionsStarted++;
        console.log('📊 Сессия отслеживается:', this.analytics);
    }

    getAnalytics() {
        return {
            ...this.analytics,
            sessionDuration: Date.now() - this.sessionStart,
            currentMode: this.currentMode,
            hasResult: !!this.lastAnalysisResult
        };
    }

    // 🔧 Debug функции
    enableDebugMode() {
        this.settings.debugMode = true;
        console.log('🔧 Debug режим включен');
        
        // Добавляем debug панель
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
        `;
        debugPanel.innerHTML = `
            <div>Mode: <span id="debug-mode">${this.currentMode || 'none'}</span></div>
            <div>Images: <span id="debug-images">S:${!!this.singleImage} C:${this.compareImages.filter(Boolean).length}</span></div>
            <div>Loading: <span id="debug-loading">${this.isLoading}</span></div>
        `;
        document.body.appendChild(debugPanel);
        
        // Обновляем debug info каждую секунду
        setInterval(() => {
            const debugMode = document.getElementById('debug-mode');
            const debugImages = document.getElementById('debug-images');
            const debugLoading = document.getElementById('debug-loading');
            
            if (debugMode) debugMode.textContent = this.currentMode || 'none';
            if (debugImages) debugImages.textContent = `S:${!!this.singleImage} C:${this.compareImages.filter(Boolean).length}`;
            if (debugLoading) debugLoading.textContent = this.isLoading;
        }, 1000);
    }
}

// 🌍 Глобальный экспорт и инициализация
window.MishuraApp = MishuraApp;
console.log('✅ Ультимативный MishuraApp доступен в window');

// 🚀 Автоинициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 DOM загружен, создание ультимативного приложения...');
    
    try {
        window.mishuraApp = new MishuraApp();
        
        // Включаем debug режим в development
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            window.mishuraApp.enableDebugMode();
        }
        
        console.log('🎉 🌟 МИШУРА - ЛУЧШИЙ TMA В МИРЕ ГОТОВ! 🌟');
        
        // Глобальные функции для удобства отладки
        window.debugMishura = () => window.mishuraApp.getAnalytics();
        window.clearMishura = () => window.mishuraApp.clearForm();
        
    } catch (error) {
        console.error('💥 Критическая ошибка инициализации:', error);
    }
});