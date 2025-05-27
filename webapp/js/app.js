/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Главное приложение (app.js)
ВЕРСИЯ: 1.1.0 (ИСПРАВЛЕНА ИНИЦИАЛИЗАЦИЯ)
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

        console.log('🚀 Начало инициализации приложения МИШУРА (app.js v1.1.0)');
        
        // Инициализируем модули по порядку с проверками
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
        if (logger) {
            logger.info('Главный модуль приложения (app.js) успешно инициализирован');
        } else {
            console.info('App.js: Главный модуль приложения успешно инициализирован');
        }
    }
    
    function initializeLogger() {
        try {
            // Безопасная проверка существования utils
            if (window.MishuraApp && 
                window.MishuraApp.utils && 
                window.MishuraApp.utils.logger) {
                logger = window.MishuraApp.utils.logger;
                if (typeof logger.init === 'function') {
                    logger.init();
                }
                console.log('App.js: Logger успешно инициализирован');
            } else {
                logger = console;
                console.warn('App.js: Logger не найден, используется console fallback');
            }
        } catch (error) {
            console.error('App.js: Ошибка при инициализации logger:', error);
            logger = console;
        }
    }

    function initializeConfig() {
        try {
            if (window.MishuraApp && window.MishuraApp.config) {
                if (typeof window.MishuraApp.config.init === 'function') {
                    window.MishuraApp.config.init();
                    console.log('App.js: Config инициализирован');
                }
            } else {
                console.error('App.js: Config не найден');
            }
        } catch (error) {
            console.error('App.js: Ошибка при инициализации config:', error);
        }
    }
    
    function initializeUIHelpers() {
        try {
            if (window.MishuraApp && 
                window.MishuraApp.utils && 
                window.MishuraApp.utils.uiHelpers) {
                uiHelpers = window.MishuraApp.utils.uiHelpers;
                if (typeof uiHelpers.init === 'function') {
                    uiHelpers.init();
                }
                console.log('App.js: UI Helpers инициализированы');
            } else {
                console.error('App.js: UI Helpers не найдены');
            }
        } catch (error) {
            console.error('App.js: Ошибка при инициализации UI Helpers:', error);
        }
    }
    
    function initializeAPIService() {
        try {
            if (window.MishuraApp && 
                window.MishuraApp.api && 
                window.MishuraApp.api.service) {
                apiService = window.MishuraApp.api.service;
                if (typeof apiService.init === 'function') {
                    apiService.init(window.MishuraApp.config);
                }
                console.log('App.js: API Service инициализирован');
            } else {
                console.error('App.js: API Service не найден');
            }
        } catch (error) {
            console.error('App.js: Ошибка при инициализации API Service:', error);
        }
    }
    
    function initializeModals() {
        try {
            if (window.MishuraApp && 
                window.MishuraApp.components && 
                window.MishuraApp.components.modals) {
                modals = window.MishuraApp.components.modals;
                if (typeof modals.init === 'function') {
                    modals.init();
                }
                console.log('App.js: Modals инициализированы');
            } else {
                console.error('App.js: Modals не найдены');
            }
        } catch (error) {
            console.error('App.js: Ошибка при инициализации Modals:', error);
        }
    }
    
    function initializeImageUpload() {
        try {
            if (window.MishuraApp && 
                window.MishuraApp.components && 
                window.MishuraApp.components.imageUpload) {
                imageUpload = window.MishuraApp.components.imageUpload;
                if (typeof imageUpload.init === 'function') {
                    imageUpload.init();
                }
                console.log('App.js: Image Upload инициализирован');
            } else {
                console.error('App.js: Image Upload не найден');
            }
        } catch (error) {
            console.error('App.js: Ошибка при инициализации Image Upload:', error);
        }
    }
    
    function initializeConsultation() {
        try {
            if (window.MishuraApp && 
                window.MishuraApp.features && 
                window.MishuraApp.features.consultation) {
                consultation = window.MishuraApp.features.consultation;
                if (typeof consultation.init === 'function') {
                    consultation.init();
                }
                console.log('App.js: Consultation инициализирован');
            } else {
                console.error('App.js: Consultation не найден');
            }
        } catch (error) {
            console.error('App.js: Ошибка при инициализации Consultation:', error);
        }
    }
    
    function initializeComparison() {
        try {
            if (window.MishuraApp && 
                window.MishuraApp.features && 
                window.MishuraApp.features.comparison) {
                comparison = window.MishuraApp.features.comparison;
                if (typeof comparison.init === 'function') {
                    comparison.init();
                }
                console.log('App.js: Comparison инициализирован');
            } else {
                console.error('App.js: Comparison не найден');
            }
        } catch (error) {
            console.error('App.js: Ошибка при инициализации Comparison:', error);
        }
    }
    
    function setModalMode(mode) {
        console.log(`App.js: Установка режима модального окна: ${mode}`);
        
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
        console.log(`App.js: Режим ${mode} установлен и событие отправлено`);
    }
    
    // Обработчики событий для кнопок
    function consultationButtonClickHandler(e) {
        e.preventDefault();
        console.log('App.js: Нажата кнопка консультации (single mode)');
        
        if (consultation && typeof consultation.openConsultationModal === 'function') {
            consultation.openConsultationModal();
            setTimeout(() => setModalMode('single'), 50);
        } else {
            console.error('App.js: Consultation module не найден или метод openConsultationModal недоступен');
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Ошибка: модуль консультации не загружен');
            }
        }
    }

    function compareButtonClickHandler(e) {
        e.preventDefault();
        console.log('App.js: Нажата кнопка сравнения образов (compare mode)');
        
        if (consultation && typeof consultation.openConsultationModal === 'function') {
            consultation.openConsultationModal();
            setTimeout(() => setModalMode('compare'), 50);
        } else {
            console.error('App.js: Consultation module не найден или метод openConsultationModal недоступен');
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast('Ошибка: модуль консультации не загружен');
            }
        }
    }

    function setupEventHandlers() {
        console.log('App.js: Настройка обработчиков событий');
        
        const consultationButton = document.getElementById('consultation-button');
        if (consultationButton) {
            if (!consultationButton.dataset.mishuraHandlerAttached) {
                consultationButton.addEventListener('click', consultationButtonClickHandler);
                consultationButton.dataset.mishuraHandlerAttached = 'true';
                console.log('App.js: Обработчик для кнопки консультации НАСТРОЕН');
            }
        } else {
            console.warn('App.js: Кнопка консультации (ID: consultation-button) не найдена');
        }
        
        const compareButton = document.getElementById('compare-button');
        if (compareButton) {
             if (!compareButton.dataset.mishuraHandlerAttached) {
                compareButton.addEventListener('click', compareButtonClickHandler);
                compareButton.dataset.mishuraHandlerAttached = 'true';
                console.log('App.js: Обработчик для кнопки сравнения НАСТРОЕН');
            }
        } else {
            console.warn('App.js: Кнопка сравнения образов (ID: compare-button) не найдена');
        }
    }
    
    function navItemClickHandler(e) {
        e.preventDefault();
        const page = this.dataset.page;
        console.log(`App.js: Переход на страницу: ${page}`);
        
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
            console.warn(`App.js: Секция ${page}-section не найдена, показана home-section`);
        }
        
        document.querySelectorAll('.nav-item').forEach(navItem => navItem.classList.remove('active'));
        this.classList.add('active');
        
        document.dispatchEvent(new CustomEvent('navigationChanged', { 
            detail: { page: page } 
        }));
    }

    function setupNavigation() {
        console.log('App.js: Настройка навигации');
        
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (!item.dataset.mishuraNavHandlerAttached) {
                item.addEventListener('click', navItemClickHandler);
                item.dataset.mishuraNavHandlerAttached = 'true';
            }
        });
        console.log('App.js: Навигация настроена');
    }
    
    return {
        init,
        setModalMode,
        isInitialized: () => isAppInitialized
    };
})();