// 🎭 МИШУРА - Твой Стилист
// Главный файл приложения - app.js (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// Версия: 2.6.0 - ИСПРАВЛЕНИЯ ДЛЯ ЮKASSA ПЛАТЕЖЕЙ

class MishuraApp {
    constructor() {
        this.initializeState();
        this.initializeAPI();
    }

    initializeState() {
        console.log('🚀 Инициализация MishuraApp...');
        
        // Состояние приложения
        this.currentMode = null;
        this.currentSection = 'home';
        this.compareImages = [null, null, null, null];
        this.singleImage = null;
        this.isLoading = false;
        this.lastAnalysisResult = null;
        this.requestTimeout = 90000; // 90 секунд
        this.eventListenersAttached = false;
        this.initializationComplete = false;
        
        // Синхронизация аккаунтов (работает в фоне)
        this.syncState = {
            isOnline: navigator.onLine,
            lastSyncTime: 0,
            syncInProgress: false,
            pendingChanges: [],
            userId: null,
            deviceId: null
        };
        
        // Пользовательские данные
        this.userBalance = 200;
        this.consultationsHistory = [];
        this.consultationsUsed = 0;
        
        // Платежи ЮKassa
        this.paymentPackages = null;
        this.currentPayment = null;
        this.paymentCheckInterval = null;
        
        // Интервалы синхронизации
        this.syncInterval = null;
        this.balanceCheckInterval = null;
        this.onlineStatusInterval = null;
        
        this.api = null;
        
        // Варианты поводов
        this.occasionOptions = [
            '💼 Деловая встреча', '❤️ Свидание', '🚶 Повседневная прогулка',
            '🎉 Вечеринка', '👔 Собеседование', '🍽️ Ужин в ресторане',
            '🎭 Театр/концерт', '🏋️ Спортзал/тренировка', '🛍️ Шоппинг',
            '✈️ Путешествие', '🎓 Учеба/университет', '🏠 Дома/отдых',
            '🌞 Пляж/отпуск', '❄️ Зимняя прогулка', '🌧️ Дождливая погода',
            '🎪 Мероприятие на свежем воздухе', '🏢 Офисная работа',
            '🎨 Творческое мероприятие', '👶 Встреча с детьми', '👥 Деловые переговоры'
        ];
        
        // Аналитика
        this.analytics = {
            appStartTime: Date.now(),
            analysisRequested: 0,
            successfulAnalysis: 0,
            errors: 0,
            syncCount: 0,
            syncErrors: 0
        };
        
        this.init = this.init.bind(this);
        setTimeout(() => this.init(), 100);
    }

    // ИСПРАВЛЕНИЕ 1: Принудительное использование реального API
    async initializeAPI() {
        try {
            const healthData = await fetch(`${API_BASE_URL}/api/v1/health`).then(res => res.json());
            console.log('🏥 Статус API:', healthData);
            
            // ИСПРАВЛЕНИЕ: Всегда используем реальный API
            this.api = new window.MishuraAPIService();
            
            console.log('🚀 API инициализирован:', this.api.constructor.name);
            
        } catch (error) {
            console.error('❌ Ошибка при инициализации API:', error);
            // ИСПРАВЛЕНИЕ: Даже при ошибке не пугаем пользователя
            this.showNotification('🔄 Подключение к серверу...', 'info', 3000);
            this.api = new window.MishuraAPIService();
        }
        
        this.updateAPIStatus();
    }

    updateAPIStatus() {
        const isRealAPI = this.api && !this.api.isMock;
        const statusElement = document.querySelector('.api-status');
        
        if (statusElement) {
            statusElement.textContent = isRealAPI ? '🌐 Реальный API' : '🎭 Демо-режим';
            statusElement.className = `api-status ${isRealAPI ? 'real' : 'demo'}`;
        }
        
        console.log('🔧 API статус:', isRealAPI ? 'Реальный API' : 'Демо-режим');
    }

    // === ИНИЦИАЛИЗАЦИЯ ===
    
    async init() {
        console.log('🚀 Инициализация приложения...');
        
        // Исправляем навигацию
            this.setupNavigation();
            
        // Исправляем кнопки режимов
        this.fixModeButtons();
        
        // Если мы в секции баланса - обновляем её
        if (this.currentSection === 'balance') {
            console.log('🔄 Обновляем секцию баланса...');
            this.showBalanceSection();
        }
        
        if (this.initializationComplete) return;

        try {
            this.syncState.deviceId = this.generateDeviceId();
            this.setupNetworkMonitoring();
            this.checkForSuccessfulPayment();
            // ВАЖНО: Инициализируем БАЗОВЫЕ обработчики событий
            this.setupBasicEventHandlers();
            this.loadUserData();
            this.startPeriodicSync();
            this.setupTelegramIntegration();
            this.initModularNavigation();
            this.initializationComplete = true;
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }

    setupBasicEventHandlers() {
        console.log('🔧 Настройка базовых обработчиков событий');
        // Настройка навигации
        this.setupNavigation();
        // Настройка модальных окон
        this.setupModeButtons();
        this.setupCloseButtons();
        this.setupSubmitButton();
        // Настройка загрузчиков
        this.initUploaders();
        // Настройка форм
        this.setupOccasionDropdown();
        this.setupResultNavigation();
        console.log('✅ Базовые обработчики настроены');
    }

    setupNavigation() {
        if (this.navigationSetup) return;
        console.log('🧭 Настройка навигации');
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            // Клонируем кнопку чтобы убрать старые обработчики
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Добавляем правильный обработчик
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const section = newBtn.id.replace('nav-', ''); // nav-balance -> balance
                console.log('🔄 Навигация в секцию:', section);
                
                // Убираем active у всех кнопок
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                // Добавляем active текущей
                newBtn.classList.add('active');
                
                // Навигируем
                this.navigateToSection(section);
                this.triggerHapticFeedback('light');
            });
        });
        this.navigationSetup = true;
        console.log('✅ Навигация настроена');
    }

    setupModeButtons() {
        if (this.modeButtonsSetup) return;

        const singleBtn = document.getElementById('single-mode-btn');
        const compareBtn = document.getElementById('compare-mode-btn');
        
        if (singleBtn) {
            const newSingleBtn = singleBtn.cloneNode(true);
            singleBtn.parentNode.replaceChild(newSingleBtn, singleBtn);
            newSingleBtn.addEventListener('click', () => {
                this.triggerHapticFeedback('light');
                this.openSingleModal();
            });
        }

        if (compareBtn) {
            const newCompareBtn = compareBtn.cloneNode(true);
            compareBtn.parentNode.replaceChild(newCompareBtn, compareBtn);
            newCompareBtn.addEventListener('click', () => {
                this.triggerHapticFeedback('light');
                this.openCompareModal();
            });
        }
        
        this.modeButtonsSetup = true;
        console.log('✅ Mode buttons настроены');
    }

    showHomeSection() {
        console.log('🏠 Показ домашней секции');
        
        const container = document.querySelector('.container');
        if (!container) return;
        
        container.innerHTML = `
            <header class="header">
                <h1>✨ МИШУРА</h1>
                <p>Твой личный стилист в кармане</p>
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
        
        // Перенастраиваем кнопки после изменения DOM
        setTimeout(() => {
            this.modeButtonsSetup = false;
            this.setupModeButtons();
        }, 100);
    }

    showHistorySection() {
        console.log('📚 Показ секции истории');
        
        const container = document.querySelector('.container');
        if (!container) return;
        
        const history = this.consultationsHistory.slice(-10).reverse();
        const consultationsRemaining = Math.floor(this.userBalance / 10);
        
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
                <div style="color: var(--text-gold); font-size: 1.2rem; font-weight: 700; margin-bottom: 6px;">
                    Осталось консультаций: ${consultationsRemaining}
                </div>
                <div style="color: var(--text-muted); font-size: 0.9rem;">
                    ${this.userBalance} STcoin
                </div>
            </div>
        `;

        if (history.length === 0) {
            historyHTML += `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
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

    navigateToSection(section) {
        console.log('🧭 app.js: Навигация в секцию:', section);
        
        // ИСПРАВЛЕНИЕ: Обновляем навигационные кнопки
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = document.getElementById(`nav-${section}`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
        
        // ИСПРАВЛЕНИЕ: Обновляем текущую секцию
        this.currentSection = section;
        
        // ИСПРАВЛЕНИЕ: Закрываем модалы
        this.closeModal();
        
        // ИСПРАВЛЕНИЕ: Показываем нужную секцию
        if (window.MishuraApp && 
            window.MishuraApp.components && 
            window.MishuraApp.components.navigation) {
            // Используем модульную навигацию если доступна
            window.MishuraApp.components.navigation.navigateTo(section);
        } else {
            // Fallback на прямой вызов
            console.log('📄 Прямой показ секции:', section);
            this.showSection(section);
        }
    }

    showSection(section) {
        console.log('📄 Показ секции:', section);
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
            default:
                console.warn('❌ Неизвестная секция:', section);
        }
    }

    async showBalanceSection() {
        console.log('💰 ПОКАЗ СЕКЦИИ БАЛАНСА С АВТООБНОВЛЕНИЕМ');
        
        const container = document.querySelector('.container');
        if (!container) return;
        
        const consultationsRemaining = Math.floor(this.userBalance / 10);
        
        // Показываем интерфейс с текущими данными
        container.innerHTML = `
            <div class="balance-card" style="
                background: var(--gold-gradient);
                color: var(--text-dark);
                border-radius: 20px;
                padding: 24px;
                margin-bottom: 24px;
                text-align: center;
                box-shadow: var(--shadow-gold);
            ">
                <div style="font-size: 2.5rem; font-weight: 900; margin-bottom: 8px;" data-balance-display>
                    ${this.userBalance}
                </div>
                <div style="font-size: 1.1rem; font-weight: 600; text-transform: uppercase;">
                    STcoin
                </div>
                <div style="font-size: 0.9rem; margin-top: 8px; opacity: 0.8;">
                    Доступно консультаций: <span data-consultations-display>${consultationsRemaining}</span>
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
                    <span style="color: var(--text-muted);">Потрачено STcoin:</span>
                    <span style="color: var(--text-light); font-weight: 600;">${this.consultationsUsed}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Остаток STcoin:</span>
                    <span style="color: var(--text-gold); font-weight: 600;" data-balance-display>${this.userBalance}</span>
                </div>
            </div>
            
            <!-- КНОПКИ ВНИЗУ -->
            <div class="balance-actions">
                <button class="action-btn" onclick="window.mishuraApp.showPaymentModal()" style="
                    width: 100%;
                    margin-bottom: 16px;
                    background: rgba(26, 26, 26, 0.8);
                    border: 2px solid var(--border-gold);
                    color: var(--text-gold);
                    padding: 20px;
                    font-size: 1.1rem;
                ">
                    <span style="margin-right: 8px;">💳</span>
                    Пополнить STcoin
                </button>
                
                <button class="action-btn" onclick="window.open('https://t.me/marketolog_online', '_blank')" style="
                    width: 100%;
                    margin-bottom: 16px;
                    background: rgba(26, 26, 26, 0.8);
                    border: 2px solid rgba(0, 123, 255, 0.5);
                    color: #007bff;
                        padding: 20px;
                    font-size: 1.1rem;
                ">
                    <span style="margin-right: 8px;">💬</span>
                    Связаться с поддержкой
                </button>
            </div>
        `;

        // АВТООБНОВЛЕНИЕ: Сразу синхронизируем баланс при входе в секцию
        console.log('🔄 Автообновление при входе в секцию баланса...');
        setTimeout(async () => {
            await this.refreshBalance();
        }, 500);
    }

    // ИСПРАВЛЕНИЕ 3: Возврат в секцию баланса после оплаты
    async checkForSuccessfulPayment() {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment_success');
        const urlUserId = urlParams.get('user_id');
        const returnTo = urlParams.get('return_to');
        
        console.log('🔍 Проверка успешной оплаты:', { paymentSuccess, urlUserId, returnTo });

        if (paymentSuccess === '1' && urlUserId) {
            const numericUserId = parseInt(urlUserId);
            if (numericUserId === this.getCurrentUserId()) {
                console.log('🎉 Обрабатываем успешную оплату...');
                
                // ИСПРАВЛЕНИЕ: Сразу переходим в секцию баланса
                setTimeout(() => {
                    console.log('🎯 Переходим в секцию баланса');
                    this.navigateToSection('balance');
                }, 500);
                
                // ИСПРАВЛЕНИЕ: Принудительно обновляем баланс через 2 секунды
                setTimeout(async () => {
                    console.log('🔄 Принудительное обновление баланса...');
                    const oldBalance = this.userBalance;
                    
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/v1/users/${numericUserId}/balance?_t=${Date.now()}`);
                        if (response.ok) {
                            const balanceData = await response.json();
                            const newBalance = balanceData.balance;
                            
                            // Обновляем локальный баланс
                            this.userBalance = newBalance;
                            this.saveUserData();
                            
                            // Обновляем отображение
                            this.updateBalanceDisplay(newBalance);
                            
                            const difference = newBalance - oldBalance;
                            if (difference > 0) {
                                this.showNotification(`🎉 Баланс пополнен на ${difference} STcoin!`, 'success', 5000);
                                this.triggerHapticFeedback('success');
                            }
                            
                            console.log(`✅ Баланс обновлен: ${oldBalance} → ${newBalance} STcoin`);
                        }
                    } catch (error) {
                        console.error('❌ Ошибка обновления баланса:', error);
                        // Попытаемся еще раз через 5 секунд
                        setTimeout(() => this.forceSyncBalance(), 5000);
                    }
                }, 2000);
                
                // ИСПРАВЛЕНИЕ: Очищаем URL от параметров только после обработки
                setTimeout(() => {
                    const newUrl = window.location.origin + window.location.pathname;
                    window.history.replaceState({}, document.title, newUrl);
                }, 3000);
            }
        }
    }

    // === НАВИГАЦИЯ ===

    setupCloseButtons() {
        if (this.eventListenersAttached) return;

        document.addEventListener('click', (event) => {
            if (event.target.matches('#consultation-cancel, .close-btn, #form-cancel')) {
                this.closeModal();
                this.triggerHapticFeedback('light');
            }
        });
    }

    setupSubmitButton() {
        if (this.submitButtonSetup) return;

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

    setupOccasionDropdown() {
        if (this.occasionDropdownSetup) return;

        document.addEventListener('click', (event) => {
            const occasionInput = document.getElementById('occasion');
            const optionsContainer = document.getElementById('occasion-options');
            
            if (!occasionInput || !optionsContainer) return;
            
            if (event.target === occasionInput) {
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

    setupResultNavigation() {
        document.addEventListener('click', (event) => {
            if (event.target.matches('#result-back')) {
                this.backToSelection();
            } else if (event.target.matches('#result-new')) {
                this.startNewAnalysis();
            }
        });
    }

    backToSelection() {
        this.hideResult();
        
        if (this.currentMode === 'single') {
            const singleMode = document.getElementById('single-mode');
            if (singleMode) singleMode.classList.add('active');
        } else if (this.currentMode === 'compare') {
            const compareMode = document.getElementById('compare-mode');
            if (compareMode) compareMode.classList.add('active');
        }
        
        if ((this.currentMode === 'single' && this.singleImage) || 
            (this.currentMode === 'compare' && this.compareImages.filter(img => img !== null).length >= 2)) {
            this.showForm();
        }
    }

    startNewAnalysis() {
        this.closeModal();
    }

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
        }
    }

    triggerHapticFeedback(type = 'light') {
        try {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                const feedback = window.Telegram.WebApp.HapticFeedback;
                switch (type) {
                    case 'light': feedback.impactOccurred('light'); break;
                    case 'medium': feedback.impactOccurred('medium'); break;
                    case 'heavy': feedback.impactOccurred('heavy'); break;
                    case 'success': feedback.notificationOccurred('success'); break;
                    case 'warning': feedback.notificationOccurred('warning'); break;
                    case 'error': feedback.notificationOccurred('error'); break;
                }
            }
        } catch (error) {
            // Игнорируем ошибки haptic feedback
        }
    }

    // === ПЛАТЕЖИ (ОСНОВНЫЕ ИСПРАВЛЕНИЯ) ===
    
    showPaymentModal() {
        if (!window.PRICING_PLANS) {
            this.showNotification('🔄 Загружаем тарифы...', 'info');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'payment-modal';
        
        let packagesHTML = '';
        Object.entries(window.PRICING_PLANS).forEach(([planId, plan]) => {
            const isPopular = plan.popular;
            packagesHTML += `
                <div class="pricing-card ${isPopular ? 'popular' : ''}" 
                     onclick="window.mishuraApp.initiatePayment('${planId}')"
                     style="
                        background: ${isPopular ? 'rgba(212, 175, 55, 0.1)' : 'rgba(26, 26, 26, 0.8)'};
                        border: 2px solid ${isPopular ? 'var(--border-gold)' : 'var(--border-light)'};
                        border-radius: 16px;
                        padding: 20px;
                        margin-bottom: 16px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                     ">
                    ${isPopular ? '<div style="position: absolute; top: -8px; right: 16px; background: var(--gold-gradient); color: var(--text-dark); padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">🔥 ПОПУЛЯРНЫЙ</div>' : ''}
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h3 style="color: var(--text-gold); margin: 0; font-size: 1.2rem;">${plan.name}</h3>
                        <div style="color: var(--text-light); font-size: 1.5rem; font-weight: 700;">${plan.price}₽</div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="color: var(--text-light);">
                            <span style="font-size: 1.1rem; font-weight: 600;">${plan.stcoins}</span>
                            <span style="color: var(--text-muted); margin-left: 4px;">STcoin</span>
                        </div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">
                            ${plan.consultations} консультаций
                        </div>
                    </div>
                </div>
            `;
        });

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">💳 Пополнение STcoin</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="
                        background: rgba(212, 175, 55, 0.1);
                        border: 1px solid var(--border-gold);
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 20px;
                        text-align: center;
                    ">
                        <div style="color: var(--text-gold); font-weight: 600; margin-bottom: 8px;">
                            🔒 Безопасная оплата через ЮKassa
                        </div>
                        <div style="color: var(--text-light); font-size: 0.9rem;">
                            Принимаем карты Visa, MasterCard, МИР, СБП и другие способы оплаты
                        </div>
                    </div>
                    
                    <div class="payment-packages">
                        ${packagesHTML}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.triggerHapticFeedback('light');
    }

    // ИСПРАВЛЕНИЕ 2: Правильный return_url для платежей
    async initiatePayment(planId) {
        const plan = window.PRICING_PLANS[planId];
        if (!plan) {
            this.showNotification('❌ План не найден', 'error');
            return;
        }

        try {
            this.showNotification('💳 Создаем платеж...', 'info');
            
            const userId = this.getUserId();
            console.log('💰 Создание платежа для пользователя:', userId, 'план:', planId);
            
            // ИСПРАВЛЕНИЕ: Правильный return_url для возврата в секцию баланса
            const baseUrl = window.location.origin + window.location.pathname;
            const returnUrl = `${baseUrl}?payment_success=1&user_id=${userId}&return_to=balance`;
            
            const paymentData = {
                telegram_id: userId,
                plan_id: planId,
                username: 'webapp_user',
                first_name: 'WebApp',
                last_name: 'User',
                return_url: returnUrl
            };
            
            console.log('📤 Отправляем данные платежа:', paymentData);
            
            const response = await fetch(`${API_BASE_URL}/api/v1/payments/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Ответ от сервера:', result);

            if (result.payment_url) {
                this.showNotification('🚀 Переходим к оплате...', 'success');
                console.log('🔗 Открываем URL:', result.payment_url);
                
                // Закрываем модал
                const paymentModal = document.getElementById('payment-modal');
                if (paymentModal) {
                    paymentModal.remove();
                }
                
                // ИСПРАВЛЕНИЕ: В TEST_MODE не открываем внешний URL, а сразу обрабатываем
                if (result.debug_info && result.debug_info.test_mode) {
                    console.log('🧪 TEST MODE: имитируем возврат после оплаты');
                    
                    // Имитируем возврат с платежной системы через 2 секунды
                    setTimeout(() => {
                        // Добавляем параметры в URL
                        const newUrl = returnUrl;
                        window.history.pushState({}, document.title, newUrl);
                        
                        // Запускаем проверку успешной оплаты
                        this.checkForSuccessfulPayment();
                    }, 2000);
                    
                } else {
                    // В реальном режиме открываем платежную страницу
                    window.location.href = result.payment_url;
                }
                
            } else {
                throw new Error('Не получен URL для оплаты');
            }

        } catch (error) {
            console.error('❌ Ошибка создания платежа:', error);
            this.showNotification(`❌ Ошибка: ${error.message}`, 'error', 5000);
        }
    }

    // === МОДАЛЬНЫЕ ОКНА ===
    
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
        
        const singlePreview = document.getElementById('single-preview');
        if (singlePreview) {
            singlePreview.innerHTML = '<div class="upload-text">Нажмите для выбора фото</div>';
            singlePreview.classList.remove('has-image');
        }
        
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
        
        const normalizedResult = this.normalizeAPIResponse(result);
        
        const content = document.getElementById('result-content');
        if (content) {
            content.innerHTML = this.formatAdvice(normalizedResult.advice);
        }
        
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
        
        this.deductConsultation(10);
        this.consultationsHistory.push(consultation);
        this.saveUserData();
        
        if (this.userBalance <= 50) {
            setTimeout(() => {
                const consultationsRemaining = Math.floor(this.userBalance / 10);
                this.showNotification(`⚠️ Осталось ${consultationsRemaining} консультаций`, 'warning', 4000);
            }, 2000);
        }
    }

    normalizeAPIResponse(response) {
        if (response && typeof response === 'object' && response.advice) {
            return {
                advice: response.advice,
                metadata: response.metadata || {
                    timestamp: new Date().toISOString(),
                    status: response.status || 'success'
                }
            };
        }
        
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

    formatAdvice(advice) {
        if (!advice) return '';
        
        let processedAdvice = this.parseMarkdownStructure(advice);
        
        const colorMapping = {
            'синий': 'Синий образ', 'синем': 'Синий образ', 'синяя': 'Синий образ',
            'красный': 'Красный образ', 'красном': 'Красный образ', 'красная': 'Красный образ',
            'белый': 'Белый образ', 'белом': 'Белый образ', 'белая': 'Белый образ',
            'черный': 'Черный образ', 'черном': 'Черный образ', 'черная': 'Черный образ'
        };
        
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
        
        Object.entries(colorMapping).forEach(([color, title]) => {
            const regex = new RegExp(`(в|на)\\s+${color}[а-я]*\\s+(платье|рубашке|футболке|блузке|костюме|жакете|пиджаке|брюках|джинсах|юбке|шортах|топе|кардигане|свитере|пальто|куртке)`, 'gi');
            processedAdvice = processedAdvice.replace(regex, `<span class="outfit-title">${title}</span>`);
        });
        
        return processedAdvice;
    }

    parseMarkdownStructure(text) {
        if (!text) return '';
        
        text = text.replace(/^### (.*$)/gm, '<h4>$1</h4>');
        text = text.replace(/^## (.*$)/gm, '<h3>$1</h3>');
        text = text.replace(/^# (.*$)/gm, '<h2>$1</h2>');
        text = text.replace(/\*\*(.*?):\*\*/g, '<h4>$1</h4>');
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        text = text.replace(/^- (.*$)/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        let formattedText = '';
        
        paragraphs.forEach(paragraph => {
            paragraph = paragraph.trim();
            if (paragraph) {
                if (paragraph.startsWith('<h') || paragraph.startsWith('<ul') || paragraph.startsWith('<div')) {
                    formattedText += paragraph;
                } else {
                    formattedText += `<p>${paragraph}</p>`;
                }
            }
        });
        
        return formattedText;
    }

    // === ОТПРАВКА ФОРМ ===
    
    async submit() {
        if (this.isLoading) return;
        
        const occasion = document.getElementById('occasion')?.value?.trim() || '';
        const preferences = document.getElementById('preferences')?.value?.trim() || '';
        
        if (!occasion) {
            this.showNotification('Пожалуйста, укажите повод', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        if (this.userBalance < 10) {
            this.showNotification('❌ Недостаточно STcoin! Пополните баланс', 'error');
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
        if (!this.singleImage) {
            this.showNotification('Загрузите изображение', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        if (!this.api) {
            this.showNotification('❌ API не подключен', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        this.showLoading();
        this.triggerHapticFeedback('medium');
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Превышено время ожидания (${this.requestTimeout / 1000} сек)`));
            }, this.requestTimeout);
        });
        
        try {
            const apiPromise = this.api.analyzeSingle(this.singleImage, occasion, preferences);
            const result = await Promise.race([apiPromise, timeoutPromise]);
            
            if (!result) {
                throw new Error('Пустой ответ от API');
            }
            
            this.lastAnalysisResult = result;
            this.analytics.successfulAnalysis++;
            this.showResult(result);
            this.triggerHapticFeedback('success');
            
        } catch (error) {
            this.analytics.errors++;
            
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

    async submitCompare(occasion, preferences) {
        const images = this.compareImages.filter(img => img !== null);
        
        if (images.length < 2) {
            this.showNotification('Загрузите минимум 2 изображения', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        if (!this.api) {
            this.showNotification('❌ API не подключен', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        this.showLoading();
        this.triggerHapticFeedback('medium');
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Превышено время ожидания сравнения (${this.requestTimeout / 1000} сек)`));
            }, this.requestTimeout);
        });
        
        try {
            const apiPromise = this.api.analyzeCompare(images, occasion, preferences);
            const result = await Promise.race([apiPromise, timeoutPromise]);
            
            if (!result) {
                throw new Error('Пустой ответ от API сравнения');
            }
            
            this.lastAnalysisResult = result;
            this.analytics.successfulAnalysis++;
            this.showResult(result);
            this.triggerHapticFeedback('success');
            
        } catch (error) {
            this.analytics.errors++;
            
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

    // === СИСТЕМА УВЕДОМЛЕНИЙ ===
    
    showNotification(message, type = 'info', duration = 3000) {
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

    // === DRAG & DROP ===
    
    setupDragAndDrop() {
        if (this.dragDropSetup) return;

        const singlePreview = document.getElementById('single-preview');
        if (singlePreview) {
            this.setupDragDropForElement(singlePreview, (file) => {
                this.handleSingleFile(file);
            });
        }
        
        document.querySelectorAll('.compare-slot').forEach((slot, index) => {
            this.setupDragDropForElement(slot, (file) => {
                this.handleCompareFile(file, index);
            });
        });
        
        this.dragDropSetup = true;
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

    setupKeyboardShortcuts() {
        if (this.keyboardSetup) return;

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeModal();
            }
            
            if (event.key === 'Enter' && event.ctrlKey) {
                const submitBtn = document.getElementById('form-submit');
                if (submitBtn && !submitBtn.disabled) {
                    this.submit();
                }
            }
            
            if (event.key === 's' || event.key === 'ы') {
                if (this.currentSection === 'home' && !document.querySelector('.modal-overlay.active')) {
                    this.openSingleModal();
                }
            }
            
            if (event.key === 'c' || event.key === 'с') {
                if (this.currentSection === 'home' && !document.querySelector('.modal-overlay.active')) {
                    this.openCompareModal();
                }
            }
        });
        
        this.keyboardSetup = true;
    }

    setupContextMenu() {
        if (this.contextMenuSetup) return;

        document.addEventListener('contextmenu', (event) => {
            if (event.target.closest('.upload-preview, .compare-slot img')) {
                event.preventDefault();
                this.showImageContextMenu(event);
            }
        });

        this.contextMenuSetup = true;
    }

    showImageContextMenu(event) {
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
        
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }

    replaceImage(imgElement) {
        const slot = imgElement.closest('.compare-slot');
        if (slot) {
            const slotIndex = parseInt(slot.dataset.slot);
            const fileInput = document.getElementById(`compare-file-input-${slotIndex}`);
            if (fileInput) fileInput.click();
        } else {
            const fileInput = document.getElementById('single-file-input');
            if (fileInput) fileInput.click();
        }
    }

    removeImage(imgElement) {
        const slot = imgElement.closest('.compare-slot');
        if (slot) {
            const slotIndex = parseInt(slot.dataset.slot);
            this.compareImages[slotIndex] = null;
            slot.innerHTML = `
                <span class="slot-number">${slotIndex + 1}</span>
                <span class="add-icon">+</span>
            `;
            slot.classList.remove('has-image');
        } else {
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

    // === ЗАГРУЗЧИКИ ФАЙЛОВ ===
    
    initUploaders() {
        this.setupSingleUploader();
        this.setupCompareUploader();
    }

    setupSingleUploader() {
        const preview = document.getElementById('single-preview');
        const fileInput = document.getElementById('single-file-input');
        
        if (preview && fileInput) {
            preview.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    this.handleSingleFile(file);
                }
            });
        }
    }

    setupCompareUploader() {
        const slots = document.querySelectorAll('.compare-slot');
        
        slots.forEach((slot, i) => {
            if (!slot.id) {
                slot.id = `compare-slot-${i}`;
            }
            
            const fileInput = document.getElementById(`compare-file-input-${i}`);
            
            if (slot && fileInput) {
                const newSlot = slot.cloneNode(true);
                slot.parentNode.replaceChild(newSlot, slot);
                
                newSlot.addEventListener('click', () => {
                    fileInput.click();
                });
                
                fileInput.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        this.handleCompareFile(file, i);
                    }
                    event.target.value = '';
                });
            }
        });
    }

    handleSingleFile(file) {
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

    handleCompareFile(file, slotIndex) {
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
            
            const loadedImages = this.compareImages.filter(img => img !== null).length;
            if (loadedImages >= 2) {
                this.showForm();
            }
            
            this.updateSubmitButton();
            this.triggerHapticFeedback('light');
        };
        
        reader.readAsDataURL(file);
    }

    validateFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('❌ Поддерживаются только JPEG, PNG и WebP форматы', 'error');
            this.triggerHapticFeedback('error');
            return false;
        }
        
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showNotification('❌ Размер файла не должен превышать 10MB', 'error');
            this.triggerHapticFeedback('error');
            return false;
        }
        
        return true;
    }

    // === УПРАВЛЕНИЕ ДАННЫМИ ===
    
    loadUserData() {
        try {
            const data = JSON.parse(localStorage.getItem('mishura_user_data') || '{}');
            this.userBalance = data.balance || 200;
            this.consultationsHistory = data.history || [];
            this.consultationsUsed = data.used || 0;
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
                lastSaved: Date.now(),
                syncState: {
                    lastSync: this.syncState.lastSyncTime,
                    deviceId: this.syncState.deviceId,
                    userId: this.syncState.userId
                }
            };
            
            localStorage.setItem('mishura_user_data', JSON.stringify(data));
        } catch (error) {
            console.error('❌ Ошибка сохранения данных пользователя:', error);
        }
    }

    initializeUserData() {
        this.userBalance = 200;
        this.consultationsHistory = [];
        this.consultationsUsed = 0;
        this.saveUserData();
        this.showNotification('🎉 Добро пожаловать! У вас 200 STcoin!', 'success', 5000);
    }

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

    // === УТИЛИТЫ ===
    
    getAnalytics() {
        return {
            ...this.analytics,
            uptime: Date.now() - this.analytics.appStartTime,
            userBalance: this.userBalance,
            consultationsTotal: this.consultationsHistory.length,
            currentMode: this.currentMode,
            currentSection: this.currentSection,
            apiStatus: this.api ? 'connected' : 'disconnected',
            isMockAPI: this.api && this.api.isMock || false,
            syncStatus: {
                userId: this.syncState.userId,
                deviceId: this.syncState.deviceId,
                isOnline: this.syncState.isOnline,
                lastSync: this.syncState.lastSyncTime,
                pendingChanges: this.syncState.pendingChanges.length,
                syncCount: this.analytics.syncCount,
                syncErrors: this.analytics.syncErrors
            }
        };
    }

    reset() {
        this.stopPeriodicSync();
        this.closeModal();
        this.clearImages();
        this.currentMode = null;
        this.isLoading = false;
        this.lastAnalysisResult = null;
        this.currentPayment = null;
        
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
            this.paymentCheckInterval = null;
        }
        
        this.syncState.syncInProgress = false;
        this.syncState.pendingChanges = [];
        this.navigateToSection('home');
        this.startPeriodicSync();
    }

    // ИСПРАВЛЕНИЕ 4: Дополнительная диагностика
    diagnose() {
        console.log('🔧 ДИАГНОСТИКА ПРИЛОЖЕНИЯ:');
        console.log('- API тип:', this.api ? this.api.constructor.name : 'НЕ ИНИЦИАЛИЗИРОВАН');
        console.log('- API_BASE_URL:', API_BASE_URL);
        console.log('- USER_ID:', this.getCurrentUserId());
        console.log('- Текущая секция:', this.currentSection);
        console.log('- PRICING_PLANS загружены:', Object.keys(window.PRICING_PLANS || {}).length > 0);
        
        // Проверяем доступность API
        fetch(`${API_BASE_URL}/api/v1/health`)
            .then(res => res.json())
            .then(data => console.log('- API здоровье:', data))
            .catch(err => console.error('- API ошибка:', err));
            
        return {
            apiType: this.api ? this.api.constructor.name : 'НЕ ИНИЦИАЛИЗИРОВАН',
            baseUrl: API_BASE_URL,
            userId: this.getCurrentUserId(),
            section: this.currentSection,
            plansLoaded: Object.keys(window.PRICING_PLANS || {}).length > 0
        };
    }

    generateDeviceId() {
        try {
            let deviceId = localStorage.getItem('device_id');
            if (!deviceId) {
                const components = [
                    navigator.userAgent, navigator.language,
                    screen.width + 'x' + screen.height,
                    new Date().getTimezoneOffset(),
                    Date.now(), Math.random()
                ];
                const hash = components.join('|').split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                }, 0);
                deviceId = `dev_${Math.abs(hash)}_${Date.now()}`;
                localStorage.setItem('device_id', deviceId);
            }
            return deviceId;
        } catch (e) {
            return `temp_${Date.now()}_${Math.random()}`;
        }
    }

    getCurrentUserId() {
        // Получение user_id из URL или Telegram
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get('user_id');
        if (urlUserId && !isNaN(urlUserId)) {
            return parseInt(urlUserId);
        }
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
            return window.Telegram.WebApp.initDataUnsafe.user.id;
        }
        
        return 5930269100; // Fallback для тестирования
    }

    setupNetworkMonitoring() {
        // Мониторинг состояния сети
        window.addEventListener('online', () => {
            this.syncState.isOnline = true;
        });
        window.addEventListener('offline', () => {
            this.syncState.isOnline = false;
        });
    }

    startPeriodicSync() {
        // Заглушка для синхронизации
        console.log('Синхронизация в фоне активна');
    }

    stopPeriodicSync() {
        // Заглушка для остановки синхронизации
    }

    addPendingChange(type, data) {
        // Заглушка для pending changes
    }

    syncWithServer(force = false) {
        // Заглушка для синхронизации с сервером
        return Promise.resolve();
    }

    async forceSyncBalance() {
        try {
            console.log('🔄 Принудительная синхронизация баланса...');
            
            const userId = this.getCurrentUserId();
            
            // Получаем актуальный баланс с сервера
            const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/balance`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const balanceData = await response.json();
            const newBalance = balanceData.balance || 0;
            
            // Обновляем локальный баланс
            const oldBalance = this.userBalance;
            this.userBalance = newBalance;
            
            // Сохраняем изменения
            this.saveUserData();
            
            // Обновляем отображение баланса в интерфейсе
            this.updateBalanceDisplay(newBalance);
            
            // Уведомляем пользователя если баланс изменился
            if (newBalance !== oldBalance) {
                const difference = newBalance - oldBalance;
                if (difference > 0) {
                    this.showNotification(
                        `🎉 Баланс пополнен на ${difference} STcoin! Новый баланс: ${newBalance}`, 
                        'success', 
                        5000
                    );
                    this.triggerHapticFeedback('success');
                } else if (difference < 0) {
                    this.showNotification(
                        `💸 Списано ${Math.abs(difference)} STcoin. Остаток: ${newBalance}`, 
                        'info', 
                        3000
                    );
                }
            }
            
            console.log(`💰 Баланс синхронизирован: ${oldBalance} → ${newBalance} STcoin`);
            
            return {
                oldBalance,
                newBalance,
                difference: newBalance - oldBalance,
                success: true
            };
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации баланса:', error);
            this.showNotification('❌ Ошибка обновления баланса', 'error');
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async refreshBalance() {
        try {
            console.log('🔄 === ОТЛАДКА ОБНОВЛЕНИЯ БАЛАНСА ===');
            
            // Показываем индикатор загрузки
            this.showNotification('🔄 Обновляем баланс...', 'info', 2000);
            
            const currentUserId = this.getCurrentUserId();
            console.log('👤 User ID:', currentUserId);
            
            // ОТЛАДКА: Сначала проверяем текущий баланс напрямую
            const directBalanceURL = `${API_BASE_URL}/api/v1/users/${currentUserId}/balance?_t=${Date.now()}`;
            console.log('🌐 Прямой запрос баланса:', directBalanceURL);
            
            const directResponse = await fetch(directBalanceURL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!directResponse.ok) {
                throw new Error(`HTTP ${directResponse.status}: ${directResponse.statusText}`);
            }
            
            const directData = await directResponse.json();
            console.log('💰 Баланс с сервера:', directData);
            
            // ОТЛАДКА: Проверяем есть ли pending платежи
            const paymentsURL = `${API_BASE_URL}/api/v1/payments/history?user_id=${currentUserId}`;
            console.log('📋 Запрос истории платежей:', paymentsURL);
            
            try {
                const paymentsResponse = await fetch(paymentsURL);
                if (paymentsResponse.ok) {
                    const paymentsData = await paymentsResponse.json();
                    const pendingPayments = paymentsData.filter(p => p.status === 'pending');
                    const completedPayments = paymentsData.filter(p => p.status === 'completed');
                    
                    console.log('📊 Статистика платежей:');
                    console.log('  - Всего платежей:', paymentsData.length);
                    console.log('  - Pending:', pendingPayments.length);
                    console.log('  - Completed:', completedPayments.length);
                    
                    if (pendingPayments.length > 0) {
                        console.log('⚠️ Есть pending платежи! Пытаемся синхронизировать...');
                        
                        // Пытаемся синхронизировать
                        const syncURL = `${API_BASE_URL}/api/v1/payments/sync_all`;
                        const syncResponse = await fetch(syncURL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ user_id: currentUserId })
                        });
                        
                        if (syncResponse.ok) {
                            const syncResult = await syncResponse.json();
                            console.log('🔄 Результат синхронизации:', syncResult);
                            
                            if (syncResult.synchronized > 0) {
                                this.showNotification(`🎉 Синхронизировано ${syncResult.synchronized} платежей!`, 'success', 3000);
                                
                                // Повторно запрашиваем баланс после синхронизации
                                const updatedResponse = await fetch(directBalanceURL);
                                if (updatedResponse.ok) {
                                    const updatedData = await updatedResponse.json();
                                    console.log('💰 Обновленный баланс:', updatedData);
                                    
                                    // Обновляем локальный баланс
                                    const oldBalance = this.userBalance;
                                    this.userBalance = updatedData.balance;
                                    this.saveUserData();
                                    
                                    const difference = updatedData.balance - oldBalance;
                                    this.showNotification(`✅ Баланс обновлен! +${difference} STcoin`, 'success', 4000);
                                    this.updateBalanceDisplay(updatedData.balance);
                                    
                                    return { success: true, balance: updatedData.balance, difference: difference };
                                }
                            } else {
                                this.showNotification('ℹ️ Нет новых платежей для зачисления', 'info', 2000);
                            }
                        } else {
                            console.error('❌ Ошибка синхронизации:', await syncResponse.text());
                        }
                    }
                }
            } catch (paymentsError) {
                console.error('❌ Ошибка получения платежей:', paymentsError);
            }
            
            // Обновляем локальный баланс в любом случае
            const oldBalance = this.userBalance;
            this.userBalance = directData.balance;
            this.saveUserData();
            
            console.log(`💰 Баланс: ${oldBalance} → ${directData.balance} STcoin`);
            
            // Показываем результат
            const difference = directData.balance - oldBalance;
            if (difference !== 0) {
                this.showNotification(`✅ Баланс обновлен: ${directData.balance} STcoin`, 'success', 3000);
            }
            
            // ВАЖНО: Обновляем отображение в интерфейсе
            this.updateBalanceDisplay(directData.balance);
            
            console.log('🔄 === ОТЛАДКА ЗАВЕРШЕНА ===');
            return { success: true, balance: directData.balance, difference: difference };
            
        } catch (error) {
            console.error('❌ ПОЛНАЯ ОШИБКА ОБНОВЛЕНИЯ БАЛАНСА:', error);
            this.showNotification('❌ Ошибка обновления баланса', 'error', 3000);
            return { success: false, error: error.message };
        }
    }

    updateBalanceDisplay(newBalance) {
        console.log('📊 Обновляем отображение баланса:', newBalance);
        
        // Обновляем все элементы с балансом на странице
        const balanceElements = document.querySelectorAll('[data-balance-display]');
        balanceElements.forEach(element => {
            element.textContent = newBalance;
            console.log('✅ Обновлен элемент баланса:', element);
        });
        
        // Обновляем количество доступных консультаций
        const consultationsRemaining = Math.floor(newBalance / 10);
        const consultationsElements = document.querySelectorAll('[data-consultations-display]');
        consultationsElements.forEach(element => {
            element.textContent = consultationsRemaining;
            console.log('✅ Обновлен элемент консультаций:', element);
        });
        
        // НЕ ПЕРЕРИСОВЫВАЕМ секцию полностью - это вызывает переход на главную!
        console.log('✅ Баланс обновлен без перерисовки секции');
    }

    deductConsultation(cost = 10) {
        this.userBalance -= cost;
        this.consultationsUsed += cost;
        this.saveUserData();
    }

    // Инициализация модульной навигации
    initModularNavigation() {
        if (window.MishuraApp && 
            window.MishuraApp.components && 
            window.MishuraApp.components.navigation) {
            
            console.log('🔧 Инициализация модульной навигации');
            window.MishuraApp.components.navigation.init();
        }
    }

    fixModeButtons() {
        const singleBtn = document.getElementById('single-mode-btn');
        const compareBtn = document.getElementById('compare-mode-btn');
        
        if (singleBtn) {
            const newSingleBtn = singleBtn.cloneNode(true);
            singleBtn.parentNode.replaceChild(newSingleBtn, singleBtn);
            newSingleBtn.addEventListener('click', () => {
                console.log('📷 Открываем анализ образа');
                if (window.mishuraApp) {
                    window.mishuraApp.openSingleModal();
                }
            });
            console.log('✅ Кнопка анализа образа починена');
        }

        if (compareBtn) {
            const newCompareBtn = compareBtn.cloneNode(true);
            compareBtn.parentNode.replaceChild(newCompareBtn, compareBtn);
            newCompareBtn.addEventListener('click', () => {
                console.log('🔄 Открываем сравнение образов');
                if (window.mishuraApp) {
                    window.mishuraApp.openCompareModal();
                }
            });
            console.log('✅ Кнопка сравнения образов починена');
        }
    }

    // 1. ЗАМЕНА getUserId
    getUserId() {
        try {
            console.log('🔍 Получение User ID...');
            // 1. Проверяем Telegram WebApp
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
                const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
                console.log('✅ Получен Telegram ID из WebApp:', telegramId);
                return telegramId;
            }
            // 2. Проверяем URL параметры (для тестирования)
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('user_id')) {
                const userId = parseInt(urlParams.get('user_id'));
                console.log('✅ Получен user_id из URL:', userId);
                return userId;
            }
            // 3. Проверяем localStorage
            const storedId = localStorage.getItem('telegram_user_id');
            if (storedId && !isNaN(storedId)) {
                const userId = parseInt(storedId);
                console.log('✅ Получен user_id из localStorage:', userId);
                return userId;
            }
            // 4. Тестовый ID для разработки
            const testId = 5930269100;
            console.warn('⚠️ Используется тестовый telegram_id:', testId);
            // Сохраняем тестовый ID в localStorage для следующих запросов
            localStorage.setItem('telegram_user_id', testId.toString());
            return testId;
        } catch (error) {
            console.error('❌ Ошибка получения user ID:', error);
            // Fallback: тестовый ID
            const fallbackId = 5930269100;
            console.warn('🔄 Используется fallback telegram_id:', fallbackId);
            return fallbackId;
        }
    }

    // 2. ЗАМЕНА createPayment
    async createPayment(planId) {
        try {
            const telegramId = this.getUserId();
            if (!telegramId) {
                throw new Error('Не удалось получить telegram_id пользователя');
            }
            console.log('💳 Создание платежа:', { telegramId, planId });
            const paymentData = {
                telegram_id: telegramId,  // ВАЖНО: передаем правильный ключ
                plan_id: planId,
                username: 'webapp_user',
                first_name: 'WebApp',
                last_name: 'User'
            };
            console.log('📤 Отправляем данные платежа:', paymentData);
            const response = await fetch(`${API_BASE_URL}/api/v1/payments/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            const result = await response.json();
            console.log('✅ Платеж создан:', result);
            return result;
        } catch (error) {
            console.error('❌ Ошибка создания платежа:', error);
            throw error;
        }
    }
}

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ ===

// Функция покупки плана (вызывается из HTML onclick)
window.buyPlan = function(planId) {
    if (window.mishuraApp) {
        window.mishuraApp.initiatePayment(planId);
    } else {
        console.error('❌ MishuraApp не инициализирован');
    }
};

// Инициализация приложения
if (!window.mishuraApp) {
    console.log('🎭 Инициализация МИШУРА App v2.6.0...');
    window.mishuraApp = new MishuraApp();
}