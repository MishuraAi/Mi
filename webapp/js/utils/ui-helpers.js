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
    
    let logger;
    let loadingOverlay;
    let toast;
    
    function init() {
        logger = window.MishuraApp.utils.logger;
        logger.debug('Инициализация UI Helpers');
        
        // Создаем элементы UI, если их нет
        createLoadingOverlay();
        createToast();
        
        logger.info('UI Helpers инициализированы');
    }
    
    function createLoadingOverlay() {
        if (!document.getElementById('loading-overlay')) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.className = 'overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <div class="loading-text">Загрузка...</div>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
        } else {
            loadingOverlay = document.getElementById('loading-overlay');
        }
    }
    
    function createToast() {
        if (!document.getElementById('toast')) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        } else {
            toast = document.getElementById('toast');
        }
    }
    
    function showLoading(message = 'Загрузка...') {
        if (!loadingOverlay) {
            createLoadingOverlay();
        }
        
        const loadingText = loadingOverlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        loadingOverlay.classList.add('active');
        document.body.classList.add('modal-open');
    }
    
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    }
    
    function showToast(message, duration = 3000) {
        if (!toast) {
            createToast();
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
            .replace(/^\s*\*\s(.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            
            // Параграфы
            .replace(/^(?!<[h|u|li])(.*$)/gm, '<p>$1</p>')
            
            // Убираем лишние переносы строк
            .replace(/\n\n/g, '\n')
            
            // Убираем пустые параграфы
            .replace(/<p><\/p>/g, '');
    }
    
    return {
        init,
        showLoading,
        hideLoading,
        showToast,
        parseMarkdownToHtml
    };
})();