// 🎭 МИШУРА - Luxury ИИ Стилист
// Главный файл приложения - app.js (ПРОДАКШН ВЕРСИЯ С ПАТЧАМИ V2)
// Версия: 2.1.0 - Все критические исправления + улучшения из тестирования

console.log('🎭 МИШУРА App загружается с патчами V2 (продакшн)...');

class MishuraApp {
    constructor() {
        console.log('🚀 Инициализация MishuraApp с патчами V2...');
        
        // Состояние приложения
        this.currentMode = null; // 'single' или 'compare'
        this.currentSection = 'home'; // 'home', 'history', 'balance'
        this.compareImages = [null, null, null, null];
        this.singleImage = null;
        this.isLoading = false;
        this.lastAnalysisResult = null;
        
        // ПАТЧ V2: Увеличен timeout до 90 секунд
        this.requestTimeout = 90000; // 90 секунд вместо 30
        
        // ПАТЧ V2: Предотвращение бесконечных циклов
        this.eventListenersAttached = false;
        this.initializationComplete = false;
        
        // Пользовательские данные
        this.userBalance = 100;
        this.consultationsHistory = [];
        this.consultationsUsed = 0;
        
        // ПАТЧ V2: Исправленная инициализация API с правильным контекстом
        this.api = null;
        this.initializeAPI();
        
        // Варианты поводов (расширенный список из тестирования)
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
            '🎪 Мероприятие на свежем воздухе',
            '🏢 Офисная работа',
            '🎨 Творческое мероприятие',
            '👶 Встреча с детьми',
            '👥 Деловые переговоры'
        ];
        
        // Аналитика
        this.analytics = {
            appStartTime: Date.now(),
            analysisRequested: 0,
            successfulAnalysis: 0,
            errors: 0
        };
        
        // ПАТЧ V2: Отложенная инициализация для предотвращения race condition
        this.init = this.init.bind(this);
        setTimeout(() => this.init(), 100);
    }

    // ПАТЧ V2: Исправленная инициализация API с fallback на Mock
    initializeAPI() {
        try {
            // Сначала пытаемся подключить реальный API
            if (window.MishuraAPIService && !window.MishuraAPIService.isMock) {
                this.api = new window.MishuraAPIService();
                console.log('✅ Реальный API экземпляр создан:', this.api);
            } 
            // Fallback на Mock API если реальный недоступен
            else if (window.MockMishuraAPIService) {
                this.api = new window.MockMishuraAPIService();
                console.log('⚠️ Используется Mock API для демо-режима:', this.api);
                this.showNotification('🧪 Демо-режим: используется Mock API', 'info', 3000);
            } 
            // Если есть старый API клиент
            else if (window.mishuraAPI) {
                this.api = window.mishuraAPI;
                console.log('✅ Существующий API клиент подключен:', this.api);
            } 
            // Последняя попытка
            else {
                console.warn('⚠️ API клиент не найден, будет повторная попытка...');
                // ПАТЧ V2: Повторная попытка через 1 секунду
                setTimeout(() => {
                    this.initializeAPI();
                }, 1000);
            }
        } catch (error) {
            console.error('❌ Ошибка инициализации API:', error);
            this.api = null;
        }
    }

    // 🎯 ПАТЧ V2: Исправленная инициализация без циклов
    init() {
        if (this.initializationComplete) {
            console.log('⚠️ Инициализация уже завершена, пропускаем');
            return;
        }

        try {
            console.log('🎯 Начало безопасной инициализации...');
            
            // Основные обработчики с защитой от дублирования
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
            this.setupResultNavigation(); // НОВОЕ: навигация после результатов
            
            // Загружаем данные пользователя
            this.loadUserData();
            
            // Telegram интеграция
            this.setupTelegramIntegration();
            
            this.initializationComplete = true;
            console.log('✅ MishuraApp инициализирован с патчами V2');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }

    // НОВОЕ: Настройка навигации после результатов (из тестирования)
    setupResultNavigation() {
        document.addEventListener('click', (event) => {
            if (event.target.matches('#result-back')) {
                this.backToSelection();
            } else if (event.target.matches('#result-new')) {
                this.startNewAnalysis();
            }
        });
        console.log('✅ Навигация результатов настроена');
    }

    // НОВОЕ: Возврат к выбору изображений
    backToSelection() {
        this.hideResult();
        
        if (this.currentMode === 'single') {
            const singleMode = document.getElementById('single-mode');
            if (singleMode) singleMode.classList.add('active');
        } else if (this.currentMode === 'compare') {
            const compareMode = document.getElementById('compare-mode');
            if (compareMode) compareMode.classList.add('active');
        }
        
        // Показываем форму если есть изображения
        if ((this.currentMode === 'single' && this.singleImage) || 
            (this.currentMode === 'compare' && this.compareImages.filter(img => img !== null).length >= 2)) {
            this.showForm();
        }
        
        console.log('⬅️ Возврат к выбору изображений');
    }

    // НОВОЕ: Начать новый анализ
    startNewAnalysis() {
        this.closeModal();
        console.log('🆕 Начало нового анализа');
    }

    // 🧭 ПАТЧ V2: Улучшенная настройка навигации без циклов
    setupNavigation() {
        if (this.navigationSetup) {
            return; // Предотвращаем повторную настройку
        }

        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(btn => {
            // Удаляем старые обработчики перед добавлением новых
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                const targetSection = newBtn.id.replace('nav-', '');
                this.navigateToSection(targetSection);
                this.triggerHapticFeedback('light');
            });
        });
        
        this.navigationSetup = true;
        console.log('✅ Навигация настроена без циклов');
    }

    navigateToSection(section) {
        console.log(`🧭 Переход в раздел: ${section}`);
        
        // Обновляем активную кнопку
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = document.getElementById(`nav-${section}`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
        
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
        if (!container) return;
        
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
        
        // ПАТЧ V2: Переинициализируем обработчики с задержкой и защитой
        setTimeout(() => {
            if (!this.modeButtonsSetup) {
                this.setupModeButtons();
            }
        }, 100);
    }

    showHistorySection() {
        const container = document.querySelector('.container');
        if (!container) return;
        
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
        if (!container) return;
        
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
        const addBalanceBtn = document.getElementById('add-balance-btn');
        if (addBalanceBtn) {
            addBalanceBtn.addEventListener('click', () => {
                this.showAddBalanceModal();
            });
        }
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

    // 🔧 ПАТЧ V2: Исправленная настройка обработчиков без циклов
    setupModeButtons() {
        if (this.modeButtonsSetup) {
            return; // Предотвращаем повторную настройку
        }

        const singleBtn = document.getElementById('single-mode-btn');
        const compareBtn = document.getElementById('compare-mode-btn');
        
        if (singleBtn) {
            // Удаляем старые обработчики
            const newSingleBtn = singleBtn.cloneNode(true);
            singleBtn.parentNode.replaceChild(newSingleBtn, singleBtn);
            
            newSingleBtn.addEventListener('click', () => {
                console.log('🔥 Single Mode button clicked');
                this.triggerHapticFeedback('light');
                this.openSingleModal();
            });
        } else {
            console.warn('⚠️ Single button не найден');
        }

        if (compareBtn) {
            // Удаляем старые обработчики
            const newCompareBtn = compareBtn.cloneNode(true);
            compareBtn.parentNode.replaceChild(newCompareBtn, compareBtn);
            
            newCompareBtn.addEventListener('click', () => {
                console.log('🔄 Compare Mode button clicked');
                this.triggerHapticFeedback('light');
                this.openCompareModal();
            });
        } else {
            console.warn('⚠️ Compare button не найден');
        }
        
        this.modeButtonsSetup = true;
        console.log('✅ Mode buttons настроены без циклов');
    }

    setupCloseButtons() {
        if (this.eventListenersAttached) {
            return; // Предотвращаем дублирование
        }

        document.addEventListener('click', (event) => {
            if (event.target.matches('#consultation-cancel, .close-btn, #form-cancel')) {
                this.closeModal();
                this.triggerHapticFeedback('light');
            }
        });
    }

    setupSubmitButton() {
        if (this.submitButtonSetup) {
            return;
        }

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

        this.submitButtonSetup = true;
    }

    // 📋 Настройка выпадающего списка поводов
    setupOccasionDropdown() {
        if (this.occasionDropdownSetup) {
            return;
        }

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

        this.occasionDropdownSetup = true;
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
        if (this.dragDropSetup) {
            return;
        }

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
        
        this.dragDropSetup = true;
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
        if (this.keyboardSetup) {
            return;
        }

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
        
        this.keyboardSetup = true;
        console.log('⌨️ Клавиатурные сокращения настроены');
    }

    // 🖱️ Контекстное меню
    setupContextMenu() {
        if (this.contextMenuSetup) {
            return;
        }

        document.addEventListener('contextmenu', (event) => {
            // Отключаем стандартное контекстное меню на превью изображений
            if (event.target.closest('.upload-preview, .compare-slot img')) {
                event.preventDefault();
                this.showImageContextMenu(event);
            }
        });

        this.contextMenuSetup = true;
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
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Анализ образа';
        }
        this.showModal('single-mode');
    }

    openCompareModal() {
        this.currentMode = 'compare';
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Сравнение образов';
        }
        this.showModal('compare-mode');
    }

    showModal(mode) {
        const overlay = document.getElementById('consultation-overlay');
        const modes = document.querySelectorAll('.upload-mode');
        
        modes.forEach(m => m.classList.remove('active'));
        const targetMode = document.getElementById(mode);
        if (targetMode) {
            targetMode.classList.add('active');
        }
        
        if (overlay) {
            overlay.classList.add('active');
        }
        
        this.clearForm();
        this.hideForm();
        this.hideLoading();
        this.hideResult();
    }

    closeModal() {
        const overlay = document.getElementById('consultation-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
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

    // ПАТЧ V2: Улучшенное отображение результатов с нормализацией ответа + навигацией
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
        
        // ПАТЧ V2: Нормализация API ответа в правильный формат
        const normalizedResult = this.normalizeAPIResponse(result);
        
        // Контент результата с навигационными кнопками
        const content = document.getElementById('result-content');
        if (content) {
            content.innerHTML = this.formatAdvice(normalizedResult.advice);
        }
        
        // НОВОЕ: Добавляем кнопки навигации если их нет
        const resultSection = document.getElementById('result');
        if (resultSection && !resultSection.querySelector('#result-back')) {
            const navButtons = document.createElement('div');
            navButtons.style.cssText = 'display: flex; gap: 12px; justify-content: center; margin-top: 20px;';
            navButtons.innerHTML = `
                <button id="result-back" style="
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                    border: 1px solid var(--accent-gold);
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                ">← Назад к выбору</button>
                <button id="result-new" style="
                    background: var(--accent-gold);
                    color: var(--bg-primary);
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                ">🆕 Новый анализ</button>
            `;
            resultSection.appendChild(navButtons);
        }
        
        // Сохраняем консультацию в историю
        const consultation = {
            id: Date.now(),
            type: this.currentMode,
            occasion: document.getElementById('occasion')?.value || '',
            preferences: document.getElementById('preferences')?.value || '',
            advice: normalizedResult.advice,
            timestamp: new Date().toISOString(),
            imagesCount: this.currentMode === 'compare' ? 
                this.compareImages.filter(img => img !== null).length : 1,
            metadata: normalizedResult.metadata || {}
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

    // ПАТЧ V2: Нормализация ответов API в единый формат
    normalizeAPIResponse(response) {
        console.log('🔄 Нормализация ответа API:', response);
        
        // Если ответ уже в правильном формате
        if (response && typeof response === 'object' && response.advice) {
            return {
                advice: response.advice,
                metadata: response.metadata || {
                    timestamp: new Date().toISOString(),
                    status: response.status || 'success'
                }
            };
        }
        
        // Если ответ - строка
        if (typeof response === 'string') {
            return {
                advice: response,
                metadata: {
                    timestamp: new Date().toISOString(),
                    status: 'success',
                    source: 'string_response'
                }
            };
        }
        
        // Если ответ содержит message вместо advice
        if (response && response.message) {
            return {
                advice: response.message,
                metadata: {
                    timestamp: new Date().toISOString(),
                    status: response.status || 'success',
                    source: 'message_field'
                }
            };
        }
        
        // Если ответ содержит другие поля с контентом
        if (response && typeof response === 'object') {
            const contentFields = ['text', 'content', 'result', 'analysis'];
            for (const field of contentFields) {
                if (response[field]) {
                    return {
                        advice: response[field],
                        metadata: {
                            timestamp: new Date().toISOString(),
                            status: response.status || 'success',
                            source: field
                        }
                    };
                }
            }
        }
        
        // Fallback
        return {
            advice: 'Анализ получен, но формат ответа неожиданный. Попробуйте еще раз.',
            metadata: {
                timestamp: new Date().toISOString(),
                status: 'warning',
                source: 'fallback'
            }
        };
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

    // ✨ ПАТЧ V2: Улучшенное форматирование ответов с парсингом структуры
    formatAdvice(advice) {
        if (!advice) return '';
        
        // ПАТЧ V2: Улучшенный парсинг markdown структуры
        let processedAdvice = this.parseMarkdownStructure(advice);
        
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
            'коричневая': 'Коричневый образ'
        };
        
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
        
        return processedAdvice;
    }

    // ПАТЧ V2: Новый метод парсинга markdown структуры
    parseMarkdownStructure(text) {
        if (!text) return '';
        
        console.log('📋 Парсинг markdown структуры...');
        
        // Обрабатываем заголовки разных уровней
        text = text.replace(/^### (.*$)/gm, '<h4>$1</h4>');
        text = text.replace(/^## (.*$)/gm, '<h3>$1</h3>');
        text = text.replace(/^# (.*$)/gm, '<h2>$1</h2>');
        
        // Обрабатываем заголовки с **Заголовок:**
        text = text.replace(/\*\*(.*?):\*\*/g, '<h4>$1</h4>');
        
        // Обрабатываем жирный текст
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Обрабатываем курсив
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Обрабатываем списки
        text = text.replace(/^- (.*$)/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        
        // Обрабатываем абзацы
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        let formattedText = '';
        
        paragraphs.forEach(paragraph => {
            paragraph = paragraph.trim();
            if (paragraph) {
                // Если это уже HTML тег, не оборачиваем в <p>
                if (paragraph.startsWith('<h') || paragraph.startsWith('<ul') || paragraph.startsWith('<div')) {
                    formattedText += paragraph;
                } else {
                    formattedText += `<p>${paragraph}</p>`;
                }
            }
        });
        
        console.log('✅ Markdown структура обработана');
        return formattedText;
    }

    // 📤 ПАТЧ V2: Исправленная отправка форм с правильным timeout
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

    // ПАТЧ V2: Полностью переписанный метод submitSingle с улучшенной обработкой
    async submitSingle(occasion, preferences) {
        console.log('🚀 Single submit начался с патчами V2');
        
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
        
        // ПАТЧ V2: Создаем promise с увеличенным timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Превышено время ожидания (${this.requestTimeout / 1000} сек)`));
            }, this.requestTimeout);
        });
        
        try {
            console.log('📡 Отправляем запрос к API с timeout 90 сек...');
            console.log('🔍 Используем метод: analyzeSingle');
            
            // ПАТЧ V2: Race между API запросом и timeout
            const apiPromise = this.api.analyzeSingle(this.singleImage, occasion, preferences);
            const result = await Promise.race([apiPromise, timeoutPromise]);
            
            console.log('✅ Single результат получен:', result);
            
            // ПАТЧ V2: Валидация ответа перед обработкой
            if (!result) {
                throw new Error('Пустой ответ от API');
            }
            
            this.lastAnalysisResult = result;
            this.analytics.successfulAnalysis++;
            this.showResult(result);
            this.triggerHapticFeedback('success');
            
        } catch (error) {
            console.error('❌ Single ошибка:', error);
            this.analytics.errors++;
            
            // ПАТЧ V2: Улучшенная обработка различных типов ошибок
            let errorMessage = 'Ошибка анализа';
            
            if (error.message.includes('timeout') || error.message.includes('Превышено время')) {
                errorMessage = 'Анализ занимает больше времени чем обычно. Попробуйте еще раз.';
            } else if (error.message.includes('сети') || error.message.includes('network')) {
                errorMessage = 'Проблемы с сетью. Проверьте подключение к интернету.';
            } else if (error.message.includes('API')) {
                errorMessage = 'Сервис временно недоступен. Попробуйте через несколько минут.';
            } else {
                errorMessage = `Ошибка анализа: ${error.message}`;
            }
            
            this.showError(errorMessage);
            this.triggerHapticFeedback('error');
        }
    }

    // ПАТЧ V2: Улучшенный метод submitCompare
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
        
        console.log(`🚀 Compare submit с патчами V2: отправка ${images.length} изображений`);
        this.showLoading();
        this.triggerHapticFeedback('medium');
        
        // ПАТЧ V2: Timeout для compare запросов
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Превышено время ожидания сравнения (${this.requestTimeout / 1000} сек)`));
            }, this.requestTimeout);
        });
        
        try {
            console.log('📡 Отправляем запрос сравнения к API...');
            console.log('🔍 Используем метод: analyzeCompare');
            
            // ПАТЧ V2: Race между API запросом и timeout
            const apiPromise = this.api.analyzeCompare(images, occasion, preferences);
            const result = await Promise.race([apiPromise, timeoutPromise]);
            
            console.log('✅ Compare результат получен:', result);
            
            // ПАТЧ V2: Валидация ответа
            if (!result) {
                throw new Error('Пустой ответ от API сравнения');
            }
            
            this.lastAnalysisResult = result;
            this.analytics.successfulAnalysis++;
            this.showResult(result);
            this.triggerHapticFeedback('success');
            
        } catch (error) {
            console.error('❌ Compare ошибка:', error);
            this.analytics.errors++;
            
            // ПАТЧ V2: Специализированная обработка ошибок сравнения
            let errorMessage = 'Ошибка сравнения';
            
            if (error.message.includes('timeout') || error.message.includes('Превышено время')) {
                errorMessage = 'Сравнение занимает больше времени чем обычно. Попробуйте с меньшим количеством изображений.';
            } else if (error.message.includes('размер') || error.message.includes('size')) {
                errorMessage = 'Изображения слишком большие. Попробуйте сжать их перед загрузкой.';
            } else {
                errorMessage = `Ошибка сравнения: ${error.message}`;
            }
            
            this.showError(errorMessage);
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
        
        if (preview && fileInput) {
            // Клик по превью открывает файловый диалог
            preview.addEventListener('click', () => {
                fileInput.click();
            });
            
            // Обработка выбора файла
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
        for (let i = 0; i < 4; i++) {
            const slot = document.getElementById(`compare-slot-${i}`);
            const fileInput = document.getElementById(`compare-file-input-${i}`);
            
            if (slot && fileInput) {
                // Клик по слоту открывает файловый диалог
                slot.addEventListener('click', () => {
                    fileInput.click();
                });
                
                // Обработка выбора файла
                fileInput.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        this.handleCompareFile(file, i);
                    }
                });
            }
        }
    }

    // 📷 Обработка одного файла
    handleSingleFile(file) {
        console.log('📷 Обработка single файла:', file.name);
        
        if (!this.validateFile(file)) return;
        
        this.singleImage = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('single-preview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 12px;
                ">`;
                preview.classList.add('has-image');
            }
            
            this.showForm();
            this.updateSubmitButton();
            this.triggerHapticFeedback('light');
        };
        
        reader.readAsDataURL(file);
    }

    // 🔄 Обработка файла для сравнения
    handleCompareFile(file, slotIndex) {
        console.log(`🔄 Обработка compare файла в слот ${slotIndex}:`, file.name);
        
        if (!this.validateFile(file)) return;
        
        this.compareImages[slotIndex] = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const slot = document.getElementById(`compare-slot-${slotIndex}`);
            if (slot) {
                slot.innerHTML = `<img src="${e.target.result}" alt="Compare ${slotIndex + 1}" style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 12px;
                ">`;
                slot.classList.add('has-image');
            }
            
            // Показываем форму если загружено минимум 2 изображения
            const loadedImages = this.compareImages.filter(img => img !== null).length;
            if (loadedImages >= 2) {
                this.showForm();
            }
            
            this.updateSubmitButton();
            this.triggerHapticFeedback('light');
        };
        
        reader.readAsDataURL(file);
    }

    // ✅ Валидация файлов
    validateFile(file) {
        // Проверка типа файла
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('❌ Поддерживаются только JPEG, PNG и WebP форматы', 'error');
            this.triggerHapticFeedback('error');
            return false;
        }
        
        // Проверка размера файла (максимум 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showNotification('❌ Размер файла не должен превышать 10MB', 'error');
            this.triggerHapticFeedback('error');
            return false;
        }
        
        return true;
    }

    // 📢 Система уведомлений
    showNotification(message, type = 'info', duration = 3000) {
        // Удаляем существующие уведомления
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        const colors = {
            'success': '#10B981',
            'error': '#EF4444',
            'warning': '#F59E0B',
            'info': '#3B82F6'
        };
        
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: ${colors[type]};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                max-width: 90vw;
                animation: slideInDown 0.3s ease;
            ">
                <span>${icons[type]}</span>
                <span>${message}</span>
            </div>
        `;
        
        // Добавляем стили анимации если их нет
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                @keyframes slideInDown {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                
                @keyframes slideOutUp {
                    from {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-100%);
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Автоматическое скрытие
        setTimeout(() => {
            const notificationElement = notification.querySelector('div');
            if (notificationElement) {
                notificationElement.style.animation = 'slideOutUp 0.3s ease forwards';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, duration);
    }

    // 📊 Получение аналитики
    getAnalytics() {
        return {
            ...this.analytics,
            uptime: Date.now() - this.analytics.appStartTime,
            userBalance: this.userBalance,
            consultationsTotal: this.consultationsHistory.length,
            currentMode: this.currentMode,
            currentSection: this.currentSection,
            apiStatus: this.api ? 'connected' : 'disconnected',
            isMockAPI: this.api && this.api.isMock || false
        };
    }

    // 🎯 Сброс приложения в исходное состояние
    reset() {
        console.log('🔄 Сброс приложения...');
        
        this.closeModal();
        this.clearImages();
        this.currentMode = null;
        this.isLoading = false;
        this.lastAnalysisResult = null;
        
        // Возвращаемся на главную
        this.navigateToSection('home');
        
        console.log('✅ Приложение сброшено');
    }

    // 🔧 Диагностика
    diagnose() {
        const diagnosis = {
            timestamp: new Date().toISOString(),
            version: '2.1.0',
            initialization: this.initializationComplete,
            api: {
                connected: !!this.api,
                type: this.api ? (this.api.isMock ? 'Mock' : 'Real') : 'None',
                methods: this.api ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.api)) : []
            },
            state: {
                currentMode: this.currentMode,
                currentSection: this.currentSection,
                isLoading: this.isLoading,
                hasImages: {
                    single: !!this.singleImage,
                    compare: this.compareImages.filter(img => img !== null).length
                }
            },
            user: {
                balance: this.userBalance,
                consultationsUsed: this.consultationsUsed,
                historyCount: this.consultationsHistory.length
            },
            analytics: this.getAnalytics(),
            domElements: {
                overlay: !!document.getElementById('consultation-overlay'),
                singlePreview: !!document.getElementById('single-preview'),
                compareSlots: document.querySelectorAll('.compare-slot').length,
                form: !!document.getElementById('consultation-form'),
                submitButton: !!document.getElementById('form-submit')
            }
        };
        
        console.log('🔧 Диагностика МИШУРЫ:', diagnosis);
        return diagnosis;
    }
}

// === ИНИЦИАЛИЗАЦИЯ И ЭКСПОРТ ===

// Ждем загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeMishuraApp();
    });
} else {
    // DOM уже загружен
    initializeMishuraApp();
}

function initializeMishuraApp() {
    try {
        // ПАТЧ V2: Проверяем что приложение еще не создано
        if (window.mishuraApp) {
            console.log('⚠️ MishuraApp уже существует, пропускаем создание');
            return;
        }
        
        console.log('🎬 Создание экземпляра MishuraApp...');
        window.mishuraApp = new MishuraApp();
        
        // Глобальные утилиты для отладки
        window.mishuraUtils = {
            diagnose: () => window.mishuraApp.diagnose(),
            reset: () => window.mishuraApp.reset(),
            analytics: () => window.mishuraApp.getAnalytics(),
            testNotification: (message, type) => window.mishuraApp.showNotification(message, type),
            
            // Быстрые тесты
            testSingle: () => {
                window.mishuraApp.openSingleModal();
                setTimeout(() => {
                    const occasionInput = document.getElementById('occasion');
                    if (occasionInput) occasionInput.value = '💼 Деловая встреча';
                    window.mishuraApp.updateSubmitButton();
                }, 100);
            },
            
            testCompare: () => {
                window.mishuraApp.openCompareModal();
                setTimeout(() => {
                    const occasionInput = document.getElementById('occasion');
                    if (occasionInput) occasionInput.value = '🎉 Вечеринка';
                    window.mishuraApp.updateSubmitButton();
                }, 100);
            }
        };
        
        console.log(`
🎉 === МИШУРА ГОТОВА К РАБОТЕ ===

📋 ДОСТУПНЫЕ КОМАНДЫ В КОНСОЛИ:
• mishuraUtils.diagnose() - диагностика приложения
• mishuraUtils.analytics() - статистика использования  
• mishuraUtils.reset() - сброс состояния
• mishuraUtils.testSingle() - тест single режима
• mishuraUtils.testCompare() - тест compare режима

🎯 ТЕКУЩЕЕ СОСТОЯНИЕ:
• Версия: 2.1.0 с патчами V2
• API: ${window.mishuraApp.api ? (window.mishuraApp.api.isMock ? 'Mock (демо)' : 'Реальный') : 'Не подключен'}
• Баланс: ${window.mishuraApp.userBalance} консультаций
• Timeout: ${window.mishuraApp.requestTimeout / 1000} секунд

✨ Приложение полностью загружено и готово к использованию!
        `);
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации МИШУРЫ:', error);
        
        // Показываем ошибку пользователю
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background: #1a1a1a;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center;
                padding: 20px;
            ">
                <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
                <h1 style="color: #ef4444; margin-bottom: 16px;">Ошибка загрузки МИШУРЫ</h1>
                <p style="color: #a1a1aa; margin-bottom: 20px; max-width: 500px;">
                    Произошла критическая ошибка при инициализации приложения. 
                    Пожалуйста, обновите страницу или обратитесь к разработчику.
                </p>
                <button onclick="location.reload()" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">🔄 Обновить страницу</button>
                <details style="margin-top: 20px; color: #71717a;">
                    <summary style="cursor: pointer;">Техническая информация</summary>
                    <pre style="
                        background: #262626;
                        padding: 12px;
                        border-radius: 6px;
                        margin-top: 8px;
                        font-size: 0.8rem;
                        text-align: left;
                        overflow-x: auto;
                    ">${error.stack || error.message}</pre>
                </details>
            </div>
        `;
    }
}

console.log('📦 МИШУРА App модуль загружен успешно!');