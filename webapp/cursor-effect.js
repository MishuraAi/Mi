/* 
ИИ СТИЛИСТ - ВЕРСИЯ: 0.3.2
ФАЙЛ: neon-cursor.js
НАЗНАЧЕНИЕ: Анимация неонового курсора для десктопной версии
ДАТА ОБНОВЛЕНИЯ: 2025-05-17
*/

document.addEventListener('DOMContentLoaded', function () {
    // Проверка на мобильные устройства
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        return; // Прекращаем выполнение скрипта на мобильных устройствах
    }

    // Скрываем стандартный курсор
    document.body.style.cursor = 'none';

    // Создаем основной курсор
    function createCursor() {
        const cursor = document.createElement('div');
        cursor.id = 'neon-cursor';
        cursor.style.position = 'fixed';
        cursor.style.width = '8px';
        cursor.style.height = '8px';
        cursor.style.borderRadius = '50%';
        cursor.style.backgroundColor = '#00c8ff'; // Используем наш основной светло-голубой цвет
        cursor.style.boxShadow = '0 0 10px #00c8ff, 0 0 20px #00c8ff';
        cursor.style.pointerEvents = 'none';
        cursor.style.zIndex = '2147483647';
        cursor.style.transform = 'translate(-50%, -50%)';
        cursor.style.transition = 'transform 0.1s ease';
        return cursor;
    }

    // Создаем контейнер для хвоста
    function createTrailContainer() {
        const container = document.createElement('div');
        container.id = 'neon-trail';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '2147483646';
        container.style.overflow = 'hidden';
        return container;
    }

    // Инициализация курсора и хвоста
    let cursor = createCursor();
    let trailContainer = createTrailContainer();
    document.body.appendChild(cursor);
    document.body.appendChild(trailContainer);

    // Настройки хвоста
    const trailPoints = [];
    const maxTrailLength = 20;
    let lastPositions = [];
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let lastUpdate = 0;

    // Создаем элементы хвоста
    for (let i = 0; i < maxTrailLength; i++) {
        const point = document.createElement('div');
        point.className = 'neon-trail-point';
        point.style.position = 'absolute';
        point.style.width = '12px';
        point.style.height = '12px';
        point.style.borderRadius = '50%';
        // Чередуем белый и светло-голубой
        point.style.backgroundColor = i % 2 === 0 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 200, 255, 0.7)';
        point.style.pointerEvents = 'none';
        point.style.transform = 'translate(-50%, -50%)';
        point.style.opacity = '0';
        point.style.transition = 'all 0.2s ease-out';
        // Чередуем цвета теней для частиц
        point.style.boxShadow = i % 2 === 0 ? '0 0 8px rgba(255, 255, 255, 0.5)' : '0 0 8px rgba(0, 200, 255, 0.5)';
        trailContainer.appendChild(point);
        trailPoints.push(point);
    }

    // Гарантирует, что курсор находится в DOM
    function ensureCursorInDOM() {
        if (!document.body.contains(cursor)) {
            cursor = createCursor();
            document.body.appendChild(cursor);
        }
        if (!document.body.contains(trailContainer)) {
            trailContainer = createTrailContainer();
            document.body.appendChild(trailContainer);
            // Пересоздаем точки хвоста
            trailPoints.forEach(point => trailContainer.appendChild(point));
        }
    }

    // Обновление позиции курсора
    function updateCursorPosition(x, y) {
        ensureCursorInDOM();
        mouseX = x;
        mouseY = y;
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
    }

    // Анимация хвоста
    function animateTrail() {
        const now = Date.now();
        if (now - lastUpdate < 16) {
            requestAnimationFrame(animateTrail);
            return;
        }
        lastUpdate = now;

        lastPositions.unshift({ x: mouseX, y: mouseY });
        if (lastPositions.length > maxTrailLength) {
            lastPositions.pop();
        }

        trailPoints.forEach((point, i) => {
            if (i < lastPositions.length) {
                const pos = lastPositions[i];
                const progress = i / maxTrailLength;
                const size = 12 - (progress * 9);
                const opacity = 0.8 - progress * 0.7;

                point.style.left = pos.x + 'px';
                point.style.top = pos.y + 'px';
                point.style.width = `${size}px`;
                point.style.height = `${size}px`;
                point.style.opacity = opacity.toString();
            } else {
                point.style.opacity = '0';
            }
        });

        requestAnimationFrame(animateTrail);
    }

    // Обработчик движения мыши
    function handleMouseMove(e) {
        updateCursorPosition(e.clientX, e.clientY);
    }

    // Полная переинициализация
    function fullReinit() {
        // Удаляем старые элементы
        if (document.body.contains(cursor)) {
            document.body.removeChild(cursor);
        }
        if (document.body.contains(trailContainer)) {
            document.body.removeChild(trailContainer);
        }

        // Создаем новые
        cursor = createCursor();
        trailContainer = createTrailContainer();
        document.body.appendChild(cursor);
        document.body.appendChild(trailContainer);

        // Пересоздаем точки хвоста
        trailPoints.length = 0;
        for (let i = 0; i < maxTrailLength; i++) {
            const point = document.createElement('div');
            point.className = 'neon-trail-point';
            point.style.position = 'absolute';
            point.style.width = '12px';
            point.style.height = '12px';
            point.style.borderRadius = '50%';
            // Чередуем белый и светло-голубой
            point.style.backgroundColor = i % 2 === 0 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 200, 255, 0.7)';
            point.style.pointerEvents = 'none';
            point.style.transform = 'translate(-50%, -50%)';
            point.style.opacity = '0';
            point.style.transition = 'all 0.2s ease-out';
            // Чередуем цвета теней для частиц
            point.style.boxShadow = i % 2 === 0 ? '0 0 8px rgba(255, 255, 255, 0.5)' : '0 0 8px rgba(0, 200, 255, 0.5)';
            trailContainer.appendChild(point);
            trailPoints.push(point);
        }

        // Перезапускаем анимацию
        lastPositions = [];
        animateTrail();
    }

    // Отслеживание движения мыши
    document.addEventListener('mousemove', handleMouseMove);

    // Обработчик для закрытия попапов
    function handlePopupClose() {
        setTimeout(() => {
            ensureCursorInDOM();
            updateCursorPosition(mouseX, mouseY);
        }, 100);
    }

    // Мониторинг изменений DOM
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.removedNodes) {
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === 1 && (node.classList.contains('t-popup') ||
                        node.classList.contains('t-modal') ||
                        node.hasAttribute('role') && node.getAttribute('role') === 'dialog')) {
                        handlePopupClose();
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Запускаем анимацию
    animateTrail();

    // Периодическая проверка (каждые 500мс)
    setInterval(function () {
        ensureCursorInDOM();
        updateCursorPosition(mouseX, mouseY);
    }, 500);

    // Эффекты при взаимодействии
    document.addEventListener('mousedown', function () {
        cursor.style.transform = 'translate(-50%, -50%) scale(1.8)';
    });

    document.addEventListener('mouseup', function () {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    // Эффект для кликабельных элементов
    document.addEventListener('mouseover', function (e) {
        if (e.target.closest('a, button, [data-clickable], .image-slot, .mode-button, .upload-label')) {
            cursor.style.backgroundColor = '#ff00ff'; // Пурпурный для интерактивных элементов
            cursor.style.boxShadow = '0 0 15px #ff00ff, 0 0 30px #ff00ff';
        }
    });

    document.addEventListener('mouseout', function (e) {
        if (!e.relatedTarget || !e.relatedTarget.closest('a, button, [data-clickable], .image-slot, .mode-button, .upload-label')) {
            cursor.style.backgroundColor = '#00c8ff'; // Возвращаем основной цвет
            cursor.style.boxShadow = '0 0 10px #00c8ff, 0 0 20px #00c8ff';
        }
    });

    // Полная переинициализация при проблемах
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
            fullReinit();
        }
    });
});