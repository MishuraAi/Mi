
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
        console.log('