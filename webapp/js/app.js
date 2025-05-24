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
        apiService = window.MishuraApp.utils.api;
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
        
        // Инициализация модуля сравнения
        const comparison = window.MishuraApp.features.comparison;
        if (!comparison) {
            logger.error('Модуль сравнения не найден');
            return;
        }
        comparison.init();
        
        // Настройка обработчиков событий
        setupEventHandlers();
        
        logger.info('Главный модуль приложения инициализирован');
    }
    
    function setModalMode(mode) {
        console.log(`🔧 setModalMode вызвана с режимом: ${mode}`);
        logger.debug(`Установка режима модального окна: ${mode}`);
        
        const singleMode = document.getElementById('single-analysis-mode');
        const compareMode = document.getElementById('compare-analysis-mode');
        const dialogTitle = document.getElementById('consultation-dialog-title');
        const dialogSubtitle = document.querySelector('#consultation-overlay .dialog-subtitle');
        
        console.log(`🔍 DOM элементы:`, {
            singleMode: !!singleMode, 
            compareMode: !!compareMode,
            dialogTitle: !!dialogTitle,
            dialogSubtitle: !!dialogSubtitle
        });
        
        if (mode === 'single') {
            if (singleMode) singleMode.classList.remove('hidden');
            if (compareMode) compareMode.classList.add('hidden');
            if (dialogTitle) dialogTitle.textContent = 'Получить консультацию';
            if (dialogSubtitle) dialogSubtitle.textContent = 'Загрузите фото одежды для анализа';
            console.log(`✅ Режим single установлен`);
        } else if (mode === 'compare') {
            if (singleMode) singleMode.classList.add('hidden');
            if (compareMode) compareMode.classList.remove('hidden');
            if (dialogTitle) dialogTitle.textContent = 'Сравнить образы';
            if (dialogSubtitle) dialogSubtitle.textContent = 'Загрузите от 2 до 4 фотографий для сравнения';
            console.log(`✅ Режим compare установлен`);
        }
        
        // Эмулируем событие изменения режима для совместимости
        console.log(`📡 Отправляем событие modeChanged с режимом: ${mode}`);
        document.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode: mode } }));
        console.log(`📡 Событие modeChanged отправлено`);
    }
    
    function setupEventHandlers() {
        // Обработчик для кнопки консультации
        const consultationButton = document.querySelector('.consultation-button');
        if (consultationButton) {
            consultationButton.addEventListener('click', function(e) {
                e.preventDefault();
                logger.debug('Нажата кнопка консультации');
                consultation.openConsultationModal();
                // Устанавливаем режим после небольшой задержки
                setTimeout(() => {
                    setModalMode('single');
                }, 100);
            });
        } else {
            logger.warn('Кнопка консультации не найдена');
        }
        
        // Обработчик для кнопки сравнения образов
        const compareButton = document.querySelector('.compare-button');
        if (compareButton) {
            compareButton.addEventListener('click', function(e) {
                e.preventDefault();
                logger.debug('Нажата кнопка сравнения образов');
                consultation.openConsultationModal();
                // Устанавливаем режим после небольшой задержки
                setTimeout(() => {
                    setModalMode('compare');
                }, 100);
            });
        } else {
            logger.warn('Кнопка сравнения образов не найдена');
        }
        
        // Обработчики для навигации
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.dataset.page;
                logger.debug(`Переход на страницу: ${page}`);
                
                // Скрываем все секции
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.add('hidden');
                });
                
                // Показываем выбранную секцию или главную
                const targetSection = document.getElementById(`${page}-section`);
                if (targetSection) {
                    targetSection.classList.remove('hidden');
                    logger.debug(`Секция ${page}-section отображена`);
                } else {
                    // Если секция не найдена, показываем главную
                    const homeSection = document.getElementById('home-section');
                    if (homeSection) {
                        homeSection.classList.remove('hidden');
                    }
                    logger.warn(`Секция ${page}-section не найдена`);
                }
                
                // Обновляем активный элемент навигации
                navItems.forEach(navItem => navItem.classList.remove('active'));
                this.classList.add('active');
                
                // Убеждаемся, что навигация всегда видна
                const navBar = document.querySelector('.nav-bar');
                if (navBar) {
                    navBar.style.display = 'flex';
                    navBar.style.visibility = 'visible';
                }

                // Уведомляем другие модули о смене страницы
                logger.debug(`Отправка события navigationChanged для страницы: ${page}`);
                document.dispatchEvent(new CustomEvent('navigationChanged', { 
                    detail: { page: page } 
                }));
                logger.debug(`Событие navigationChanged отправлено`);
            });
        });
    }
    
    return {
        init
    };
})();

// Убираем дублирующийся код навигации
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация приложения
    if (window.MishuraApp && window.MishuraApp.app) {
        window.MishuraApp.app.init();
        
        // Показываем страницу после инициализации
        document.body.classList.add('loaded');
    }

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
            const href = this.getAttribute('href');
            // Проверяем, что href не пустой и не равен только "#"
            if (href && href !== '#' && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}); 