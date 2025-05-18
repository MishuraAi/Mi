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

    // Логируем найденные элементы для отладки
    logger.debug("Найденные DOM элементы:", {
        consultationButton: !!consultationButton,
        tryOnButton: !!tryOnButton,
        navItems: navItems.length,
        fabButton: !!fabButton,
        menuButton: !!menuButton,
        searchButton: !!searchButton,
        headerTitle: !!headerTitle
    });

    initApp();

    function initApp() {
        logger.info("initApp: Старт инициализации.");

        // Удаляем встроенные обработчики событий из index.html, если они есть
        clearInlineEventListeners();

        // Устанавливаем наши обработчики событий
        setupEventListeners();

        // Инициализируем работу с неоновым курсором
        setupCursorInteractions();

        logger.info("initApp: Инициализация завершена.");
    }

    // Функция для удаления встроенных обработчиков событий
    function clearInlineEventListeners() {
        logger.debug("clearInlineEventListeners: Удаляем встроенные обработчики...");

        // Создаем клоны элементов без обработчиков событий
        if (consultationButton) {
            const newConsultationButton = consultationButton.cloneNode(true);
            consultationButton.parentNode.replaceChild(newConsultationButton, consultationButton);
            // Обновляем ссылку на элемент
            window.consultationButton = document.getElementById('consultation-button');
        }

        if (tryOnButton) {
            const newTryOnButton = tryOnButton.cloneNode(true);
            tryOnButton.parentNode.replaceChild(newTryOnButton, tryOnButton);
            // Обновляем ссылку на элемент
            window.tryOnButton = document.getElementById('try-on-button');
        }

        logger.debug("clearInlineEventListeners: Встроенные обработчики удалены.");
    }

    function setupEventListeners() {
        logger.debug("setupEventListeners: Настройка слушателей...");

        // Основные кнопки действий
        if (consultationButton) {
            logger.debug("Добавляем обработчик для кнопки 'Получить консультацию'");

            // Используем делегирование событий для более надежной работы
            consultationButton.addEventListener('click', function (event) {
                logger.info("Нажата кнопка 'Получить консультацию'");
                // Временная реализация - сообщение
                showToast("Переход к получению консультации");
                event.stopPropagation(); // Предотвращаем всплытие события
            });

            // Отключаем эффект "ghost click" на мобильных устройствах
            if (isMobile) {
                consultationButton.addEventListener('touchstart', function () {
                    logger.debug("touchstart: consultationButton");
                });
            }
        } else {
            logger.error("Кнопка 'Получить консультацию' не найдена в DOM!");
        }

        if (tryOnButton) {
            logger.debug("Добавляем обработчик для кнопки 'Примерить'");

            tryOnButton.addEventListener('click', function (event) {
                logger.info("Нажата кнопка 'Примерить'");
                // Логика для примерки
                showToast("Переход к виртуальной примерке");
                event.stopPropagation(); // Предотвращаем всплытие события
            });

            // Отключаем эффект "ghost click" на мобильных устройствах
            if (isMobile) {
                tryOnButton.addEventListener('touchstart', function () {
                    logger.debug("touchstart: tryOnButton");
                });
            }
        } else {
            logger.error("Кнопка 'Примерить' не найдена в DOM!");
        }

        // Нижняя навигация
        if (navItems && navItems.length > 0) {
            logger.debug(`Найдено ${navItems.length} элементов навигации. Добавляем обработчики.`);

            navItems.forEach(item => {
                item.addEventListener('click', function (event) {
                    const navText = item.querySelector('.nav-text')?.textContent || "Неизвестная вкладка";
                    logger.info(`Нажата вкладка '${navText}'`);

                    // Обновляем активный класс
                    navItems.forEach(navItem => navItem.classList.remove('active'));
                    item.classList.add('active');

                    // Логика навигации
                    handleNavigation(navText);
                    event.stopPropagation(); // Предотвращаем всплытие события
                });

                // Отключаем эффект "ghost click" на мобильных устройствах
                if (isMobile) {
                    item.addEventListener('touchstart', function () {
                        logger.debug("touchstart: navItem");
                    });
                }
            });
        } else {
            logger.warn("Элементы навигации не найдены или их количество равно 0!");
        }

        // FAB кнопка
        if (fabButton) {
            logger.debug("Добавляем обработчик для плавающей кнопки (FAB)");

            fabButton.addEventListener('click', function (event) {
                logger.info("Нажата плавающая кнопка (FAB)");
                // Логика быстрого действия (например, быстрая загрузка фото)
                showToast("Загрузка фотографии");
                event.stopPropagation(); // Предотвращаем всплытие события
            });

            // Отключаем эффект "ghost click" на мобильных устройствах
            if (isMobile) {
                fabButton.addEventListener('touchstart', function () {
                    logger.debug("touchstart: fabButton");
                });
            }
        } else {
            logger.error("Плавающая кнопка (FAB) не найдена в DOM!");
        }

        // Кнопка меню
        if (menuButton) {
            logger.debug("Добавляем обработчик для кнопки меню");

            menuButton.addEventListener('click', function (event) {
                logger.info("Нажата кнопка меню");
                // Логика открытия меню
                showToast("Открытие меню");
                event.stopPropagation(); // Предотвращаем всплытие события
            });

            // Отключаем эффект "ghost click" на мобильных устройствах
            if (isMobile) {
                menuButton.addEventListener('touchstart', function () {
                    logger.debug("touchstart: menuButton");
                });
            }
        } else {
            logger.error("Кнопка меню не найдена в DOM!");
        }

        // Кнопка поиска
        if (searchButton) {
            logger.debug("Добавляем обработчик для кнопки поиска");

            searchButton.addEventListener('click', function (event) {
                logger.info("Нажата кнопка поиска");
                // Логика открытия поиска
                showToast("Открытие поиска");
                event.stopPropagation(); // Предотвращаем всплытие события
            });

            // Отключаем эффект "ghost click" на мобильных устройствах
            if (isMobile) {
                searchButton.addEventListener('touchstart', function () {
                    logger.debug("touchstart: searchButton");
                });
            }
        } else {
            logger.error("Кнопка поиска не найдена в DOM!");
        }

        // Анимация заголовка
        if (headerTitle) {
            logger.debug("Добавляем обработчик для заголовка");

            headerTitle.addEventListener('click', function (event) {
                logger.info("Нажат заголовок");
                // Логика возврата на главную
                showToast("Возврат на главную");
                event.stopPropagation(); // Предотвращаем всплытие события
            });
        } else {
            logger.error("Заголовок не найден в DOM!");
        }

        // Добавляем обработчик для всего документа, чтобы отловить потерянные клики
        document.addEventListener('click', function (event) {
            const target = event.target;
            logger.debug(`Клик по элементу: ${target.tagName} ${target.className || 'без класса'}`);
        });

        logger.debug("setupEventListeners: Слушатели настроены.");
    }

    // Обработка взаимодействия с неоновым курсором
    function setupCursorInteractions() {
        // Проверяем, есть ли cursor-effect.js
        if (window.neonCursorInitialized) {
            logger.debug("setupCursorInteractions: Неоновый курсор уже инициализирован.");
            return;
        }

        // Отмечаем, что мы пытались инициализировать cursor-effect
        window.neonCursorInitialized = true;

        logger.debug("setupCursorInteractions: Настройка взаимодействия с неоновым курсором.");

        // Пытаемся найти элементы курсора
        const cursor = document.getElementById('neon-cursor');

        if (cursor) {
            logger.info("Неоновый курсор найден, настраиваем взаимодействия.");

            // Все кликабельные элементы
            const clickableElements = [
                consultationButton,
                tryOnButton,
                ...Array.from(navItems),
                fabButton,
                menuButton,
                searchButton,
                headerTitle
            ].filter(Boolean); // Фильтруем null и undefined

            // Добавляем обработчики для изменения стиля курсора
            clickableElements.forEach(element => {
                element.addEventListener('mouseover', function () {
                    cursor.style.backgroundColor = '#ff00ff'; // Пурпурный для интерактивных элементов
                    cursor.style.boxShadow = '0 0 15px #ff00ff, 0 0 30px #ff00ff';
                });

                element.addEventListener('mouseout', function () {
                    cursor.style.backgroundColor = '#00c8ff'; // Возвращаем основной цвет
                    cursor.style.boxShadow = '0 0 10px #00c8ff, 0 0 20px #00c8ff';
                });
            });
        } else {
            logger.debug("Неоновый курсор не найден в DOM, пропускаем настройку.");
        }
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