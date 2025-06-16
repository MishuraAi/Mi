// 🎭 МИШУРА - Твой Стилист
// Главный файл приложения - app.js (ОЧИЩЕННАЯ ВЕРСИЯ)
// Версия: 2.5.0 - Убрана лишняя информация о синхронизации + оптимизация кода

console.log('🎭 МИШУРА App загружается v2.5.0...');

class MishuraApp {
    constructor() {
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
        this.initializeAPI();
        
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

    // === СИНХРОНИЗАЦИЯ (РАБОТАЕТ В ФОНЕ) ===
    
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
            this.syncState.deviceId = deviceId;
            return deviceId;
        } catch (e) {
            this.syncState.deviceId = `temp_${Date.now()}_${Math.random()}`;
            return this.syncState.deviceId;
        }
    }

    getCurrentUserId() {
        // 1. Telegram WebApp (реальный user_id)
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
            const telegramUserId = window.Telegram.WebApp.initDataUnsafe.user.id;
            this.saveUserIdLocally(telegramUserId, 'telegram_webapp');
            this.syncState.userId = telegramUserId;
            return telegramUserId;
        }
        
        // 2. URL параметр user_id
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get('user_id');
        if (urlUserId && !isNaN(urlUserId)) {
            const numericUserId = parseInt(urlUserId);
            this.saveUserIdLocally(numericUserId, 'telegram_url');
            this.syncState.userId = numericUserId;
            return numericUserId;
        }
        
        // 3. Сохраненный user_id
        try {
            const savedUserId = localStorage.getItem('primary_user_id');
            if (savedUserId && !isNaN(savedUserId)) {
                const numericUserId = parseInt(savedUserId);
                const lastSync = localStorage.getItem('last_sync');
                const syncAge = Date.now() - parseInt(lastSync || '0');
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней
                
                if (syncAge < maxAge) {
                    this.syncState.userId = numericUserId;
                    return numericUserId;
                }
            }
        } catch (e) {
            console.warn('⚠️ localStorage недоступен:', e);
        }
        
        // 4. Тестовый режим
        const yourTelegramId = 5930269100;
        this.saveUserIdLocally(yourTelegramId, 'developer_mode');
        this.syncState.userId = yourTelegramId;
        return yourTelegramId;
    }

    saveUserIdLocally(userId, source) {
        try {
            localStorage.setItem('primary_user_id', userId.toString());
            localStorage.setItem('user_source', source);
            localStorage.setItem('last_sync', Date.now().toString());
        } catch (e) {
            console.warn('⚠️ Не удалось сохранить user_id локально:', e);
        }
    }

    getCurrentTelegramData() {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            return {
                id: user.id,
                username: user.username || null,
                first_name: user.first_name || null,
                last_name: user.last_name || null,
                language_code: user.language_code || 'ru',
                is_premium: user.is_premium || false
            };
        }
        return null;
    }

    // Синхронизация с сервером (в фоне)
    async syncWithServer(force = false) {
        const userId = this.getCurrentUserId();
        if (!userId || this.syncState.syncInProgress) return;

        const timeSinceLastSync = Date.now() - this.syncState.lastSyncTime;
        const minSyncInterval = 30000; // 30 секунд

        if (!force && timeSinceLastSync < minSyncInterval) return;

        this.syncState.syncInProgress = true;

        try {
            const telegramData = this.getCurrentTelegramData();
            const deviceId = this.syncState.deviceId || this.generateDeviceId();

            const syncPayload = {
                user_id: userId,
                telegram_data: telegramData,
                sync_timestamp: Date.now(),
                device_id: deviceId,
                local_balance: this.userBalance,
                pending_changes: this.syncState.pendingChanges
            };

            const response = await fetch('/api/v1/users/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(syncPayload)
            });

            if (response.ok) {
                const syncResult = await response.json();
                const oldBalance = this.userBalance;
                this.userBalance = syncResult.balance;
                this.syncState.pendingChanges = [];
                this.syncState.lastSyncTime = Date.now();
                this.analytics.syncCount++;
                this.saveUserData();

                // Обновляем UI если баланс изменился
                if (oldBalance !== this.userBalance) {
                    this.updateBalanceDisplay();
                    const diff = this.userBalance - oldBalance;
                    if (diff > 0) {
                        this.showNotification(`💰 Баланс обновлен: +${diff} STcoin!`, 'success', 6000);
                    }
                }

                return syncResult;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.analytics.syncErrors++;
            this.addPendingChange('sync_error', { error: error.message, timestamp: Date.now() });
        } finally {
            this.syncState.syncInProgress = false;
        }
    }

    addPendingChange(type, data) {
        this.syncState.pendingChanges.push({
            type: type,
            data: data,
            timestamp: Date.now(),
            device_id: this.syncState.deviceId
        });

        if (this.syncState.pendingChanges.length > 50) {
            this.syncState.pendingChanges = this.syncState.pendingChanges.slice(-30);
        }
    }

    // Синхронизация баланса
    async forceSyncBalance() {
        const userId = this.getCurrentUserId();
        if (!userId) return;

        try {
            const response = await fetch(`/api/v1/users/${userId}/balance`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'X-Device-ID': this.syncState.deviceId || 'unknown'
                }
            });

            if (response.ok) {
                const balanceData = await response.json();
                const oldBalance = this.userBalance;
                this.userBalance = balanceData.balance;
                this.updateBalanceDisplay();
                this.saveUserData();

                if (oldBalance !== this.userBalance && oldBalance > 0) {
                    const diff = this.userBalance - oldBalance;
                    if (diff > 0) {
                        this.showNotification(`💰 Баланс обновлен: +${diff} STcoin!`, 'success', 6000);
                    }
                }
                return balanceData;
            }
        } catch (error) {
            console.error('❌ Ошибка синхронизации баланса:', error);
        }
    }

    updateBalanceDisplay() {
        const balanceElements = document.querySelectorAll('[data-balance-display]');
        balanceElements.forEach(element => {
            element.textContent = this.userBalance;
        });

        const consultationElements = document.querySelectorAll('[data-consultations-display]');
        const consultationsAvailable = Math.floor(this.userBalance / 10);
        consultationElements.forEach(element => {
            element.textContent = consultationsAvailable;
        });

        if (this.currentSection === 'balance') {
            this.showBalanceSection();
        }
    }

    // Мониторинг сети
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.syncState.isOnline = true;
            setTimeout(() => this.syncWithServer(true), 1000);
        });

        window.addEventListener('offline', () => {
            this.syncState.isOnline = false;
        });

        this.onlineStatusInterval = setInterval(() => {
            const currentStatus = navigator.onLine;
            if (currentStatus !== this.syncState.isOnline) {
                this.syncState.isOnline = currentStatus;
            }
        }, 5000);
    }

    // Периодическая синхронизация
    startPeriodicSync() {
        setTimeout(() => this.syncWithServer(true), 2000);
        
        this.syncInterval = setInterval(() => {
            if (this.syncState.isOnline && !this.syncState.syncInProgress) {
                this.syncWithServer(false);
            }
        }, 120000); // 2 минуты

        this.balanceCheckInterval = setInterval(() => {
            if (this.syncState.isOnline && !this.syncState.syncInProgress) {
                this.forceSyncBalance();
            }
        }, 30000); // 30 секунд
    }

    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        if (this.balanceCheckInterval) {
            clearInterval(this.balanceCheckInterval);
            this.balanceCheckInterval = null;
        }
        if (this.onlineStatusInterval) {
            clearInterval(this.onlineStatusInterval);
            this.onlineStatusInterval = null;
        }
    }

    deductConsultation(cost = 10) {
        this.addPendingChange('consultation_used', {
            cost: cost,
            timestamp: Date.now(),
            balance_before: this.userBalance,
            balance_after: this.userBalance - cost
        });

        this.userBalance -= cost;
        this.consultationsUsed += cost;
        this.saveUserData();

        if (this.syncState.isOnline) {
            this.syncWithServer(true);
        }
    }

    // === API ИНИЦИАЛИЗАЦИЯ ===
    
    async initializeAPI() {
        try {
            let apiUrl;
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                apiUrl = 'http://localhost:8000/api/v1/health';
            } else {
                apiUrl = `${window.location.protocol}//${window.location.hostname}/api/v1/health`;
            }
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                
                const response = await fetch(apiUrl, { 
                    signal: controller.signal,
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const healthData = await response.json();
                    if (healthData.gemini_working) {
                        this.api = new window.MishuraAPIService();
                        await this.loadPaymentPackages();
                    } else {
                        this.api = new window.MockMishuraAPIService();
                    }
                } else {
                    this.api = new window.MockMishuraAPIService();
                }
            } catch (e) {
                this.api = new window.MockMishuraAPIService();
            }
            
            this.updateAPIStatus();
            
        } catch (error) {
            this.api = new window.MockMishuraAPIService();
            this.updateAPIStatus();
        }
    }

    async loadPaymentPackages() {
        try {
            const response = await fetch('/api/v1/payments/packages');
            if (response.ok) {
                const data = await response.json();
                this.paymentPackages = data.packages;
            } else {
                this.paymentPackages = null;
            }
        } catch (error) {
            this.paymentPackages = null;
        }
    }

    updateAPIStatus() {
        const isRealAPI = this.api && !this.api.isMock;
        const statusElement = document.querySelector('.api-status');
        
        if (statusElement) {
            statusElement.textContent = isRealAPI ? '🌐 Реальный API' : '🎭 Демо-режим';
            statusElement.className = `api-status ${isRealAPI ? 'real' : 'demo'}`;
        }
        
        if (!isRealAPI) {
            setTimeout(() => {
                this.showNotification('🔬 Работаем в демо-режиме с примерами ответов', 'info', 4000);
            }, 2000);
        }
    }

    // === ИНИЦИАЛИЗАЦИЯ ===
    
    async init() {
        if (this.initializationComplete) return;

        try {
            this.generateDeviceId();
            this.setupNetworkMonitoring();
            this.checkForSuccessfulPayment();
            
            this.setupModeButtons();
            this.setupCloseButtons();
            this.setupSubmitButton();
            this.initUploaders();
            this.setupNavigation();
            this.setupKeyboardShortcuts();
            this.setupDragAndDrop();
            this.setupContextMenu();
            this.setupOccasionDropdown();
            this.setupResultNavigation();
            
            this.loadUserData();
            this.startPeriodicSync();
            this.setupTelegramIntegration();
            
            this.initializationComplete = true;
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }

    checkForSuccessfulPayment() {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment_success');
        const urlUserId = urlParams.get('user_id');

        if (paymentSuccess === '1' && urlUserId) {
            const numericUserId = parseInt(urlUserId);
            if (numericUserId === this.getCurrentUserId()) {
                this.showNotification('🎉 Проверяем пополнение баланса...', 'info', 3000);
                setTimeout(() => this.forceSyncBalance(), 2000);
                const newUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }
        }
    }

    // === НАВИГАЦИЯ ===
    
    setupNavigation() {
        if (this.navigationSetup) return;

        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                const targetSection = newBtn.id.replace('nav-', '');
                this.navigateToSection(targetSection);
                this.triggerHapticFeedback('light');
            });
        });
        
        this.navigationSetup = true;
    }

    navigateToSection(section) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = document.getElementById(`nav-${section}`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
        
        this.currentSection = section;
        this.showSection(section);
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
            this.modeButtonsSetup = false;
            this.setupModeButtons();
        }, 100);
    }

    showHistorySection() {
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

    // ОЧИЩЕННАЯ секция баланса (убрана вся лишняя информация о синхронизации)
    showBalanceSection() {
        const container = document.querySelector('.container');
        if (!container) return;
        
        const consultationsRemaining = Math.floor(this.userBalance / 10);
        
        container.innerHTML = `
            <header class="header">
                <h1>💰 Баланс</h1>
                <p>Управление STcoin</p>
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
            
            <div class="add-balance-section">
                <button id="add-balance-btn" class="action-btn" style="
                    width: 100%;
                    margin-bottom: 16px;
                    background: rgba(26, 26, 26, 0.8);
                    border: 2px solid var(--border-gold);
                    color: var(--text-gold);
                ">
                    <span class="icon">💳</span>
                    Пополнить STcoin
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
                        Одна консультация стоит 10 STcoin.
                        Пополнение через безопасную платежную систему ЮKassa.
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем обработчик кнопки пополнения
        const addBalanceBtn = document.getElementById('add-balance-btn');
        if (addBalanceBtn) {
            addBalanceBtn.addEventListener('click', () => {
                this.showPaymentModal();
            });
        }
    }

    // === ОСТАЛЬНЫЕ МЕТОДЫ (упрощены и оптимизированы) ===
    
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

    // === DRAG & DROP (упрощено) ===
    
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

    // === ПЛАТЕЖИ (упрощено) ===
    
    showPaymentModal() {
        if (!this.paymentPackages) {
            this.showNotification('🔄 Загружаем пакеты пополнения...', 'info');
            this.loadPaymentPackages().then(() => {
                if (this.paymentPackages) {
                    this.showPaymentModal();
                } else {
                    this.showNotification('❌ Пакеты пополнения недоступны', 'error');
                }
            });
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'payment-modal';
        
        let packagesHTML = '';
        Object.entries(this.paymentPackages).forEach(([packageId, packageData]) => {
            const isPopular = packageData.popular;
            packagesHTML += `
                <div class="payment-package ${isPopular ? 'popular' : ''}" 
                     data-package-id="${packageId}"
                     style="
                        background: ${isPopular ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))' : 'rgba(26, 26, 26, 0.8)'};
                        border: 2px solid ${isPopular ? 'var(--border-gold)' : 'var(--border-light)'};
                        border-radius: 16px;
                        padding: 20px;
                        margin-bottom: 16px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                     ">
                    ${isPopular ? '<div style="position: absolute; top: -8px; right: 16px; background: var(--accent-gold); color: var(--bg-primary); padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">🔥 ПОПУЛЯРНЫЙ</div>' : ''}
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h3 style="color: var(--text-gold); margin: 0; font-size: 1.2rem;">${packageData.name}</h3>
                        <div style="color: var(--text-light); font-size: 1.5rem; font-weight: 700;">${packageData.price_rub}₽</div>
                    </div>
                    
                    <div style="color: var(--text-muted); margin-bottom: 12px; font-size: 0.9rem;">
                        ${packageData.description}
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="color: var(--text-light);">
                            <span style="font-size: 1.1rem; font-weight: 600;">${packageData.stcoin}</span>
                            <span style="color: var(--text-muted); margin-left: 4px;">STcoin</span>
                        </div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">
                            ${packageData.consultations} консультаций
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
        
        modal.querySelectorAll('.payment-package').forEach(packageElement => {
            packageElement.addEventListener('click', () => {
                const packageId = packageElement.dataset.packageId;
                this.initiatePayment(packageId);
            });
        });
        
        this.triggerHapticFeedback('light');
    }

    async initiatePayment(packageId) {
        const packageData = this.paymentPackages[packageId];
        if (!packageData) {
            this.showNotification('❌ Пакет не найден', 'error');
            return;
        }

        try {
            this.showNotification('💳 Создаем платеж...', 'info');

            const response = await fetch('/api/v1/payments/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-ID': this.syncState.deviceId || 'unknown'
                },
                body: JSON.stringify({
                    user_id: this.getCurrentUserId(),
                    package_id: packageId,
                    return_url: window.location.origin + '/webapp'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const paymentData = await response.json();

            if (paymentData.status === 'success') {
                this.currentPayment = {
                    id: paymentData.payment_id,
                    packageId: packageId,
                    amount: paymentData.amount,
                    stcoinAmount: paymentData.stcoin_amount,
                    confirmationUrl: paymentData.confirmation_url
                };

                const paymentModal = document.getElementById('payment-modal');
                if (paymentModal) {
                    paymentModal.remove();
                }

                this.showPaymentConfirmation();

            } else {
                throw new Error(paymentData.message || 'Не удалось создать платеж');
            }

        } catch (error) {
            console.error('❌ Ошибка создания платежа:', error);
            this.showNotification('❌ Ошибка создания платежа. Попробуйте позже.', 'error');
        }
    }

    showPaymentConfirmation() {
        if (!this.currentPayment) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'payment-confirmation-modal';

        const packageData = this.paymentPackages[this.currentPayment.packageId];

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2 class="modal-title">💳 Подтверждение платежа</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="
                        background: var(--gold-gradient);
                        color: var(--text-dark);
                        border-radius: 16px;
                        padding: 20px;
                        margin-bottom: 20px;
                        text-align: center;
                    ">
                        <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">
                            ${packageData.name}
                        </div>
                        <div style="font-size: 2rem; font-weight: 900; margin-bottom: 8px;">
                            ${this.currentPayment.amount}₽
                        </div>
                        <div style="font-size: 1rem; opacity: 0.8;">
                            ${this.currentPayment.stcoinAmount} STcoin
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button id="cancel-payment-btn" style="
                            flex: 1;
                            background: transparent;
                            border: 1px solid var(--border-light);
                            color: var(--text-light);
                            padding: 12px;
                            border-radius: 8px;
                            cursor: pointer;
                        ">Отмена</button>
                        
                        <button id="proceed-payment-btn" style="
                            flex: 2;
                            background: var(--accent-gold);
                            border: none;
                            color: var(--bg-primary);
                            padding: 12px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                        ">Перейти к оплате</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#cancel-payment-btn').addEventListener('click', () => {
            modal.remove();
            this.currentPayment = null;
        });

        modal.querySelector('#proceed-payment-btn').addEventListener('click', () => {
            this.proceedToPayment();
        });

        this.triggerHapticFeedback('light');
    }

    proceedToPayment() {
        if (!this.currentPayment || !this.currentPayment.confirmationUrl) {
            this.showNotification('❌ Ошибка платежа', 'error');
            return;
        }

        const confirmationModal = document.getElementById('payment-confirmation-modal');
        if (confirmationModal) {
            confirmationModal.remove();
        }

        this.showNotification('🔄 Переходим к оплате...', 'info');
        this.startPaymentStatusCheck();
        window.open(this.currentPayment.confirmationUrl, '_blank');
        this.triggerHapticFeedback('medium');
    }

    startPaymentStatusCheck() {
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
        }

        this.paymentCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/v1/payments/status/${this.currentPayment.id}`);
                
                if (response.ok) {
                    const statusData = await response.json();

                    if (statusData.payment_status === 'succeeded') {
                        this.handleSuccessfulPayment();
                    } else if (statusData.payment_status === 'canceled') {
                        this.handleCanceledPayment();
                    }
                }
            } catch (error) {
                console.warn('⚠️ Ошибка при проверке платежа:', error);
            }
        }, 5000);

        setTimeout(() => {
            if (this.paymentCheckInterval) {
                clearInterval(this.paymentCheckInterval);
                this.paymentCheckInterval = null;
            }
        }, 600000);
    }

    handleSuccessfulPayment() {
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
            this.paymentCheckInterval = null;
        }

        this.addPendingChange('payment_completed', {
            payment_id: this.currentPayment.id,
            stcoin_amount: this.currentPayment.stcoinAmount,
            timestamp: Date.now()
        });

        this.userBalance += this.currentPayment.stcoinAmount;
        this.saveUserData();
        this.syncWithServer(true);

        this.showNotification(
            `🎉 Платеж успешен! Зачислено ${this.currentPayment.stcoinAmount} STcoin`, 
            'success', 
            8000
        );

        if (this.currentSection === 'balance') {
            this.showBalanceSection();
        }

        this.currentPayment = null;
        this.triggerHapticFeedback('success');
    }

    handleCanceledPayment() {
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
            this.paymentCheckInterval = null;
        }

        this.showNotification('❌ Платеж отменен', 'warning');
        this.currentPayment = null;
        this.triggerHapticFeedback('error');
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

    diagnose() {
        const diagnosis = {
            timestamp: new Date().toISOString(),
            version: '2.5.0',
            initialization: this.initializationComplete,
            api: {
                connected: !!this.api,
                type: this.api ? (this.api.isMock ? 'Mock' : 'Real') : 'None'
            },
            sync: {
                userId: this.syncState.userId,
                deviceId: this.syncState.deviceId,
                isOnline: this.syncState.isOnline,
                lastSyncTime: this.syncState.lastSyncTime,
                syncInProgress: this.syncState.syncInProgress,
                pendingChanges: this.syncState.pendingChanges.length,
                syncCount: this.analytics.syncCount,
                syncErrors: this.analytics.syncErrors
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
            payments: {
                packagesLoaded: !!this.paymentPackages,
                packagesCount: this.paymentPackages ? Object.keys(this.paymentPackages).length : 0,
                currentPayment: this.currentPayment ? this.currentPayment.id : null,
                checkingPayment: !!this.paymentCheckInterval
            }
        };
        
        console.log('🔧 Диагностика МИШУРЫ:', diagnosis);
        return diagnosis;
    }
}

// === ИНИЦИАЛИЗАЦИЯ ===

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeMishuraApp();
    });
} else {
    initializeMishuraApp();
}

function initializeMishuraApp() {
    try {
        if (window.mishuraApp) {
            console.log('⚠️ MishuraApp уже существует, пропускаем создание');
            return;
        }
        
        console.log('🎬 Создание экземпляра MishuraApp...');
        window.mishuraApp = new MishuraApp();
        
        // Утилиты для отладки
        window.mishuraUtils = {
            diagnose: () => window.mishuraApp.diagnose(),
            reset: () => window.mishuraApp.reset(),
            analytics: () => window.mishuraApp.getAnalytics(),
            testNotification: (message, type) => window.mishuraApp.showNotification(message, type),
            forceSyncNow: () => window.mishuraApp.syncWithServer(true),
            checkBalance: () => window.mishuraApp.forceSyncBalance(),
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
            },
            testPaymentModal: () => {
                window.mishuraApp.showPaymentModal();
            }
        };
        
        console.log(`
🎉 === МИШУРА ГОТОВА ===

📋 КОМАНДЫ В КОНСОЛИ:
• mishuraUtils.diagnose() - диагностика
• mishuraUtils.analytics() - статистика
• mishuraUtils.reset() - сброс состояния
• mishuraUtils.testSingle() - тест анализа
• mishuraUtils.testCompare() - тест сравнения
• mishuraUtils.testPaymentModal() - тест платежей

🔄 СИНХРОНИЗАЦИЯ:
• mishuraUtils.forceSyncNow() - принудительная синхронизация
• mishuraUtils.checkBalance() - проверка баланса

🎯 СОСТОЯНИЕ:
• Версия: 2.5.0 (оптимизированная)
• API: ${window.mishuraApp.api ? (window.mishuraApp.api.isMock ? 'Mock (демо)' : 'Реальный') : 'Не подключен'}
• User ID: ${window.mishuraApp.syncState.userId || 'определяется...'}
• Баланс: ${window.mishuraApp.userBalance} STcoin
• Синхронизация работает в фоне незаметно для пользователя
        `);
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации МИШУРЫ:', error);
        
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center;
                padding: 20px;
            ">
                <div style="
                    background: rgba(239, 68, 68, 0.1);
                    border: 2px solid #ef4444;
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 500px;
                    margin: 20px;
                ">
                    <div style="font-size: 4rem; margin-bottom: 20px;">🚫</div>
                    
                    <h1 style="
                        color: #ef4444; 
                        margin-bottom: 16px;
                        font-size: 1.5rem;
                    ">Доступ заблокирован</h1>
                    
                    <p style="
                        color: #a1a1aa; 
                        margin-bottom: 24px; 
                        line-height: 1.6;
                        font-size: 1.1rem;
                    ">
                        Это приложение работает <strong>только через Telegram бота</strong>.<br>
                        Доступ через обычный браузер запрещен для обеспечения безопасности.
                    </p>
                    
                    <div style="
                        background: rgba(212, 175, 55, 0.1);
                        border: 1px solid rgba(212, 175, 55, 0.3);
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 24px;
                        text-align: left;
                    ">
                        <h3 style="color: #d4af37; margin-bottom: 12px; font-size: 1.1rem;">
                            📱 Как получить доступ:
                        </h3>
                        <ol style="color: #e5e5e5; margin: 0; padding-left: 20px; line-height: 1.8;">
                            <li>Откройте Telegram</li>
                            <li>Найдите бота <strong>@MishuraAIBot</strong></li>
                            <li>Нажмите <strong>"🌐 Веб-приложение"</strong></li>
                            <li>Или отправьте команду <code>/webapp</code></li>
                        </ol>
                    </div>
                    
                    <div style="
                        color: #71717a;
                        font-size: 0.9rem;
                        margin-top: 20px;
                    ">
                        💡 Баланс автоматически синхронизируется между всеми устройствами
                    </div>
                </div>
            </div>
        `;
    }
}

console.log('📦 МИШУРА App модуль загружен (очищенная версия v2.5.0)!');
            