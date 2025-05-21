/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: UI-утилиты (ui-helpers.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

НАЗНАЧЕНИЕ ФАЙЛА:
Содержит вспомогательные функции для работы с пользовательским интерфейсом,
такие как управление уведомлениями, индикаторами загрузки и парсинг текста.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.utils = window.MishuraApp.utils || {};
window.MishuraApp.utils.uiHelpers = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let config, logger;
    
    // Константы по умолчанию
    const DEFAULT_TOAST_DURATION = 3000; // 3 секунды
    
    /**
     * Показывает уведомление пользователю
     * @param {string} message - текст уведомления
     * @param {number} duration - длительность показа в мс (по умолчанию 3000)
     */
    function showToast(message, duration) {
        // Исправлено: используем значение по умолчанию вместо config.LIMITS.TOAST_DURATION
        const toastDuration = duration || DEFAULT_TOAST_DURATION;
        const toastElement = document.getElementById('toast');
        
        if (toastElement) {
            toastElement.textContent = message;
            toastElement.classList.add('show');
            setTimeout(() => toastElement.classList.remove('show'), toastDuration);
        } else {
            if (logger) {
                logger.warn("Элемент #toast не найден для показа сообщения:", message);
            } else {
                console.warn("Элемент #toast не найден для показа сообщения:", message);
            }
            // Запасной вариант - обычный alert в крайнем случае
            if (message.includes('ошибка') || message.includes('Ошибка')) {
                alert(message);
            }
        }
    }
    
    /**
     * Показывает глобальный индикатор загрузки
     * @param {string} message - текст, отображаемый в индикаторе
     */
    function showLoading(message = 'Загрузка...') {
        if (logger) {
            logger.debug(`Показ индикатора загрузки: ${message}`);
        }
        
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.textContent = message;
        
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Предотвращаем прокрутку фона
        } else {
            if (logger) {
                logger.error("Элемент #loading-overlay не найден.");
            } else {
                console.error("Элемент #loading-overlay не найден.");
            }
        }
    }
    
    /**
     * Скрывает глобальный индикатор загрузки
     */
    function hideLoading() {
        if (logger) {
            logger.debug('Скрытие индикатора загрузки');
        }
        
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            document.body.style.overflow = ''; // Восстанавливаем прокрутку фона
        }
    }
    
    /**
     * Показывает локальный индикатор загрузки внутри элемента
     * @param {HTMLElement} element - элемент, внутри которого будет показан индикатор
     */
    function showLoadingIndicatorFor(element) {
        if (!element) return;
        
        // Проверяем, существует ли уже индикатор
        let indicator = element.querySelector('.upload-loading-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'upload-loading-indicator';
            indicator.innerHTML = '<div class="loading-spinner" style="width:25px;height:25px;"></div>';
            indicator.style.position = 'absolute';
            indicator.style.top = '50%';
            indicator.style.left = '50%';
            indicator.style.transform = 'translate(-50%, -50%)';
            indicator.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            indicator.style.borderRadius = '50%';
            indicator.style.padding = '10px';
            indicator.style.zIndex = '5';
            
            element.appendChild(indicator);
            
            // Полупрозрачный фон для элемента
            element.style.position = 'relative';
            element.style.opacity = '0.7';
        }
    }
    
    /**
     * Скрывает локальный индикатор загрузки
     * @param {HTMLElement} element - элемент с индикатором
     */
    function hideLoadingIndicatorFor(element) {
        if (!element) return;
        
        const indicator = element.querySelector('.upload-loading-indicator');
        if (indicator) {
            element.removeChild(indicator);
        }
        element.style.opacity = '1';
    }
    
    /**
     * Парсит текст в формате Markdown в HTML
     * @param {string} markdown - текст в формате Markdown
     * @returns {string} - HTML-разметка
     */
    function parseMarkdownToHtml(markdown) {
        if (typeof markdown !== 'string' || !markdown.trim()) {
            return '<p>К сожалению, ИИ-стилист Мишура не смог предоставить ответ. Попробуйте другой запрос или изображение.</p>';
        }
        
        let html = markdown;
        
        // Заголовки (### Наименование ### -> <h4>Наименование</h4>)
        html = html.replace(/^###\s*(.*?)\s*###\s*$/gm, '<h4>$1</h4>');
        html = html.replace(/^###\s*(.*?)\s*$/gm, '<div class="result-section-title">$1</div>');

        // Списки (* или - )
        html = html.replace(/^\s*[\*\-]\s+(.*)$/gm, '<li>$1</li>');
        
        // Обертывание блоков <li> в <ul>
        let inList = false;
        const lines = html.split('\n');
        html = lines.map(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('<li>')) {
                if (!inList) {
                    inList = true;
                    return '<ul>' + line;
                }
                return line;
            } else if (trimmedLine.startsWith('💡')) { // Для подсказок
                 if (inList) {
                    inList = false;
                    return '</ul><p class="ai-tip">' + line + '</p>';
                }
                return '<p class="ai-tip">' + line + '</p>';
            }
            else { // Не элемент списка
                if (inList) { // Если перед этим был список, закрываем его
                    inList = false;
                    // Если строка не пустая после списка, оборачиваем ее в <p>
                    return trimmedLine === '' ? '</ul>' : '</ul><p>' + line + '</p>';
                }
                // Если строка не пустая и не является уже HTML тегом, оборачиваем в <p>
                return (trimmedLine !== '' && !trimmedLine.match(/^<(\w+)\b[^>]*>/)) ? '<p>' + line + '</p>' : line;
            }
        }).join('\n');

        if (inList) { // Если список был последним элементом
            html += '</ul>';
        }
        
        // Заменяем двойные переносы строк на один
        html = html.replace(/\n\n+/g, '\n');
        // Заменяем оставшиеся одинарные \n на <br> для сохранения переносов
        html = html.replace(/\n/g, '<br>');
        // Убираем <br> внутри <li> если он там лишний
        html = html.replace(/<li><br\s*\/?>/gi, '<li>');
        // Убираем <br> перед закрывающим </li>
        html = html.replace(/<br\s*\/?>\s*<\/li>/gi, '</li>');
        // Убираем <p><br></p> или <p></p>
        html = html.replace(/<p>(<br\s*\/?>|\s*)<\/p>/gi, '');

        return html;
    }
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        config = window.MishuraApp.config;
        logger = window.MishuraApp.utils.logger;
        
        if (logger) {
            logger.debug('UI-хелперы инициализированы');
        } else {
            console.debug('UI-хелперы инициализированы');
        }
    }
    
    // Публичный API модуля
    return {
        init,
        showToast,
        showLoading,
        hideLoading,
        showLoadingIndicatorFor,
        hideLoadingIndicatorFor,
        parseMarkdownToHtml
    };
})();