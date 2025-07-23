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
    
    function loadTransactionHistory() {
        try {
            console.log('📊 Загрузка истории транзакций...');
            const userId = window.unifiedBalanceSync?.getCurrentUserId() || 
                          window.userService?.getCurrentUserId() ||
                          5930269100;
            if (!userId) {
                console.warn('⚠️ User ID не определен для загрузки истории');
                displayNoTransactions();
                return;
            }
            fetch(`/api/v1/users/${userId}/transactions?limit=10`)
                .then(response => response.ok ? response.json() : Promise.reject(response))
                .then(data => {
                    console.log('✅ История транзакций получена:', data);
                    displayTransactions(data.transactions || []);
                })
                .catch(err => {
                    console.warn('⚠️ Не удалось загрузить историю транзакций:', err);
                    displayErrorTransactions();
                });
        } catch (error) {
            console.error('❌ Ошибка загрузки истории:', error);
            displayErrorTransactions();
        }
    }
    function displayTransactions(transactions) {
        const container = document.getElementById('transactions-list');
        if (!container) return;
        if (!transactions || transactions.length === 0) {
            displayNoTransactions();
            return;
        }
        const html = transactions.map(tx => `
            <div class="transaction-item" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid rgba(212, 175, 55, 0.1);
            ">
                <div class="transaction-info">
                    <span class="transaction-type" style="
                        color: var(--text-light);
                        font-weight: 600;
                    ">${getTransactionIcon(tx.operation_type)} ${getTransactionLabel(tx.operation_type)}</span>
                    <div class="transaction-date" style="
                        color: var(--text-muted);
                        font-size: 0.8rem;
                        margin-top: 2px;
                    ">${new Date(tx.created_at).toLocaleDateString('ru-RU')}</div>
                </div>
                <div class="transaction-amount" style="
                    font-weight: 700;
                    color: ${tx.amount > 0 ? '#4CAF50' : '#f44336'};
                ">
                    ${tx.amount > 0 ? '+' : ''}${tx.amount} STcoin
                </div>
            </div>
        `).join('');
        container.innerHTML = html;
    }
    function displayNoTransactions() {
        const container = document.getElementById('transactions-list');
        if (container) {
            container.innerHTML = `
                <p style="
                    color: var(--text-muted); 
                    text-align: center;
                    padding: 20px;
                    font-style: italic;
                ">📝 История операций пуста</p>
            `;
        }
    }
    function displayErrorTransactions() {
        const container = document.getElementById('transactions-list');
        if (container) {
            container.innerHTML = `
                <p style="
                    color: #f44336; 
                    text-align: center;
                    padding: 20px;
                ">❌ Ошибка загрузки истории</p>
            `;
        }
    }
    function getTransactionIcon(type) {
        const icons = {
            'consultation_analysis': '🎨',
            'consultation_compare': '⚖️',
            'payment_stcoins': '💎',
            'feedback_bonus': '🎁',
            'consultation_refund': '🔄',
            'legacy': '📊'
        };
        return icons[type] || '📊';
    }
    function getTransactionLabel(type) {
        const labels = {
            'consultation_analysis': 'Анализ образа',
            'consultation_compare': 'Сравнение образов',
            'payment_stcoins': 'Пополнение баланса',
            'feedback_bonus': 'Бонус за отзыв',
            'consultation_refund': 'Возврат средств',
            'legacy': 'Операция'
        };
        return labels[type] || 'Неизвестная операция';
    }

    function hideAllSectionsLocal() {
        console.log('🙈 Скрываем все секции (модульная навигация)');
        
        // Скрываем секцию баланса
        const balanceSection = document.getElementById('balance-section');
        if (balanceSection) {
            balanceSection.style.display = 'none';
        }
        
        // Восстанавливаем основной контент если нужно
        const container = document.querySelector('.container');
        if (container && !container.querySelector('.action-buttons')) {
            container.innerHTML = `
                <header class="header">
                    <h1>✨ МИШУРА</h1>
                    <p>Твой личный стилист</p>
                </header>

                <div class="action-buttons">
                    <button id="single-mode-btn" class="action-btn">
                        <span class="icon">📷</span>
                        Анализ образа
                    </button>
                    <button id="compare-mode-btn" class="action-btn">
                        <span class="icon">🔄</span>
                        Сравнение образов
                    </button>
                </div>
            `;
            
            // Переинициализируем кнопки режимов
            if (window.app && typeof window.app.fixModeButtons === 'function') {
                window.app.fixModeButtons();
            }
        }
    }
    function showBalanceSection() {
        try {
            console.log('💰 Модульная навигация: Показ секции баланса');
            // Скрываем все секции
            hideAllSectionsLocal();
            // Показываем секцию баланса
            const balanceSection = document.getElementById('balance-section');
            if (balanceSection) {
                balanceSection.style.display = 'block';
                // Обновляем баланс
                if (window.app && window.app.refreshBalance) {
                    window.app.refreshBalance();
                }
                // Загружаем историю транзакций
                loadTransactionHistory();
            } else {
                console.error('❌ Секция баланса не найдена! Ожидался элемент #balance-section');
            }
        } catch (error) {
            console.error('❌ Ошибка показа секции баланса:', error);
        }
    }
    // Публичный API
    return {
        init,
        navigateTo,
        getCurrentPage,
        showBalanceSection,
        loadTransactionHistory,
        displayTransactions,
        displayNoTransactions,
        displayErrorTransactions,
        getTransactionIcon,
        getTransactionLabel
    };
})();