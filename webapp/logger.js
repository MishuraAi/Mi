/**
 * МИШУРА - ИИ Стилист
 * Логгер (logger.js)
 * Версия: 1.0.0
 * Дата: 2025-05-31
 */

class Logger {
    constructor(namespace = 'Default') {
        this.namespace = namespace;
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
        
        // Определяем уровень логирования в зависимости от окружения
        this.currentLevel = this.getLogLevel();
    }

    getLogLevel() {
        // В продакшне показываем только INFO и выше
        if (window.location.hostname.includes('onrender.com')) {
            return this.levels.INFO;
        }
        
        // В разработке показываем все
        return this.levels.DEBUG;
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `${this.namespace} [${timestamp}] ${level}: ${message}`;
        
        return { formattedMessage, data };
    }

    debug(message, data = null) {
        if (this.currentLevel <= this.levels.DEBUG) {
            const { formattedMessage, data: logData } = this.formatMessage('DEBUG', message, data);
            if (logData) {
                console.log(formattedMessage, logData);
            } else {
                console.log(formattedMessage);
            }
        }
    }

    info(message, data = null) {
        if (this.currentLevel <= this.levels.INFO) {
            const { formattedMessage, data: logData } = this.formatMessage('INFO', message, data);
            if (logData) {
                console.info(formattedMessage, logData);
            } else {
                console.info(formattedMessage);
            }
        }
    }

    warn(message, data = null) {
        if (this.currentLevel <= this.levels.WARN) {
            const { formattedMessage, data: logData } = this.formatMessage('WARN', message, data);
            if (logData) {
                console.warn(formattedMessage, logData);
            } else {
                console.warn(formattedMessage);
            }
        }
    }

    error(message, data = null) {
        if (this.currentLevel <= this.levels.ERROR) {
            const { formattedMessage, data: logData } = this.formatMessage('ERROR', message, data);
            if (logData) {
                console.error(formattedMessage, logData);
            } else {
                console.error(formattedMessage);
            }
        }
    }
}