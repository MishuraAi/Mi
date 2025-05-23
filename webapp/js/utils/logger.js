/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Утилита логирования (logger.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Предоставляет унифицированный интерфейс для логирования сообщений различного уровня.
Позволяет контролировать вывод логов в разных средах.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.utils = window.MishuraApp.utils || {};

window.MishuraApp.utils.logger = (function() {
    'use strict';
    
    // Уровни логирования
    const LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };
    
    // Текущий уровень логирования
    let currentLogLevel = LOG_LEVELS.DEBUG;
    
    // Префикс для всех сообщений
    const LOG_PREFIX = 'MishuraApp';
    
    function init() {
        console.debug(`${LOG_PREFIX}: Logger initialized with level: ${getLogLevelName(currentLogLevel)}`);
    }
    
    function setLogLevel(level) {
        if (LOG_LEVELS[level] !== undefined) {
            currentLogLevel = LOG_LEVELS[level];
            console.debug(`${LOG_PREFIX}: Log level set to: ${level}`);
        } else {
            console.warn(`${LOG_PREFIX}: Invalid log level: ${level}`);
        }
    }
    
    function getLogLevelName(level) {
        return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
    }
    
    function shouldLog(level) {
        return level >= currentLogLevel;
    }
    
    function formatMessage(level, ...args) {
        const timestamp = new Date().toISOString();
        const levelName = getLogLevelName(level);
        return [`${LOG_PREFIX} [${timestamp}] ${levelName}:`, ...args];
    }
    
    function debug(...args) {
        if (shouldLog(LOG_LEVELS.DEBUG)) {
            console.debug(...formatMessage(LOG_LEVELS.DEBUG, ...args));
        }
    }
    
    function info(...args) {
        if (shouldLog(LOG_LEVELS.INFO)) {
            console.info(...formatMessage(LOG_LEVELS.INFO, ...args));
        }
    }
    
    function warn(...args) {
        if (shouldLog(LOG_LEVELS.WARN)) {
            console.warn(...formatMessage(LOG_LEVELS.WARN, ...args));
        }
    }
    
    function error(...args) {
        if (shouldLog(LOG_LEVELS.ERROR)) {
            console.error(...formatMessage(LOG_LEVELS.ERROR, ...args));
        }
    }
    
    // Инициализация при создании
    init();
    
    return {
        init,
        setLogLevel,
        debug,
        info,
        warn,
        error
    };
})();