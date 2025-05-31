// 📝 ПРОДВИНУТЫЙ ЛОГГЕР - webapp/logger.js
// Версия: 1.5.0 - Профессиональная система логирования
console.log('📝 Продвинутый логгер загружается...');

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
        this.maxLogs = 1000;
        
        // Конфигурация
        this.config = {
            enableConsole: true,
            enableStorage: true,
            enableRemote: false,
            enablePerformance: true,
            enableUserActions: true,
            remoteEndpoint: '/api/v1/logs'
        };
        
        this.init();
    }

    init() {
        // Перехватываем стандартные console методы
        this.interceptConsole();
        
        // Отслеживаем ошибки
        this.setupErrorHandling();
        
        // Отслеживаем производительность
        if (this.config.enablePerformance) {
            this.setupPerformanceMonitoring();
        }
        
        // Отслеживаем действия пользователя
        if (this.config.enableUserActions) {
            this.setupUserActionTracking();
        }
        
        // Периодическая отправка логов на сервер
        if (this.config.enableRemote) {
            this.setupRemoteLogging();
        }
        
        this.info('🚀 MishuraLogger инициализирован', {
            level: this.currentLevel,
            production: this.isProduction,
            config: this.config
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
            url: window.location.href,
            userAgent: navigator.userAgent
        });
    }

    performance(metric, value, unit = 'ms') {
        this.log('DEBUG', `PERF ${metric}: ${value}${unit}`, {
            metric,
            value,
            unit,
            timestamp: Date.now()
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
        
        // Сохраняем локально
        if (this.config.enableStorage) {
            this.saveToStorage(logEntry);
        }
        
        // Отправляем на сервер (для критичных ошибок)
        if (level === 'ERROR' && this.config.enableRemote) {
            this.sendToRemote(logEntry);
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
        
        if (data) {
            console[consoleMethod](`${prefix} ${message}`, data);
        } else {
            console[consoleMethod](`${prefix} ${message}`);
        }
    }

    // 💿 Сохранение в localStorage
    saveToStorage(logEntry) {
        try {
            const key = `mishura_logs_${new Date().toDateString()}`;
            const existingLogs = JSON.parse(localStorage.getItem(key) || '[]');
            existingLogs.push(logEntry);
            
            // Ограничиваем размер (последние 100 записей на день)
            if (existingLogs.length > 100) {
                existingLogs.splice(0, existingLogs.length - 100);
            }
            
            localStorage.setItem(key, JSON.stringify(existingLogs));
        } catch (error) {
            // Игнорируем ошибки localStorage (квота превышена и т.д.)
        }
    }

    // 🌐 Отправка на сервер
    async sendToRemote(logEntry) {
        try {
            await fetch(this.config.remoteEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(logEntry)
            });
        } catch (error) {
            // Не логируем ошибки отправки логов, чтобы избежать рекурсии
        }
    }

    // 🔍 Перехват console методов
    interceptConsole() {
        const originalMethods = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error
        };
        
        // Перехватываем console.error для автоматического логирования
        console.error = (...args) => {
            originalMethods.error.apply(console, args);
            this.error('Console Error', { args });
        };
        
        // Сохраняем оригинальные методы для внутреннего использования
        this.originalConsole = originalMethods;
    }

    // ⚠️ Обработка ошибок
    setupErrorHandling() {
        // JavaScript ошибки
        window.addEventListener('error', (event) => {
            this.error('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
        
        // Promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Unhandled Promise Rejection', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        });
        
        // Ресурсы, которые не загрузились
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.warn('Resource Loading Error', {
                    type: event.target.tagName,
                    source: event.target.src || event.target.href,
                    message: 'Failed to load resource'
                });
            }
        }, true);
    }

    // ⚡ Мониторинг производительности
    setupPerformanceMonitoring() {
        // Page Load Performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    this.performance('page-load', Math.round(perfData.loadEventEnd - perfData.fetchStart));
                    this.performance('dom-ready', Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart));
                    this.performance('first-paint', Math.round(perfData.responseStart - perfData.fetchStart));
                }
            }, 1000);
        });
        
        // Memory usage (если доступно)
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.performance('memory-used', Math.round(memory.usedJSHeapSize / 1024 / 1024), 'MB');
            }, 30000); // каждые 30 секунд
        }
        
        // Long tasks (если доступно)
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.performance('long-task', Math.round(entry.duration));
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                // Браузер не поддерживает longtask
            }
        }
    }

    // 👤 Отслеживание действий пользователя
    setupUserActionTracking() {
        // Клики
        document.addEventListener('click', (event) => {
            const target = event.target;
            const tagName = target.tagName.toLowerCase();
            const className = target.className;
            const id = target.id;
            
            // Логируем только значимые клики
            if (['button', 'a'].includes(tagName) || className.includes('btn') || className.includes('clickable')) {
                this.user('click', {
                    element: tagName,
                    id,
                    className,
                    text: target.textContent?.slice(0, 50)
                });
            }
        });
        
        // Отправка форм
        document.addEventListener('submit', (event) => {
            const form = event.target;
            this.user('form-submit', {
                formId: form.id,
                formClass: form.className,
                action: form.action
            });
        });
        
        // Изменения в полях ввода (без логирования значений для безопасности)
        document.addEventListener('change', (event) => {
            const target = event.target;
            if (['input', 'select', 'textarea'].includes(target.tagName.toLowerCase())) {
                this.user('input-change', {
                    type: target.type,
                    id: target.id,
                    name: target.name
                });
            }
        });
        
        // Переходы по страницам
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                this.user('page-change', {
                    from: currentUrl,
                    to: window.location.href
                });
                currentUrl = window.location.href;
            }
        }, 1000);
    }

    // 🔄 Удаленное логирование
    setupRemoteLogging() {
        // Отправляем накопленные логи каждые 30 секунд
        setInterval(() => {
            this.flushLogsToRemote();
        }, 30000);
        
        // Отправляем логи при закрытии страницы
        window.addEventListener('beforeunload', () => {
            this.flushLogsToRemote();
        });
    }

    async flushLogsToRemote() {
        const logsToSend = this.logs.filter(log => !log.sent);
        if (logsToSend.length === 0) return;
        
        try {
            await fetch(this.config.remoteEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.getSessionId(),
                    logs: logsToSend
                })
            });
            
            // Помечаем логи как отправленные
            logsToSend.forEach(log => log.sent = true);
            
        } catch (error) {
            // Не логируем ошибки отправки логов
        }
    }

    // 🆔 Генерация ID сессии
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = 'mishura_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        return this.sessionId;
    }

    // 📊 Экспорт логов
    exportLogs(format = 'json') {
        const data = {
            sessionId: this.getSessionId(),
            exportTime: new Date().toISOString(),
            logs: this.logs,
            config: this.config,
            browser: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                onLine: navigator.onLine
            }
        };
        
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            return this.convertToCsv(this.logs);
        }
        
        return data;
    }

    convertToCsv(logs) {
        if (logs.length === 0) return '';
        
        const headers = ['timestamp', 'level', 'message', 'data'];
        const rows = logs.map(log => [
            log.timestamp,
            log.level,
            log.message,
            JSON.stringify(log.data)
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
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

    getLogs(level = null) {
        if (level) {
            return this.logs.filter(log => log.level === level);
        }
        return [...this.logs];
    }

    getStats() {
        const stats = {
            total: this.logs.length,
            byLevel: {}
        };
        
        Object.keys(this.levels).forEach(level => {
            stats.byLevel[level] = this.logs.filter(log => log.level === level).length;
        });
        
        return stats;
    }
}

// 🌍 Глобальная инициализация
window.MishuraLogger = MishuraLogger;
window.logger = new MishuraLogger();

// Удобные глобальные функции
window.log = {
    error: (msg, data) => window.logger.error(msg, data),
    warn: (msg, data) => window.logger.warn(msg, data),
    info: (msg, data) => window.logger.info(msg, data),
    debug: (msg, data) => window.logger.debug(msg, data),
    api: (method, url, duration, status, error) => window.logger.api(method, url, duration, status, error),
    user: (action, details) => window.logger.user(action, details),
    perf: (metric, value, unit) => window.logger.performance(metric, value, unit)
};

console.log('✅ Продвинутый логгер готов к работе');