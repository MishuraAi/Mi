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
window.MishuraApp.components = window.MishuraApp.components || {};
window.MishuraApp.components.navigation = (function() {
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
        navLinks = document.querySelectorAll('.nav-item');
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
                // Удаляем старые обработчики
                const newLink = link.cloneNode(true);
                link.parentNode.replaceChild(newLink, link);
                
                newLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetPage = this.getAttribute('data-page');
                    navigateTo(targetPage);
                });
            });
            
            // Обновляем коллекцию после клонирования
            navLinks = document.querySelectorAll('.nav-item');
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
        // Проверяем существование страницы или вызываем методы app.js
        if (page === 'balance') {
            showBalanceSection();
        } else if (page === 'home') {
            // Вызываем метод из app.js если доступен
            if (window.mishuraApp && typeof window.mishuraApp.showHomeSection === 'function') {
                window.mishuraApp.showHomeSection();
            }
        } else if (page === 'history') {
            // Вызываем метод из app.js если доступен
            if (window.mishuraApp && typeof window.mishuraApp.showHistorySection === 'function') {
                window.mishuraApp.showHistorySection();
            }
        } else {
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
            
            logger.debug(`Модульная навигация на страницу: ${page}`);
        }
    }
    
    /**
     * Получение текущей страницы
     * @public
     * @returns {string} - идентификатор текущей страницы
     */
    function getCurrentPage() {
        return currentPage;
    }
    
    /**
     * Показать секцию баланса БЕЗ заголовков + кнопки поддержки и обновления
     */
    function showBalanceSection() {
        console.log('💰 Модульная навигация: Показ секции баланса');
        
        const container = document.querySelector('.container');
        if (!container) return;
        
        // Получаем данные из app.js если доступно
        const mishuraApp = window.mishuraApp;
        const userBalance = mishuraApp ? mishuraApp.userBalance : 50;
        const consultationsHistory = mishuraApp ? mishuraApp.consultationsHistory : [];
        const consultationsUsed = mishuraApp ? mishuraApp.consultationsUsed : 0;
        const consultationsRemaining = Math.floor(userBalance / 10);
        
        // ИСПРАВЛЕНО: Карточка баланса БЕЗ кнопок внутри
        container.innerHTML = `
            <div class="balance-card" style="
                background: var(--gold-gradient);
                color: var(--text-dark);
                border-radius: 20px;
                padding: 24px;
                margin-bottom: 24px;
                text-align: center;
                box-shadow: var(--shadow-gold);
            ">
                <!-- УБРАЛИ кнопки отсюда -->
                <div style="font-size: 2.5rem; font-weight: 900; margin-bottom: 8px;" data-balance-display>
                    ${userBalance}
                </div>
                <div style="font-size: 1.1rem; font-weight: 600; text-transform: uppercase;">
                    STcoin
                </div>
                <div style="font-size: 0.9rem; margin-top: 8px; opacity: 0.8;">
                    Доступно консультаций: <span data-consultations-display>${consultationsRemaining}</span>
                </div>
            </div>
            
            <!-- Статистика -->
            <div class="usage-stats" style="
                background: rgba(26, 26, 26, 0.8);
                border: 1px solid var(--border-light);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 24px;
            ">
                <h3 style="
                    color: var(--text-gold);
                    margin-bottom: 16px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 1rem;
                ">📊 Статистика использования</h3>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: var(--text-muted);">Всего получено:</span>
                    <span style="color: var(--text-light); font-weight: 600;">${consultationsHistory.length}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: var(--text-muted);">Потрачено STcoin:</span>
                    <span style="color: var(--text-light); font-weight: 600;">${consultationsUsed}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Остаток STcoin:</span>
                    <span style="color: var(--text-gold); font-weight: 600;" data-balance-display>${userBalance}</span>
                </div>
            </div>
            
            <!-- ИСПРАВЛЕНО: Кнопки ВНИЗУ как отдельные блоки -->
            <div class="balance-actions">
                <!-- Кнопка пополнения -->
                <button class="action-btn" onclick="window.mishuraApp && window.mishuraApp.showPaymentModal ? window.mishuraApp.showPaymentModal() : window.showPricingModal()" style="
                    width: 100%;
                    margin-bottom: 16px;
                    background: rgba(26, 26, 26, 0.8);
                    border: 2px solid var(--border-gold);
                    color: var(--text-gold);
                    padding: 20px;
                    font-size: 1.1rem;
                ">
                    <span style="margin-right: 8px;">💳</span>
                    Пополнить STcoin
                </button>
                
                <!-- Кнопка поддержки -->
                <button class="action-btn" onclick="window.open('https://t.me/marketolog_online', '_blank')" style="
                    width: 100%;
                    margin-bottom: 16px;
                    background: rgba(26, 26, 26, 0.8);
                    border: 2px solid rgba(0, 123, 255, 0.5);
                    color: #007bff;
                    padding: 20px;
                    font-size: 1.1rem;
                ">
                    <span style="margin-right: 8px;">💬</span>
                    Связаться с поддержкой
                </button>
            </div>
        `;
        
        logger.info('Секция баланса отображена: кнопки вынесены внизу');
    }
    
    // Публичный API
    return {
        init,
        navigateTo,
        getCurrentPage,
        showBalanceSection
    };
})();