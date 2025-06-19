// 📝 ПРОСТОЙ И НАДЕЖНЫЙ ЛОГГЕР - webapp/logger.js
// Версия: 2.0.0 - Без рекурсивных ошибок
// console.log('📝 Простой логгер загружается...'); // удалено для оптимизации

class MishuraLogger {
    constructor() {
        this.isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1';
        
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };
        
        this.currentLevel = this.isProduction ? this.levels.INFO : this.levels.DEBUG;
        this.logs = [];
        this.maxLogs = 500; // Уменьшили для стабильности
        
        // Простая конфигурация
        this.config = {
            enableConsole: true,
            enableStorage: false, // Отключили для стабильности
            enableRemote: false,
            enablePerformance: false, // Отключили для стабильности
            enableUserActions: true
        };
        
        this.init();
    }

    init() {
        // Простая инициализация без перехвата console
        this.setupErrorHandling();
        
        if (this.config.enableUserActions) {
            this.setupUserActionTracking();
        }
        
        this.info('🚀 Простой MishuraLogger инициализирован', {
            level: this.currentLevel,
            production: this.isProduction
        });
    }

    // 🎯 Основные методы логирования
    error(message, data = null) {
        this.log('ERROR', message, data);
    }

    warn(message, data = null) {
        this.log('WARN', message, data);
    }

    info(message, data = null) {
        this.log('INFO', message, data);
    }

    debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    trace(message, data = null) {
        this.log('TRACE', message, data);
    }

    // 📊 Специализированные методы
    api(method, url, duration, status, error = null) {
        const level = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO';
        this.log(level, `API ${method} ${url}`, {
            method,
            url,
            duration,
            status,
            error,
            timestamp: Date.now()
        });
    }

    user(action, details = null) {
        this.log('INFO', `USER ${action}`, {
            action,
            details,
            timestamp: Date.now(),
            url: window.location.href
        });
    }

    // 🔧 Основной метод логирования
    log(level, message, data = null) {
        const levelValue = this.levels[level];
        
        if (levelValue > this.currentLevel) {
            return; // Логи этого уровня отключены
        }
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            url: window.location.href,
            sessionId: this.getSessionId()
        };
        
        // Добавляем в память
        this.addToMemory(logEntry);
        
        // Выводим в консоль
        if (this.config.enableConsole) {
            this.logToConsole(logEntry);
        }
    }

    // 💾 Управление памятью
    addToMemory(logEntry) {
        this.logs.push(logEntry);
        
        // Ограничиваем количество логов в памяти
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }

    // 🖥️ Вывод в консоль
    logToConsole(logEntry) {
        const { level, message, data } = logEntry;
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        const prefix = `[${timestamp}] [${level}]`;
        
        const consoleMethod = {
            ERROR: 'error',
            WARN: 'warn',
            INFO: 'info',
            DEBUG: 'log',
            TRACE: 'log'
        }[level] || 'log';
        
        try {
            if (data) {
                console[consoleMethod](`${prefix} ${message}`, data);
            } else {
                console[consoleMethod](`${prefix} ${message}`);
            }
        } catch (error) {
            // Игнорируем ошибки консоли
        }
    }

    // ⚠️ Простая обработка ошибок
    setupErrorHandling() {
        // JavaScript ошибки
        window.addEventListener('error', (event) => {
            try {
                this.error('JavaScript Error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            } catch (e) {
                // Игнорируем ошибки в обработчике ошибок
            }
        });
        
        // Promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            try {
                this.error('Unhandled Promise Rejection', {
                    reason: String(event.reason)
                });
            } catch (e) {
                // Игнорируем ошибки в обработчике ошибок
            }
        });
    }

    // 👤 Простое отслеживание действий пользователя
    setupUserActionTracking() {
        // Клики
        document.addEventListener('click', (event) => {
            try {
                const target = event.target;
                const tagName = target.tagName?.toLowerCase();
                const className = target.className;
                const id = target.id;
                
                // Логируем только значимые клики
                if (['button', 'a'].includes(tagName) || 
                    (className && className.includes('btn')) || 
                    (className && className.includes('clickable'))) {
                    this.user('click', {
                        element: tagName,
                        id,
                        className,
                        text: target.textContent?.slice(0, 50)
                    });
                }
            } catch (e) {
                // Игнорируем ошибки в отслеживании
            }
        });
        
        // Отправка форм
        document.addEventListener('submit', (event) => {
            try {
                const form = event.target;
                this.user('form-submit', {
                    formId: form.id,
                    formClass: form.className,
                    action: form.action
                });
            } catch (e) {
                // Игнорируем ошибки в отслеживании
            }
        });
        
        // Изменения в полях ввода
        document.addEventListener('change', (event) => {
            try {
                const target = event.target;
                if (['input', 'select', 'textarea'].includes(target.tagName?.toLowerCase())) {
                    this.user('input-change', {
                        type: target.type,
                        id: target.id,
                        name: target.name
                    });
                }
            } catch (e) {
                // Игнорируем ошибки в отслеживании
            }
        });
    }

    // 🆔 Генерация ID сессии
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = 'mishura_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        return this.sessionId;
    }

    // 📊 Экспорт логов
    getLogs(level = null) {
        try {
            if (level) {
                return this.logs.filter(log => log.level === level);
            }
            return [...this.logs];
        } catch (e) {
            return [];
        }
    }

    getStats() {
        try {
            const stats = {
                total: this.logs.length,
                byLevel: {}
            };
            
            Object.keys(this.levels).forEach(level => {
                stats.byLevel[level] = this.logs.filter(log => log.level === level).length;
            });
            
            return stats;
        } catch (e) {
            return { total: 0, byLevel: {} };
        }
    }

    // 🔧 Методы управления
    setLevel(level) {
        if (level in this.levels) {
            this.currentLevel = this.levels[level];
            this.info(`Log level изменен на ${level}`);
        }
    }

    clear() {
        this.logs = [];
        this.info('Логи очищены');
    }
}

// 🌍 Глобальная инициализация
window.MishuraLogger = MishuraLogger;

// Создаем логгер с защитой от ошибок
try {
    window.logger = new MishuraLogger();
} catch (error) {
    console.warn('Ошибка создания логгера:', error);
    // Создаем заглушку
    window.logger = {
        error: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {},
        api: () => {},
        user: () => {},
        getLogs: () => [],
        getStats: () => ({ total: 0, byLevel: {} }),
        clear: () => {},
        setLevel: () => {}
    };
}

// Удобные глобальные функции
window.log = {
    error: (msg, data) => window.logger.error(msg, data),
    warn: (msg, data) => window.logger.warn(msg, data),
    info: (msg, data) => window.logger.info(msg, data),
    debug: (msg, data) => window.logger.debug(msg, data),
    api: (method, url, duration, status, error) => window.logger.api(method, url, duration, status, error),
    user: (action, details) => window.logger.user(action, details)
};

// console.log('✅ Простой и надежный логгер готов к работе'); // удалено для оптимизации