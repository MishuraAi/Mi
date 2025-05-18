/*
ПРОЕКТ: МИШУРА - ИИ СТИЛИСТ
ВЕРСИЯ ДИЗАЙНА: SereneFlow 1.0.2-hotfix-single
ФАЙЛ: script.js
НАЗНАЧЕНИЕ: Исправление проблемы с повторным выбором файла в одиночном режиме.
МЕТОДОЛОГИЯ ПРАВОК: Файл предоставляется целиком. Добавлен сброс input.value после обработки выбора файла.
ДАТА ОБНОВЛЕНИЯ: 2025-05-18
*/

document.addEventListener('DOMContentLoaded', function () {
    // Упрощенный логгер для клиента
    const logger = {
        info: (message, ...args) => console.log(`[INFO] МишураApp: ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[WARN] МишураApp: ${message}`, ...args),
        error: (message, ...args) => console.error(`[ERROR] МишураApp: ${message}`, ...args),
        debug: (message, ...args) => console.debug(`[DEBUG] МишураApp: ${message}`, ...args)
    };

    logger.info("DOM полностью загружен. Инициализация приложения...");

    // Элементы DOM
    const singleModeBtn = document.getElementById('single-mode');
    const compareModeBtn = document.getElementById('compare-mode');

    const fileInputSingle = document.getElementById('file-input-single');
    const fileDropArea = document.getElementById('file-drop-area');
    const previewContainerSingle = document.getElementById('preview-container-single');

    const singleUploadContainer = document.getElementById('single-upload-container');
    const multiUploadContainer = document.getElementById('multi-upload-container');

    const analysisForm = document.getElementById('analysis-form');
    const uploadSection = document.getElementById('upload-section');
    const resultSection = document.getElementById('result-section');
    const backButton = document.getElementById('back-button');
    const resultContent = document.getElementById('result-content');
    const loadingIndicator = document.getElementById('loading-indicator');

    const aboutLink = document.getElementById('about-link');
    const aboutModal = document.getElementById('about-modal');
    const closeAboutModal = document.getElementById('close-about-modal');

    const singleModeText = document.querySelector('.single-mode-text');
    const compareModeText = document.querySelector('.compare-mode-text');

    const imageSlots = document.querySelectorAll('.image-slot');

    let currentMode = 'single';
    let selectedFileSingle = null;
    let slotFiles = [null, null, null, null];

    // --- Кастомный курсор (полный код из предыдущей рабочей версии SereneFlow 1.0) ---
    const CURSOR_MAIN_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-primary').trim() || '#307A7A';
    const CURSOR_INTERACTIVE_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-secondary').trim() || '#FF8C69';
    let customCursor, trailContainer, trailPoints = [], lastPositions = [], mouseX, mouseY, lastUpdate = 0;
    const MAX_TRAIL_LENGTH_CURSOR = 15;

    function initCustomCursor() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile || customCursor) { // Не инициализировать повторно, если уже есть
            if (isMobile) document.body.style.cursor = 'auto'; // Вернуть обычный курсор на мобильных
            return;
        }
        logger.debug("Инициализация кастомного курсора...");
        document.body.style.cursor = 'none';
        customCursor = createCursorElement();
        trailContainer = createTrailContainerElement();
        document.body.appendChild(customCursor);
        document.body.appendChild(trailContainer);
        trailPoints = []; // Очищаем перед заполнением
        for (let i = 0; i < MAX_TRAIL_LENGTH_CURSOR; i++) {
            const point = createTrailPointElement(i);
            trailContainer.appendChild(point);
            trailPoints.push(point);
        }
        mouseX = window.innerWidth / 2;
        mouseY = window.innerHeight / 2;
        updateCursorPositionVisual(mouseX, mouseY); // Установить начальную позицию

        document.removeEventListener('mousemove', handleMouseMoveCursor); // Убрать старые, если были
        document.addEventListener('mousemove', handleMouseMoveCursor);
        document.removeEventListener('mousedown', handleMouseDownCursor);
        document.addEventListener('mousedown', handleMouseDownCursor);
        document.removeEventListener('mouseup', handleMouseUpCursor);
        document.addEventListener('mouseup', handleMouseUpCursor);
        document.removeEventListener('mouseover', handleMouseOverInteractive);
        document.addEventListener('mouseover', handleMouseOverInteractive);
        document.removeEventListener('mouseout', handleMouseOutInteractive);
        document.addEventListener('mouseout', handleMouseOutInteractive);

        if (animateTrailCursor._animationFrameId) { // Отменить предыдущую анимацию, если есть
            cancelAnimationFrame(animateTrailCursor._animationFrameId);
        }
        animateTrailCursor();
    }
    function createCursorElement() {
        const el = document.createElement('div');
        el.id = 'serene-cursor';
        Object.assign(el.style, {
            position: 'fixed', width: '10px', height: '10px', borderRadius: '50%',
            backgroundColor: CURSOR_MAIN_COLOR, pointerEvents: 'none', zIndex: '2147483647',
            transform: 'translate(-50%, -50%)',
            transition: 'transform 0.1s ease-out, background-color 0.2s ease, width 0.2s ease, height 0.2s ease',
        });
        return el;
    }
    function createTrailContainerElement() {
        const el = document.createElement('div');
        el.id = 'serene-trail';
        Object.assign(el.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: '2147483646', overflow: 'hidden',
        });
        return el;
    }
    function createTrailPointElement(index) {
        const el = document.createElement('div');
        el.className = 'serene-trail-point';
        const trailColor = index % 2 === 0 ? 'rgba(255, 255, 255, 0.6)' : CURSOR_MAIN_COLOR;
        Object.assign(el.style, {
            position: 'absolute', width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: trailColor, opacity: '0', transform: 'translate(-50%, -50%)',
            transition: 'opacity 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out',
        });
        return el;
    }
    function updateCursorPositionVisual(x, y) {
        mouseX = x; mouseY = y;
        if (customCursor) { customCursor.style.left = x + 'px'; customCursor.style.top = y + 'px'; }
    }
    function animateTrailCursor() {
        const now = Date.now();
        if (now - lastUpdate < 20) {
            animateTrailCursor._animationFrameId = requestAnimationFrame(animateTrailCursor); return;
        }
        lastUpdate = now;
        lastPositions.unshift({ x: mouseX, y: mouseY });
        if (lastPositions.length > MAX_TRAIL_LENGTH_CURSOR) lastPositions.pop();
        trailPoints.forEach((point, i) => {
            if (i < lastPositions.length) {
                const pos = lastPositions[i]; const progress = i / MAX_TRAIL_LENGTH_CURSOR;
                const size = 8 - (progress * 6); const opacity = 0.6 - progress * 0.5;
                Object.assign(point.style, {
                    left: `${pos.x}px`, top: `${pos.y}px`, width: `${size}px`,
                    height: `${size}px`, opacity: opacity.toString()
                });
            } else { point.style.opacity = '0'; }
        });
        animateTrailCursor._animationFrameId = requestAnimationFrame(animateTrailCursor);
    }
    animateTrailCursor._animationFrameId = null; // Для хранения ID requestAnimationFrame
    function handleMouseMoveCursor(e) { updateCursorPositionVisual(e.clientX, e.clientY); }
    function handleMouseDownCursor() { if (customCursor) customCursor.style.transform = 'translate(-50%, -50%) scale(1.5)'; }
    function handleMouseUpCursor() { if (customCursor) customCursor.style.transform = 'translate(-50%, -50%) scale(1)'; }
    const interactiveSelector = 'a, button, select, textarea, input[type="file"], .upload-label, .upload-label-slot, .image-slot, .mode-button, .remove-image, .remove-preview-single, .close-modal';
    function handleMouseOverInteractive(e) {
        if (customCursor && e.target.closest(interactiveSelector)) {
            Object.assign(customCursor.style, { backgroundColor: CURSOR_INTERACTIVE_COLOR, width: '14px', height: '14px' });
        }
    }
    function handleMouseOutInteractive(e) {
        if (customCursor && e.target.closest(interactiveSelector)) {
            if (!e.relatedTarget || !e.relatedTarget.closest(interactiveSelector)) {
                Object.assign(customCursor.style, { backgroundColor: CURSOR_MAIN_COLOR, width: '10px', height: '10px' });
            }
        }
    }
    // --- Конец кода кастомного курсора ---

    initApp();

    function initApp() {
        logger.info("initApp: Старт инициализации.");
        setupEventListeners();
        switchMode(currentMode);
        initCustomCursor();
        logger.info("initApp: Инициализация завершена.");
    }

    function setupEventListeners() {
        logger.debug("setupEventListeners: Настройка слушателей...");
        singleModeBtn.addEventListener('click', () => switchMode('single'));
        compareModeBtn.addEventListener('click', () => switchMode('compare'));

        fileInputSingle.addEventListener('change', handleFileSelectSingle);
        // Клик по drop-зоне также должен триггерить fileInputSingle
        fileDropArea.addEventListener('click', (e) => {
            // Предотвращаем двойное открытие, если клик был по label внутри fileDropArea
            if (e.target === fileDropArea || e.target.classList.contains('upload-icon') || e.target.classList.contains('upload-text')) {
                logger.debug("Клик по fileDropArea, триггер fileInputSingle.click()");
                fileInputSingle.click();
            }
        });

        // Drag and Drop для одиночного режима (оставляем, но проблема не в нем, похоже)
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


        imageSlots.forEach((slot) => {
            const input = slot.querySelector('.slot-input');
            const removeBtn = slot.querySelector('.remove-image');
            const slotIndex = parseInt(slot.dataset.slotId, 10);

            slot.addEventListener('click', (e) => {
                if (!slot.classList.contains('has-image') && e.target !== removeBtn && !removeBtn.contains(e.target)) {
                    input.click();
                }
            });
            input.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    handleSlotFileSelect(slotIndex, e.target.files[0]);
                    e.target.value = null; // *** ИСПРАВЛЕНИЕ для слотов, аналогично одиночному ***
                }
            });
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeSlotFile(slotIndex);
            });
            // Drag-n-drop для слотов
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                slot.addEventListener(eventName, preventDefaults, false);
                slot.addEventListener(eventName, (ev) => ev.stopPropagation(), false);
            });
            ['dragenter', 'dragover'].forEach(eventName => { slot.addEventListener(eventName, () => slot.classList.add('drag-over'), false); });
            ['dragleave', 'drop'].forEach(eventName => { slot.addEventListener(eventName, () => slot.classList.remove('drag-over'), false); });
            slot.addEventListener('drop', (e) => {
                if (e.dataTransfer.files.length > 0) {
                    handleSlotFileSelect(slotIndex, e.dataTransfer.files[0]);
                    e.target.value = null; // *** ИСПРАВЛЕНИЕ для слотов, аналогично одиночному ***
                }
            }, false);
        });

        analysisForm.addEventListener('submit', handleFormSubmit);
        backButton.addEventListener('click', resetToUploadView);
        aboutLink.addEventListener('click', (e) => { e.preventDefault(); aboutModal.classList.remove('hidden'); });
        closeAboutModal.addEventListener('click', () => { aboutModal.classList.add('hidden'); });
        aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) aboutModal.classList.add('hidden'); });
        logger.debug("setupEventListeners: Слушатели настроены.");
    }

    function switchMode(mode) { /* ... код как в 1.0.1-debug-single ... */
        logger.info(`switchMode: Переключение в режим "${mode}"`);
        currentMode = mode;
        selectedFileSingle = null;
        if (fileInputSingle) fileInputSingle.value = null; // Сбрасываем инпут при смене режима
        slotFiles = [null, null, null, null];
        imageSlots.forEach(slot => { // Сбрасываем инпуты в слотах
            const input = slot.querySelector('.slot-input');
            if (input) input.value = null;
        });


        if (mode === 'single') {
            singleModeBtn.classList.add('active');
            compareModeBtn.classList.remove('active');
            singleModeText.style.display = 'block';
            compareModeText.style.display = 'none';
            singleUploadContainer.classList.remove('hidden');
            multiUploadContainer.classList.add('hidden');
        } else {
            singleModeBtn.classList.remove('active');
            compareModeBtn.classList.add('active');
            singleModeText.style.display = 'none';
            compareModeText.style.display = 'block';
            singleUploadContainer.classList.add('hidden');
            multiUploadContainer.classList.remove('hidden');
        }
        updateFilePreviewSingle();
        updateAllSlotPreviews();
    }

    function handleFileSelectSingle(e) {
        logger.debug("handleFileSelectSingle: Сработало событие 'change'. e.target.files:", e.target.files);
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            logger.info(`handleFileSelectSingle: Файл выбран: "${file.name}"`);
            selectedFileSingle = file;
            updateFilePreviewSingle();
            // *** КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ***
            // Сбрасываем значение инпута ПОСЛЕ того, как файл был успешно обработан и сохранен в selectedFileSingle.
            // Это позволит событию 'change' сработать снова, если пользователь выберет тот же самый файл.
            e.target.value = null;
        } else {
            logger.warn("handleFileSelectSingle: Файлы не выбраны.");
            // selectedFileSingle = null; // Не нужно, т.к. не было нового выбора
            // updateFilePreviewSingle(); // Не нужно, т.к. файл не изменился
        }
    }

    function handleDropSingle(e) {
        logger.debug("handleDropSingle: Сработало событие 'drop'.");
        preventDefaults(e); // Убедимся, что preventDefaults вызван и здесь
        fileDropArea.classList.remove('drag-over'); // Убираем подсветку
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            logger.info(`handleDropSingle: Файл перетащен: "${file.name}"`);
            selectedFileSingle = file;
            updateFilePreviewSingle();
            // Для drag-n-drop нет прямого file input, который нужно сбрасывать таким же образом,
            // но selectedFileSingle теперь содержит файл.
            // Если после drag-n-drop мы хотим снова использовать <input type="file">,
            // его состояние уже должно быть независимым.
        } else {
            logger.warn("handleDropSingle: Файлы не были перетащены.");
        }
    }


    function updateFilePreviewSingle() { /* ... код как в 1.0.1-debug-single, но убедитесь, что fileInputSingle.value = ''; есть при удалении ... */
        logger.debug(`updateFilePreviewSingle: Вызвана. selectedFileSingle: ${selectedFileSingle ? selectedFileSingle.name : 'null'}`);
        previewContainerSingle.innerHTML = '';
        if (selectedFileSingle) {
            fileDropArea.classList.add('hidden');
            previewContainerSingle.classList.remove('hidden');
            const reader = new FileReader();
            reader.onload = function (e_reader) {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item-single';
                const img = document.createElement('img');
                img.src = e_reader.target.result;
                img.className = 'preview-image-single';
                img.alt = selectedFileSingle.name;
                const removeBtn = document.createElement('div');
                removeBtn.className = 'remove-preview-single';
                removeBtn.innerHTML = '✕';
                removeBtn.title = 'Удалить изображение';
                removeBtn.addEventListener('click', () => {
                    logger.info("Удаление одиночного файла из предпросмотра.");
                    selectedFileSingle = null;
                    if (fileInputSingle) fileInputSingle.value = ''; // ВАЖНО!
                    updateFilePreviewSingle();
                });
                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                previewContainerSingle.appendChild(previewItem);
            };
            reader.onerror = function (e_reader_error) { logger.error("Ошибка FileReader (single):", e_reader_error); };
            reader.readAsDataURL(selectedFileSingle);
        } else {
            fileDropArea.classList.remove('hidden');
            previewContainerSingle.classList.add('hidden');
        }
    }

    // --- Множественный режим (слоты) ---
    function handleSlotFileSelect(slotIndex, file) {
        logger.info(`Слот ${slotIndex}: файл выбран "${file.name}"`);
        slotFiles[slotIndex] = file;
        updateSlotPreview(slotIndex);
        // Сброс значения инпута для слота также здесь, после обработки
        const inputElement = imageSlots[slotIndex].querySelector('.slot-input');
        if (inputElement) {
            inputElement.value = null;
            logger.debug(`Слот ${slotIndex}: значение инпута сброшено.`);
        }
    }

    function updateSlotPreview(slotIndex) {
        // ... (код из SereneFlow 1.0 или 1.0.1-debug-single)
        // Убедитесь, что при удалении файла из слота (removeSlotFile), соответствующий input.value также сбрасывается.
        const slot = imageSlots[slotIndex];
        const file = slotFiles[slotIndex];
        const previewImgEl = slot.querySelector('.preview-image-slot');
        const removeBtnEl = slot.querySelector('.remove-image');
        const uploadLabelEl = slot.querySelector('.upload-label-slot');


        if (file) {
            slot.classList.add('has-image');
            if (uploadLabelEl) uploadLabelEl.classList.add('hidden'); // Скрываем лейбл
            if (previewImgEl) previewImgEl.classList.remove('hidden');
            if (removeBtnEl) removeBtnEl.classList.remove('hidden');

            const reader = new FileReader();
            reader.onload = (e_reader) => { if (previewImgEl) previewImgEl.src = e_reader.target.result; };
            reader.onerror = (e_reader_error) => { logger.error(`Ошибка FileReader (слот ${slotIndex}):`, e_reader_error); };
            reader.readAsDataURL(file);
        } else {
            slot.classList.remove('has-image');
            if (uploadLabelEl) uploadLabelEl.classList.remove('hidden');
            if (previewImgEl) {
                previewImgEl.classList.add('hidden');
                previewImgEl.src = '#'; // Сброс src для чистоты
            }
            if (removeBtnEl) removeBtnEl.classList.add('hidden');
        }
    }
    function updateAllSlotPreviews() { slotFiles.forEach((f, i) => updateSlotPreview(i)); }
    function removeSlotFile(slotIndex) {
        logger.info(`Удаление файла из слота ${slotIndex}.`);
        slotFiles[slotIndex] = null;
        const inputElement = imageSlots[slotIndex].querySelector('.slot-input');
        if (inputElement) inputElement.value = ''; // ВАЖНО!
        updateSlotPreview(slotIndex);
    }


    function handleFormSubmit(e) { /* ... код как в 1.0.1-debug-single ... */
        e.preventDefault();
        logger.info(`handleFormSubmit: Форма отправлена. Текущий режим: ${currentMode}`);
        let filesToUpload = [];
        let endpoint = '';
        const formData = new FormData();

        const occasion = document.getElementById('occasion').value;
        const preferences = document.getElementById('preferences').value;

        if (!occasion) { alert('Пожалуйста, выберите повод.'); return; }
        formData.append('occasion', occasion);
        if (preferences) formData.append('preferences', preferences);

        if (currentMode === 'single') {
            if (!selectedFileSingle) { alert('Пожалуйста, загрузите изображение.'); return; }
            logger.info(`Форма (single): файл "${selectedFileSingle.name}"`);
            formData.append('image', selectedFileSingle, selectedFileSingle.name);
            endpoint = '/analyze-outfit';
        } else {
            filesToUpload = slotFiles.filter(file => file !== null);
            if (filesToUpload.length < 2) { alert('Загрузите минимум 2 изображения для сравнения.'); return; }
            filesToUpload.forEach((file) => {
                logger.info(`Форма (compare): файл "${file.name}"`);
                formData.append('images', file, file.name);
            });
            endpoint = '/compare-outfits';
        }
        logger.debug("Содержимое FormData перед отправкой:");
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) { logger.debug(`  ${key}: File { name: "${value.name}" ... }`); }
            else { logger.debug(`  ${key}: ${value}`); }
        }

        uploadSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        loadingIndicator.classList.remove('hidden');
        resultContent.innerHTML = '';

        fetch(endpoint, { method: 'POST', body: formData })
            .then(response => {
                logger.info(`Ответ от сервера: статус ${response.status}`);
                if (!response.ok) {
                    return response.json().then(errData => { throw new Error(errData.message || `Ошибка сервера: ${response.status}`); })
                        .catch(() => { throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`); });
                }
                return response.json();
            })
            .then(data => {
                logger.info("Данные JSON успешно разобраны:", data.status);
                loadingIndicator.classList.add('hidden');
                if (data.status === 'success' && data.advice) {
                    resultContent.innerHTML = markdownToHtml(data.advice);
                } else {
                    resultContent.innerHTML = `<div class="error-message"><h3>Произошла ошибка</h3><p>${data.message || 'Не удалось получить анализ.'}</p></div>`;
                }
            })
            .catch(error => {
                logger.error("Ошибка fetch или JSON:", error);
                loadingIndicator.classList.add('hidden');
                resultContent.innerHTML = `<div class="error-message"><h3>Ошибка</h3><p>${error.message || 'Не удалось отправить запрос.'}</p></div>`;
            });
    }

    function resetToUploadView() {
        logger.debug("resetToUploadView: Возврат к секции загрузки.");
        uploadSection.classList.remove('hidden');
        resultSection.classList.add('hidden');
        // Очистка выбранных файлов не здесь, а при смене режима или после успешной отправки,
        // чтобы пользователь мог видеть, что он отправлял, если нажмет "Назад".
        // Если нужен полный сброс, можно раскомментировать:
        // selectedFileSingle = null;
        // if (fileInputSingle) fileInputSingle.value = null;
        // slotFiles = [null, null, null, null];
        // imageSlots.forEach(slot => {
        //     const input = slot.querySelector('.slot-input');
        //     if (input) input.value = null;
        // });
        // updateFilePreviewSingle();
        // updateAllSlotPreviews();
    }
    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
    function markdownToHtml(markdown) {
        if (!markdown) return '';
        let html = markdown;
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/__(.*?)__/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/_(.*?)_/g, '<em>$1</em>');
        html = html.replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>');
        let inList = false;
        const lines = html.split('\n');
        html = lines.map(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('<li>')) {
                if (!inList) { inList = true; return '<ul>' + line; } return line;
            } else if (inList) {
                inList = false;
                const closingUl = '</ul>';
                return trimmedLine === '' ? closingUl : closingUl + line; // Если строка пустая после списка, просто закрываем. Иначе закрываем и добавляем строку.
            }
            return line;
        }).join('\n');
        if (inList) html += '</ul>';

        html = html.split('\n').map(line => {
            const trimmedLine = line.trim();
            if (trimmedLine === '' || trimmedLine.match(/^<\/?(ul|li|h[1-6]|strong|em|p|br)/i)) return line;
            return '<p>' + line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>'; // Экранирование для безопасности
        }).join('\n').replace(/<\/p>\s*<p>/g, '</p><p>');
        html = html.replace(/<p><ul>/g, '<ul>').replace(/<\/ul><\/p>/g, '</ul>');
        return html.replace(/\n/g, '<br>');
    }
});