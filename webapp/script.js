/*
ПРОЕКТ: МИШУРА - ИИ СТИЛИСТ
ВЕРСИЯ ДИЗАЙНА: 2.0
ФАЙЛ: script.js
НАЗНАЧЕНИЕ: Основной JS-файл с функциональностью для нового дизайна "МИШУРА"
МЕТОДОЛОГИЯ ПРАВОК: Полная замена файла для избежания ошибок при интеграции
ДАТА ОБНОВЛЕНИЯ: 2025-05-19
*/

document.addEventListener('DOMContentLoaded', function () {
    // Упрощенный логгер для отладки
    const logger = {
        info: (message, ...args) => console.log(`[INFO] МишураApp: ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[WARN] МишураApp: ${message}`, ...args),
        error: (message, ...args) => console.error(`[ERROR] МишураApp: ${message}`, ...args),
        debug: (message, ...args) => console.debug(`[DEBUG] МишураApp: ${message}`, ...args)
    };

    logger.info("DOM полностью загружен. Инициализация приложения...");

    // Элементы DOM для нового интерфейса
    const consultationButton = document.getElementById('consultation-button');
    const tryOnButton = document.getElementById('try-on-button');
    const navItems = document.querySelectorAll('.nav-item');
    const fabButton = document.querySelector('.fab');
    const menuButton = document.querySelector('.header-left');
    const searchButton = document.querySelector('.header-right');
    const headerTitle = document.querySelector('.header-title');

    // Проверка на мобильные устройства
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    initApp();

    function initApp() {
        logger.info("initApp: Старт инициализации.");
        setupEventListeners();
        logger.info("initApp: Инициализация завершена.");
    }

    function setupEventListeners() {
        logger.debug("setupEventListeners: Настройка слушателей...");

        // Основные кнопки действий
        if (consultationButton) {
            consultationButton.addEventListener('click', () => {
                logger.info("Нажата кнопка 'Получить консультацию'");
                // Здесь логика для перехода к странице консультации
                // Можно использовать либо window.location.href для перехода,
                // либо открывать модальное окно или обновлять DOM
                // Пример: window.location.href = '/webapp/consultation.html';

                // Временная реализация - сообщение в консоль
                showToast("Переход к получению консультации");
            });
        }

        if (tryOnButton) {
            tryOnButton.addEventListener('click', () => {
                logger.info("Нажата кнопка 'Примерить'");
                // Логика для примерки
                showToast("Переход к виртуальной примерке");
            });
        }

        // Нижняя навигация
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const navText = item.querySelector('.nav-text').textContent;
                logger.info(`Нажата вкладка '${navText}'`);

                // Обновляем активный класс
                navItems.forEach(navItem => navItem.classList.remove('active'));
                item.classList.add('active');

                // Логика навигации
                handleNavigation(navText);
            });
        });

        // FAB кнопка
        if (fabButton) {
            fabButton.addEventListener('click', () => {
                logger.info("Нажата плавающая кнопка (FAB)");
                // Логика быстрого действия (например, быстрая загрузка фото)
                showToast("Загрузка фотографии");
            });
        }

        // Кнопка меню
        if (menuButton) {
            menuButton.addEventListener('click', () => {
                logger.info("Нажата кнопка меню");
                // Логика открытия меню
                showToast("Открытие меню");
            });
        }

        // Кнопка поиска
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                logger.info("Нажата кнопка поиска");
                // Логика открытия поиска
                showToast("Открытие поиска");
            });
        }

        // Анимация заголовка
        if (headerTitle) {
            headerTitle.addEventListener('click', () => {
                logger.info("Нажат заголовок");
                // Логика возврата на главную
                showToast("Возврат на главную");
            });
        }

        logger.debug("setupEventListeners: Слушатели настроены.");
    }

    // Обработка навигации по табам
    function handleNavigation(tabName) {
        // В будущем здесь будет логика перехода между экранами
        // Пример: loadScreen(tabName.toLowerCase());
        showToast(`Переход в раздел: ${tabName}`);
    }

    // Простой тост для демонстрации действий
    function showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '100px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        toast.style.color = 'white';
        toast.style.padding = '10px 16px';
        toast.style.borderRadius = '20px';
        toast.style.zIndex = '9999';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease-in-out';

        document.body.appendChild(toast);

        // Показываем тост
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // Скрываем и удаляем через 2 секунды
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }

    // Добавляем обработку анимации пульсации для демонстрации состояний
    // Это временный код для презентации, его можно будет удалить в продакшн
    const demoAnimationElements = document.querySelectorAll('.demo-active-state');
    if (demoAnimationElements.length > 0) {
        demoAnimationElements.forEach(el => {
            el.addEventListener('click', () => {
                el.classList.remove('demo-active-state');
                void el.offsetWidth; // Force reflow
                el.classList.add('demo-active-state');
            });
        });
    }
});