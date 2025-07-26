// Единая система идентификации и синхронизации балансов

class UnifiedUserSyncSystem {
    constructor() {
        this.currentUser = null;
        this.balanceCache = null;
        this.syncInProgress = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Настройки API
        this.API_BASE_URL = this.detectAPIBaseURL();
        
        // События для подписки на изменения
        this.eventHandlers = {
            'userIdentified': [],
            'balanceUpdated': [],
            'syncCompleted': [],
            'syncFailed': []
        };
        
        this.log('🚀 Инициализация Unified User Sync System');
        this.initialize();
    }

    /**
     * 🔍 Автоматическое определение API URL
     */
    detectAPIBaseURL() {
        if (window.location.hostname === 'localhost') {
            // Локальная разработка - проверяем доступные порты
            return 'http://localhost:8001/api/v1';
        } else {
            // Продакшн - используем текущий домен
            return `${window.location.origin}/api/v1`;
        }
    }

    /**
     * 🎯 Инициализация системы
     */
    async initialize() {
        try {
            // 1. Определяем пользователя
            await this.identifyUser();
            
            // 2. Синхронизируем баланс
            await this.syncBalance();
            
            // 3. Настраиваем автоматическую синхронизацию
            this.setupAutoSync();
            
            // 4. Настраиваем UI обновления
            this.setupUISync();
            
            this.log('✅ Система успешно инициализирована');
            
        } catch (error) {
            this.error('❌ Ошибка инициализации системы:', error);
        }
    }

    /**
     * 👤 ЕДИНАЯ ЛОГИКА ОПРЕДЕЛЕНИЯ ПОЛЬЗОВАТЕЛЯ
     */
    async identifyUser() {
        try {
            let userInfo = {
                telegramId: null,
                source: 'unknown',
                deviceFingerprint: this.generateDeviceFingerprint(),
                isAuthenticated: false
            };

            // Приоритет 1: Telegram WebApp (наивысший приоритет)
            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
                userInfo = {
                    telegramId: parseInt(tgUser.id),
                    source: 'telegram_webapp',
                    deviceFingerprint: this.generateDeviceFingerprint(),
                    isAuthenticated: true,
                    telegramData: {
                        username: tgUser.username,
                        firstName: tgUser.first_name,
                        lastName: tgUser.last_name,
                        languageCode: tgUser.language_code
                    }
                };
                this.log(`👤 Telegram пользователь определен: ${userInfo.telegramId}`);
            }
            
            // Приоритет 2: URL параметры
            else {
                const urlParams = new URLSearchParams(window.location.search);
                const urlTelegramId = urlParams.get('user_id') || urlParams.get('telegram_id');
                
                if (urlTelegramId && !isNaN(parseInt(urlTelegramId))) {
                    userInfo.telegramId = parseInt(urlTelegramId);
                    userInfo.source = 'url_params';
                    userInfo.isAuthenticated = true;
                    this.log(`🔗 Пользователь из URL: ${userInfo.telegramId}`);
                }
            }

            // Приоритет 3: Поиск существующей сессии
            if (!userInfo.telegramId) {
                const existingUser = await this.findExistingUser(userInfo.deviceFingerprint);
                if (existingUser) {
                    userInfo = existingUser;
                }
            }

            // Приоритет 4: Создание нового пользователя или использование гостевого режима
            if (!userInfo.telegramId) {
                const newUser = await this.createOrUseGuestUser(userInfo.deviceFingerprint);
                if (newUser) {
                    userInfo = newUser;
                }
            }

            // Сохраняем пользователя и обновляем сессию
            this.currentUser = userInfo;
            await this.updateUserSession(userInfo);

            this.triggerEvent('userIdentified', userInfo);
            this.log(`✅ Пользователь идентифицирован: ${userInfo.telegramId} (${userInfo.source})`);

            return userInfo;

        } catch (error) {
            this.error('❌ Ошибка идентификации пользователя:', error);
            
            // Fallback: используем гостевого пользователя
            const fallbackUser = {
                telegramId: 5930269100,
                source: 'fallback_guest',
                deviceFingerprint: this.generateDeviceFingerprint(),
                isAuthenticated: false,
                isGuest: true
            };
            
            this.currentUser = fallbackUser;
            this.warn('⚠️ Используется fallback пользователь');
            return fallbackUser;
        }
    }

    /**
     * 🔍 Поиск существующего пользователя по отпечатку устройства
     */
    async findExistingUser(deviceFingerprint) {
        try {
            const response = await this.makeAPIRequest(`/users/device/${deviceFingerprint}`);
            
            if (response && response.success && response.user) {
                return {
                    telegramId: response.user.telegram_id,
                    source: 'device_fingerprint',
                    deviceFingerprint: deviceFingerprint,
                    isAuthenticated: true,
                    existingUser: true
                };
            }
        } catch (error) {
            this.warn('⚠️ Не удалось найти существующего пользователя по отпечатку устройства');
        }

        // Fallback: проверяем localStorage
        try {
            const storedSession = localStorage.getItem('mishura_user_session');
            if (storedSession) {
                const session = JSON.parse(storedSession);
                if (this.isValidSession(session)) {
                    return {
                        telegramId: session.telegramId,
                        source: 'stored_session',
                        deviceFingerprint: deviceFingerprint,
                        isAuthenticated: false,
                        sessionData: session
                    };
                }
            }
        } catch (error) {
            this.warn('⚠️ Ошибка чтения сохраненной сессии');
        }

        return null;
    }

    /**
     * 🆕 Создание нового пользователя или использование гостевого режима
     */
    async createOrUseGuestUser(deviceFingerprint) {
        try {
            // Пытаемся создать анонимного пользователя через API
            const response = await this.makeAPIRequest('/users/anonymous', {
                method: 'POST',
                body: JSON.stringify({
                    deviceFingerprint: deviceFingerprint,
                    source: 'webapp',
                    timestamp: Date.now()
                })
            });

            if (response && response.success && response.user) {
                return {
                    telegramId: response.user.telegram_id,
                    source: response.user.is_existing ? 'existing_anonymous' : 'anonymous_created',
                    deviceFingerprint: deviceFingerprint,
                    isAuthenticated: true,
                    isAnonymous: true
                };
            }
        } catch (error) {
            this.warn('⚠️ Не удалось создать анонимного пользователя через API');
        }

        // Fallback: используем фиксированного гостевого пользователя
        const guestTelegramId = 5930269100; // Известный рабочий ID
        this.warn(`🔄 Используется гостевой пользователь: ${guestTelegramId}`);
        
        return {
            telegramId: guestTelegramId,
            source: 'guest_fallback',
            deviceFingerprint: deviceFingerprint,
            isAuthenticated: false,
            isGuest: true
        };
    }

    /**
     * 💾 Обновление пользовательской сессии
     */
    async updateUserSession(userInfo) {
        try {
            const sessionData = {
                telegramId: userInfo.telegramId,
                source: userInfo.source,
                deviceFingerprint: userInfo.deviceFingerprint,
                isAuthenticated: userInfo.isAuthenticated,
                timestamp: Date.now(),
                telegramData: userInfo.telegramData || null,
                version: '2.0'
            };

            // Сохраняем в localStorage
            localStorage.setItem('mishura_user_session', JSON.stringify(sessionData));
            
            // Совместимость со старыми ключами
            localStorage.setItem('user_id', userInfo.telegramId.toString());
            localStorage.setItem('telegram_user_id', userInfo.telegramId.toString());

            // Отправляем информацию на сервер для связки устройства с пользователем
            if (userInfo.isAuthenticated) {
                try {
                    await this.makeAPIRequest('/users/device-link', {
                        method: 'POST',
                        body: JSON.stringify({
                            telegramId: userInfo.telegramId,
                            deviceFingerprint: userInfo.deviceFingerprint,
                            sessionData: sessionData
                        })
                    });
                } catch (error) {
                    this.warn('⚠️ Не удалось связать устройство с пользователем на сервере');
                }
            }

            this.log('💾 Пользовательская сессия обновлена');

        } catch (error) {
            this.error('❌ Ошибка обновления сессии:', error);
        }
    }

    /**
     * 💰 УНИФИЦИРОВАННАЯ СИНХРОНИЗАЦИЯ БАЛАНСА
     */
    async syncBalance(forceSync = false) {
        if (this.syncInProgress && !forceSync) {
            this.log('⏳ Синхронизация уже выполняется');
            return this.balanceCache?.balance || this.getLocalBalance();
        }

        if (!this.currentUser || !this.currentUser.telegramId) {
            this.error('❌ Нет данных пользователя для синхронизации баланса');
            return this.getLocalBalance();
        }

        this.syncInProgress = true;
        const startTime = Date.now();

        try {
            this.log(`🔄 Синхронизация баланса для пользователя ${this.currentUser.telegramId}`);

            // Запрашиваем актуальный баланс с сервера
            const response = await this.makeAPIRequest(`/users/${this.currentUser.telegramId}/balance`);

            if (!response || typeof response.balance === 'undefined') {
                throw new Error('Некорректный ответ сервера');
            }

            const serverBalance = parseInt(response.balance);
            const localBalance = this.getLocalBalance();

            // Сравниваем балансы
            if (localBalance !== serverBalance || forceSync) {
                this.log(`🔄 Обнаружено расхождение: локальный=${localBalance}, сервер=${serverBalance}`);
                
                // Обновляем локальный баланс
                this.updateLocalBalance(serverBalance);
                
                // Обновляем UI
                this.updateBalanceUI(serverBalance);
                
                this.log(`✅ Баланс синхронизирован: ${serverBalance} STcoin`);
            } else {
                this.log(`✅ Баланс актуален: ${serverBalance} STcoin`);
            }

            // Сохраняем дополнительную информацию
            this.balanceCache = {
                balance: serverBalance,
                lastSync: Date.now(),
                syncDuration: Date.now() - startTime,
                source: 'server'
            };

            this.retryCount = 0; // Сброс счетчика попыток при успехе
            this.triggerEvent('balanceUpdated', { balance: serverBalance, source: 'sync' });
            this.triggerEvent('syncCompleted', this.balanceCache);

            return serverBalance;

        } catch (error) {
            this.error('❌ Ошибка синхронизации баланса:', error);
            
            // Retry logic
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                this.warn(`🔄 Повтор синхронизации (попытка ${this.retryCount}/${this.maxRetries})`);
                
                setTimeout(() => {
                    this.syncBalance(forceSync);
                }, 2000 * this.retryCount); // Экспоненциальная задержка
                
                return this.getLocalBalance();
            }

            // Используем локальный баланс как fallback
            const fallbackBalance = this.getLocalBalance();
            this.warn(`⚠️ Используется локальный баланс: ${fallbackBalance} STcoin`);
            
            this.triggerEvent('syncFailed', { error: error.message, fallbackBalance });
            return fallbackBalance;

        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * 📱 Обновление UI элементов с балансом
     */
    updateBalanceUI(balance) {
        const selectors = [
            '#balance-display',
            '.balance-amount',
            '.balance-value',
            '[data-balance]',
            '#user-balance',
            '.stcoin-balance',
            '.balance-text',
            '#balance-counter',
            '.current-balance',
            '.balance-display'
        ];

        let updatedElements = 0;

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element) {
                    // Определяем, как обновлять элемент
                    if (element.tagName === 'INPUT') {
                        element.value = balance;
                    } else {
                        element.textContent = `${balance} STcoin`;
                    }
                    
                    // Устанавливаем data-атрибут
                    element.setAttribute('data-balance', balance);
                    
                    // Визуальная анимация обновления
                    element.classList.add('balance-updated');
                    setTimeout(() => {
                        element.classList.remove('balance-updated');
                    }, 2000);
                    
                    updatedElements++;
                }
            });
        });

        // Обновляем глобальные переменные
        if (typeof window.userBalance !== 'undefined') {
            window.userBalance = balance;
        }
        if (typeof window.balance !== 'undefined') {
            window.balance = balance;
        }
        if (typeof window.currentBalance !== 'undefined') {
            window.currentBalance = balance;
        }

        // Диспетчеризуем событие для других компонентов
        window.dispatchEvent(new CustomEvent('balanceChanged', {
            detail: { 
                balance: balance, 
                telegramId: this.currentUser.telegramId,
                timestamp: Date.now()
            }
        }));

        this.log(`🎨 Обновлено ${updatedElements} UI элементов с балансом ${balance} STcoin`);
    }

    /**
     * 💾 Управление локальным балансом
     */
    getLocalBalance() {
        try {
            const storedBalance = localStorage.getItem('mishura_balance');
            return storedBalance ? parseInt(storedBalance) : 0;
        } catch (error) {
            return 0;
        }
    }

    updateLocalBalance(balance) {
        try {
            localStorage.setItem('mishura_balance', balance.toString());
            localStorage.setItem('mishura_balance_timestamp', Date.now().toString());
        } catch (error) {
            this.error('❌ Ошибка сохранения баланса в localStorage:', error);
        }
    }

    /**
     * 🌐 Универсальный метод для API запросов
     */
    async makeAPIRequest(endpoint, options = {}) {
        const url = `${this.API_BASE_URL}${endpoint}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Source': this.currentUser?.source || 'unknown',
                'X-Device-Fingerprint': this.currentUser?.deviceFingerprint || 'unknown'
            },
            credentials: 'include',
            ...options
        };

        try {
            this.log(`🌐 API запрос: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, defaultOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.log(`✅ API ответ получен`);
            return data;

        } catch (error) {
            this.error(`❌ API запрос неудачен (${url}):`, error);
            throw error;
        }
    }

    /**
     * ⏰ Настройка автоматической синхронизации
     */
    setupAutoSync() {
        // Синхронизация при фокусе страницы
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.log('👁️ Страница получила фокус - синхронизация баланса');
                this.syncBalance();
            }
        });

        // Периодическая синхронизация каждые 60 секунд
        setInterval(() => {
            if (!this.syncInProgress) {
                this.log('⏰ Автоматическая синхронизация');
                this.syncBalance();
            }
        }, 60000);

        // Синхронизация при online статусе
        window.addEventListener('online', () => {
            this.log('🌐 Интернет соединение восстановлено - синхронизация');
            this.syncBalance(true);
        });

        this.log('⏰ Автоматическая синхронизация настроена');
    }

    /**
     * 🎨 Настройка UI синхронизации
     */
    setupUISync() {
        // CSS для анимаций
        if (!document.getElementById('unified-sync-styles')) {
            const styles = document.createElement('style');
            styles.id = 'unified-sync-styles';
            styles.textContent = `
                .balance-updated {
                    animation: balanceUpdateAnimation 2s ease-in-out;
                    font-weight: bold;
                }
                
                @keyframes balanceUpdateAnimation {
                    0% { transform: scale(1); color: inherit; }
                    25% { transform: scale(1.05); color: #4CAF50; }
                    75% { transform: scale(1.02); color: #4CAF50; }
                    100% { transform: scale(1); color: inherit; }
                }
                
                .sync-status {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    z-index: 10000;
                    transition: all 0.3s ease;
                }
                
                .sync-status.syncing {
                    background: #2196F3;
                    color: white;
                }
                
                .sync-status.success {
                    background: #4CAF50;
                    color: white;
                }
                
                .sync-status.error {
                    background: #f44336;
                    color: white;
                }
            `;
            document.head.appendChild(styles);
        }

        // Подписываемся на события синхронизации
        this.addEventListener('syncCompleted', (data) => {
            this.showSyncStatus('✅ Баланс синхронизирован', 'success');
        });

        this.addEventListener('syncFailed', (data) => {
            this.showSyncStatus('❌ Ошибка синхронизации', 'error');
        });
    }

    /**
     * 📢 Показ статуса синхронизации
     */
    showSyncStatus(message, type = 'info', duration = 3000) {
        // Удаляем предыдущие уведомления
        const existing = document.querySelectorAll('.sync-status');
        existing.forEach(el => el.remove());

        const status = document.createElement('div');
        status.className = `sync-status ${type}`;
        status.textContent = message;
        
        document.body.appendChild(status);

        setTimeout(() => {
            if (status.parentElement) {
                status.remove();
            }
        }, duration);
    }

    /**
     * 🔧 Вспомогательные методы
     */
    generateDeviceFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Fingerprint', 2, 2);
            
            const canvasFingerprint = canvas.toDataURL();
            const screenFingerprint = `${screen.width}x${screen.height}`;
            const timezoneFingerprint = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const languageFingerprint = navigator.language;
            
            const combined = canvasFingerprint + screenFingerprint + timezoneFingerprint + languageFingerprint;
            
            // Простая хэш функция
            let hash = 0;
            for (let i = 0; i < combined.length; i++) {
                const char = combined.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            
            return `fp_${Math.abs(hash).toString(36)}`;
            
        } catch (error) {
            return `fp_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
        }
    }

    isValidSession(session) {
        if (!session || !session.telegramId || !session.timestamp) {
            return false;
        }

        // Сессия валидна 24 часа
        const sessionAge = Date.now() - session.timestamp;
        const maxAge = 24 * 60 * 60 * 1000;

        return sessionAge < maxAge && session.version === '2.0';
    }

    /**
     * 📡 Система событий
     */
    addEventListener(eventType, handler) {
        if (!this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = [];
        }
        this.eventHandlers[eventType].push(handler);
    }

    triggerEvent(eventType, data) {
        if (this.eventHandlers[eventType]) {
            this.eventHandlers[eventType].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    this.error(`❌ Ошибка в обработчике события ${eventType}:`, error);
                }
            });
        }
    }

    /**
     * 🔍 Публичные методы для диагностики
     */
    getCurrentUser() {
        return this.currentUser;
    }

    getCurrentBalance() {
        return this.balanceCache?.balance || this.getLocalBalance();
    }

    async forceSyncBalance() {
        this.log('🔄 Принудительная синхронизация баланса');
        return await this.syncBalance(true);
    }

    /**
     * 🧪 Диагностика системы
     */
    async diagnose() {
        console.log('🔍 === ДИАГНОСТИКА UNIFIED USER SYNC SYSTEM ===');
        
        console.log('👤 Текущий пользователь:', this.currentUser);
        console.log('💰 Кэш баланса:', this.balanceCache);
        console.log('🌐 API Base URL:', this.API_BASE_URL);
        console.log('🔄 Синхронизация в процессе:', this.syncInProgress);
        console.log('💾 Локальный баланс:', this.getLocalBalance());
        
        // Проверяем localStorage
        const session = localStorage.getItem('mishura_user_session');
        console.log('💾 Сессия в localStorage:', session ? JSON.parse(session) : null);
        
        // Проверяем API доступность
        try {
            const health = await this.makeAPIRequest('/health');
            console.log('🏥 API Health:', health);
        } catch (error) {
            console.error('❌ API недоступен:', error);
        }
        
        console.log('🔍 === КОНЕЦ ДИАГНОСТИКИ ===');
    }

    /**
     * 📝 Методы логирования
     */
    log(message, data) {
        console.log(`[UnifiedUserSync] ${message}`, data || '');
    }

    warn(message, data) {
        console.warn(`[UnifiedUserSync] ${message}`, data || '');
    }

    error(message, data) {
        console.error(`[UnifiedUserSync] ${message}`, data || '');
    }
}

// 🌍 Глобальная инициализация
window.unifiedUserSync = new UnifiedUserSyncSystem();

// 🚀 Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedUserSyncSystem;
}

console.log('✅ Unified User Sync System загружен и готов к работе!'); 