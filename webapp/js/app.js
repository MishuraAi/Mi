/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Главное приложение (app.js)
ВЕРСИЯ: 1.0.0 (СОЗДАН ЗАНОВО)
ДАТА ОБНОВЛЕНИЯ: 2025-05-27

НАЗНАЧЕНИЕ ФАЙЛА:
Главный файл приложения, отвечающий за инициализацию всех модулей и координацию их работы.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};

window.MishuraApp.app = (function() {
    'use strict';
    
    let logger;
    let uiHelpers;
    let apiService;
    let modals;
    let consultation;
    let comparison;
    let imageUpload;
    let isAppInitialized = false;
    
    function init() {
        if (isAppInitialized) {
            console.warn('App.js: Повторная инициализация app.js пропущена.');
            return;
        }

        console.log('🚀 Начало инициализации приложения МИШУРА (app.js v1.0.0)');
        
        // Инициализируем модули по порядку
        initializeLogger();
        initializeConfig();
        initializeUIHelpers();
        initializeAPIService();
        initializeModals();
        initializeImageUpload();
        initializeConsultation();
        initializeComparison();
        
        // Настраиваем обработчики событий
        setTimeout(() => {
            setupEventHandlers();
            setupNavigation();
        }, 100);
        
        isAppInitialized = true;
        logger.info('Главный модуль приложения (app.js) успешно инициализирован');
    }
    
    function initializeLogger() {
        if (window.MishuraApp.utils && window.MishураApp.utils.logger) {
            logger = window.MishuraApp.utils.logger;
            if (typeof logger.init === 'function' && (!logger.isInitialized || !logger.isInitialized())) {
                logger.init();
            }
        } else {
            logger = console;
            logger.warn('App.js: Logger не найден, используется console.');
        }
    }

    function initializeConfig() {
        if (window.MishuraApp.config) {
            if (typeof window.MishuraApp.config.init === 'function' && 
                (!window.MishuraApp.config.isInitialized || !window.MishuraApp.config.isInitialized())) {
                window.MishuraApp.config.init();
                if(logger) logger.debug('App.js: Config инициализирован.');
            }
        } else {
            if(logger) logger.error('App.js: Config не найден.');
        }
    }
    
    function initializeUIHelpers() {
        if (window.MishuraApp.utils && window.MishuraApp.utils.uiHelpers) {
            uiHelpers = window.MishuraApp.utils.uiHelpers;
            if (typeof uiHelpers.init === 'function' && (!uiHelpers.isInitialized || !uiHelpers.isInitialized())) {
                uiHelpers.init();
            }
            if(logger) logger.debug('App.js: UI Helpers инициализированы.');
        } else {
            if(logger) logger.error('App.js: UI Helpers не найдены.');
        }
    }
    
    function initializeAPIService() {
        if (window.MishuraApp.api && window.MishuraApp.api.service) {
            apiService = window.MishuraApp.api.service;
            if (typeof apiService.init === 'function' && (!apiService.isInitialized || !apiService.isInitialized())) {
                 apiService.init(window.MishuraApp.config);
            }
            if(logger) logger.debug('App.js: API Service инициализирован.');
        } else {
            if(logger) logger.error('App.js: API Service не найден.');
        }
    }
    
    function initializeModals() {
        if (window.MishuraApp.components && window.MishuraApp.components.modals) {
            modals = window.MishuraApp.components.modals;
            if (typeof modals.init === 'function' && (!modals.isInitialized || !modals.isInitialized())) {
                modals.init();
            }
            if(logger) logger.debug('App.js: Modals инициализированы.');
        } else {
            if(logger) logger.error('App.js: Modals не найдены.');
        }
    }
    
    function initializeImageUpload() {
        if (window.MishuraApp.components && window.MishuraApp.components.imageUpload) {
            imageUpload = window.MishuraApp.components.imageUpload;
            if (typeof imageUpload.init === 'function' && (!imageUpload.isInitialized || !imageUpload.isInitialized())) {
                imageUpload.init();
            }
            if(logger) logger.debug('App.js: Image Upload инициализирован.');
        } else {
            if(logger) logger.error('App.js: Image Upload не найден.');
        }
    }
    
    function initializeConsultation() {
        if (window.MishuraApp.features && window.MishuraApp.features.consultation) {
            consultation = window.MishuraApp.features.consultation;
            if (typeof consultation.init === 'function' && (!consultation.isInitialized || !consultation.isInitialized())) {
                consultation.init();
            }
            if(logger) logger.debug('App.js: Consultation инициализирован.');
        } else {
            if(logger) logger.error('App.js: Consultation не найден.');
        }
    }
    
    function initializeComparison() {
        if (window.MishuraApp.features && window.MishuraApp.features.comparison) {
            comparison = window.MishuraApp.features.comparison;
            if (typeof comparison.init === 'function' && (!comparison.isInitialized || !comparison.isInitialized())) {
                comparison.init();
            }
            if(logger) logger.debug('App.js: Comparison инициализирован.');
        } else {
            if(logger) logger.error('App.js: Comparison не найден.');
        }
    }
    
    function setModalMode(mode) {
        if(logger) logger.debug(`App.js: Установка режима модального окна: ${mode}`);
        
        const singleModeContainer = document.getElementById('single-analysis-mode');
        const compareModeContainer = document.getElementById('compare-analysis-mode');
        const dialogTitle = document.getElementById('consultation-dialog-title');
        const dialogSubtitle = document.querySelector('#consultation-overlay .dialog-subtitle');
        
        if (mode === 'single') {
            if (singleModeContainer) singleModeContainer.classList.remove('hidden');
            if (compareModeContainer) compareModeContainer.classList.add('hidden');
            if (dialogTitle) dialogTitle.textContent = 'Получить консультацию';
            if (dialogSubtitle) dialogSubtitle.textContent = 'Загрузите фото одежды для анализа';
        } else if (mode === 'compare') {
            if (singleModeContainer) singleModeContainer.classList.add('hidden');
            if (compareModeContainer) compareModeContainer.classList.remove('hidden');
            if (dialogTitle) dialogTitle.textContent = 'Сравнить образы';
            if (dialogSubtitle) dialogSubtitle.textContent = 'Загрузите от 2 до 4 фотографий для сравнения';
        }
        
        document.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode: mode } }));
        if(logger) logger.debug(`App.js: Режим ${mode} установлен и событие отправлено`);
    }
    
    // Обработчики событий для кнопок
    function consultationButtonClickHandler(e) {
        e.preventDefault();
        logger.debug('App.js: Нажата кнопка консультации (single mode) - ID: consultation-button');
        if (consultation && typeof consultation.openConsultationModal === 'function') {
            consultation.openConsultationModal();
            setTimeout(() => setModalMode('single'), 50);
        } else {
            logger.error('App.js: Consultation module не найден для открытия модального окна');
        }
    }

    function compareButtonClickHandler(e) {
        e.preventDefault();
        logger.debug('App.js: Нажата кнопка сравнения образов (compare mode) - ID: compare-button');
        if (consultation && typeof consultation.openConsultationModal === 'function') {
            consultation.openConsultationModal();
            setTimeout(() => setModalMode('compare'), 50);
        } else {
            logger.error('App.js: Consultation module не найден для открытия модального окна (compare)');
        }
    }

    function setupEventHandlers() {
        if(logger) logger.debug('App.js: Настройка обработчиков событий');
        
        const consultationButton = document.getElementById('consultation-button');
        if (consultationButton) {
            if (!consultationButton.dataset.mishuraHandlerAttached) {
                consultationButton.addEventListener('click', consultationButtonClickHandler);
                consultationButton.dataset.mishuraHandlerAttached = 'true';
                logger.debug('App.js: Обработчик для кнопки консультации НАСТРОЕН');
            }
        } else {
            logger.warn('App.js: Кнопка консультации (ID: consultation-button) не найдена');
        }
        
        const compareButton = document.getElementById('compare-button');
        if (compareButton) {
             if (!compareButton.dataset.mishuraHandlerAttached) {
                compareButton.addEventListener('click', compareButtonClickHandler);
                compareButton.dataset.mishuraHandlerAttached = 'true';
                logger.debug('App.js: Обработчик для кнопки сравнения НАСТРОЕН');
            }
        } else {
            logger.warn('App.js: Кнопка сравнения образов (ID: compare-button) не найдена');
        }
    }
    
    function navItemClickHandler(e) {
        e.preventDefault();
        const page = this.dataset.page;
        logger.debug(`App.js: Переход на страницу: ${page}`);
        
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        const targetSection = document.getElementById(`${page}-section`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        } else {
            const homeSection = document.getElementById('home-section');
            if (homeSection) {
                homeSection.classList.remove('hidden');
            }
            logger.warn(`App.js: Секция ${page}-section не найдена, показана home-section`);
        }
        
        document.querySelectorAll('.nav-item').forEach(navItem => navItem.classList.remove('active'));
        this.classList.add('active');
        
        const navBar = document.querySelector('.nav-bar');
        if (navBar) {
            navBar.style.display = 'flex';
            navBar.style.visibility = 'visible';
        }

        document.dispatchEvent(new CustomEvent('navigationChanged', { 
            detail: { page: page } 
        }));
    }

    function setupNavigation() {
        if(logger) logger.debug('App.js: Настройка навигации');
        
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (!item.dataset.mishuraNavHandlerAttached) {
                item.addEventListener('click', navItemClickHandler);
                item.dataset.mishuraNavHandlerAttached = 'true';
            }
        });
        if(logger) logger.debug('App.js: Навигация настроена');
    }
    
    return {
        init,
        setModalMode,
        isInitialized: () => isAppInitialized
    };
})();