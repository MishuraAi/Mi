 ﻿// 🎭 МИШУРА - Твой Стилист
// Главный файл приложения - app.js (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// Версия: 2.6.1 - КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ ПЛАТЕЖЕЙ И СИНХРОНИЗАЦИИ

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
        
        this.balanceSync = {
            interval: null,
            lastUpdate: 0,
            isUpdating: false,
            forceUpdate: false
        };
        
        // Пользовательские данные
        this.userBalance = 200;
        this.consultationsHistory = [];
        this.consultationsUsed = 0;
        
        // Платежи ЮKassa
        this.paymentPackages = null;
        this.currentPayment = null;
        this.paymentCheckInterval = null;
        
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
            errors: 0
        };
        
        this.init = this.init.bind(this);
        setTimeout(() => this.init(), 100);
    }

    async initializeAPI() {
        try {
            const healthData = await fetch(`${API_BASE_URL}/api/v1/health`).then(res => res.json());
                    console.log('🏥 Статус API:', healthData);
                    
                this.api = new window.MishuraAPIService();
            console.log('🚀 API инициализирован:', this.api.constructor.name);
            
        } catch (error) {
            console.error('❌ Ошибка при инициализации API:', error);
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
        
        if (this.initializationComplete) return;

        try {
            // НОВОЕ: Инициализируем UserService
            if (window.userService) {
                await this.initializeUserService();
            }
            
            await this.checkForSuccessfulPayment();
            
            this.setupNavigation();
            this.fixModeButtons();
            this.setupBasicEventHandlers();
            this.loadUserData();
            
            this.initFeedbackSystem();
            
            // ОБНОВЛЕНО: Новая система синхронизации
            this.startAdvancedBalanceSync();
            
            this.setupTelegramIntegration();
            this.initModularNavigation();
            
            this.addDropdownStyles();
            
            this.initializationComplete = true;
            
            console.log('✅ MishuraApp инициализирован с UserService');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }

        this.lastConsultationId = null;
    }

    // НОВЫЙ метод инициализации UserService
    async initializeUserService() {
        try {
            console.log('👤 Инициализация UserService...');
            
            // Получаем актуального пользователя
            const userId = window.userService.getCurrentUserId();
            console.log(`✅ Пользователь определен: ${userId}`);
            
            // Синхронизируем баланс
            const balance = await window.userService.getBalance(true);
            if (balance !== null && balance !== this.userBalance) {
                console.log(`💰 Баланс синхронизирован: ${this.userBalance} → ${balance}`);
                this.userBalance = balance;
                this.saveUserData();
                this.updateBalanceDisplay();
            }
            
            // Подписываемся на изменения баланса
            document.addEventListener('balanceChanged', (event) => {
                const newBalance = event.detail.balance;
                if (newBalance !== this.userBalance) {
                    console.log(`📢 Получено уведомление об изменении баланса: ${this.userBalance} → ${newBalance}`);
                    this.userBalance = newBalance;
                    this.saveUserData();
                    this.updateBalanceDisplay();
                    this.animateBalanceChange();
                }
            });
            
            console.log('✅ UserService инициализирован');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации UserService:', error);
        }
    }

    // ОБНОВЛЕННАЯ система синхронизации баланса
    startAdvancedBalanceSync() {
        console.log('🔄 Запуск продвинутой синхронизации баланса...');
        
        // Основной интервал синхронизации (каждые 30 секунд)
        this.balanceSync.interval = setInterval(async () => {
            if (!this.balanceSync.isUpdating && window.userService) {
                await this.advancedSyncBalance();
            }
        }, 30000);
        
        // Синхронизация при изменении видимости
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && window.userService && !this.balanceSync.isUpdating) {
                await this.advancedSyncBalance();
            }
        });
        
        // Синхронизация при фокусе окна
        window.addEventListener('focus', async () => {
            if (window.userService && !this.balanceSync.isUpdating) {
                await this.advancedSyncBalance();
            }
        });
        
        // Синхронизация при online/offline
        window.addEventListener('online', async () => {
            console.log('🌐 Подключение восстановлено, синхронизируем баланс');
            if (window.userService && !this.balanceSync.isUpdating) {
                await this.advancedSyncBalance();
            }
        });
        
        console.log('✅ Продвинутая синхронизация активирована');
    }

    // НОВЫЙ метод синхронизации баланса
    async advancedSyncBalance() {
        const now = Date.now();
        
        // Не синхронизируем слишком часто
        if (now - this.balanceSync.lastUpdate < 10000 && !this.balanceSync.forceUpdate) {
            return;
        }
        
        console.log('🔄 Продвинутая синхронизация баланса...');
        
        try {
            this.balanceSync.isUpdating = true;
            
            if (!window.userService) {
                console.warn('⚠️ UserService недоступен, используем fallback');
                await this.syncBalance(); // Старый метод
                return;
            }
            
            // Получаем актуальный баланс через UserService
            const newBalance = await window.userService.getBalance(this.balanceSync.forceUpdate);
            
            if (newBalance !== null && newBalance !== this.userBalance) {
                const oldBalance = this.userBalance;
                this.userBalance = newBalance;
                this.saveUserData();
                
                console.log(`💰 Баланс синхронизирован: ${oldBalance} → ${newBalance}`);
                
                // Обновляем отображение
                this.updateBalanceDisplay();
                
                // Показываем уведомление при увеличении
                if (newBalance > oldBalance) {
                    const difference = newBalance - oldBalance;
                    this.showNotification(
                        `🎉 Баланс пополнен на ${difference} STcoin!`, 
                        'success', 
                        4000
                    );
                    this.animateBalanceChange();
                }
            }
            
            this.balanceSync.lastUpdate = now;
            this.balanceSync.forceUpdate = false;
            
        } catch (error) {
            console.error('❌ Ошибка продвинутой синхронизации баланса:', error);
            
            // Fallback на старый метод
            try {
                await this.syncBalance();
            } catch (fallbackError) {
                console.error('❌ Fallback синхронизация также не удалась:', fallbackError);
            }
        } finally {
            this.balanceSync.isUpdating = false;
        }
    }

    // ОБНОВЛЕННЫЙ метод принудительного обновления
    async forceBalanceUpdate() {
        console.log('🔄 Принудительное обновление баланса...');
        
        if (window.userService) {
            try {
                const balance = await window.userService.syncBalance();
                if (balance !== null) {
                    console.log('✅ Принудительное обновление через UserService завершено');
                    return;
                }
            } catch (error) {
                console.error('❌ Ошибка принудительного обновления через UserService:', error);
            }
        }
        
        // Fallback на старый метод
        this.balanceSync.forceUpdate = true;
        await this.syncBalance();
    }

    // ОБНОВЛЕННЫЙ метод получения userId
    getUserId() {
        if (window.userService) {
            try {
                const userId = window.userService.getCurrentUserId();
                console.log(`✅ User ID получен через UserService: ${userId}`);
                return userId;
            } catch (error) {
                console.error('❌ Ошибка получения User ID через UserService:', error);
            }
        }
        
        // Fallback на старый метод
        console.warn('⚠️ Используем fallback метод получения User ID');
        return this.getFallbackUserId();
    }

    // НОВЫЙ fallback метод
    getFallbackUserId() {
        try {
            // Проверяем Telegram WebApp
            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
                console.log('✅ Fallback: Telegram ID:', telegramId);
                return parseInt(telegramId);
            }
            
            // Проверяем localStorage
            const storedId = localStorage.getItem('user_id');
            if (storedId && !isNaN(storedId)) {
                const userId = parseInt(storedId);
                console.log('✅ Fallback: localStorage ID:', userId);
                return userId;
            }
            
            // Последний fallback
            const defaultId = 5930269100;
            console.warn('⚠️ Fallback: используем default ID:', defaultId);
            return defaultId;
            
        } catch (error) {
            console.error('❌ Ошибка fallback getUserId:', error);
            return 5930269100;
        }
    }

    // НОВЫЙ метод диагностики
    async diagnoseSyncIssues() {
        console.log('🔍 === ДИАГНОСТИКА СИНХРОНИЗАЦИИ БАЛАНСА ===');
        
        // Диагностика UserService
        if (window.userService) {
            await window.userService.diagnose();
        } else {
            console.warn('⚠️ UserService недоступен');
        }
        
        // Диагностика app.js
        console.log('📱 App.js состояние:');
        console.log(`   userBalance: ${this.userBalance}`);
        console.log(`   consultationsHistory: ${this.consultationsHistory.length}`);
        console.log(`   балансSync.lastUpdate: ${new Date(this.balanceSync.lastUpdate).toLocaleTimeString()}`);
        console.log(`   balanceSync.isUpdating: ${this.balanceSync.isUpdating}`);
        
        // Диагностика localStorage
        console.log('💾 LocalStorage:');
        console.log(`   mishura_user_data: ${localStorage.getItem('mishura_user_data')}`);
        console.log(`   user_id: ${localStorage.getItem('user_id')}`);
        console.log(`   current_user_session: ${localStorage.getItem('current_user_session')}`);
        
        console.log('🔍 === КОНЕЦ ДИАГНОСТИКИ ===');
    }

    // ОБНОВЛЕНИЕ метода загрузки пользовательских данных
    loadUserData() {
        try {
            const data = JSON.parse(localStorage.getItem('mishura_user_data') || '{}');
            
            // 🔧 ИСПРАВЛЕНО: Начальный баланс 50 вместо 200
            this.userBalance = data.balance || 50; // Было: || 200
            this.consultationsHistory = data.consultations || [];
            this.lastSyncTimestamp = data.lastSync || 0;
            
            // 🆕 НОВОЕ: Автоматическая валидация и синхронизация баланса
            this.validateAndSyncBalance();
            
            this.updateUI();
            console.log('📊 Данные пользователя загружены:', {
                balance: this.userBalance,
                consultations: this.consultationsHistory.length,
                lastSync: new Date(this.lastSyncTimestamp).toLocaleString()
            });
        } catch (error) {
            console.error('❌ Ошибка загрузки данных пользователя:', error);
            this.initializeUserData();
        }
    }

    // 🆕 НОВЫЙ МЕТОД: Валидация и автоматическая синхронизация
    async validateAndSyncBalance() {
        try {
            // Получаем актуальный баланс с сервера через UserService
            if (window.userService) {
                const serverBalance = await window.userService.getActualBalance();
                
                // Если есть расхождение - исправляем автоматически
                if (Math.abs(this.userBalance - serverBalance) > 0.01) {
                    console.log(`🔄 Обнаружено расхождение баланса: localStorage=${this.userBalance} сервер=${serverBalance}`);
                    console.log('🔧 Автоматическая синхронизация...');
                    
                    // Обновляем баланс из авторитетного источника
                    this.userBalance = serverBalance;
                    
                    // Сохраняем исправленные данные
                    this.saveUserData();
                    
                    // Обновляем UI
                    this.updateUI();
                    
                    console.log(`✅ Баланс синхронизирован: ${serverBalance} STcoin`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Не удалось проверить баланс с сервером:', error);
            // Продолжаем работу с кэшированными данными
        }
    }

    // 🔧 ИСПРАВЛЕНИЕ 2: initializeUserData
    async initializeUserData() {
        console.log('🔄 Инициализация новых данных пользователя...');
        this.userBalance = 50;
        this.consultationsHistory = [];
        this.lastSyncTimestamp = Date.now();
        this.saveUserData();
        this.updateUI();
        console.log('✅ Новый пользователь инициализирован с балансом: 50 STcoin');
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
        } catch (error) {
            console.error('❌ Ошибка сохранения данных пользователя:', error);
        }
    }

    async checkForSuccessfulPayment() {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment_success'); // 'true', не '1'
        const section = urlParams.get('section');
        
        console.log('🔍 Проверка успешной оплаты:', { 
            paymentSuccess, 
            section,
            fullUrl: window.location.href 
        });

        if (paymentSuccess === 'true') {
            console.log('🎉 УСПЕШНАЯ ОПЛАТА ОБНАРУЖЕНА!');
            
            setTimeout(async () => {
                await this.forceBalanceUpdate();
            }, 1000);
            
            // 🧭 Переход в секцию баланса
            setTimeout(() => {
                this.navigateToSection('balance');
            }, 1500);
            
            // 🧹 Очистка URL
            setTimeout(() => {
                const newUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
                console.log('🧹 URL очищен от параметров оплаты');
            }, 3000);
        }
    }

    showPaymentSuccessNotification() {
        // Удаляем предыдущие уведомления
        document.querySelectorAll('.payment-success-notification').forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.className = 'payment-success-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                padding: 20px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(76, 175, 80, 0.4);
                z-index: 10000;
                animation: slideInRight 0.5s ease-out;
                max-width: 300px;
            ">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 28px;">✅</div>
                    <div>
                        <div style="font-weight: 700; font-size: 18px; margin-bottom: 4px;">
                            Оплата прошла успешно!
                        </div>
                        <div style="font-size: 14px; opacity: 0.9;">
                            Ваш баланс пополнен
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Автоудаление через 6 секунд
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 6000);
    }

    animateBalanceChange() {
        const balanceElements = document.querySelectorAll('.balance-amount, .balance-value, [data-balance-display]');
        
        balanceElements.forEach(element => {
            element.style.animation = 'balanceUpdate 1s ease-out';
            
            setTimeout(() => {
                element.style.animation = '';
            }, 1000);
        });
    }

    updateBalanceDisplay() {
        // Обновляем все элементы с балансом
        const balanceElements = document.querySelectorAll('.balance-amount, .balance-value, [data-balance-display]');
        balanceElements.forEach(element => {
            element.textContent = this.userBalance;
        });
        
        // Обновляем количество консультаций
        const consultationsRemaining = Math.floor(this.userBalance / 10);
        const consultationsElements = document.querySelectorAll('[data-consultations-display]');
        consultationsElements.forEach(element => {
            element.textContent = consultationsRemaining;
        });
        
        // Обновляем заголовок секции баланса
        const balanceTitle = document.querySelector('#balance-section .section-title');
        if (balanceTitle) {
            balanceTitle.innerHTML = `💰 Баланс: <span class="balance-highlight">${this.userBalance}</span> STCoins`;
        }
        
        console.log('📊 Отображение баланса обновлено:', this.userBalance);
    }

    setupBasicEventHandlers() {
        console.log('🔧 Настройка базовых обработчиков событий');
        this.setupCloseButtons();
        this.setupSubmitButton();
        this.initUploaders();
        this.setupOccasionDropdown();
        this.setupResultNavigation();
        console.log('✅ Базовые обработчики настроены');
    }

    setupNavigation() {
        if (this.navigationSetup) return;
        console.log('🧭 Настройка навигации');
        
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const section = newBtn.id.replace('nav-', '');
                console.log('🔄 Навигация в секцию:', section);
                
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                newBtn.classList.add('active');
                
                this.navigateToSection(section);
                this.triggerHapticFeedback('light');
            });
        });
        
        this.navigationSetup = true;
        console.log('✅ Навигация настроена');
    }

    fixModeButtons() {
        const singleBtn = document.getElementById('single-mode-btn');
        const compareBtn = document.getElementById('compare-mode-btn');
        
        if (singleBtn) {
            const newSingleBtn = singleBtn.cloneNode(true);
            singleBtn.parentNode.replaceChild(newSingleBtn, singleBtn);
            newSingleBtn.addEventListener('click', () => {
                console.log('📷 Открываем анализ образа');
                this.openSingleModal();
            });
            console.log('✅ Кнопка анализа образа починена');
        }

        if (compareBtn) {
            const newCompareBtn = compareBtn.cloneNode(true);
            compareBtn.parentNode.replaceChild(newCompareBtn, compareBtn);
            newCompareBtn.addEventListener('click', () => {
                console.log('🔄 Открываем сравнение образов');
                this.openCompareModal();
            });
            console.log('✅ Кнопка сравнения образов починена');
        }
    }

    navigateToSection(section) {
        console.log('🧭 app.js: Навигация в секцию:', section);
        
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const targetBtn = document.getElementById(`nav-${section}`);
            if (targetBtn) {
                targetBtn.classList.add('active');
            }
        
            this.currentSection = section;
            this.closeModal();
        
        if (window.MishuraApp?.components?.navigation) {
            window.MishuraApp.components.navigation.navigateTo(section);
        } else {
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
        
        setTimeout(() => {
            this.fixModeButtons();
        }, 100);
    }

    async showBalanceSection() {
        console.log('💰 ПОКАЗ СЕКЦИИ БАЛАНСА');
        
        const container = document.querySelector('.container');
        if (!container) return;
        
        // Сразу обновляем баланс при входе в секцию
        await this.forceBalanceUpdate();
        
        const consultationsRemaining = Math.floor(this.userBalance / 10);
        
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

    // === ПЛАТЕЖИ ===
    
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
            
            const paymentData = {
                telegram_id: userId,
                plan_id: planId
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
                console.log('🔗 Переходим на страницу оплаты ЮKassa:', result.payment_url);

                // Закрываем модал платежей
                const paymentModal = document.getElementById('payment-modal');
                if (paymentModal) {
                    paymentModal.remove();
                }

                // Переходим на страницу оплаты ЮKassa
                if (window.Telegram?.WebApp?.openLink) {
                    console.log('📲 Открываем ссылку оплаты через Telegram WebApp');
                    window.Telegram.WebApp.openLink(result.payment_url, { try_instant_view: false });
                } else {
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
        console.log('📤 Закрытие модального окна...');
        
        // ВАЖНО: закрываем dropdown при закрытии модала
        this.closeDropdown();
        
        // ... остальной код closeModal остается без изменений
        const modals = document.querySelectorAll('.modal-overlay');
        const resultSection = document.getElementById('result');
        
        const isResultVisible = resultSection && resultSection.classList.contains('active');
        
        if (isResultVisible && this.lastConsultationId) {
            const consultationIdForFeedback = this.lastConsultationId;
            
            modals.forEach(modal => {
                modal.classList.remove('active');
            });
            
            const sections = ['loading', 'consultation-form', 'result'];
            sections.forEach(sectionId => {
                const element = document.getElementById(sectionId);
                if (element) {
                    element.classList.remove('active');
                }
            });
            
            document.body.classList.remove('modal-open');
            
            setTimeout(() => {
                this.showFeedbackModal(consultationIdForFeedback);
            }, 500);
            
            this.lastConsultationId = null;
            
        } else {
            modals.forEach(modal => {
                modal.classList.remove('active');
            });
            
            const sections = ['loading', 'consultation-form', 'result'];
            sections.forEach(sectionId => {
                const element = document.getElementById(sectionId);
                if (element) {
                    element.classList.remove('active');
                }
            });
            
            document.body.classList.remove('modal-open');
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
        // Сохраняем ID консультации для системы отзывов
        this.lastConsultationId = result.consultation_id || Date.now();
        console.log('💾 Сохранен ID консультации для отзыва:', this.lastConsultationId);
        // ... остальной код метода ...
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
        
        if (consultation && consultation.id) {
            setTimeout(() => {
                this.checkAndShowFeedbackPrompt(consultation.id);
            }, Math.random() * 120000 + 60000); // 1-3 минуты
        } else {
            // Если нет ID консультации, используем timestamp как ID
            const mockConsultationId = Date.now();
            setTimeout(() => {
                this.checkAndShowFeedbackPrompt(mockConsultationId);
            }, Math.random() * 120000 + 60000);
        }
        
        // Запускаем проверку отзыва через 2 минуты после показа результата
        setTimeout(() => {
            const mockConsultationId = Date.now();
            console.log('⏰ Автоматический запуск проверки отзыва через 2 минуты');
            this.checkAndShowFeedbackPrompt(mockConsultationId);
        }, 120000); // 2 минуты для тестирования
    }

    normalizeAPIResponse(response) {
        if (response && typeof response === 'object') {
            // Проверяем и advice и analysis
            const advice = response.advice || response.analysis;
            
            if (advice) {
                return {
                    advice: advice,
                    metadata: response.metadata || {
                        timestamp: new Date().toISOString(),
                        status: response.status || 'success'
                    }
                };
            }
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

                @keyframes balanceUpdate {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); color: #4CAF50; }
                    100% { transform: scale(1); }
                }

                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }

                .balance-highlight {
                    color: #4CAF50;
                    font-weight: bold;
                    text-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
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
            
            // 🔧 ИСПРАВЛЕНО: Начальный баланс 50 вместо 200
            this.userBalance = data.balance || 50; // Было: || 200
            this.consultationsHistory = data.consultations || [];
            this.lastSyncTimestamp = data.lastSync || 0;
            
            // 🆕 НОВОЕ: Автоматическая валидация и синхронизация баланса
            this.validateAndSyncBalance();
            
            this.updateUI();
            console.log('📊 Данные пользователя загружены:', {
                balance: this.userBalance,
                consultations: this.consultationsHistory.length,
                lastSync: new Date(this.lastSyncTimestamp).toLocaleString()
            });
        } catch (error) {
            console.error('❌ Ошибка загрузки данных пользователя:', error);
            this.initializeUserData();
        }
    }

    initializeUserData() {
        console.log('🔄 Инициализация новых данных пользователя...');
        this.userBalance = 50;
        this.consultationsHistory = [];
        this.lastSyncTimestamp = Date.now();
        this.saveUserData();
        this.updateUI();
        console.log('✅ Новый пользователь инициализирован с балансом: 50 STcoin');
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
        } catch (error) {
            console.error('❌ Ошибка сохранения данных пользователя:', error);
        }
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

    deductConsultation(cost = 10) {
        this.userBalance -= cost;
        this.consultationsUsed += cost;
        this.saveUserData();
        this.updateBalanceDisplay();
    }

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

    // ========== ОКОНЧАТЕЛЬНОЕ DROPDOWN-РЕШЕНИЕ ========== //

    setupOccasionDropdown() {
        if (this.occasionDropdownSetup) return;

        console.log('🎯 Настройка ОКОНЧАТЕЛЬНОГО dropdown решения...');

        // Удаляем встроенный dropdown навсегда
        setTimeout(() => {
            const builtinDropdown = document.getElementById('occasion-options');
            if (builtinDropdown) {
                builtinDropdown.remove();
            }
        }, 100);

        // Глобальные переменные для dropdown
        window.DROPDOWN_STATE = {
            isOpen: false,
            element: null,
            inputElement: null
        };

        // Создаем ЕДИНСТВЕННЫЙ обработчик событий
        this.createDropdownHandler();

        this.occasionDropdownSetup = true;
        console.log('✅ ОКОНЧАТЕЛЬНЫЙ dropdown настроен');
    }

    createDropdownHandler() {
        // Находим input только один раз
        const occasionInput = document.getElementById('occasion');
        if (!occasionInput) {
            console.error('❌ Input occasion не найден');
            return;
        }

        // Удаляем ВСЕ старые обработчики через клонирование
        const cleanInput = occasionInput.cloneNode(true);
        occasionInput.parentNode.replaceChild(cleanInput, occasionInput);
        
        // Сохраняем ссылку на чистый input
        window.DROPDOWN_STATE.inputElement = cleanInput;

        console.log('🧹 Input очищен от всех обработчиков');

        // ЕДИНСТВЕННЫЙ обработчик input - с правильной изоляцией событий
        cleanInput.addEventListener('click', this.handleInputClick.bind(this), true);

        // Обработчик document - с задержкой для предотвращения конфликтов
        setTimeout(() => {
            document.addEventListener('click', this.handleDocumentClick.bind(this), false);
        }, 500);

        console.log('🎯 Обработчики установлены с правильной изоляцией');
    }

    handleInputClick(event) {
        console.log('🎯 Клик по input occasion');
        
        // КРИТИЧНО: полная остановка всплытия
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // Переключаем состояние dropdown
        if (window.DROPDOWN_STATE.isOpen) {
            this.closeDropdown();
        } else {
            // Задержка для предотвращения конфликта с document обработчиком
            setTimeout(() => {
                this.openDropdown();
            }, 50);
        }
    }

    handleDocumentClick(event) {
        // Проверяем что dropdown открыт
        if (!window.DROPDOWN_STATE.isOpen || !window.DROPDOWN_STATE.element) {
            return;
        }

        // Проверяем что клик НЕ по input и НЕ по dropdown
        const clickedInput = event.target === window.DROPDOWN_STATE.inputElement;
        const clickedDropdown = window.DROPDOWN_STATE.element && 
                               window.DROPDOWN_STATE.element.contains(event.target);

        if (!clickedInput && !clickedDropdown) {
            console.log('👆 Клик вне dropdown - закрываем');
            this.closeDropdown();
        }
    }

    openDropdown() {
        if (window.DROPDOWN_STATE.isOpen) {
            console.log('⚠️ Dropdown уже открыт');
            return;
        }

        console.log('📂 Открываем dropdown...');
        
        const inputElement = window.DROPDOWN_STATE.inputElement;
        if (!inputElement) {
            console.error('❌ Input element не найден');
            return;
        }

        // Создаем dropdown элемент
        const dropdown = document.createElement('div');
        dropdown.className = 'final-dropdown';
        dropdown.style.cssText = this.getDropdownStyles(inputElement);

        // Добавляем опции
        this.occasionOptions.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'final-dropdown-option';
            optionElement.textContent = option;
            optionElement.style.cssText = this.getOptionStyles(index === this.occasionOptions.length - 1);

            // Обработчики для опции
            optionElement.addEventListener('mouseenter', () => {
                optionElement.style.background = 'rgba(212, 175, 55, 0.1)';
                optionElement.style.color = '#d4af37';
            });

            optionElement.addEventListener('mouseleave', () => {
                optionElement.style.background = 'transparent';
                optionElement.style.color = '#ffffff';
            });

            optionElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectOption(option);
            });

            dropdown.appendChild(optionElement);
        });

        // КРИТИЧНО: добавляем dropdown в body, а НЕ в модальное окно
        document.body.appendChild(dropdown);

        // Обновляем состояние
        window.DROPDOWN_STATE.isOpen = true;
        window.DROPDOWN_STATE.element = dropdown;

        console.log('✅ Dropdown открыт и добавлен в body');
    }

    closeDropdown() {
        if (!window.DROPDOWN_STATE.isOpen || !window.DROPDOWN_STATE.element) {
            return;
        }

        console.log('📁 Закрываем dropdown...');

        // Удаляем элемент
        window.DROPDOWN_STATE.element.remove();
        
        // Сбрасываем состояние
        window.DROPDOWN_STATE.isOpen = false;
        window.DROPDOWN_STATE.element = null;

        console.log('✅ Dropdown закрыт');
    }

    selectOption(option) {
        console.log('✅ Выбрана опция:', option);

        if (window.DROPDOWN_STATE.inputElement) {
            window.DROPDOWN_STATE.inputElement.value = option;
        }

        this.closeDropdown();
        this.updateSubmitButton();
        this.triggerHapticFeedback('light');
    }

    getDropdownStyles(inputElement) {
        const rect = inputElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom - 20;
        const maxHeight = Math.min(Math.max(spaceBelow, 200), 350);

        return `
            position: fixed !important;
            z-index: 2147483647 !important;
            background: #1a1a1a !important;
            border: 2px solid #d4af37 !important;
            border-radius: 12px !important;
            box-shadow: 0 8px 32px rgba(212, 175, 55, 0.4) !important;
            backdrop-filter: blur(20px) !important;
            max-height: ${maxHeight}px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch !important;
            left: ${rect.left}px !important;
            top: ${rect.bottom + 4}px !important;
            width: ${rect.width}px !important;
            pointer-events: auto !important;
            font-family: inherit !important;
        `;
    }

    getOptionStyles(isLast) {
        return `
            padding: 14px 16px !important;
            cursor: pointer !important;
            color: #ffffff !important;
            transition: all 0.2s ease !important;
            min-height: 48px !important;
            display: flex !important;
            align-items: center !important;
            font-size: 16px !important;
            user-select: none !important;
            -webkit-tap-highlight-color: transparent !important;
            border-bottom: ${isLast ? 'none' : '1px solid rgba(212, 175, 55, 0.1)'} !important;
        `;
    }

    addDropdownStyles() {
        if (document.getElementById('final-dropdown-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'final-dropdown-styles';
        styles.textContent = `
            .final-dropdown::-webkit-scrollbar {
                width: 8px !important;
            }
            .final-dropdown::-webkit-scrollbar-track {
                background: rgba(42, 42, 42, 0.8) !important;
                border-radius: 4px !important;
            }
            .final-dropdown::-webkit-scrollbar-thumb {
                background: #d4af37 !important;
                border-radius: 4px !important;
            }
            .final-dropdown::-webkit-scrollbar-thumb:hover {
                background: #f7dc6f !important;
            }
            
            @media (max-width: 768px) {
                .final-dropdown {
                    font-size: 18px !important;
                }
                .final-dropdown-option {
                    min-height: 52px !important;
                    padding: 16px !important;
                    font-size: 18px !important;
                }
            }
            
            /* Скрываем встроенный dropdown навсегда */
            .occasion-options,
            #occasion-options {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }
        `;

        document.head.appendChild(styles);
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
        if (window.Telegram?.WebApp) {
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
            if (window.Telegram?.WebApp?.HapticFeedback) {
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

    initModularNavigation() {
        if (window.MishuraApp?.components?.navigation) {
            console.log('🔧 Инициализация модульной навигации');
            window.MishuraApp.components.navigation.init();
        }
    }

    // === СИСТЕМА ОТЗЫВОВ ===

    initFeedbackSystem() {
        this.feedbackSystem = {
            cooldownDays: 10,
            minCharacters: 150,
            maxCharacters: 1000,
            isShowing: false,
            currentConsultationId: null,
            selectedRating: null
        };
        
        console.log('📝 Система отзывов инициализирована');
    }

    async checkAndShowFeedbackPrompt(consultationId) {
        if (this.feedbackSystem.isShowing) return;
        
        console.log('🔍 Проверка возможности показа формы отзыва для консультации:', consultationId);
        
        try {
            const userId = this.getUserId();
            const response = await fetch(`${API_BASE_URL}/api/v1/feedback/can-prompt/${userId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.can_show_prompt) {
                // Показываем форму с задержкой 1-3 минуты
                const delay = Math.random() * 120000 + 60000; // 1-3 минуты
                
                console.log(`⏰ Форма отзыва будет показана через ${Math.round(delay/1000)} секунд`);
                
                setTimeout(() => {
                    this.showFeedbackModal(consultationId);
                }, delay);
                
                // Логируем что показали форму
                await this.logFeedbackPromptAction(consultationId, 'shown');
            } else {
                console.log('❌ Форма отзыва не может быть показана (кулдаун)');
            }
            
        } catch (error) {
            console.error('❌ Ошибка проверки возможности показа отзыва:', error);
        }
    }

    showFeedbackModal(consultationId) {
        if (this.feedbackSystem.isShowing) return;
        
        this.feedbackSystem.isShowing = true;
        this.feedbackSystem.currentConsultationId = consultationId;
        this.feedbackSystem.selectedRating = null;
        
        console.log('📝 Показ модального окна отзыва');
        
        // Удаляем предыдущие модальные окна отзывов
        document.querySelectorAll('.feedback-modal-overlay').forEach(el => el.remove());
        
        const modal = document.createElement('div');
        modal.className = 'feedback-modal-overlay';
        modal.innerHTML = this.getFeedbackModalHTML();
        
        document.body.appendChild(modal);
        
        // Анимация появления
        setTimeout(() => {
            modal.classList.add('active');
        }, 100);
        
        // Настройка обработчиков
        this.setupFeedbackModalHandlers(modal);
        
        this.triggerHapticFeedback('light');
    }

    getFeedbackModalHTML() {
        return `
            <div class="feedback-modal-content">
                <!-- ИСПРАВЛЕНО: Компактный заголовок -->
                <div class="feedback-header">
                    <div class="feedback-icon">💭</div>
                    <h3 class="feedback-title">Ваше мнение важно!</h3>
                    <p class="feedback-description">
                        <strong class="feedback-highlight">За отзыв 150+ символов = +10 STcoin</strong>
                    </p>
                </div>
                
                <!-- ИСПРАВЛЕНО: Компактная секция рейтинга -->
                <div class="rating-section">
                    <div class="rating-label">Оцените консультацию:</div>
                    <div class="rating-buttons">
                        <button class="rating-btn" data-rating="positive">
                            <span class="rating-icon">👍</span>
                            <span class="rating-text">Отлично</span>
                        </button>
                        <button class="rating-btn" data-rating="negative">
                            <span class="rating-icon">👎</span>
                            <span class="rating-text">Плохо</span>
                        </button>
                    </div>
                </div>
                
                <!-- ИСПРАВЛЕНО: Компактная форма -->
                <div class="feedback-form">
                    <textarea 
                        id="feedback-textarea" 
                        class="feedback-textarea"
                        placeholder="Что понравилось? Что можно улучшить?"
                        maxlength="1000"
                    ></textarea>
                    <!-- ИСПРАВЛЕНО: Выделенная метаинформация -->
                    <div class="feedback-meta">
                        <span id="feedback-char-count" class="char-count">0 символов</span>
                        <span class="reward-hint">Мин. 150 = бонус</span>
                    </div>
                </div>
                
                <!-- ИСПРАВЛЕНО: Компактные кнопки -->
                <div class="feedback-actions">
                    <button id="feedback-skip" class="btn-feedback btn-ghost">Позже</button>
                    <button id="feedback-submit" class="btn-feedback btn-primary" disabled>Отправить</button>
                </div>
            </div>
        `;
    }

    setupFeedbackModalHandlers(modal) {
        const textarea = modal.querySelector('#feedback-textarea');
        const charCount = modal.querySelector('#feedback-char-count');
        const submitBtn = modal.querySelector('#feedback-submit');
        const skipBtn = modal.querySelector('#feedback-skip');
        const ratingBtns = modal.querySelectorAll('.rating-btn');
        
        // Обработка выбора рейтинга
        ratingBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Убираем выделение с всех кнопок
                ratingBtns.forEach(b => {
                    b.classList.remove('selected', 'positive', 'negative');
                });
                
                // Выделяем выбранную кнопку
                const rating = btn.dataset.rating;
                btn.classList.add('selected', rating);
                
                this.feedbackSystem.selectedRating = rating;
                this.updateFeedbackSubmitButton(textarea, submitBtn);
                
                console.log('Выбран рейтинг:', rating);
            });
        });
        
        // Обработка ввода текста
        textarea.addEventListener('input', () => {
            const length = textarea.value.length;
            charCount.textContent = `${length} символов`;
            
            // ИСПРАВЛЕНО: Улучшенная видимость счетчика
            if (length >= this.feedbackSystem.minCharacters) {
                charCount.classList.add('valid');
                charCount.classList.remove('warning');
                charCount.style.color = '#4CAF50';
                charCount.style.fontWeight = '700';
            } else if (length >= 100) {
                charCount.classList.add('warning');
                charCount.classList.remove('valid');
                charCount.style.color = '#ff9800';
                charCount.style.fontWeight = '600';
            } else {
                charCount.classList.remove('valid', 'warning');
                charCount.style.color = '#ffffff';
                charCount.style.fontWeight = '600';
            }
            
            this.updateFeedbackSubmitButton(textarea, submitBtn);
        });
        
        // Кнопка отправки
        submitBtn.addEventListener('click', () => {
            this.submitFeedback(textarea.value);
        });
        
        // Кнопка пропустить
        skipBtn.addEventListener('click', () => {
            this.closeFeedbackModal('dismissed', 'user_skipped');
        });
        
        // Закрытие по клику вне модала
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeFeedbackModal('dismissed', 'clicked_outside');
            }
        });
    }

    updateFeedbackSubmitButton(textarea, submitBtn) {
        const length = textarea.value.length;
        const hasRating = this.feedbackSystem.selectedRating !== null;
        const hasEnoughText = length >= this.feedbackSystem.minCharacters;
        
        // Кнопка активна если есть рейтинг И текст >= 150 символов
        const canSubmit = hasRating && hasEnoughText;
        submitBtn.disabled = !canSubmit;
    }

    async submitFeedback(feedbackText) {
        const trimmedText = feedbackText.trim();
        
        if (!this.feedbackSystem.selectedRating) {
            this.showNotification('Пожалуйста, оцените консультацию 👍 или 👎', 'warning');
            return;
        }
        
        if (trimmedText.length < this.feedbackSystem.minCharacters) {
            this.showNotification('Добавьте подробностей, пожалуйста!', 'warning');
            return;
        }
        
        try {
            console.log('📤 Отправка отзыва...');
            
            const submitBtn = document.querySelector('#feedback-submit');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправляем...';
            
            const userId = this.getUserId();
            const response = await fetch(`${API_BASE_URL}/api/v1/feedback/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegram_id: userId,
                    feedback_text: trimmedText,
                    feedback_rating: this.feedbackSystem.selectedRating,
                    consultation_id: this.feedbackSystem.currentConsultationId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.bonus_awarded) {
                // Обновляем баланс
                await this.forceBalanceUpdate();
                
                // Показываем успешное уведомление
                const ratingText = this.feedbackSystem.selectedRating === 'positive' ? 'положительную' : 'отрицательную';
                this.showNotification(
                    `🎉 Спасибо за ${ratingText} оценку и подробный отзыв! Вы получили +1 консультацию!`, 
                    'success', 
                    6000
                );
                
                this.animateBalanceChange();
            } else {
                this.showNotification('✅ Спасибо за отзыв!', 'success');
            }
            
            this.closeFeedbackModal('completed');
            this.triggerHapticFeedback('success');
            
            console.log('✅ Отзыв успешно отправлен:', result);
            
        } catch (error) {
            console.error('❌ Ошибка отправки отзыва:', error);
            
            const submitBtn = document.querySelector('#feedback-submit');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Отправить отзыв';
            }
            
            let errorMessage = 'Ошибка отправки отзыва';
            if (error.message.includes('слишком короткий')) {
                errorMessage = 'Добавьте подробностей, пожалуйста!';
            } else if (error.message.includes('спам')) {
                errorMessage = 'Пожалуйста, напишите осмысленный отзыв';
            } else if (error.message.includes('рейтинг')) {
                errorMessage = 'Пожалуйста, оцените консультацию';
            }
            
            this.showNotification(errorMessage, 'error');
            this.triggerHapticFeedback('error');
        }
    }

    async closeFeedbackModal(action = 'dismissed', reason = null) {
        const modal = document.querySelector('.feedback-modal-overlay');
        if (!modal) return;
        
        this.feedbackSystem.isShowing = false;
        
        // Логируем действие
        if (action !== 'completed') {
            await this.logFeedbackPromptAction(
                this.feedbackSystem.currentConsultationId || 0, 
                action, 
                reason
            );
        }
        
        // Анимация исчезновения
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
        
        this.feedbackSystem.currentConsultationId = null;
        this.feedbackSystem.selectedRating = null;
    }

    async logFeedbackPromptAction(consultationId, action, dismissalReason = null) {
        try {
            const userId = this.getUserId();
            
            await fetch(`${API_BASE_URL}/api/v1/feedback/prompt-action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegram_id: userId,
                    consultation_id: consultationId,
                    action: action,
                    dismissal_reason: dismissalReason
                })
            });
            
            console.log(`📊 Зафиксировано действие с формой отзыва: ${action}`);
            
        } catch (error) {
            console.error('❌ Ошибка логирования действия с формой:', error);
        }
    }
}

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ===

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
    console.log('🎭 Инициализация МИШУРА App v2.6.1...');
    window.mishuraApp = new MishuraApp();
}

// 🧹 ДОПОЛНИТЕЛЬНО: Функция для очистки поврежденного кэша (выполнить в консоли)
function clearCorruptedCache() {
    console.log('🧹 Очистка поврежденного кэша...');
    localStorage.removeItem('mishura_user_data');
    if (window.mishuraApp) {
        window.mishuraApp.initializeUserData();
        console.log('✅ Кэш очищен, приложение переинициализировано');
    }
    if (window.userService) {
        window.userService.syncBalance();
        console.log('🔄 Запущена синхронизация с сервером');
    }
}
