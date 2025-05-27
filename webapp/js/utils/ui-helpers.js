/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: UI-утилиты (ui-helpers.js)
ВЕРСИЯ: 1.0.0 (ИСПРАВЛЕН)
ДАТА ОБНОВЛЕНИЯ: 2025-05-27

НАЗНАЧЕНИЕ ФАЙЛА:
Содержит вспомогательные функции для работы с пользовательским интерфейсом,
такие как управление уведомлениями, индикаторами загрузки и парсинг текста.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.utils = window.MishuraApp.utils || {};

window.MishuraApp.utils.uiHelpers = (function() {
    'use strict';
    
    let logger;
    let loadingOverlay;
    let toast;
    let isUIHelpersInitialized = false;
    
    function init() {
        if (isUIHelpersInitialized) return;
        
        logger = window.MishuraApp.utils.logger || {
            debug: (...args) => console.debug("UIHelpers:", ...args),
            info: (...args) => console.info("UIHelpers:", ...args),
            warn: (...args) => console.warn("UIHelpers:", ...args),
            error: (...args) => console.error("UIHelpers:", ...args)
        };
        
        logger.debug('Инициализация UI Helpers');
        
        // Получаем существующие элементы или создаем новые
        initLoadingOverlay();
        initToast();
        
        isUIHelpersInitialized = true;
        logger.info('UI Helpers инициализированы');
    }
    
    function initLoadingOverlay() {
        loadingOverlay = document.getElementById('loading-overlay');
        if (!loadingOverlay) {
            logger.warn('Loading overlay не найден в DOM, создаем новый');
            createLoadingOverlay();
        } else {
            logger.debug('Loading overlay найден в DOM');
        }
    }
    
    function createLoadingOverlay() {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.className = 'overlay';
        loadingOverlay.setAttribute('role', 'alertdialog');
        loadingOverlay.setAttribute('aria-busy', 'true');
        loadingOverlay.setAttribute('aria-live', 'assertive');
        loadingOverlay.innerHTML = `
            <div class="dialog loading-dialog">
                <div class="loading-indicator">
                    <div class="loading-spinner" aria-hidden="true"></div>
                    <p id="loading-text">Загрузка...</p>
                </div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
        logger.debug('Loading overlay создан и добавлен в DOM');
    }
    
    function initToast() {
        toast = document.getElementById('toast');
        if (!toast) {
            logger.warn('Toast не найден в DOM, создаем новый');
            createToast();
        } else {
            logger.debug('Toast найден в DOM');
        }
    }
    
    function createToast() {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
        logger.debug('Toast создан и добавлен в DOM');
    }
    
    function showLoading(message = 'Загрузка...') {
        if (!loadingOverlay) {
            initLoadingOverlay();
        }
        
        const loadingText = loadingOverlay.querySelector('#loading-text') || loadingOverlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        loadingOverlay.classList.add('active');
        document.body.classList.add('modal-open');
        
        logger.debug(`Показан индикатор загрузки: ${message}`);
    }
    
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            document.body.classList.remove('modal-open');
            logger.debug('Скрыт индикатор загрузки');
        }
    }
    
    function showToast(message, duration = 3000) {
        if (!toast) {
            initToast();
        }
        
        toast.textContent = message;
        toast.classList.add('active');
        
        // Удаляем предыдущий таймер, если он есть
        if (toast.hideTimer) {
            clearTimeout(toast.hideTimer);
        }
        
        // Устанавливаем новый таймер
        toast.hideTimer = setTimeout(() => {
            toast.classList.remove('active');
        }, duration);
        
        logger.debug(`Показано уведомление: ${message} (${duration}ms)`);
    }
    
    function showResults(response) {
        logger.debug('Показ результатов:', response);
        
        const resultsContainer = document.getElementById('results-container');
        if (!resultsContainer) {
            logger.error('Results container не найден');
            return;
        }
        
        if (response && response.status === 'success' && response.advice) {
            const htmlContent = parseMarkdownToHtml(response.advice);
            resultsContainer.innerHTML = htmlContent;
        } else if (response && response.status === 'error') {
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <h3>❌ Ошибка</h3>
                    <p>${response.message || 'Произошла неизвестная ошибка'}</p>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <h3>❌ Ошибка</h3>
                    <p>Получен некорректный ответ от сервера</p>
                </div>
            `;
        }
        
        // Открываем модальное окно результатов
        const modals = window.MishuraApp.components.modals;
        if (modals && typeof modals.openResultsModal === 'function') {
            modals.openResultsModal();
        }
    }
    
    function parseMarkdownToHtml(markdown) {
        if (!markdown) return '';
        
        // Простой парсер Markdown
        return markdown
            // Заголовки
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            
            // Жирный текст
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            
            // Курсив
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // Списки
            .replace(/^\s*[-*]\s(.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            
            // Параграфы (исключаем уже обработанные теги)
            .replace(/^(?!<[h|u|li])(.*$)/gm, '<p>$1</p>')
            
            // Убираем лишние переносы строк
            .replace(/\n\n/g, '\n')
            
            // Убираем пустые параграфы
            .replace(/<p><\/p>/g, '');
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    return {
        init,
        showLoading,
        hideLoading,
        showToast,
        showResults,
        parseMarkdownToHtml,
        formatFileSize,
        debounce,
        throttle,
        isInitialized: () => isUIHelpersInitialized
    };
})();