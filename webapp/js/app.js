/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Главное приложение (app.js)
ВЕРСИЯ: 0.5.1 (Исправлены обработчики событий)
ДАТА ОБНОВЛЕНИЯ: 2025-05-26

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
            console.warn('App уже инициализирован, пропускаем повторную инициализацию');
            return;
        }

        console.log('🚀 Начало инициализации приложения МИШУРА');
        
        // Инициализация базовых модулей в правильном порядке
        initializeLogger();
        initializeUIHelpers();
        initializeAPIService();
        initializeModals();
        initializeImageUpload();
        initializeConsultation();
        initializeComparison();
        
        // Настройка обработчиков событий ПОСЛЕ инициализации всех модулей
        setTimeout(() => {
            setupEventHandlers();
            setupNavigation();
        }, 100);
        
        isAppInitialized = true;
        logger.info('Главный модуль приложения успешно инициализирован');
    }
    
    function initializeLogger() {
        if (window.MishuraApp.utils && window.MishuraApp.utils.logger) {
            logger = window.MishuraApp.utils.logger;
            if (typeof logger.init === 'function') {
                logger.init();
            }
        } else {
            logger = console;
            console.warn('Logger не найден, используется console');
        }
    }
    
    function initializeUIHelpers() {
        if (window.MishuraApp.utils && window.MishuraApp.utils.uiHelpers) {
            uiHelpers = window.MishuraApp.utils.uiHelpers;
            if (typeof uiHelpers.init === 'function') {
                uiHelpers.init();
            }
            logger.debug('UI Helpers инициализированы');
        } else {
            logger.error('UI Helpers не найдены');
        }
    }
    
    function initializeAPIService() {
        if (window.MishuraApp.utils && window.MishuraApp.utils.api) {
            apiService = window.MishuraApp.utils.api;
            if (typeof apiService.init === 'function') {
                apiService.init();
            }
            logger.debug('API Service инициализирован');
        } else {
            logger.error('API Service не найден');
        }
    }
    
    function initializeModals() {
        if (window.MishuraApp.components && window.MishuraApp.components.modals) {
            modals = window.MishuraApp.components.modals;
            if (typeof modals.init === 'function') {
                modals.init();
            }
            logger.debug('Modals инициализированы');
        } else {
            logger.error('Modals не найдены');
        }
    }
    
    function initializeImageUpload() {
        if (window.MishuraApp.components && window.MishuraApp.components.imageUpload) {
            imageUpload = window.MishuraApp.components.imageUpload;
            if (typeof imageUpload.init === 'function') {
                imageUpload.init();
            }
            logger.debug('Image Upload инициализирован');
        } else {
            logger.error('Image Upload не найден');
        }
    }
    
    function initializeConsultation() {
        if (window.MishuraApp.features && window.MishuraApp.features.consultation) {
            consultation = window.MishuraApp.features.consultation;
            if (typeof consultation.init === 'function') {
                consultation.init();
            }
            logger.debug('Consultation инициализирован');
        } else {
            logger.error('Consultation не найден');
        }
    }
    
    function initializeComparison() {
        if (window.MishuraApp.features && window.MishuraApp.features.comparison) {
            comparison = window.MishuraApp.features.comparison;
            if (typeof comparison.init === 'function') {
                comparison.init();
            }
            logger.debug('Comparison инициализирован');
        } else {
            logger.error('Comparison не найден');
        }
    }
    
    function setModalMode(mode) {
        logger.debug(`Установка режима модального окна: ${mode}`);
        
        const singleMode = document.getElementById('single-analysis-mode');
        const compareMode = document.getElementById('compare-analysis-mode');
        const dialogTitle = document.getElementById('consultation-dialog-title');
        const dialogSubtitle = document.querySelector('#consultation-overlay .dialog-subtitle');
        
        if (mode === 'single') {
            if (singleMode) singleMode.classList.remove('hidden');
            if (compareMode) compareMode.classList.add('hidden');
            if (dialogTitle) dialogTitle.textContent = 'Получить консультацию';
            if (dialogSubtitle) dialogSubtitle.textContent = 'Загрузите фото одежды для анализа';
        } else if (mode === 'compare') {
            if (singleMode) singleMode.classList.add('hidden');
            if (compareMode) compareMode.classList.remove('hidden');
            if (dialogTitle) dialogTitle.textContent = 'Сравнить образы';
            if (dialogSubtitle) dialogSubtitle.textContent = 'Загрузите от 2 до 4 фотографий для сравнения';
        }
        
        // Отправляем событие для других модулей
        document.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode: mode } }));
        logger.debug(`Режим ${mode} установлен и событие отправлено`);
    }
    
    function setupEventHandlers() {
        logger.debug('Настройка обработчиков событий');
        
        // Обработчик для кнопки консультации (режим single)
        const consultationButton = document.getElementById('consultation-button');
        if (consultationButton) {
            consultationButton.addEventListener('click', function(e) {
                e.preventDefault();
                logger.debug('Нажата кнопка консультации (single mode)');
                if (consultation && typeof consultation.openConsultationModal === 'function') {
                    consultation.openConsultationModal();
                    // Устанавливаем режим single с небольшой задержкой
                    setTimeout(() => setModalMode('single'), 50);
                } else {
                    logger.error('Consultation module не найден');
                }
            });
            
            logger.debug('Обработчик для кнопки консультации настроен');
        } else {
            logger.warn('Кнопка консультации не найдена по ID');
        }
        
        // Обработчик для кнопки сравнения образов (режим compare)
        const compareButton = document.getElementById('compare-button');
        if (compareButton) {
            compareButton.addEventListener('click', function(e) {
                e.preventDefault();
                logger.debug('Нажата кнопка сравнения образов (compare mode)');
                if (consultation && typeof consultation.openConsultationModal === 'function') {
                    consultation.openConsultationModal();
                    // Устанавливаем режим compare с небольшой задержкой
                    setTimeout(() => setModalMode('compare'), 50);
                } else {
                    logger.error('Consultation module не найден');
                }
            });
            
            logger.debug('Обработчик для кнопки сравнения настроен');
        } else {
            logger.warn('Кнопка сравнения образов не найдена по ID');
        }
    }
    
    function setupNavigation() {
        logger.debug('Настройка навигации');
        
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
                
                // Показываем выбранную секцию
                const targetSection = document.getElementById(`${page}-section`);
                if (targetSection) {
                    targetSection.classList.remove('hidden');
                } else {
                    // Если секция не найдена, показываем главную
                    const homeSection = document.getElementById('home-section');
                    if (homeSection) {
                        homeSection.classList.remove('hidden');
                    }
                    logger.warn(`Секция ${page}-section не найдена`);
                }
                
                // Обновляем активный элемент навигации
                document.querySelectorAll('.nav-item').forEach(navItem => navItem.classList.remove('active'));
                this.classList.add('active');
                
                // Убеждаемся, что навигация видна
                const navBar = document.querySelector('.nav-bar');
                if (navBar) {
                    navBar.style.display = 'flex';
                    navBar.style.visibility = 'visible';
                }

                // Уведомляем другие модули о смене страницы
                document.dispatchEvent(new CustomEvent('navigationChanged', { 
                    detail: { page: page } 
                }));
            });
        });
        
        logger.debug('Навигация настроена');
    }
    
    return {
        init,
        setModalMode
    };
})();