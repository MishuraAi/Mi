window.MishuraApp = window.MishuraApp || {};

window.MishuraApp.app = (function() {
    'use strict';
    
    let logger;
    let uiHelpers;
    let apiService;
    let modals;
    let consultation;
    
    function init() {
        // Инициализация логгера
        logger = window.MishuraApp.utils.logger;
        logger.debug('Инициализация главного модуля приложения');
        
        // Инициализация UI хелперов
        uiHelpers = window.MishuraApp.utils.uiHelpers;
        if (!uiHelpers) {
            logger.error('UI хелперы не найдены');
            return;
        }
        uiHelpers.init();
        
        // Инициализация API сервиса
        apiService = window.MishuraApp.services.api;
        if (!apiService) {
            logger.error('API сервис не найден');
            return;
        }
        apiService.init();
        
        // Инициализация модальных окон
        modals = window.MishuraApp.components.modals;
        if (!modals) {
            logger.error('Модуль модальных окон не найден');
            return;
        }
        modals.init();
        
        // Инициализация модуля консультаций
        consultation = window.MishuraApp.features.consultation;
        if (!consultation) {
            logger.error('Модуль консультаций не найден');
            return;
        }
        consultation.init();
        
        // Настройка обработчиков событий
        setupEventHandlers();
        
        logger.info('Главный модуль приложения инициализирован');
    }
    
    function setupEventHandlers() {
        // Обработчик для кнопки консультации
        const consultationButton = document.querySelector('.consultation-button');
        if (consultationButton) {
            // Клонируем кнопку для удаления старых обработчиков
            const newButton = consultationButton.cloneNode(true);
            consultationButton.parentNode.replaceChild(newButton, consultationButton);
            
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                logger.debug('Нажата кнопка консультации');
                consultation.openConsultationModal();
            });
        } else {
            logger.warn('Кнопка консультации не найдена');
        }
        
        // Обработчики для навигации
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            // Клонируем элемент для удаления старых обработчиков
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.dataset.page;
                logger.debug(`Переход на страницу: ${page}`);
                
                // Скрываем все секции
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.add('hidden');
                });
                
                // Показываем выбранную секцию
                const targetSection = document.getElementById(`${page}-section`);
                if (targetSection) {
                    targetSection.classList.remove('hidden');
                }
                
                // Обновляем активный элемент навигации
                navItems.forEach(navItem => navItem.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
    
    // Инициализация при загрузке страницы
    document.addEventListener('DOMContentLoaded', function() {
        init();
        // Показываем страницу после инициализации
        document.body.classList.add('loaded');
    });
    
    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    // Navigation handling
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Here you can add navigation logic
            const section = item.querySelector('.nav-label').textContent.toLowerCase();
            console.log(`Navigating to: ${section}`);
        });
    });

    // Feature cards hover effect
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.classList.add('shimmer-effect');
        });
        
        card.addEventListener('mouseleave', () => {
            card.classList.remove('shimmer-effect');
        });
    });

    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}); 