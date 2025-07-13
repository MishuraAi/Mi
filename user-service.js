/**
 * МИШУРА - Современная система идентификации пользователей
 * Автоматическая идентификация без ручного ввода Telegram ID
 * Поддержка синхронизации между устройствами
 */

class ModernUserService {
    constructor() {
        this.currentUser = null;
        this.deviceFingerprint = null;
        this.anonymousId = null;
        this.isLinked = false;
        this.initialized = false;
        
        // Константы
        this.STORAGE_KEYS = {
            ANONYMOUS_ID: 'mishura_anonymous_id',
            DEVICE_FINGERPRINT: 'mishura_device_fingerprint',
            USER_DATA: 'mishura_user_data',
            LAST_SYNC: 'mishura_last_sync'
        };
        
        this.API_BASE = '/api/v1';
        
        console.log('🎭 ModernUserService инициализирован');
    }
    
    /**
     * Главный метод автоматической идентификации
     */
    async initializeUser() {
        try {
            console.log('🔍 Начинаем автоматическую идентификацию пользователя...');
            
            // 1. Генерируем device fingerprint
            this.deviceFingerprint = await this.generateDeviceFingerprint();
            console.log('📱 Device fingerprint:', this.deviceFingerprint.substring(0, 16) + '...');
            
            // 2. Проверяем Telegram WebApp
            const telegramUser = this.detectTelegramWebApp();
            if (telegramUser) {
                console.log('📲 Обнаружен Telegram WebApp:', telegramUser);
                return await this.handleTelegramUser(telegramUser);
            }
            
            // 3. Проверяем URL параметры
            const urlUser = this.detectUrlParameters();
            if (urlUser) {
                console.log('🔗 Обнаружен user_id в URL:', urlUser);
                return await this.handleUrlUser(urlUser);
            }
            
            // 4. Проверяем существующее устройство
            const existingDevice = await this.checkExistingDevice();
            if (existingDevice) {
                console.log('💾 Найдено существующее устройство:', existingDevice.anonymous_id);
                return await this.handleExistingDevice(existingDevice);
            }
            
            // 5. Создаем новое анонимное устройство
            console.log('🆕 Создаем новое анонимное устройство...');
            return await this.createAnonymousDevice();
            
        } catch (error) {
            console.error('❌ Ошибка инициализации пользователя:', error);
            return await this.handleFallback();
        }
    }
    
    /**
     * Генерация уникального device fingerprint
     */
    async generateDeviceFingerprint() {
        const components = {
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            pixelRatio: window.devicePixelRatio || 1
        };
        
        // Добавляем Canvas fingerprint
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('МИШУРА Device ID', 2, 2);
            components.canvas = canvas.toDataURL().slice(-50);
        } catch (e) {
            components.canvas = 'unavailable';
        }
        
        // Добавляем WebGL fingerprint
        try {
            const gl = document.createElement('canvas').getContext('webgl');
            components.webgl = gl ? gl.getParameter(gl.RENDERER) : 'unavailable';
        } catch (e) {
            components.webgl = 'unavailable';
        }
        
        const fingerprint = await this.hashString(JSON.stringify(components));
        
        // Сохраняем в localStorage
        localStorage.setItem(this.STORAGE_KEYS.DEVICE_FINGERPRINT, fingerprint);
        
        return fingerprint;
    }
    
    /**
     * Хеширование строки
     */
    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Определение Telegram WebApp
     */
    detectTelegramWebApp() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                const user = tg.initDataUnsafe.user;
                return {
                    telegram_id: user.id,
                    telegram_username: user.username,
                    telegram_first_name: user.first_name,
                    method: 'telegram_webapp'
                };
            }
        }
        
        return null;
    }
    
    /**
     * Определение из URL параметров
     */
    detectUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id');
        
        if (userId && userId !== '5930269100') { // Исключаем fallback ID
            try {
                const telegramId = parseInt(userId);
                if (!isNaN(telegramId) && telegramId > 0) {
                    return {
                        telegram_id: telegramId,
                        method: 'url_parameter'
                    };
                }
            } catch (e) {
                console.warn('⚠️ Некорректный user_id в URL:', userId);
            }
        }
        
        return null;
    }
    
    /**
     * Проверка существующего устройства
     */
    async checkExistingDevice() {
        try {
            // Проверяем localStorage
            const savedAnonymousId = localStorage.getItem(this.STORAGE_KEYS.ANONYMOUS_ID);
            const savedFingerprint = localStorage.getItem(this.STORAGE_KEYS.DEVICE_FINGERPRINT);
            
            if (savedFingerprint && savedFingerprint === this.deviceFingerprint) {
                // Проверяем на сервере
                const response = await fetch(`${this.API_BASE}/users/sync/${this.deviceFingerprint}`);
                const data = await response.json();
                
                if (data.status === 'success' && data.data) {
                    return data.data;
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Ошибка проверки существующего устройства:', error);
            return null;
        }
    }
    
    /**
     * Обработка пользователя из Telegram WebApp
     */
    async handleTelegramUser(telegramUser) {
        try {
            // Проверяем есть ли уже анонимное устройство
            let anonymousId = localStorage.getItem(this.STORAGE_KEYS.ANONYMOUS_ID);
            
            if (!anonymousId) {
                // Создаем анонимное устройство
                const deviceResult = await this.createAnonymousDevice();
                anonymousId = deviceResult.anonymous_id;
            }
            
            // Привязываем Telegram к анонимному устройству
            const linkResponse = await fetch(`${this.API_BASE}/users/link-telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    anonymous_id: anonymousId,
                    telegram_id: telegramUser.telegram_id,
                    telegram_username: telegramUser.telegram_username,
                    telegram_first_name: telegramUser.telegram_first_name
                })
            });
            
            const linkData = await linkResponse.json();
            
            if (linkData.status === 'success') {
                this.currentUser = {
                    telegram_id: telegramUser.telegram_id,
                    anonymous_id: anonymousId,
                    is_linked: true,
                    method: 'telegram_webapp'
                };
                
                this.saveUserData();
                this.initialized = true;
                
                console.log('✅ Telegram пользователь успешно привязан');
                return this.currentUser;
            }
            
            throw new Error('Не удалось привязать Telegram пользователя');
            
        } catch (error) {
            console.error('❌ Ошибка обработки Telegram пользователя:', error);
            return await this.handleFallback();
        }
    }
    
    /**
     * Обработка пользователя из URL
     */
    async handleUrlUser(urlUser) {
        try {
            // Проверяем есть ли уже анонимное устройство  
            let anonymousId = localStorage.getItem(this.STORAGE_KEYS.ANONYMOUS_ID);
            
            if (!anonymousId) {
                const deviceResult = await this.createAnonymousDevice();
                anonymousId = deviceResult.anonymous_id;
            }
            
            // Привязываем Telegram ID
            const linkResponse = await fetch(`${this.API_BASE}/users/link-telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    anonymous_id: anonymousId,
                    telegram_id: urlUser.telegram_id
                })
            });
            
            const linkData = await linkResponse.json();
            
            if (linkData.status === 'success') {
                this.currentUser = {
                    telegram_id: urlUser.telegram_id,
                    anonymous_id: anonymousId,
                    is_linked: true,
                    method: 'url_parameter'
                };
                
                this.saveUserData();
                this.initialized = true;
                
                console.log('✅ URL пользователь успешно привязан');
                return this.currentUser;
            }
            
            throw new Error('Не удалось привязать URL пользователя');
            
        } catch (error) {
            console.error('❌ Ошибка обработки URL пользователя:', error);
            return await this.handleFallback();
        }
    }
    
    /**
     * Обработка существующего устройства
     */
    async handleExistingDevice(deviceData) {
        try {
            this.anonymousId = deviceData.anonymous_id;
            this.isLinked = deviceData.is_linked;
            
            this.currentUser = {
                telegram_id: deviceData.telegram_id,
                anonymous_id: deviceData.anonymous_id,
                is_linked: deviceData.is_linked,
                method: 'existing_device'
            };
            
            this.saveUserData();
            this.initialized = true;
            
            console.log('✅ Восстановлено существующее устройство');
            return this.currentUser;
            
        } catch (error) {
            console.error('❌ Ошибка обработки существующего устройства:', error);
            return await this.handleFallback();
        }
    }
    
    /**
     * Создание нового анонимного устройства
     */
    async createAnonymousDevice() {
        try {
            const deviceInfo = {
                user_agent: navigator.userAgent,
                screen_resolution: `${screen.width}x${screen.height}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                platform: navigator.platform,
                viewport: `${window.innerWidth}x${window.innerHeight}`
            };
            
            const response = await fetch(`${this.API_BASE}/users/anonymous`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    device_fingerprint: this.deviceFingerprint,
                    device_info: deviceInfo
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success' && data.data) {
                this.anonymousId = data.data.anonymous_id;
                this.isLinked = data.data.is_linked;
                
                this.currentUser = {
                    telegram_id: data.data.telegram_id,
                    anonymous_id: data.data.anonymous_id,
                    is_linked: data.data.is_linked,
                    method: 'anonymous_created'
                };
                
                this.saveUserData();
                this.initialized = true;
                
                console.log('✅ Создано новое анонимное устройство:', this.anonymousId);
                return this.currentUser;
            }
            
            throw new Error('Не удалось создать анонимное устройство');
            
        } catch (error) {
            console.error('❌ Ошибка создания анонимного устройства:', error);
            return await this.handleFallback();
        }
    }
    
    /**
     * Fallback обработка при ошибках
     */
    async handleFallback() {
        console.warn('⚠️ Используем fallback режим');
        
        this.currentUser = {
            telegram_id: 5930269100, // Fallback ID
            anonymous_id: 'fallback_' + Date.now(),
            is_linked: false,
            method: 'fallback'
        };
        
        this.initialized = true;
        return this.currentUser;
    }
    
    /**
     * Сохранение данных пользователя
     */
    saveUserData() {
        try {
            localStorage.setItem(this.STORAGE_KEYS.ANONYMOUS_ID, this.anonymousId);
            localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
            localStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        } catch (error) {
            console.error('❌ Ошибка сохранения данных пользователя:', error);
        }
    }
    
    /**
     * Получение текущего user_id для совместимости
     */
    getUserId() {
        if (!this.initialized) {
            console.warn('⚠️ UserService не инициализирован');
            return 5930269100; // Fallback
        }
        
        return this.currentUser?.telegram_id || 5930269100;
    }
    
    /**
     * Получение анонимного ID
     */
    getAnonymousId() {
        return this.anonymousId;
    }
    
    /**
     * Проверка привязки к Telegram
     */
    isLinkedToTelegram() {
        return this.isLinked;
    }
    
    /**
     * Получение полной информации о пользователе
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Синхронизация данных между устройствами
     */
    async syncUserData(targetAnonymousId = null) {
        try {
            if (!this.currentUser?.telegram_id) {
                console.warn('⚠️ Нет Telegram ID для синхронизации');
                return false;
            }
            
            const targetId = targetAnonymousId || this.anonymousId;
            
            const response = await fetch(`${this.API_BASE}/users/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_telegram_id: this.currentUser.telegram_id,
                    target_anonymous_id: targetId
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                console.log('✅ Данные синхронизированы успешно');
                this.saveUserData();
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации данных:', error);
            return false;
        }
    }
    
    /**
     * Получение всех устройств пользователя
     */
    async getUserDevices() {
        try {
            if (!this.currentUser?.telegram_id) {
                return [];
            }
            
            const response = await fetch(`${this.API_BASE}/users/${this.currentUser.telegram_id}/devices`);
            const data = await response.json();
            
            if (data.status === 'success') {
                return data.data.devices;
            }
            
            return [];
            
        } catch (error) {
            console.error('❌ Ошибка получения устройств:', error);
            return [];
        }
    }
    
    /**
     * Очистка данных (для отладки)
     */
    clearUserData() {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        
        this.currentUser = null;
        this.anonymousId = null;
        this.isLinked = false;
        this.initialized = false;
        
        console.log('🧹 Данные пользователя очищены');
    }
}

// Создаем глобальный экземпляр
window.modernUserService = new ModernUserService();

/**
 * Главная функция для получения USER_ID
 * Заменяет старую логику в config.js
 */
async function getUserIdWithAutoDetection() {
    try {
        if (!window.modernUserService.initialized) {
            await window.modernUserService.initializeUser();
        }
        
        return window.modernUserService.getUserId();
        
    } catch (error) {
        console.error('❌ Ошибка автоматического определения пользователя:', error);
        return 5930269100; // Fallback
    }
}

// Экспортируем для использования в других модулях
window.getUserIdWithAutoDetection = getUserIdWithAutoDetection;

console.log('✅ ModernUserService загружен и готов к работе');