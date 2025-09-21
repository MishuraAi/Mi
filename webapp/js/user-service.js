// 🔧 СОЗДАТЬ НОВЫЙ ФАЙЛ: webapp/js/user-service.js
// Унифицированная система управления пользователем

class UserService {
    constructor() {
        this.currentUserId = null;
        this.currentUserSource = null;
        this.fallbackUserId = 5930269100;
        this.userInfo = null;
        this.balanceCache = new Map();
        this.syncInProgress = false;
        
        console.log('👤 UserService инициализирован');
    }

    /**
     * Получение текущего пользователя (единая точка истины)
     */
    getCurrentUserId() {
        const fallbackId = this.fallbackUserId;
        const currentId = this.currentUserId;
        const matchesFallbackId = currentId !== null && currentId !== undefined
            && Number.parseInt(currentId, 10) === fallbackId;
        const isCurrentFallback = matchesFallbackId || this.currentUserSource === 'fallback';

        if (currentId && !isCurrentFallback) {
            return currentId;
        }

        if (isCurrentFallback && currentId) {
            console.log('🔄 Обнаружен fallback ID. Пытаемся найти актуальный идентификатор...');
        }

        try {
            let userId = null;
            let source = 'unknown';

            // 1. Проверяем Telegram WebApp (высший приоритет)
            const telegramRawId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            if (telegramRawId !== undefined && telegramRawId !== null) {
                const parsedTelegramId = Number.parseInt(telegramRawId, 10);
                if (!Number.isNaN(parsedTelegramId) && parsedTelegramId > 0) {
                    userId = parsedTelegramId;
                    source = 'telegram_webapp';
                }
            }

            // 2. URL параметры
            if (userId === null) {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('user_id')) {
                    const urlUserId = Number.parseInt(urlParams.get('user_id'), 10);
                    if (!Number.isNaN(urlUserId) && urlUserId > 0) {
                        userId = urlUserId;
                        source = 'url_params';
                    }
                }
            }

            // 3. localStorage с актуальной сессией
            if (userId === null) {
                const stored = localStorage.getItem('current_user_session');
                if (stored) {
                    try {
                        const session = JSON.parse(stored);
                        if (this.isValidSession(session)) {
                            const storedId = Number.parseInt(session.user_id, 10);
                            if (!Number.isNaN(storedId) && storedId > 0) {
                                userId = storedId;
                                const storedSource = typeof session.source === 'string' ? session.source : 'stored_session';
                                if (storedId === fallbackId) {
                                    source = 'fallback';
                                } else {
                                    source = storedSource || 'stored_session';
                                }
                            }
                        }
                    } catch (error) {
                        console.warn('⚠️ Некорректная сессия в localStorage');
                    }
                }
            }

            // 4. Fallback ID
            if (userId === null) {
                userId = fallbackId; // Известный рабочий ID
                source = 'fallback';
                console.warn('⚠️ Используется fallback user ID');
            }

            if (userId === fallbackId && source !== 'fallback') {
                source = 'fallback';
            }

            const previousId = this.currentUserId;
            const previousSource = this.currentUserSource;

            this.currentUserId = userId;
            this.currentUserSource = source;

            if (previousId !== userId || previousSource !== source) {
                this.saveUserSession(userId, source);
                console.log(`✅ User ID определен: ${userId} (источник: ${source})`);
            }

            return userId;

        } catch (error) {
            console.error('❌ Ошибка получения user ID:', error);
            const emergencyId = this.fallbackUserId;
            this.currentUserId = emergencyId;
            this.currentUserSource = 'fallback';
            return emergencyId;
        }
    }

    /**
     * Сохранение сессии пользователя
     */
    saveUserSession(userId, source) {
        const fallbackId = this.fallbackUserId;
        const normalizedSource = userId === fallbackId && source !== 'fallback'
            ? 'fallback'
            : source;

        this.currentUserSource = normalizedSource;
        try {
            const session = {
                user_id: userId,
                source: normalizedSource,
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

        const parsedId = Number.parseInt(session.user_id, 10);

        return sessionAge < maxAge && !Number.isNaN(parsedId) && parsedId > 0;
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
        this.currentUserSource = null;
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
        this.userService = window.userService || new UserService();
        this.userId = null;
        this.currentBalance = 0;
        this.lastSyncTime = 0;
        this.syncInProgress = false;
        this.autoSyncInterval = null;
        this.init();
    }

    resolveUserId() {
        try {
            if (this.userService?.getCurrentUserId) {
                const resolvedId = this.userService.getCurrentUserId();
                const parsedId = Number.parseInt(resolvedId, 10);
                if (!Number.isNaN(parsedId) && parsedId > 0) {
                    return parsedId;
                }
            }
        } catch (error) {
            console.error('❌ Не удалось определить user ID через UserService:', error);
        }

        return null;
    }

    init() {
        this.userId = this.resolveUserId();

        if (!this.userId) {
            this.showSyncStatus('❌ Не удалось определить пользователя для синхронизации. Откройте ссылку из Telegram или авторизуйтесь заново.', 'error');
            return;
        }

        console.log(`🚀 BalanceManager инициализирован для пользователя ${this.userId}`);

        // Принудительная синхронизация при загрузке
        this.forceSyncWithServer();

        // Создаем кнопку принудительной синхронизации
        this.createSyncButton();
    }

    /**
     * 🔄 ПРИНУДИТЕЛЬНАЯ синхронизация с сервером
     */
    async forceSyncWithServer() {
        if (this.syncInProgress) {
            console.log('⏳ Синхронизация уже выполняется...');
            return;
        }

        const resolvedId = this.resolveUserId();
        if (resolvedId) {
            this.userId = resolvedId;
        }

        if (!this.userId) {
            console.error('❌ Пользователь не определен для синхронизации');
            this.showSyncStatus('❌ Не удалось определить пользователя. Попробуйте обновить страницу через Telegram.', 'error');
            return;
        }

        this.syncInProgress = true;
        this.showSyncStatus('🔄 Синхронизация баланса...');

        try {
            console.log(`🔄 Начинаем принудительную синхронизацию для ${this.userId}`);

            // 1. Очищаем весь localStorage
            this.clearAllBalanceCache();

            // 2. Запрашиваем актуальный баланс с сервера
            const response = await fetch(`/api/v1/users/${this.userId}/balance/sync`, {
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

            if (this.userService?.notifyBalanceChange) {
                try {
                    this.userService.notifyBalanceChange(serverBalance);
                } catch (notifyError) {
                    console.warn('⚠️ Не удалось отправить уведомление о новом балансе через UserService:', notifyError);
                }
            }

            // 4. Сохраняем в localStorage с меткой "синхронизировано"
            this.saveBalanceToCache(serverBalance, true);

            if (this.userService) {
                this.userService.currentUserId = this.userId;
                const fallbackId = this.userService?.fallbackUserId ?? 5930269100;
                const isFallbackUser = this.userId === fallbackId || this.userService.currentUserSource === 'fallback';

                if (!isFallbackUser) {
                    this.userService.currentUserSource = 'balance_manager';
                }

                if (this.userService.balanceCache) {
                    this.userService.balanceCache.set(this.userId, {
                        balance: serverBalance,
                        timestamp: Date.now()
                    });
                }
            }

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
            'mishura_balance'
        ];

        if (this.userId) {
            keysToRemove.push(`balance_${this.userId}`);
        }

        keysToRemove.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn(`Не удалось удалить ${key}:`, e);
            }
        });

        if (this.userService?.balanceCache && this.userId) {
            this.userService.balanceCache.delete(this.userId);
        }

        console.log('🧹 Весь кэш баланса очищен');
    }

    /**
     * 💾 Сохранение баланса в localStorage
     */
    saveBalanceToCache(balance, synced = false) {
        const cacheData = {
            userId: this.userId,
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
            if (this.userId) {
                localStorage.setItem(`balance_${this.userId}`, JSON.stringify(cacheData));
            }
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
                    if (this.userId) {
                        element.setAttribute('data-user-id', this.userId);
                    } else {
                        element.removeAttribute('data-user-id');
                    }

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
            detail: { balance, userId: this.userId }
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