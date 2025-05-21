/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Навигация (navigation.js)
ВЕРСИЯ: 0.4.1 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Обеспечивает навигацию по разделам приложения.
Обрабатывает переключение между страницами и вкладками.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.utils = window.MishuraApp.utils || {};
window.MishuraApp.utils.navigation = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let logger;
    
    // Текущая страница
    let currentPage = '';
    
    // Элементы DOM
    let navLinks, contentSections;
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        if (window.MishuraApp.utils.logger) {
            logger = window.MishuraApp.utils.logger;
        } else {
            logger = {
                debug: function(msg) { console.log('[DEBUG] ' + msg); },
                info: function(msg) { console.log('[INFO] ' + msg); },
                warn: function(msg) { console.warn('[WARN] ' + msg); },
                error: function(msg) { console.error('[ERROR] ' + msg); }
            };
        }
        
        // Инициализация элементов DOM
        navLinks = document.querySelectorAll('.nav-link');
        contentSections = document.querySelectorAll('.content-section');
        
        // Настройка обработчиков событий
        initEventListeners();
        
        // Установка начальной страницы на основе URL
        setInitialPage();
        
        logger.info('Модуль Навигация инициализирован');
    }
    
    /**
     * Инициализация обработчиков событий
     * @private
     */
    function initEventListeners() {
        // Обработчики для ссылок навигации
        if (navLinks) {
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetPage = this.getAttribute('data-page');
                    navigateTo(targetPage);
                });
            });
        }
        
        // Обработчик изменения хэша URL
        window.addEventListener('hashchange', handleHashChange);
    }
    
    /**
     * Установка начальной страницы на основе URL
     * @private
     */
    function setInitialPage() {
        // Получаем хэш из URL
        const hash = window.location.hash;
        
        if (hash) {
            // Удаляем символ # из хэша
            const page = hash.substring(1);
            navigateTo(page);
        } else {
            // Если хэш не указан, переходим на домашнюю страницу
            navigateTo('home');
        }
    }
    
    /**
     * Обработчик изменения хэша URL
     * @private
     */
    function handleHashChange() {
        const hash = window.location.hash;
        
        if (hash) {
            // Удаляем символ # из хэша
            const page = hash.substring(1);
            navigateTo(page, false); // Не обновляем URL, так как он уже изменен
        }
    }
    
    /**
     * Навигация к указанной странице
     * @public
     * @param {string} page - идентификатор страницы
     * @param {boolean} updateUrl - обновлять ли URL (по умолчанию true)
     */
    function navigateTo(page, updateUrl = true) {
        // Проверяем существование страницы
        const targetSection = document.getElementById(`${page}-section`);
        
        if (!targetSection) {
            logger.warn(`Страница '${page}' не найдена`);
            return;
        }
        
        // Если мы уже на этой странице, ничего не делаем
        if (currentPage === page) {
            return;
        }
        
        // Обновляем текущую страницу
        currentPage = page;
        
        // Скрываем все разделы
        if (contentSections) {
            contentSections.forEach(section => {
                section.classList.add('hidden');
            });
        }
        
        // Показываем целевой раздел
        targetSection.classList.remove('hidden');
        
        // Обновляем активные ссылки в навигации
        if (navLinks) {
            navLinks.forEach(link => {
                const linkPage = link.getAttribute('data-page');
                
                if (linkPage === page) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
        
        // Обновляем URL, если необходимо
        if (updateUrl) {
            window.location.hash = page;
        }
        
        // Прокрутка страницы вверх
        window.scrollTo(0, 0);
        
        // Отправляем событие изменения страницы
        document.dispatchEvent(new CustomEvent('pageChanged', {
            detail: { page: page }
        }));
        
        logger.debug(`Навигация на страницу: ${page}`);
    }
    
    /**
     * Получение текущей страницы
     * @public
     * @returns {string} - идентификатор текущей страницы
     */
    function getCurrentPage() {
        return currentPage;
    }
    
    // Публичный API
    return {
        init,
        navigateTo,
        getCurrentPage
    };
})();