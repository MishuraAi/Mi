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

// 🔄 ПРИНУДИТЕЛЬНАЯ СИНХРОНИЗАЦИЯ БАЛАНСА
// Добавлено Mishura AI

class BalanceManager {
    constructor() {
        this.telegramId = null;
        this.currentBalance = 0;
        this.lastSyncTime = 0;
        this.syncInProgress = false;
        this.init();
    }

    init() {
        // Получаем telegram_id из Telegram WebApp
        if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
            this.telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
            console.log(`🚀 BalanceManager инициализирован для пользователя ${this.telegramId}`);
            
            // Принудительная синхронизация при загрузке
            this.forceSyncWithServer();
            
            // Создаем кнопку принудительной синхронизации
            this.createSyncButton();
            
        } else {
            console.warn('⚠️ Telegram WebApp не доступен, используем fallback');
            this.telegramId = this.getTelegramIdFromUrl() || this.promptForTelegramId();
        }
    }

    /**
     * 🔄 ПРИНУДИТЕЛЬНАЯ синхронизация с сервером
     */
    async forceSyncWithServer() {
        if (this.syncInProgress) {
            console.log('⏳ Синхронизация уже выполняется...');
            return;
        }

        if (!this.telegramId) {
            console.error('❌ Telegram ID не найден для синхронизации');
            return;
        }

        this.syncInProgress = true;
        this.showSyncStatus('🔄 Синхронизация баланса...');

        try {
            console.log(`🔄 Начинаем принудительную синхронизацию для ${this.telegramId}`);

            // 1. Очищаем весь localStorage
            this.clearAllBalanceCache();

            // 2. Запрашиваем актуальный баланс с сервера
            const response = await fetch(`/api/v1/users/${this.telegramId}/balance/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Force-Refresh': 'true'
                },
                body: JSON.stringify({
                    force_refresh: true,
                    clear_cache: true,
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error(`Сервер вернул ошибку: ${response.status}`);
            }

            const data = await response.json();
            const serverBalance = data.balance;

            console.log(`✅ Сервер вернул баланс: ${serverBalance} STcoin`);

            // 3. Обновляем интерфейс
            this.updateBalanceEverywhere(serverBalance);

            // 4. Сохраняем в localStorage с меткой "синхронизировано"
            this.saveBalanceToCache(serverBalance, true);

            this.showSyncStatus(`✅ Баланс синхронизирован: ${serverBalance} STcoin`, 'success');
            this.lastSyncTime = Date.now();

            return serverBalance;

        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error);
            this.showSyncStatus(`❌ Ошибка синхронизации: ${error.message}`, 'error');
            throw error;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * 🧹 Полная очистка кэша баланса
     */
    clearAllBalanceCache() {
        const keysToRemove = [
            'user_balance',
            'balance_timestamp', 
            'last_balance_sync',
            'cached_balance',
            'balance_cache',
            'stcoin_balance',
            `balance_${this.telegramId}`,
            'mishura_balance'
        ];

        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn(`Не удалось удалить ${key}:`, e);
            }
        });

        console.log('🧹 Весь кэш баланса очищен');
    }

    /**
     * 💾 Сохранение баланса в localStorage
     */
    saveBalanceToCache(balance, synced = false) {
        const cacheData = {
            telegramId: this.telegramId,
            balance: balance,
            timestamp: Date.now(),
            synced: synced,
            source: 'server',
            version: '2.0'
        };

        try {
            localStorage.setItem('user_balance', JSON.stringify(cacheData));
            localStorage.setItem('balance_timestamp', Date.now().toString());
            localStorage.setItem('last_balance_sync', Date.now().toString());
            console.log(`💾 Баланс сохранен в кэш: ${balance} STcoin (synced: ${synced})`);
        } catch (error) {
            console.error('❌ Ошибка сохранения в кэш:', error);
        }
    }

    /**
     * 🎨 Обновление баланса во ВСЕХ элементах интерфейса
     */
    updateBalanceEverywhere(balance) {
        this.currentBalance = balance;

        // Список всех возможных селекторов для баланса
        const balanceSelectors = [
            '#balance-display',
            '.balance-amount',
            '.balance-value',
            '[data-balance]',
            '#user-balance',
            '.stcoin-balance',
            '.balance-text',
            '#balance-counter',
            '.current-balance'
        ];

        let updatedElements = 0;

        balanceSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element) {
                    element.textContent = `${balance} STcoin`;
                    element.setAttribute('data-balance', balance);
                    
                    // Визуальная анимация обновления
                    element.classList.add('balance-updated');
                    setTimeout(() => {
                        element.classList.remove('balance-updated');
                    }, 1500);
                    
                    updatedElements++;
                }
            });
        });

        // Обновляем глобальные переменные
        if (window.userBalance !== undefined) {
            window.userBalance = balance;
        }
        if (window.balance !== undefined) {
            window.balance = balance;
        }
        if (window.currentBalance !== undefined) {
            window.currentBalance = balance;
        }

        console.log(`🎨 Обновлено ${updatedElements} элементов интерфейса с балансом ${balance} STcoin`);

        // Триггерим событие для других компонентов
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
            detail: { balance, telegramId: this.telegramId }
        }));
    }

    /**
     * 📱 Создание кнопки принудительной синхронизации
     */
    createSyncButton() {
        // Проверяем, есть ли уже кнопка
        if (document.getElementById('force-sync-button')) {
            return;
        }

        const button = document.createElement('button');
        button.id = 'force-sync-button';
        button.innerHTML = '🔄 Синхронизировать баланс';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;

        button.onclick = () => {
            this.forceSyncWithServer();
        };

        document.body.appendChild(button);
        console.log('📱 Кнопка принудительной синхронизации создана');
    }

    /**
     * 📢 Показ статуса синхронизации
     */
    showSyncStatus(message, type = 'info') {
        // Удаляем предыдущие уведомления
        const existingNotifications = document.querySelectorAll('.sync-notification');
        existingNotifications.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = 'sync-notification';
        
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            error: '#f44336'
        };

        notification.style.cssText = `
            position: fixed;
            top: 50px;
            right: 10px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10001;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInFromRight 0.3s ease-out;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);

        // Автоматически скрываем через 3-5 секунд
        const hideDelay = type === 'error' ? 5000 : 3000;
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutToRight 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, hideDelay);
    }

    /**
     * 🔍 Получение telegram_id из URL (fallback)
     */
    getTelegramIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('telegram_id') || urlParams.get('user_id');
    }

    /**
     * ❓ Запрос telegram_id у пользователя (последний fallback)
     */
    promptForTelegramId() {
        const id = prompt('Введите ваш Telegram ID для синхронизации баланса:');
        return id ? parseInt(id) : null;
    }

    /**
     * 📊 Получение текущего баланса
     */
    getCurrentBalance() {
        return this.currentBalance;
    }

    /**
     * ⏰ Автоматическая синхронизация каждые 60 секунд
     */
    startAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }

        this.autoSyncInterval = setInterval(() => {
            if (!this.syncInProgress) {
                console.log('⏰ Автоматическая синхронизация...');
                this.forceSyncWithServer();
            }
        }, 60000); // 60 секунд

        console.log('⏰ Автоматическая синхронизация запущена (каждые 60 сек)');
    }

    /**
     * 🛑 Остановка автоматической синхронизации
     */
    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
            console.log('🛑 Автоматическая синхронизация остановлена');
        }
    }
}

// 🌍 Глобальный экземпляр
window.balanceManager = new BalanceManager();

// 🚀 Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 BalanceManager готов к работе');
    
    // Запускаем автосинхронизацию
    window.balanceManager.startAutoSync();
});

// 📱 Синхронизация при возвращении на страницу
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.balanceManager) {
        console.log('👁️ Страница снова видна - принудительная синхронизация');
        window.balanceManager.forceSyncWithServer();
    }
});

// 🎨 CSS анимации
const syncStyles = document.createElement('style');
syncStyles.textContent = `
    .balance-updated {
        animation: balanceUpdatePulse 1.5s ease-in-out;
        font-weight: bold;
    }
    
    @keyframes balanceUpdatePulse {
        0% { transform: scale(1); color: inherit; }
        50% { transform: scale(1.1); color: #4CAF50; font-weight: bold; }
        100% { transform: scale(1); color: inherit; }
    }
    
    @keyframes slideInFromRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutToRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .sync-notification {
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(syncStyles);

console.log('✅ Система принудительной синхронизации баланса загружена');