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
    
    // Текущий уровень логирования (можно изменить во время выполнения)
    let currentLogLevel = LOG_LEVELS.INFO;
    
    // Префикс для всех логов
    const LOG_PREFIX = 'МишураApp';
    
    /**
     * Инициализация модуля логирования
     */
    function init() {
        autoConfigureLogLevel();
        info('Модуль логирования инициализирован');
        return true;
    }
    
    /**
     * Вывод отладочной информации (только для разработки)
     * @param {string} message - сообщение для логирования
     * @param {...any} args - дополнительные аргументы
     */
    function debug(message, ...args) {
        if (currentLogLevel <= LOG_LEVELS.DEBUG) {
            console.debug(`[DEBUG] ${LOG_PREFIX}: ${message}`, ...args);
        }
    }
    
    /**
     * Вывод информационного сообщения
     * @param {string} message - сообщение для логирования
     * @param {...any} args - дополнительные аргументы
     */
    function info(message, ...args) {
        if (currentLogLevel <= LOG_LEVELS.INFO) {
            console.log(`[INFO] ${LOG_PREFIX}: ${message}`, ...args);
        }
    }
    
    /**
     * Вывод предупреждения
     * @param {string} message - сообщение для логирования
     * @param {...any} args - дополнительные аргументы
     */
    function warn(message, ...args) {
        if (currentLogLevel <= LOG_LEVELS.WARN) {
            console.warn(`[WARN] ${LOG_PREFIX}: ${message}`, ...args);
        }
    }
    
    /**
     * Вывод сообщения об ошибке
     * @param {string} message - сообщение для логирования
     * @param {...any} args - дополнительные аргументы
     */
    function error(message, ...args) {
        if (currentLogLevel <= LOG_LEVELS.ERROR) {
            console.error(`[ERROR] ${LOG_PREFIX}: ${message}`, ...args);
        }
    }
    
    /**
     * Установка уровня логирования
     * @param {string} level - уровень логирования ('debug', 'info', 'warn', 'error')
     */
    function setLogLevel(level) {
        const levelUpper = level.toUpperCase();
        if (LOG_LEVELS[levelUpper] !== undefined) {
            currentLogLevel = LOG_LEVELS[levelUpper];
            info(`Уровень логирования установлен: ${levelUpper}`);
        } else {
            warn(`Неизвестный уровень логирования: ${level}`);
        }
    }
    
    /**
     * Получение текущего уровня логирования
     * @returns {string} - текущий уровень логирования
     */
    function getLogLevel() {
        for (const [key, value] of Object.entries(LOG_LEVELS)) {
            if (value === currentLogLevel) {
                return key;
            }
        }
        return 'UNKNOWN';
    }
    
    // Автоматическая установка уровня логирования на основе URL параметров
    function autoConfigureLogLevel() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const logLevel = urlParams.get('log_level');
            if (logLevel) {
                setLogLevel(logLevel);
            }
            
            // В режиме разработки включаем отладочные логи
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                setLogLevel('DEBUG');
                debug('Режим разработки: логирование DEBUG включено');
            }
        } catch (e) {
            console.error('Ошибка при автоматической настройке уровня логирования:', e);
        }
    }
    
    // Публичный API модуля
    return {
        init,
        debug,
        info,
        warn,
        error,
        setLogLevel,
        getLogLevel,
        LEVELS: LOG_LEVELS
    };
})();