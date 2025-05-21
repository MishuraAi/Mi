/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Навигация (navigation.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

НАЗНАЧЕНИЕ ФАЙЛА:
Управление навигацией приложения. Контролирует переключение между разделами,
обработку кнопок меню и общую навигацию по вкладкам.
==========================================================================================
*/

// Добавляем модуль в пространство имен приложения
window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.components = window.MishuraApp.components || {};
window.MishuraApp.components.navigation = (function() {
    'use strict';
    
    // Локальные ссылки на другие модули
    let logger, uiHelpers;
    
    // Элементы DOM для навигации
    let menuButton, homeButton, searchButton, navItems;
    
    // Текущее состояние навигации
    let currentTab = 'home';
    
    /**
     * Инициализация модуля
     */
    function init() {
        // Получаем ссылки на другие модули
        logger = window.MishuraApp.utils.logger;
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        
        // Получаем ссылки на DOM элементы
        menuButton = document.getElementById('menu-button');
        homeButton = document.getElementById('home-button');
        searchButton = document.getElementById('search-button');
        navItems = document.querySelectorAll('.nav-item');
        
        // Проверяем наличие элементов
        if (!menuButton || !homeButton || !searchButton) {
            logger.warn("Не все элементы навигации найдены в DOM");
        }
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        // Устанавливаем активную вкладку
        setActiveTab(currentTab);
        
        logger.debug("Модуль навигации инициализирован");
    }
    
    /**
     * Настраивает обработчики событий для элементов навигации
     * @private
     */
    function setupEventListeners() {
        if (menuButton) {
            menuButton.addEventListener('click', handleMenuClick);
        }
        
        if (homeButton) {
            homeButton.addEventListener('click', handleHomeClick);
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', handleSearchClick);
        }
        
        // Настраиваем обработчики для вкладок нижней навигации
        navItems.forEach(item => {
            item.addEventListener('click', (event) => {
                handleNavClick(event.currentTarget);
            });
        });
    }
    
    /**
     * Обработчик клика по кнопке меню
     * @private
     */
    function handleMenuClick() {
        logger.info("Клик по кнопке меню");
        uiHelpers.showToast("Меню в разработке");
        // В будущих версиях здесь может быть открытие бокового меню
    }
    
    /**
     * Обработчик клика по заголовку/логотипу
     * @private
     */
    function handleHomeClick() {
        logger.info("Клик по заголовку/логотипу");
        setActiveTab('home');
    }
    
    /**
     * Обработчик клика по кнопке поиска
     * @private
     */
    function handleSearchClick() {
        logger.info("Клик по кнопке поиска");
        uiHelpers.showToast("Поиск в разработке");
        // В будущих версиях здесь может быть открытие поиска
    }
    
    /**
     * Обработчик клика по вкладке нижней навигации
     * @private
     * @param {HTMLElement} tabElement - Элемент вкладки
     */
    function handleNavClick(tabElement) {
        if (!tabElement || !tabElement.dataset.tab) {
            logger.warn("Некорректный элемент вкладки или отсутствует data-tab");
            return;
        }
        
        const tabName = tabElement.dataset.tab;
        logger.info(`Переключение на вкладку: ${tabName}`);
        
        setActiveTab(tabName);
        
        // Показываем уведомление для разделов в разработке
        if (tabName !== 'home') {
            const tabText = tabElement.querySelector('.nav-text')?.textContent || tabName;
            uiHelpers.showToast(`Раздел "${tabText}" в разработке`);
        }
    }
    
    /**
     * Устанавливает активную вкладку
     * @param {string} tabName - Имя вкладки
     */
    function setActiveTab(tabName) {
        if (!tabName) return;
        
        currentTab = tabName;
        
        // Обновляем класс активной вкладки
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.tab === currentTab);
        });
        
        // Здесь можно добавить логику для изменения содержимого в зависимости от вкладки
        
        // Вызываем событие изменения вкладки, чтобы другие модули могли реагировать
        const event = new CustomEvent('tabChanged', { detail: { tab: currentTab } });
        document.dispatchEvent(event);
    }
    
    /**
     * Возвращает текущую активную вкладку
     * @returns {string} - Имя активной вкладки
     */
    function getActiveTab() {
        return currentTab;
    }
    
    // Публичный API модуля
    return {
        init,
        setActiveTab,
        getActiveTab
    };
})();