// 🎭 МИШУРА - Luxury ИИ Стилист
// Главный файл приложения - app.js (исправленная версия)

console.log('🎭 МИШУРА App загружается...');

class MishuraApp {
    constructor() {
        console.log('🚀 Инициализация MishuraApp...');
        
        // Состояние приложения
        this.currentMode = null; // 'single' или 'compare'
        this.currentSection = 'home'; // 'home', 'history', 'balance'
        this.compareImages = [null, null, null, null];
        this.singleImage = null;
        this.isLoading = false;
        this.lastAnalysisResult = null;
        
        // Пользовательские данные
        this.userBalance = 100;
        this.consultationsHistory = [];
        this.consultationsUsed = 0;
        
        // API клиент - создаем экземпляр!
        if (window.MishuraAPIService) {
            this.api = new window.MishuraAPIService();
            console.log('✅ API экземпляр создан:', this.api);
        } else if (window.mishuraAPI) {
            this.api = window.mishuraAPI;
            console.log('✅ API клиент подключен:', this.api);
        } else {
            this.api = null;
            console.error('❌ API клиент не найден!');
            this.showNotification('Ошибка подключения к API', 'error');
        }
        
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
        
        // Аналитика
        this.analytics = {
            appStartTime: Date.now(),
            analysisRequested: 0,
            successfulAnalysis: 0,
            errors: 0
        };
        
        this.init();
    }

    // 🎯 Инициализация
    init() {
        try {
            // Основные обработчики
            this.setupModeButtons();
            this.setupCloseButtons();
            this.setupSubmitButton();
            this.initUploaders();
            this.setupNavigation();
            
            // Дополнительные функции
            this.setupKeyboardShortcuts();
            this.setupDragAndDrop();
            this.setupContextMenu();
            this.setupOccasionDropdown();
            
            // Загружаем данные пользователя
            this.loadUserData();
            
            // Telegram интеграция
            this.setupTelegramIntegration();
            
            console.log('✅ MishuraApp инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }

    // 🧭 Настройка навигации
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetSection = btn.id.replace('nav-', '');
                this.navigateToSection(targetSection);
                this.triggerHapticFeedback('light');
            });
        });
        
        console.log('✅ Навигация настроена');
    }

    navigateToSection(section) {
        console.log(`🧭 Переход в раздел: ${section}`);
        
        // Обновляем активную кнопку
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`nav-${section}`).classList.add('active');
        
        // Показываем нужный контент
        this.currentSection = section;
        this.showSection(section);
        
        // Закрываем модальное окно если открыто
        this.closeModal();
    }

    showSection(section) {
        switch (section) {
            case 'home':
                this.showHomeSection();
                break;
            case 'history':
                this.showHistorySection();
                break;
            case 'balance':
                this.showBalanceSection();
                break;
        }
    }

    showHomeSection() {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <header class="header">
                <h1>✨ МИШУРА</h1>
                <p>Luxury ИИ-стилист премиум класса</p>
            </header>

            <div class="action-buttons">
                <button id="single-mode-btn" class="action-btn">
                    <span class="icon">📷</span>
                    Анализ образа
                </button>
                <button id="compare-mode-btn" class="action-btn">
                    <span class="icon">🔄</span>
                    Сравнение образов
                </button>
            </div>
        `;
        
        // Переинициализируем обработчики с небольшой задержкой
        setTimeout(() => {
            this.setupModeButtons();
        }, 100);
    }

    showHistorySection() {
        const container = document.querySelector('.container');
        const history = this.consultationsHistory.slice(-10).reverse();
        
        let historyHTML = `
            <header class="header">
                <h1>📚 История</h1>
                <p>Ваши консультации стилиста</p>
            </header>
            
            <div class="stats-card" style="
                background: rgba(212, 175, 55, 0.1);
                border: 1px solid var(--border-gold);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
                text-align: center;
            ">
                <div style="color: var(--text-gold); font-size: 1.2rem; font-weight: 600;">
                    Всего консультаций: ${this.consultationsHistory.length}
                </div>
                <div style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">
                    Осталось: ${this.userBalance} бесплатных
                </div>
            </div>
        `;

        if (history.length === 0) {
            historyHTML += `
                <div style="
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--text-muted);
                ">
                    <div style="font-size: 3rem; margin-bottom: 16px;">📝</div>
                    <div style="font-size: 1.1rem;">История пуста</div>
                    <div style="font-size: 0.9rem; margin-top: 8px;">
                        Получите первую консультацию!
                    </div>
                </div>
            `;
        } else {
            historyHTML += '<div class="history-list">';
            
            history.forEach((consultation, index) => {
                const date = new Date(consultation.timestamp).toLocaleDateString('ru-RU');
                const time = new Date(consultation.timestamp).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                historyHTML += `
                    <div class="history-item" style="
                        background: rgba(26, 26, 26, 0.8);
                        border: 1px solid var(--border-light);
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 12px;
                        cursor: pointer;
                        transition: var(--transition);
                    " onclick="window.mishuraApp.viewConsultation(${this.consultationsHistory.length - 1 - index})">
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 8px;
                        ">
                            <span style="
                                color: var(--text-gold);
                                font-weight: 600;
                                text-transform: uppercase;
                                font-size: 0.9rem;
                            ">${consultation.occasion}</span>
                            <span style="
                                color: var(--text-muted);
                                font-size: 0.8rem;
                            ">${date} ${time}</span>
                        </div>
                        <div style="
                            color: var(--text-light);
                            font-size: 0.9rem;
                            line-height: 1.4;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                            overflow: hidden;
                        ">
                            ${consultation.advice.replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </div>
                    </div>
                `;
            });
            
            historyHTML += '</div>';
        }

        container.innerHTML = historyHTML;
    }

    showBalanceSection() {
        const container = document.querySelector('.container');
        
        container.innerHTML = `
            <header class="header">
                <h1>💰 Баланс</h1>
                <p>Управление консультациями</p>
            </header>
            
            <div class="balance-card" style="
                background: var(--gold-gradient);
                color: var(--text-dark);
                border-radius: 20px;
                padding: 24px;
                margin-bottom: 24px;
                text-align: center;
                box-shadow: var(--shadow-gold);
            ">
                <div style="font-size: 2.5rem; font-weight: 900; margin-bottom: 8px;">
                    ${this.userBalance}
                </div>
                <div style="font-size: 1.1rem; font-weight: 600; text-transform: uppercase;">
                    Бесплатных консультаций
                </div>
            </div>
            
            <div class="usage-stats" style="
                background: rgba(26, 26, 26, 0.8);
                border: 1px solid var(--border-light);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 24px;
            ">
                <h3 style="
                    color: var(--text-gold);
                    margin-bottom: 16px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 1rem;
                ">📊 Статистика использования</h3>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: var(--text-muted);">Всего получено:</span>
                    <span style="color: var(--text-light); font-weight: 600;">${this.consultationsHistory.length}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: var(--text-muted);">Использовано:</span>
                    <span style="color: var(--text-light); font-weight: 600;">${this.consultationsUsed}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Осталось:</span>
                    <span style="color: var(--text-gold); font-weight: 600;">${this.userBalance}</span>
                </div>
            </div>
            
            <div class="add-balance-section">
                <button id="add-balance-btn" class="action-btn" style="
                    width: 100%;
                    margin-bottom: 16px;
                    background: rgba(26, 26, 26, 0.8);
                    border: 2px solid var(--border-gold);
                    color: var(--text-gold);
                ">
                    <span class="icon">➕</span>
                    Добавить консультации
                </button>
                
                <div style="
                    background: rgba(212, 175, 55, 0.1);
                    border: 1px solid var(--border-gold);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                ">
                    <div style="
                        color: var(--text-gold);
                        font-weight: 600;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        font-size: 0.9rem;
                    ">💡 Информация</div>
                    <div style="
                        color: var(--text-light);
                        font-size: 0.9rem;
                        line-height: 1.4;
                    ">
                        Каждый новый пользователь получает 100 бесплатных консультаций. 
                        После их использования можно приобрести дополнительные пакеты 
                        или поддержать проект добровольным пожертвованием.
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем обработчик для кнопки пополнения
        document.getElementById('add-balance-btn').addEventListener('click', () => {
            this.showAddBalanceModal();
        });
    }

    // 💰 Модальное окно пополнения баланса
    showAddBalanceModal() {
        this.showNotification('🚧 Функция в разработке. Скоро будет доступна оплата!', 'info', 4000);
        this.triggerHapticFeedback('warning');
        
        // Пока что добавляем 10 консультаций бесплатно для тестирования
        setTimeout(() => {
            this.userBalance += 10;
            this.saveUserData();
            this.showBalanceSection();
            this.showNotification('🎁 Добавлено 10 бесплатных консультаций!', 'success');
            this.triggerHapticFeedback('success');
        }, 1000);
    }

    // 📄 Просмотр консультации
    viewConsultation(index) {
        const consultation = this.consultationsHistory[index];
        if (!consultation) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">Консультация #${index + 1}</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="
                        background: rgba(212, 175, 55, 0.1);
                        border: 1px solid var(--border-gold);
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 16px;
                    ">
                        <div style="color: var(--text-gold); font-weight: 600; margin-bottom: 8px;">
                            📅 ${new Date(consultation.timestamp).toLocaleString('ru-RU')}
                        </div>
                        <div style="color: var(--text-light); margin-bottom: 4px;">
                            <strong>Повод:</strong> ${consultation.occasion}
                        </div>
                        ${consultation.preferences ? `
                            <div style="color: var(--text-light);">
                                <strong>Предпочтения:</strong> ${consultation.preferences}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="result-content">
                        ${consultation.advice}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.triggerHapticFeedback('light');
    }

    // 💾 Управление данными пользователя
    loadUserData() {
        try {
            const data = JSON.parse(localStorage.getItem('mishura_user_data') || '{}');
            this.userBalance = data.balance || 100;
            this.consultationsHistory = data.history || [];
            this.consultationsUsed = data.used || 0;
            
            console.log('📊 Данные пользователя загружены:', {
                balance: this.userBalance,
                history: this.consultationsHistory.length,
                used: this.consultationsUsed
            });
        } catch (error) {
            console.error('❌ Ошибка загрузки данных пользователя:', error);
            this.initializeUserData();
        }
    }

    saveUserData() {
        try {
            const data = {
                balance: this.userBalance,
                history: this.consultationsHistory,
                used: this.consultationsUsed,
                lastSaved: Date.now()
            };
            
            localStorage.setItem('mishura_user_data', JSON.stringify(data));
            console.log('💾 Данные пользователя сохранены');
        } catch (error) {
            console.error('❌ Ошибка сохранения данных пользователя:', error);
        }
    }

    initializeUserData() {
        this.userBalance = 100;
        this.consultationsHistory = [];
        this.consultationsUsed = 0;
        this.saveUserData();
        
        console.log('🆕 Инициализированы данные нового пользователя');
        this.showNotification('🎉 Добро пожаловать! У вас 100 бесплатных консультаций!', 'success', 5000);
    }

    // 🔧 Настройка обработчиков
    setupModeButtons() {
        const singleBtn = document.getElementById('single-mode-btn');
        const compareBtn = document.getElementById('compare-mode-btn');
        
        if (singleBtn) {
            const handleSingleClick = () => {
                console.log('🔥 Single Mode button clicked');
                this.triggerHapticFeedback('light');
                this.openSingleModal();
            };
            singleBtn.addEventListener('click', handleSingleClick);
        } else {
            console.warn('⚠️ Single button не найден');
        }

        if (compareBtn) {
            const handleCompareClick = () => {
                console.log('🔄 Compare Mode button clicked');
                this.triggerHapticFeedback('light');
                this.openCompareModal();
            };
            compareBtn.addEventListener('click', handleCompareClick);
        } else {
            console.warn('⚠️ Compare button не найден');
        }
        
        console.log('✅ Mode buttons настроены');
    }

    setupCloseButtons() {
        document.addEventListener('click', (event) => {
            if (event.target.matches('#consultation-cancel, .close-btn, #form-cancel')) {
                this.closeModal();
                this.triggerHapticFeedback('light');
            }
        });
    }

    setupSubmitButton() {
        document.addEventListener('click', (event) => {
            if (event.target.matches('#form-submit')) {
                event.preventDefault();
                this.submit();
            }
        });
        
        document.addEventListener('input', (event) => {
            if (['occasion', 'preferences'].includes(event.target.id)) {
                this.updateSubmitButton();
            }
        });
    }

    // 📋 Настройка выпадающего списка поводов
    setupOccasionDropdown() {
        document.addEventListener('click', (event) => {
            const occasionInput = document.getElementById('occasion');
            const optionsContainer = document.getElementById('occasion-options');
            
            if (!occasionInput || !optionsContainer) return;
            
            if (event.target === occasionInput) {
                // Создаем опции если их нет
                if (optionsContainer.children.length === 0) {
                    this.occasionOptions.forEach(option => {
                        const optionElement = document.createElement('div');
                        optionElement.className = 'occasion-option';
                        optionElement.textContent = option;
                        optionElement.addEventListener('click', () => {
                            occasionInput.value = option;
                            optionsContainer.classList.remove('active');
                            this.updateSubmitButton();
                            this.triggerHapticFeedback('light');
                        });
                        optionsContainer.appendChild(optionElement);
                    });
                }
                
                optionsContainer.classList.toggle('active');
                this.triggerHapticFeedback('light');
            } else if (!event.target.closest('.occasion-dropdown')) {
                optionsContainer.classList.remove('active');
            }
        });
    }

    // 📱 Telegram интеграция
    setupTelegramIntegration() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            tg.ready();
            tg.expand();
            
            tg.MainButton.setText('Получить консультацию');
            tg.MainButton.show();
            
            tg.MainButton.onClick(() => {
                if (this.currentSection === 'home') {
                    this.openSingleModal();
                } else {
                    this.navigateToSection('home');
                }
            });
            
            console.log('📱 Telegram WebApp интегрирован');
        }
    }

    // 🎮 Haptic Feedback
    triggerHapticFeedback(type = 'light') {
        try {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                const feedback = window.Telegram.WebApp.HapticFeedback;
                
                switch (type) {
                    case 'light':
                        feedback.impactOccurred('light');
                        break;
                    case 'medium':
                        feedback.impactOccurred('medium');
                        break;
                    case 'heavy':
                        feedback.impactOccurred('heavy');
                        break;
                    case 'success':
                        feedback.notificationOccurred('success');
                        break;
                    case 'warning':
                        feedback.notificationOccurred('warning');
                        break;
                    case 'error':
                        feedback.notificationOccurred('error');
                        break;
                }
            }
        } catch (error) {
            // Игнорируем ошибки haptic feedback
        }
    }

    // 🖱️ Drag & Drop функциональность
    setupDragAndDrop() {
        // Single режим
        const singlePreview = document.getElementById('single-preview');
        if (singlePreview) {
            this.setupDragDropForElement(singlePreview, (file) => {
                this.handleSingleFile(file);
            });
        }
        
        // Compare режим
        document.querySelectorAll('.compare-slot').forEach((slot, index) => {
            this.setupDragDropForElement(slot, (file) => {
                this.handleCompareFile(file, index);
            });
        });
        
        console.log('🖱️ Drag & Drop настроен');
    }

    setupDragDropForElement(element, onDrop) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            element.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            element.addEventListener(eventName, () => {
                element.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            element.addEventListener(eventName, () => {
                element.classList.remove('drag-over');
            }, false);
        });

        element.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                onDrop(files[0]);
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // ⌨️ Клавиатурные сокращения
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // ESC - закрыть модальное окно
            if (event.key === 'Escape') {
                this.closeModal();
            }
            
            // Enter - отправить форму (если активна)
            if (event.key === 'Enter' && event.ctrlKey) {
                const submitBtn = document.getElementById('form-submit');
                if (submitBtn && !submitBtn.disabled) {
                    this.submit();
                }
            }
            
            // S - открыть single режим
            if (event.key === 's' || event.key === 'ы') {
                if (this.currentSection === 'home' && !document.querySelector('.modal-overlay.active')) {
                    this.openSingleModal();
                }
            }
            
            // C - открыть compare режим  
            if (event.key === 'c' || event.key === 'с') {
                if (this.currentSection === 'home' && !document.querySelector('.modal-overlay.active')) {
                    this.openCompareModal();
                }
            }
        });
        
        console.log('⌨️ Клавиатурные сокращения настроены');
    }

    // 🖱️ Контекстное меню
    setupContextMenu() {
        document.addEventListener('contextmenu', (event) => {
            // Отключаем стандартное контекстное меню на превью изображений
            if (event.target.closest('.upload-preview, .compare-slot img')) {
                event.preventDefault();
                this.showImageContextMenu(event);
            }
        });
    }

    showImageContextMenu(event) {
        // Простое контекстное меню для изображений
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: var(--secondary-black);
            border: 1px solid var(--border-gold);
            border-radius: 8px;
            padding: 8px 0;
            z-index: 10000;
            min-width: 150px;
            box-shadow: var(--shadow-black);
        `;
        
        const actions = [
            { text: '🔄 Заменить', action: () => this.replaceImage(event.target) },
            { text: '❌ Удалить', action: () => this.removeImage(event.target) }
        ];
        
        actions.forEach(({ text, action }) => {
            const item = document.createElement('div');
            item.textContent = text;
            item.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                color: var(--text-light);
                transition: background-color 0.2s;
            `;
            
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });
            
            item.addEventListener('click', () => {
                action();
                menu.remove();
            });
            
            menu.appendChild(item);
        });
        
        document.body.appendChild(menu);
        
        // Удаляем меню при клике вне его
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }

    replaceImage(imgElement) {
        // Определяем тип изображения и заменяем
        const slot = imgElement.closest('.compare-slot');
        if (slot) {
            const slotIndex = parseInt(slot.dataset.slot);
            const fileInput = document.getElementById(`compare-file-input-${slotIndex}`);
            if (fileInput) fileInput.click();
        } else {
            // Single режим
            const fileInput = document.getElementById('single-file-input');
            if (fileInput) fileInput.click();
        }
    }

    removeImage(imgElement) {
        const slot = imgElement.closest('.compare-slot');
        if (slot) {
            // Compare режим
            const slotIndex = parseInt(slot.dataset.slot);
            this.compareImages[slotIndex] = null;
            slot.innerHTML = `
                <span class="slot-number">${slotIndex + 1}</span>
                <span class="add-icon">+</span>
            `;
            slot.classList.remove('has-image');
        } else {
            // Single режим
            this.singleImage = null;
            const preview = document.getElementById('single-preview');
            if (preview) {
                preview.innerHTML = '<div class="upload-text">Нажмите для выбора фото</div>';
                preview.classList.remove('has-image');
            }
        }
        
        this.updateSubmitButton();
        this.triggerHapticFeedback('light');
    }

    // 🎯 Методы модального окна
    openSingleModal() {
        this.currentMode = 'single';
        document.getElementById('modal-title').textContent = 'Анализ образа';
        this.showModal('single-mode');
    }

    openCompareModal() {
        this.currentMode = 'compare';
        document.getElementById('modal-title').textContent = 'Сравнение образов';
        this.showModal('compare-mode');
    }

    showModal(mode) {
        const overlay = document.getElementById('consultation-overlay');
        const modes = document.querySelectorAll('.upload-mode');
        
        modes.forEach(m => m.classList.remove('active'));
        document.getElementById(mode).classList.add('active');
        
        overlay.classList.add('active');
        this.clearForm();
        this.hideForm();
        this.hideLoading();
        this.hideResult();
    }

    closeModal() {
        const overlay = document.getElementById('consultation-overlay');
        overlay.classList.remove('active');
        this.clearForm();
        this.clearImages();
    }

    // 🎯 Управление состоянием формы
    clearForm() {
        const occasion = document.getElementById('occasion');
        const preferences = document.getElementById('preferences');
        const options = document.getElementById('occasion-options');
        
        if (occasion) occasion.value = '';
        if (preferences) preferences.value = '';
        if (options) options.classList.remove('active');
        
        this.updateSubmitButton();
    }

    clearImages() {
        this.singleImage = null;
        this.compareImages = [null, null, null, null];
        
        // Очищаем превью
        const singlePreview = document.getElementById('single-preview');
        if (singlePreview) {
            singlePreview.innerHTML = '<div class="upload-text">Нажмите для выбора фото</div>';
            singlePreview.classList.remove('has-image');
        }
        
        // Очищаем слоты сравнения
        document.querySelectorAll('.compare-slot').forEach((slot, index) => {
            slot.innerHTML = `
                <span class="slot-number">${index + 1}</span>
                <span class="add-icon">+</span>
            `;
            slot.classList.remove('has-image');
        });
    }

    updateSubmitButton() {
        const submitBtn = document.getElementById('form-submit');
        const occasion = document.getElementById('occasion')?.value?.trim() || '';
        
        let hasImages = false;
        if (this.currentMode === 'single') {
            hasImages = this.singleImage !== null;
        } else if (this.currentMode === 'compare') {
            hasImages = this.compareImages.filter(img => img !== null).length >= 2;
        }
        
        if (submitBtn) {
            submitBtn.disabled = !hasImages || !occasion;
        }
    }

    hideForm() {
        const form = document.getElementById('consultation-form');
        if (form) form.classList.remove('active');
    }

    showForm() {
        const form = document.getElementById('consultation-form');
        if (form) form.classList.add('active');
        this.updateSubmitButton();
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.remove('active');
    }

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
    }

    hideResult() {
        const result = document.getElementById('result');
        if (result) result.classList.remove('active');
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
        
        // Сохраняем консультацию в историю
        const consultation = {
            id: Date.now(),
            type: this.currentMode,
            occasion: document.getElementById('occasion')?.value || '',
            preferences: document.getElementById('preferences')?.value || '',
            advice: result.advice || result.message || '',
            timestamp: new Date().toISOString(),
            imagesCount: this.currentMode === 'compare' ? 
                this.compareImages.filter(img => img !== null).length : 1
        };
        
        // Списываем консультацию
        this.userBalance--;
        this.consultationsUsed++;
        this.consultationsHistory.push(consultation);
        this.saveUserData();
        
        // Показываем обновленный баланс
        if (this.userBalance <= 10) {
            setTimeout(() => {
                this.showNotification(`⚠️ Осталось ${this.userBalance} консультаций`, 'warning', 4000);
            }, 2000);
        }
    }

    showError(message) {
        this.isLoading = false;
        
        const sections = {
            loading: false,
            'consultation-form': true,
            result: false
        };
        
        Object.entries(sections).forEach(([id, show]) => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.toggle('active', show);
            }
        });
        
        this.showNotification(message, 'error');
    }

    // ✨ Форматирование ответов
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

    // 📤 Отправка форм
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
        
        // Проверяем баланс
        if (this.userBalance <= 0) {
            this.showNotification('❌ Консультации закончились! Пополните баланс', 'error');
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
        
        // Проверяем API
        if (!this.api) {
            this.showNotification('❌ API не подключен', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        this.showLoading();
        this.triggerHapticFeedback('medium');
        
        try {
            console.log('📡 Отправляем запрос к API...');
            console.log('🔍 Используем метод:', 'analyzeSingle');
            
            const result = await this.api.analyzeSingle(this.singleImage, occasion, preferences);
            console.log('✅ Single результат получен:', result);
            
            this.lastAnalysisResult = result;
            this.analytics.successfulAnalysis++;
            this.showResult(result);
            this.triggerHapticFeedback('success');
            
        } catch (error) {
            console.error('❌ Single ошибка:', error);
            this.analytics.errors++;
            this.showError(`Ошибка анализа: ${error.message}`);
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
        
        // Проверяем API
        if (!this.api) {
            this.showNotification('❌ API не подключен', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        console.log(`🚀 Compare submit: отправка ${images.length} изображений`);
        this.showLoading();
        this.triggerHapticFeedback('medium');
        
        try {
            console.log('📡 Отправляем запрос к API...');
            console.log('🔍 Используем метод:', 'analyzeCompare');
            
            const result = await this.api.analyzeCompare(images, occasion, preferences);
            console.log('✅ Compare результат получен:', result);
            
            this.lastAnalysisResult = result;
            this.analytics.successfulAnalysis++;
            this.showResult(result);
            this.triggerHapticFeedback('success');
            
        } catch (error) {
            console.error('❌ Compare ошибка:', error);
            this.analytics.errors++;
            this.showError(`Ошибка сравнения: ${error.message}`);
            this.triggerHapticFeedback('error');
        }
    }

    // 📁 Инициализация загрузчиков
    initUploaders() {
        // Single режим
        this.setupSingleUploader();
        
        // Compare режим  
        this.setupCompareUploader();
        
        console.log('📁 Загрузчики файлов настроены');
    }

    // 📷 Single загрузчик
    setupSingleUploader() {
        const preview = document.getElementById('single-preview');
        const fileInput = document.getElementById('single-file-input');
        
        if (preview) {
            preview.addEventListener('click', () => {
                console.log('📁 Выбор файла для Single режима');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    this.handleSingleFile(file);
                }
            });
        }
    }

    // 🔄 Compare загрузчик
    setupCompareUploader() {
        document.querySelectorAll('.compare-slot').forEach((slot, index) => {
            slot.addEventListener('click', () => {
                console.log(`📁 Выбор файла для Compare слота ${index}`);
                const fileInput = document.getElementById(`compare-file-input-${index}`);
                if (fileInput) {
                    fileInput.click();
                }
            });
        });
        
        // Обработчики файлов для каждого слота
        for (let i = 0; i < 4; i++) {
            const fileInput = document.getElementById(`compare-file-input-${i}`);
            if (fileInput) {
                fileInput.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        this.handleCompareFile(file, i);
                    }
                });
            }
        }
    }

    // 📷 Обработка Single файла
    async handleSingleFile(file) {
        console.log('📷 Single файл загружен:', file.name);
        
        // Валидация
        if (!this.validateFile(file)) {
            return;
        }
        
        try {
            // Оптимизация изображения
            const optimizedFile = await this.optimizeImage(file);
            this.singleImage = optimizedFile;
            
            // Показ превью
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('single-preview');
                if (preview) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Превью" class="upload-preview">`;
                    preview.classList.add('has-image');
                }
                
                this.updateSubmitButton();
                this.showForm();
                this.triggerHapticFeedback('success');
            };
            reader.readAsDataURL(optimizedFile);
            
        } catch (error) {
            console.error('❌ Ошибка обработки файла:', error);
            this.showNotification('Ошибка обработки изображения', 'error');
        }
    }

    // 🔄 Обработка Compare файла
    async handleCompareFile(file, slotIndex) {
        console.log(`🔄 Compare файл загружен для слота ${slotIndex}:`, file.name);
        
        // Валидация
        if (!this.validateFile(file)) {
            return;
        }
        
        try {
            // Оптимизация изображения
            const optimizedFile = await this.optimizeImage(file);
            this.compareImages[slotIndex] = optimizedFile;
            
            // Показ превью
            const reader = new FileReader();
            reader.onload = (e) => {
                const slot = document.querySelector(`[data-slot="${slotIndex}"]`);
                if (slot) {
                    slot.innerHTML = `
                        <span class="slot-number">${slotIndex + 1}</span>
                        <img src="${e.target.result}" alt="Превью ${slotIndex + 1}">
                    `;
                    slot.classList.add('has-image');
                }
                
                this.updateSubmitButton();
                this.updateCompareForm();
                this.triggerHapticFeedback('success');
            };
            reader.readAsDataURL(optimizedFile);
            
        } catch (error) {
            console.error('❌ Ошибка обработки файла:', error);
            this.showNotification('Ошибка обработки изображения', 'error');
        }
    }

    // ✅ Валидация файлов
    validateFile(file) {
        const maxSize = 20 * 1024 * 1024; // 20MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Поддерживаются только JPG, PNG и WebP', 'error');
            this.triggerHapticFeedback('error');
            return false;
        }
        
        if (file.size > maxSize) {
            this.showNotification('Файл слишком большой (максимум 20MB)', 'error');
            this.triggerHapticFeedback('error');
            return false;
        }
        
        return true;
    }

    // 🎨 Оптимизация изображений
    async optimizeImage(file) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Максимальные размеры
                const maxWidth = 1920;
                const maxHeight = 1920;
                
                let { width, height } = img;
                
                // Пропорциональное масштабирование
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Рисуем изображение
                ctx.drawImage(img, 0, 0, width, height);
                
                // Конвертируем в blob
                canvas.toBlob((blob) => {
                    const optimizedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    
                    console.log(`🎨 Изображение оптимизировано: ${file.size} → ${optimizedFile.size} байт`);
                    resolve(optimizedFile);
                }, 'image/jpeg', 0.85);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    // 🔄 Обновление формы сравнения
    updateCompareForm() {
        const imageCount = this.compareImages.filter(img => img !== null).length;
        
        if (imageCount >= 2) {
            this.showForm();
        }
        
        console.log(`🔄 Compare: загружено ${imageCount} изображений`);
    }

    // 🔔 Уведомления
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, duration);
        
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
    }
}

// 🎉 Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM готов, создаем приложение...');
    window.mishuraApp = new MishuraApp();
    console.log('✅ Приложение МИШУРА запущено!');
});