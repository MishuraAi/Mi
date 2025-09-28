// 🔧 СОЗДАТЬ НОВЫЙ ФАЙЛ: webapp/js/user-service.js
// Унифицированная система управления пользователем

// В продакшне НЕ используем общий fallback ID, только для локальной разработки
const FALLBACK_USER_ID = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 5930269100
    : null;

class UserService {
    constructor() {
        this.currentUserId = null;
        this.currentUserSource = 'unknown';
        this.userInfo = null;
        this.balanceCache = new Map();
        this.syncInProgress = false;
        
        console.log('👤 UserService инициализирован');
    }

    /**
     * Инициализация из Telegram WebApp: сохраняем пользователя на сервере и локально
     * Вызывается при старте, чтобы на мобильном Telegram и десктопе был один и тот же ID
     */
    async initFromTelegram() {
      try {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (!tgUser || !tgUser.id) {
          // Пытаемся вызвать ready и прочитать повторно (на некоторых клиентах данные приходят позже)
          try { window.Telegram?.WebApp?.ready?.(); } catch (_) {}
          const retryUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
          if (!retryUser || !retryUser.id) {
            return null;
          }
        }

        const user = window.Telegram.WebApp.initDataUnsafe.user;
        const telegramId = this.parseValidUserId(user.id);
        if (!telegramId) return null;

        // Сохранение сессии локально
        this.currentUserId = telegramId;
        this.currentUserSource = 'telegram';
        this.saveUserSession(telegramId, 'telegram');

        // Обновляем профиль и баланс на сервере
        try {
          await fetch(`${API_BASE_URL}/api/v1/users/upsert-from-telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: telegramId,
              username: (user.username || '').toString().replace(/^@+/, ''),
              first_name: user.first_name || '',
              last_name: user.last_name || ''
            })
          });
        } catch (e) {
          console.warn('⚠️ Не удалось выполнить upsert-from-telegram:', e);
        }

        // Гарантируем наличие пользователя (создание со стартовым балансом 50 при первом входе)
        try {
          await fetch(`${API_BASE_URL}/api/v1/users/${telegramId}/ensure`, { method: 'POST' });
        } catch (e) {
          console.warn('⚠️ ensure при initFromTelegram не удался:', e);
        }

        return telegramId;
      } catch (e) {
        console.warn('⚠️ initFromTelegram: не удалось инициализировать пользователя из Telegram:', e);
        return null;
      }
    }

    /**
     * Получение текущего пользователя (единая точка истины)
     */
    getCurrentUserId() {
        // 0) Кэш в памяти
        if (this.currentUserId && Number.isInteger(this.currentUserId) && this.currentUserId > 0) {
            return this.currentUserId;
        }

        // 1) Telegram WebApp
        try {
            const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            const parsedTg = this.parseValidUserId(tgId);
            if (parsedTg) {
                this.currentUserId = parsedTg;
                this.currentUserSource = 'telegram';
                this.saveUserSession(parsedTg, 'telegram');
                return parsedTg;
            }
        } catch (_) {}

        // 2) URL параметры (user_id или telegram_id)
        try {
            const params = new URLSearchParams(window.location.search);
            const parsedUrl = this.parseValidUserId(params.get('user_id') || params.get('telegram_id'));
            if (parsedUrl) {
                this.currentUserId = parsedUrl;
                this.currentUserSource = 'url';
                this.saveUserSession(parsedUrl, 'url');
                return parsedUrl;
            }
            // Попытка определить по username (?username= или ?tg_username=)
            const username = (params.get('username') || params.get('tg_username') || '').replace(/^@+/, '');
            if (username) {
                // Разрешаем через backend
                // ВАЖНО: синхронно здесь нельзя, поэтому вернём fallback, а асинхронно сохраним
                // Мы попробуем синхронно через XHR с keepalive=false для упрощения
                try {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', `${API_BASE_URL}/api/v1/users/resolve?username=${encodeURIComponent(username)}`, false);
                    xhr.send(null);
                    if (xhr.status === 200) {
                        const data = JSON.parse(xhr.responseText);
                        const resolvedId = this.parseValidUserId(data.telegram_id);
                        if (resolvedId) {
                            this.currentUserId = resolvedId;
                            this.currentUserSource = 'username';
                            this.saveUserSession(resolvedId, 'username');
                            return resolvedId;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Не удалось разрешить пользователя по username:', e);
                }
            }
        } catch (_) {}

        // 3) Сохранённая сессия
        try {
            const raw = localStorage.getItem('current_user_session');
            if (raw) {
                const session = JSON.parse(raw);
                if (this.isValidSession(session)) {
                    const parsedSession = this.parseValidUserId(session.user_id);
                    if (parsedSession) {
                        this.currentUserId = parsedSession;
                        this.currentUserSource = session.source || 'session';
                        return parsedSession;
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Некорректная сессия в localStorage', e);
        }

        // 4) Legacy ключи localStorage (не используем в Telegram WebApp, чтобы не перепутать аккаунт)
        try {
            const isTelegramWebApp = !!(window.Telegram?.WebApp);
            if (!isTelegramWebApp) {
                const legacy = this.parseValidUserId(localStorage.getItem('user_id') || localStorage.getItem('telegram_user_id'));
                if (legacy) {
                    this.currentUserId = legacy;
                    this.currentUserSource = 'localStorage';
                    this.saveUserSession(legacy, 'localStorage');
                    return legacy;
                }
            }
        } catch (_) {}

        // 5) Fallback
        // В Telegram WebApp и ПРОДАКШНЕ fallback НЕ используем. Разрешаем только на localhost/127.0.0.1
        const isTelegramWebApp = !!(window.Telegram?.WebApp);
        if (isTelegramWebApp || !FALLBACK_USER_ID) {
            console.warn('⚠️ Fallback ID отключен. Требуется авторизация через Telegram или корректный параметр в URL.');
            return null;
        }

        // Разрешен только в локальной разработке
        this.currentUserId = FALLBACK_USER_ID;
        this.currentUserSource = 'fallback';
        this.saveUserSession(FALLBACK_USER_ID, 'fallback');
        return FALLBACK_USER_ID;
    }

    parseValidUserId(rawValue) {
        if (rawValue === undefined || rawValue === null) {
            return null;
        }

        const parsed = Number.parseInt(rawValue, 10);

        if (Number.isNaN(parsed) || parsed <= 0) {
            return null;
        }

        return parsed;
    }

    /**
     * Сохранение сессии пользователя
     */
    saveUserSession(userId, source) {
        try {
            if (!userId) {
                return;
            }

            if (this.isFallbackSource(source)) {
                const existingRaw = localStorage.getItem('current_user_session');
                if (existingRaw) {
                    try {
                        const existingSession = JSON.parse(existingRaw);
                        if (existingSession && !this.isFallbackSource(existingSession.source)) {
                            console.log('ℹ️ Пропускаем перезапись fallback-сессией, используется более точный идентификатор');
                            return;
                        }
                    } catch (parseError) {
                        console.warn('⚠️ Не удалось прочитать текущую сессию при сохранении fallback:', parseError);
                    }
                }
            }

            const normalizedSource = this.normalizeSource(source);
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

            if (!this.isFallbackSource(source)) {
                localStorage.setItem('telegram_user_id', userId.toString());
            }

            console.log('💾 Сессия пользователя сохранена:', session);

        } catch (error) {
            console.error('❌ Ошибка сохранения сессии:', error);
        }
    }

    normalizeSource(source) {
        const s = (source || '').toString().toLowerCase();
        if (['telegram', 'url', 'session', 'localstorage', 'fallback'].includes(s)) return s;
        return 'unknown';
    }

    isFallbackSource(source) {
        const s = this.normalizeSource(source);
        return s === 'fallback' || s === 'localstorage';
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
            // Гарантируем, что пользователь существует (создастся со стартовым балансом 50 при первом заходе)
            try {
                await fetch(`${API_BASE_URL}/api/v1/users/${userId}/ensure`, { method: 'POST' });
            } catch (ensureErr) {
                console.warn('⚠️ ensure_user_exists: не удалось гарантировать создание пользователя:', ensureErr);
            }

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
            
            // ВАЖНО: не затираем баланс на фронтенде
            return null;
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
            this.setSyncIndicatorActive(false);
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
        console.log(`📦 Источник User ID: ${this.currentUserSource}`);

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

        // Создаем крошечный индикатор синхронизации
        this.createSyncIndicator();
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
        this.setSyncIndicatorActive(true);

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
            // Пишем только в user-неймспейс, без глобальных ключей
            if (this.userId) {
                localStorage.setItem(`balance_${this.userId}`, JSON.stringify(cacheData));
            }
            console.log(`💾 Баланс сохранен в кэш пользователя ${this.userId}: ${balance} STcoin (synced: ${synced})`);
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
    createSyncIndicator() {
        // Уже создан
        if (document.getElementById('sync-indicator')) return;

        // Вставляем стили один раз
        if (!document.getElementById('sync-indicator-styles')) {
            const styles = document.createElement('style');
            styles.id = 'sync-indicator-styles';
            styles.textContent = `
                @keyframes breathe {
                    0% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.35); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.6; }
                }
                .sync-indicator {
                    position: fixed;
                    top: 12px;
                    right: 12px;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--accent-gold, #d4af37);
                    box-shadow: 0 0 6px rgba(212, 175, 55, 0.4);
                    z-index: 9999;
                    opacity: 0.25; /* почти незаметен в обычном режиме */
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }
                .sync-indicator.active {
                    opacity: 0.9;
                    animation: breathe 1.6s ease-in-out infinite;
                }
            `;
            document.head.appendChild(styles);
        }

        const dot = document.createElement('div');
        dot.id = 'sync-indicator';
        dot.className = 'sync-indicator';
        dot.title = 'Синхронизация баланса';
        document.body.appendChild(dot);

        console.log('🫧 Индикатор синхронизации создан');
    }

    setSyncIndicatorActive(active) {
        const dot = document.getElementById('sync-indicator');
        if (!dot) return;
        dot.classList.toggle('active', !!active);
    }

    /**
     * 📢 Показ статуса синхронизации
     */
    showSyncStatus(message, type = 'info') {
        // Тихий режим: без визуальных тостов. Оставляем только ненавязчивый лог.
        try {
            const level = (type === 'error') ? 'error' : (type === 'success' ? 'log' : 'debug');
            // eslint-disable-next-line no-console
            console[level](`(sync) ${message}`);
        } catch (_) {
            // игнорируем
        }
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
        // Больше не запрашиваем ID у пользователя во избежание плохого UX
        return null;
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