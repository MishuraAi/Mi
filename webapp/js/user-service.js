// 🔧 СОЗДАТЬ НОВЫЙ ФАЙЛ: webapp/js/user-service.js
// Унифицированная система управления пользователем

class UserService {
    constructor() {
        this.currentUserId = null;
        this.userInfo = null;
        this.balanceCache = new Map();
        this.syncInProgress = false;
        
        console.log('👤 UserService инициализирован');
    }

    /**
     * Получение текущего пользователя (единая точка истины)
     */
    getCurrentUserId() {
        if (this.currentUserId) {
            return this.currentUserId;
        }

        try {
            let userId = null;
            let source = 'unknown';

            // 1. Проверяем Telegram WebApp (высший приоритет)
            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                userId = parseInt(window.Telegram.WebApp.initDataUnsafe.user.id);
                source = 'telegram_webapp';
            }
            
            // 2. URL параметры
            else if (!userId) {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('user_id')) {
                    const urlUserId = parseInt(urlParams.get('user_id'));
                    if (!isNaN(urlUserId)) {
                        userId = urlUserId;
                        source = 'url_params';
                    }
                }
            }
            
            // 3. localStorage с актуальной сессией
            else if (!userId) {
                const stored = localStorage.getItem('current_user_session');
                if (stored) {
                    try {
                        const session = JSON.parse(stored);
                        if (this.isValidSession(session)) {
                            userId = parseInt(session.user_id);
                            source = 'stored_session';
                        }
                    } catch (e) {
                        console.warn('⚠️ Некорректная сессия в localStorage');
                    }
                }
            }
            
            // 4. Fallback ID
            if (!userId) {
                userId = 5930269100; // Известный рабочий ID
                source = 'fallback';
                console.warn('⚠️ Используется fallback user ID');
            }

            // Сохраняем и кэшируем
            this.currentUserId = userId;
            this.saveUserSession(userId, source);
            
            console.log(`✅ User ID определен: ${userId} (источник: ${source})`);
            return userId;

        } catch (error) {
            console.error('❌ Ошибка получения user ID:', error);
            const emergencyId = 5930269100;
            this.currentUserId = emergencyId;
            return emergencyId;
        }
    }

    /**
     * Сохранение сессии пользователя
     */
    saveUserSession(userId, source) {
        try {
            const session = {
                user_id: userId,
                source: source,
                timestamp: Date.now(),
                platform: this.getPlatformInfo(),
                telegram_info: this.getTelegramInfo()
            };

            localStorage.setItem('current_user_session', JSON.stringify(session));
            
            // Синхронизируем старые ключи для совместимости
            localStorage.setItem('user_id', userId.toString());
            localStorage.setItem('telegram_user_id', userId.toString());
            
            console.log('💾 Сессия пользователя сохранена:', session);

        } catch (error) {
            console.error('❌ Ошибка сохранения сессии:', error);
        }
    }

    /**
     * Проверка валидности сессии
     */
    isValidSession(session) {
        if (!session || !session.user_id || !session.timestamp) {
            return false;
        }

        // Сессия валидна 24 часа
        const sessionAge = Date.now() - session.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 часа

        return sessionAge < maxAge && !isNaN(parseInt(session.user_id));
    }

    /**
     * Получение информации о платформе
     */
    getPlatformInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screen: {
                width: screen.width,
                height: screen.height
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }

    /**
     * Получение информации Telegram
     */
    getTelegramInfo() {
        if (!window.Telegram?.WebApp) {
            return null;
        }

        const tg = window.Telegram.WebApp;
        return {
            platform: tg.platform,
            version: tg.version,
            colorScheme: tg.colorScheme,
            isExpanded: tg.isExpanded,
            user: tg.initDataUnsafe?.user || null
        };
    }

    /**
     * Получение актуального баланса с кэшированием
     */
    async getBalance(forceUpdate = false) {
        const userId = this.getCurrentUserId();
        
        if (!forceUpdate && this.balanceCache.has(userId)) {
            const cached = this.balanceCache.get(userId);
            const cacheAge = Date.now() - cached.timestamp;
            
            // Кэш валиден 30 секунд
            if (cacheAge < 30000) {
                console.log(`💾 Баланс из кэша: ${cached.balance} STcoin`);
                return cached.balance;
            }
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/balance?_t=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const balance = data.balance;

            // Обновляем кэш
            this.balanceCache.set(userId, {
                balance: balance,
                timestamp: Date.now()
            });

            console.log(`💰 Актуальный баланс получен: ${balance} STcoin`);
            return balance;

        } catch (error) {
            console.error('❌ Ошибка получения баланса:', error);
            
            // Возвращаем кэшированное значение если есть
            if (this.balanceCache.has(userId)) {
                const cached = this.balanceCache.get(userId);
                console.log(`⚠️ Используем кэшированный баланс: ${cached.balance} STcoin`);
                return cached.balance;
            }
            
            return 0;
        }
    }

    /**
     * Принудительная синхронизация баланса
     */
    async syncBalance() {
        if (this.syncInProgress) {
            console.log('⏳ Синхронизация уже выполняется');
            return null;
        }

        this.syncInProgress = true;
        console.log('🔄 Принудительная синхронизация баланса...');

        try {
            const balance = await this.getBalance(true);
            
            // Уведомляем приложение об обновлении
            this.notifyBalanceChange(balance);
            
            return balance;

        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error);
            return null;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Уведомление об изменении баланса
     */
    notifyBalanceChange(newBalance) {
        const userId = this.getCurrentUserId();
        
        // Создаем кастомное событие
        const event = new CustomEvent('balanceChanged', {
            detail: {
                userId: userId,
                balance: newBalance,
                timestamp: Date.now()
            }
        });
        
        document.dispatchEvent(event);
        console.log(`📢 Уведомление об изменении баланса: ${newBalance} STcoin`);
    }

    /**
     * Получение информации о пользователе
     */
    async getUserInfo() {
        if (this.userInfo) {
            return this.userInfo;
        }

        try {
            const userId = this.getCurrentUserId();
            const response = await fetch(`${API_BASE_URL}/api/v1/debug/user/${userId}`);
            
            if (response.ok) {
                this.userInfo = await response.json();
                console.log('👤 Информация о пользователе получена:', this.userInfo);
                return this.userInfo;
            }

        } catch (error) {
            console.error('❌ Ошибка получения информации о пользователе:', error);
        }

        return null;
    }

    /**
     * Очистка кэша и сброс сессии
     */
    reset() {
        this.currentUserId = null;
        this.userInfo = null;
        this.balanceCache.clear();
        
        try {
            localStorage.removeItem('current_user_session');
            console.log('🗑️ UserService сброшен');
        } catch (error) {
            console.error('❌ Ошибка сброса сессии:', error);
        }
    }

    /**
     * Диагностика проблем с пользователем
     */
    async diagnose() {
        console.log('🔍 === ДИАГНОСТИКА USER SERVICE ===');
        
        const userId = this.getCurrentUserId();
        console.log(`👤 Текущий User ID: ${userId}`);
        
        // Проверяем localStorage
        const session = localStorage.getItem('current_user_session');
        console.log('💾 Сессия в localStorage:', session ? JSON.parse(session) : null);
        
        // Проверяем Telegram
        const telegramInfo = this.getTelegramInfo();
        console.log('📱 Telegram информация:', telegramInfo);
        
        // Проверяем баланс
        try {
            const balance = await this.getBalance(true);
            console.log(`💰 Актуальный баланс: ${balance} STcoin`);
        } catch (error) {
            console.error('❌ Ошибка получения баланса:', error);
        }
        
        // Проверяем платформу
        const platformInfo = this.getPlatformInfo();
        console.log('🖥️ Информация о платформе:', platformInfo);
        
        console.log('🔍 === КОНЕЦ ДИАГНОСТИКИ ===');
    }

    // 🆕 Получить актуальный баланс с сервера (алиас для getBalance)
    async getActualBalance() {
        try {
            console.log('💰 Получение актуального баланса с сервера...');
            const balance = await this.getBalance(true);
            if (balance !== null) {
                console.log(`✅ Актуальный баланс получен: ${balance} STcoin`);
                return balance;
            } else {
                console.warn('⚠️ Не удалось получить актуальный баланс');
                return this.currentBalance || 50;
            }
        } catch (error) {
            console.error('❌ Ошибка получения актуального баланса:', error);
            return this.currentBalance || 50;
        }
    }

    // 🆕 Синхронизация баланса (алиас для принудительного обновления)
    async syncBalance() {
        try {
            console.log('🔄 Принудительная синхронизация баланса...');
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('User ID не определен');
            }
            const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/balance/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (typeof data.balance === 'number') {
                const oldBalance = this.currentBalance;
                this.currentBalance = data.balance;
                this.saveToLocalStorage();
                this.notifyBalanceChange(data.balance);
                console.log(`✅ Баланс синхронизирован: ${oldBalance} → ${data.balance}`);
                return data.balance;
            } else {
                throw new Error('Некорректный ответ от сервера');
            }
        } catch (error) {
            console.error('❌ Ошибка синхронизации баланса:', error);
            return this.currentBalance;
        }
    }

    // 🆕 Диагностика состояния UserService
    diagnose() {
        console.log('🔍 === ДИАГНОСТИКА USERSERVICE ===');
        console.log(`   currentUserId: ${this.currentUserId}`);
        console.log(`   currentBalance: ${this.currentBalance}`);
        console.log(`   balanceLastUpdate: ${this.balanceLastUpdate ? new Date(this.balanceLastUpdate).toLocaleString() : 'никогда'}`);
        console.log(`   forceSync: ${this.forceSync}`);
        console.log(`   API_BASE_URL: ${typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'не установлен'}`);
        const methods = ['getCurrentUserId', 'getBalance', 'getActualBalance', 'syncBalance'];
        methods.forEach(method => {
            const available = typeof this[method] === 'function';
            console.log(`   ${method}: ${available ? '✅ доступен' : '❌ отсутствует'}`);
        });
        console.log('🔍 === КОНЕЦ ДИАГНОСТИКИ ===');
    }
}

// Создаем глобальный экземпляр
window.userService = new UserService();

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserService;
}

console.log('✅ UserService готов к использованию');