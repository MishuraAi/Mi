/* 
ИИ СТИЛИСТ - ВЕРСИЯ: 0.3.1
ФАЙЛ: cursor-effect.js
НАЗНАЧЕНИЕ: Анимация курсора для десктопной версии
ДАТА ОБНОВЛЕНИЯ: 2025-05-17
*/

document.addEventListener('DOMContentLoaded', function () {
    // Проверяем, что это десктопная версия
    if (window.innerWidth >= 768 && !isMobileDevice()) {
        // Создаем элементы для анимации курсора
        const cursorCircle = document.createElement('div');
        cursorCircle.classList.add('cursor-circle');
        document.body.appendChild(cursorCircle);

        // Создаем canvas для частиц
        const particleCanvas = document.createElement('canvas');
        particleCanvas.classList.add('particle-canvas');
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
        document.body.appendChild(particleCanvas);

        const ctx = particleCanvas.getContext('2d');

        // Массив для хранения частиц
        const particles = [];

        // Позиция курсора
        let mouseX = 0;
        let mouseY = 0;

        // Предыдущая позиция для расчета скорости
        let prevMouseX = 0;
        let prevMouseY = 0;

        // Следим за курсором
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // Обновляем позицию кружка курсора
            cursorCircle.style.left = mouseX + 'px';
            cursorCircle.style.top = mouseY + 'px';

            // Создаем новые частицы
            const velocityX = mouseX - prevMouseX;
            const velocityY = mouseY - prevMouseY;
            const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

            // Создаем частицы только если курсор двигается
            if (speed > 1) {
                const particleCount = Math.min(Math.floor(speed / 3), 5); // Ограничение на количество частиц

                for (let i = 0; i < particleCount; i++) {
                    createParticle(mouseX, mouseY, velocityX, velocityY);
                }
            }

            prevMouseX = mouseX;
            prevMouseY = mouseY;
        });

        // Изменение размера холста при изменении размера окна
        window.addEventListener('resize', () => {
            particleCanvas.width = window.innerWidth;
            particleCanvas.height = window.innerHeight;
        });

        // Функция для создания новой частицы
        function createParticle(x, y, velocityX, velocityY) {
            // Только два цвета: белый и светло-голубой
            const colors = [
                '#ffffff', // Белый
                '#00c8ff', // Светло-голубой
            ];

            const particle = {
                x: x,
                y: y,
                size: Math.random() * 3 + 1, // Немного уменьшим размер частиц
                color: colors[Math.floor(Math.random() * colors.length)],
                speedX: (Math.random() - 0.5) * 2 - velocityX * 0.1,
                speedY: (Math.random() - 0.5) * 2 - velocityY * 0.1,
                life: 100,
                maxLife: 100,
                attraction: 0.02 // Сила притяжения к курсору
            };

            particles.push(particle);
        }

        // Функция анимации
        function animate() {
            requestAnimationFrame(animate);

            // Очищаем холст
            ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

            // Обновляем и рисуем частицы
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Обновляем жизнь частицы
                p.life--;

                if (p.life <= 0) {
                    particles.splice(i, 1);
                    i--;
                    continue;
                }

                // При остановке курсора, частицы притягиваются к нему
                if (Math.abs(mouseX - prevMouseX) < 1 && Math.abs(mouseY - prevMouseY) < 1) {
                    const dx = mouseX - p.x;
                    const dy = mouseY - p.y;
                    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

                    // Притяжение к курсору
                    p.speedX += dx / distance * p.attraction;
                    p.speedY += dy / distance * p.attraction;
                }

                // Обновляем позицию
                p.x += p.speedX;
                p.y += p.speedY;

                // Трение
                p.speedX *= 0.98;
                p.speedY *= 0.98;

                // Рисуем частицу
                ctx.globalAlpha = p.life / p.maxLife;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // Запускаем анимацию
        animate();
    }

    // Проверка, является ли устройство мобильным
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
});