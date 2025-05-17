/*
ПРОЕКТ: МИШУРА - ИИ СТИЛИСТ
ВЕРСИЯ ДИЗАЙНА: SereneFlow 1.0
ФАЙЛ: script.js
НАЗНАЧЕНИЕ: Клиентский JavaScript для веб-приложения "Мишура" с дизайном "SereneFlow".
МЕТОДОЛОГИЯ ПРАВОК: Файл предоставляется целиком с учетом всех изменений дизайна и интеграции эффекта курсора.
ДАТА ОБНОВЛЕНИЯ: 2025-05-17
*/

document.addEventListener('DOMContentLoaded', function () {
    // Элементы DOM
    const singleModeBtn = document.getElementById('single-mode');
    const compareModeBtn = document.getElementById('compare-mode');

    // Для одиночного режима
    const fileInputSingle = document.getElementById('file-input-single');
    const fileDropArea = document.getElementById('file-drop-area');
    const previewContainerSingle = document.getElementById('preview-container-single');

    // Контейнеры режимов
    const singleUploadContainer = document.getElementById('single-upload-container');
    const multiUploadContainer = document.getElementById('multi-upload-container');

    const analysisForm = document.getElementById('analysis-form');
    const uploadSection = document.getElementById('upload-section');
    const resultSection = document.getElementById('result-section');
    const backButton = document.getElementById('back-button');
    // const submitButton = document.getElementById('submit-button'); // Не используется напрямую, используется form submit
    const resultContent = document.getElementById('result-content');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Модальное окно
    const aboutLink = document.getElementById('about-link');
    const aboutModal = document.getElementById('about-modal');
    const closeAboutModal = document.getElementById('close-about-modal');

    // Тексты описания режимов
    const singleModeText = document.querySelector('.single-mode-text');
    const compareModeText = document.querySelector('.compare-mode-text');

    // Элементы для многослотовой загрузки
    const imageSlots = document.querySelectorAll('.image-slot'); // Получаем все слоты
    const slotInputs = document.querySelectorAll('.slot-input'); // Получаем все инпуты в слотах

    // Состояние приложения
    let currentMode = 'single'; // 'single' или 'compare'
    let selectedFileSingle = null; // Для одиночного режима теперь один файл
    let slotFiles = [null, null, null, null]; // Массив файлов для слотов в режиме сравнения

    // --- ИНТЕГРАЦИЯ ЭФФЕКТА КУРСОРА (бывший cursor-effect.js) ---
    // Настройки курсора (цвета из SereneFlow)
    const CURSOR_MAIN_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-primary').trim() || '#307A7A';
    const CURSOR_INTERACTIVE_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-secondary').trim() || '#FF8C69';
    let customCursor, trailContainer, trailPoints = [], lastPositions = [], mouseX, mouseY, lastUpdate = 0;
    const MAX_TRAIL_LENGTH_CURSOR = 15; // Уменьшил для более спокойного эффекта

    function initCustomCursor() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            return;
        }

        document.body.style.cursor = 'none';

        customCursor = createCursorElement();
        trailContainer = createTrailContainerElement();
        document.body.appendChild(customCursor);
        document.body.appendChild(trailContainer);

        for (let i = 0; i < MAX_TRAIL_LENGTH_CURSOR; i++) {
            const point = createTrailPointElement(i);
            trailContainer.appendChild(point);
            trailPoints.push(point);
        }

        mouseX = window.innerWidth / 2;
        mouseY = window.innerHeight / 2;

        document.addEventListener('mousemove', handleMouseMoveCursor);
        document.addEventListener('mousedown', handleMouseDownCursor);
        document.addEventListener('mouseup', handleMouseUpCursor);
        document.addEventListener('mouseover', handleMouseOverInteractive);
        document.addEventListener('mouseout', handleMouseOutInteractive);

        // Убрал MutationObserver и fullReinit для упрощения и если не было явных проблем
        // setInterval(ensureCursorInDOMVisual, 500); // Можно вернуть, если курсор будет пропадать
        animateTrailCursor();
    }

    function createCursorElement() {
        const el = document.createElement('div');
        el.id = 'serene-cursor'; // Новое ID
        Object.assign(el.style, {
            position: 'fixed',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: CURSOR_MAIN_COLOR,
            // boxShadow: `0 0 8px ${CURSOR_MAIN_COLOR}, 0 0 15px ${CURSOR_MAIN_COLOR}`, // Убрал тень для чистоты
            pointerEvents: 'none',
            zIndex: '2147483647',
            transform: 'translate(-50%, -50%)',
            transition: 'transform 0.1s ease-out, background-color 0.2s ease, width 0.2s ease, height 0.2s ease', // Добавил width/height
        });
        return el;
    }

    function createTrailContainerElement() {
        const el = document.createElement('div');
        el.id = 'serene-trail'; // Новое ID
        Object.assign(el.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: '2147483646', overflow: 'hidden',
        });
        return el;
    }

    function createTrailPointElement(index) {
        const el = document.createElement('div');
        el.className = 'serene-trail-point'; // Новое имя класса
        const trailColor = index % 2 === 0 ? 'rgba(255, 255, 255, 0.6)' : CURSOR_MAIN_COLOR; // Белый и основной акцентный
        Object.assign(el.style, {
            position: 'absolute',
            width: '8px', // Уменьшил
            height: '8px', // Уменьшил
            borderRadius: '50%',
            backgroundColor: trailColor,
            opacity: '0',
            transform: 'translate(-50%, -50%)',
            transition: 'opacity 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out', // Плавнее
            // boxShadow: `0 0 5px ${trailColor}` // Тень для точек хвоста тоже можно убрать для чистоты
        });
        return el;
    }

    // function ensureCursorInDOMVisual() { // Если понадобится
    //     if (customCursor && !document.body.contains(customCursor)) document.body.appendChild(customCursor);
    //     if (trailContainer && !document.body.contains(trailContainer)) document.body.appendChild(trailContainer);
    // }

    function updateCursorPositionVisual(x, y) {
        // ensureCursorInDOMVisual(); // Если курсор пропадает
        mouseX = x;
        mouseY = y;
        if (customCursor) {
            customCursor.style.left = x + 'px';
            customCursor.style.top = y + 'px';
        }
    }

    function animateTrailCursor() {
        const now = Date.now();
        if (now - lastUpdate < 20) { // Немного увеличил интервал для плавности
            requestAnimationFrame(animateTrailCursor);
            return;
        }
        lastUpdate = now;

        lastPositions.unshift({ x: mouseX, y: mouseY });
        if (lastPositions.length > MAX_TRAIL_LENGTH_CURSOR) {
            lastPositions.pop();
        }

        trailPoints.forEach((point, i) => {
            if (i < lastPositions.length) {
                const pos = lastPositions[i];
                const progress = i / MAX_TRAIL_LENGTH_CURSOR;
                const size = 8 - (progress * 6); // Меньше и меньше меняется
                const opacity = 0.6 - progress * 0.5; // Меньше изначальная прозрачность

                point.style.left = pos.x + 'px';
                point.style.top = pos.y + 'px';
                point.style.width = `${size}px`;
                point.style.height = `${size}px`;
                point.style.opacity = opacity.toString();
            } else {
                point.style.opacity = '0';
            }
        });
        requestAnimationFrame(animateTrailCursor);
    }

    function handleMouseMoveCursor(e) {
        updateCursorPositionVisual(e.clientX, e.clientY);
    }

    function handleMouseDownCursor() {
        if (customCursor) customCursor.style.transform = 'translate(-50%, -50%) scale(1.5)'; // Меньше увеличение
    }

    function handleMouseUpCursor() {
        if (customCursor) customCursor.style.transform = 'translate(-50%, -50%) scale(1)';
    }

    function handleMouseOverInteractive(e) {
        if (customCursor && e.target.closest('a, button, select, textarea, input[type="file"], .upload-label, .upload-label-slot, .image-slot, .mode-button, .remove-image, .remove-preview-single, .close-modal')) {
            customCursor.style.backgroundColor = CURSOR_INTERACTIVE_COLOR;
            // customCursor.style.boxShadow = `0 0 10px ${CURSOR_INTERACTIVE_COLOR}, 0 0 20px ${CURSOR_INTERACTIVE_COLOR}`;
            customCursor.style.width = '14px'; // Увеличиваем курсор
            customCursor.style.height = '14px';
        }
    }

    function handleMouseOutInteractive(e) {
        if (customCursor && e.target.closest('a, button, select, textarea, input[type="file"], .upload-label, .upload-label-slot, .image-slot, .mode-button, .remove-image, .remove-preview-single, .close-modal')) {
            // Проверяем, не перешли ли на другой интерактивный элемент внутри этого же
            if (!e.relatedTarget || !e.relatedTarget.closest('a, button, select, textarea, input[type="file"], .upload-label, .upload-label-slot, .image-slot, .mode-button, .remove-image, .remove-preview-single, .close-modal')) {
                customCursor.style.backgroundColor = CURSOR_MAIN_COLOR;
                // customCursor.style.boxShadow = `0 0 8px ${CURSOR_MAIN_COLOR}, 0 0 15px ${CURSOR_MAIN_COLOR}`;
                customCursor.style.width = '10px';
                customCursor.style.height = '10px';
            }
        }
    }
    // --- КОНЕЦ ИНТЕГРАЦИИ ЭФФЕКТА КУРСОРА ---


    // Инициализация
    initApp();

    function initApp() {
        setupEventListeners();
        switchMode(currentMode); // Устанавливаем начальный режим
        initCustomCursor(); // Инициализация кастомного курсора
        // adaptForScreenSize(); // Не требуется, CSS обрабатывает
        // addTouchEffects(); // Пока убрал, т.к. glow-эффекты ушли
    }

    function setupEventListeners() {
        singleModeBtn.addEventListener('click', () => switchMode('single'));
        compareModeBtn.addEventListener('click', () => switchMode('compare'));

        // Одиночный режим
        fileInputSingle.addEventListener('change', handleFileSelectSingle);
        fileDropArea.addEventListener('click', () => fileInputSingle.click()); // Клик по области открывает инпут
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, () => fileDropArea.classList.add('drag-over'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, () => fileDropArea.classList.remove('drag-over'), false);
        });
        fileDropArea.addEventListener('drop', handleDropSingle, false);

        // Множественный режим (слоты)
        imageSlots.forEach((slot) => {
            const input = slot.querySelector('.slot-input');
            const removeBtn = slot.querySelector('.remove-image');

            slot.addEventListener('click', (e) => {
                // Клик по слоту триггерит инпут, если нет картинки или если клик не по кнопке удаления
                if (!slot.classList.contains('has-image') && e.target !== removeBtn && !removeBtn.contains(e.target)) {
                    input.click();
                }
            });

            input.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const slotIndex = parseInt(e.target.dataset.slotIndex, 10);
                    handleSlotFileSelect(slotIndex, e.target.files[0]);
                }
            });

            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const slotIndex = parseInt(input.dataset.slotIndex, 10);
                removeSlotFile(slotIndex);
            });

            // Drag and drop для слотов
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                slot.addEventListener(eventName, preventDefaults, false);
                slot.addEventListener(eventName, (e) => e.stopPropagation(), false); // Остановка всплытия, чтобы не триггерить drop-зону одиночного режима
            });
            ['dragenter', 'dragover'].forEach(eventName => {
                slot.addEventListener(eventName, () => slot.classList.add('drag-over'), false);
            });
            ['dragleave', 'drop'].forEach(eventName => {
                slot.addEventListener(eventName, () => slot.classList.remove('drag-over'), false);
            });
            slot.addEventListener('drop', (e) => {
                if (e.dataTransfer.files.length > 0) {
                    const slotIndex = parseInt(input.dataset.slotIndex, 10);
                    handleSlotFileSelect(slotIndex, e.dataTransfer.files[0]);
                }
            }, false);
        });


        analysisForm.addEventListener('submit', handleFormSubmit);
        backButton.addEventListener('click', resetToUploadView);

        aboutLink.addEventListener('click', e => {
            e.preventDefault();
            aboutModal.classList.remove('hidden');
        });
        closeAboutModal.addEventListener('click', () => {
            aboutModal.classList.add('hidden');
        });
        aboutModal.addEventListener('click', e => {
            if (e.target === aboutModal) {
                aboutModal.classList.add('hidden');
            }
        });
    }

    function switchMode(mode) {
        currentMode = mode;
        selectedFileSingle = null; // Сброс при смене режима
        slotFiles = [null, null, null, null]; // Сброс слотов

        if (mode === 'single') {
            singleModeBtn.classList.add('active');
            compareModeBtn.classList.remove('active');
            singleModeText.style.display = 'block';
            compareModeText.style.display = 'none';
            singleUploadContainer.classList.remove('hidden');
            multiUploadContainer.classList.add('hidden');
        } else { // compare mode
            singleModeBtn.classList.remove('active');
            compareModeBtn.classList.add('active');
            singleModeText.style.display = 'none';
            compareModeText.style.display = 'block';
            singleUploadContainer.classList.add('hidden');
            multiUploadContainer.classList.remove('hidden');
        }
        updateFilePreviewSingle();
        updateAllSlotPreviews();
        console.log("Режим изменен на:", mode);
    }

    // --- Одиночный режим ---
    function handleFileSelectSingle(e) {
        const file = e.target.files[0];
        if (file) {
            selectedFileSingle = file;
            updateFilePreviewSingle();
        }
    }

    function handleDropSingle(e) {
        const file = e.dataTransfer.files[0];
        if (file) {
            selectedFileSingle = file;
            updateFilePreviewSingle();
        }
    }

    function updateFilePreviewSingle() {
        previewContainerSingle.innerHTML = ''; // Очищаем предыдущее превью
        if (selectedFileSingle) {
            fileDropArea.classList.add('hidden');
            previewContainerSingle.classList.remove('hidden');

            const reader = new FileReader();
            reader.onload = function (e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item-single';

                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image-single';
                img.alt = selectedFileSingle.name;

                const removeBtn = document.createElement('div');
                removeBtn.className = 'remove-preview-single';
                removeBtn.innerHTML = '✕';
                removeBtn.title = 'Удалить изображение';
                removeBtn.addEventListener('click', () => {
                    selectedFileSingle = null;
                    fileInputSingle.value = ''; // Сброс значения инпута
                    updateFilePreviewSingle();
                });

                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                previewContainerSingle.appendChild(previewItem);
            };
            reader.readAsDataURL(selectedFileSingle);
        } else {
            fileDropArea.classList.remove('hidden');
            previewContainerSingle.classList.add('hidden');
        }
    }

    // --- Множественный режим (слоты) ---
    function handleSlotFileSelect(slotIndex, file) {
        slotFiles[slotIndex] = file;
        updateSlotPreview(slotIndex);
    }

    function updateSlotPreview(slotIndex) {
        const slot = imageSlots[slotIndex];
        const file = slotFiles[slotIndex];
        const previewImgEl = slot.querySelector('.preview-image-slot');
        const removeBtnEl = slot.querySelector('.remove-image');

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImgEl.src = e.target.result;
                previewImgEl.classList.remove('hidden');
                slot.classList.add('has-image');
                removeBtnEl.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            previewImgEl.src = '#'; // Сброс src
            previewImgEl.classList.add('hidden');
            slot.classList.remove('has-image');
            removeBtnEl.classList.add('hidden');
            // Очищаем также сам file input, чтобы не было "фантомных" файлов
            const inputEl = slot.querySelector('.slot-input');
            if (inputEl) inputEl.value = '';
        }
    }

    function updateAllSlotPreviews() {
        slotFiles.forEach((file, index) => updateSlotPreview(index));
    }

    function removeSlotFile(slotIndex) {
        slotFiles[slotIndex] = null;
        updateSlotPreview(slotIndex);
    }

    // --- Отправка формы и результаты ---
    function handleFormSubmit(e) {
        e.preventDefault();
        let filesToUpload = [];
        let endpoint = '';

        if (currentMode === 'single') {
            if (!selectedFileSingle) {
                alert('Пожалуйста, загрузите изображение для анализа.');
                return;
            }
            filesToUpload.push(selectedFileSingle);
            endpoint = '/analyze-outfit';
        } else { // compare mode
            filesToUpload = slotFiles.filter(file => file !== null);
            if (filesToUpload.length < 2) {
                alert('Пожалуйста, загрузите минимум 2 изображения для сравнения.');
                return;
            }
            endpoint = '/compare-outfits';
        }

        const occasion = document.getElementById('occasion').value;
        if (!occasion) {
            alert('Пожалуйста, выберите повод.');
            return;
        }

        uploadSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        loadingIndicator.classList.remove('hidden');
        resultContent.innerHTML = ''; // Очищаем предыдущие результаты

        const formData = new FormData();
        formData.append('occasion', occasion);
        const preferences = document.getElementById('preferences').value;
        if (preferences) {
            formData.append('preferences', preferences);
        }

        if (currentMode === 'single') {
            formData.append('image', filesToUpload[0]);
        } else {
            filesToUpload.forEach(file => formData.append('images', file));
        }

        fetch(endpoint, {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    // Попытка прочитать ошибку как JSON, если это возможно
                    return response.json().then(errData => {
                        throw new Error(errData.message || `Ошибка сервера: ${response.status}`);
                    }).catch(() => {
                        // Если тело ответа не JSON или пустое
                        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                loadingIndicator.classList.add('hidden');
                if (data.status === 'success' && data.advice) {
                    resultContent.innerHTML = markdownToHtml(data.advice);
                } else {
                    resultContent.innerHTML = `<div class="error-message"><h3>Произошла ошибка</h3><p>${data.message || 'Не удалось получить анализ. Пожалуйста, попробуйте снова.'}</p></div>`;
                }
            })
            .catch(error => {
                loadingIndicator.classList.add('hidden');
                resultContent.innerHTML = `<div class="error-message"><h3>Ошибка</h3><p>${error.message || 'Не удалось отправить запрос. Проверьте подключение и попробуйте снова.'}</p></div>`;
                console.error('Error:', error);
            });
    }

    function resetToUploadView() {
        uploadSection.classList.remove('hidden');
        resultSection.classList.add('hidden');
        // Сбрасываем форму и файлы не здесь, а при переключении режима или успешной отправке, если нужно
        // Это позволяет пользователю вернуться и посмотреть, что он отправлял.
        // Если нужен полный сброс:
        // analysisForm.reset();
        // selectedFileSingle = null;
        // slotFiles = [null, null, null, null];
        // updateFilePreviewSingle();
        // updateAllSlotPreviews();
    }

    // --- Вспомогательные функции ---
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function markdownToHtml(markdown) {
        if (!markdown) return '';
        let html = markdown;
        // Заголовки (убедимся, что # в начале строки)
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        // Жирный текст
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
        // Курсив
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');
        // Списки (улучшенная обработка)
        html = html.replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>');
        // Оборачиваем группы <li> в <ul>
        html = html.replace(/<\/li>\s*<li>/g, '</li><li>'); // Убираем пробелы между li
        let inList = false;
        const lines = html.split('\n');
        html = lines.map(line => {
            if (line.trim().startsWith('<li>')) {
                if (!inList) {
                    inList = true;
                    return '<ul>' + line;
                }
                return line;
            } else if (inList && line.trim() !== '') { // Если строка не пустая и мы были в списке
                inList = false;
                return '</ul>' + line;
            } else if (inList && line.trim() === '') { // Пустая строка внутри списка
                return line; // Просто пропускаем ее или можно добавить <br>
            }
            return line;
        }).join('\n');
        if (inList) { // Если последний элемент был списком
            html += '</ul>';
        }
        // Параграфы (обрабатываем оставшиеся строки, не являющиеся частью тегов)
        // Пропускаем строки, уже содержащие HTML теги или пустые
        html = html.split('\n').map(line => {
            const trimmedLine = line.trim();
            if (trimmedLine === '' || trimmedLine.match(/^<\/?(ul|li|h[1-6]|strong|em|p|br)/)) {
                return line; // Оставляем как есть
            }
            return '<p>' + line + '</p>'; // Оборачиваем в <p>
        }).join('\n').replace(/<\/p>\n<p>/g, '</p><p>'); // Убираем лишние переносы между параграфами
        // Убираем теги <p> вокруг <ul>
        html = html.replace(/<p><ul>/g, '<ul>').replace(/<\/ul><\/p>/g, '</ul>');

        return html.replace(/\n/g, '<br>'); // Заменяем оставшиеся переносы строк на <br>
    }
});