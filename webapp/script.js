/* 
ИИ СТИЛИСТ - ВЕРСИЯ: 0.3.1
ФАЙЛ: script.js
НАЗНАЧЕНИЕ: Клиентский JavaScript для веб-приложения
ДАТА ОБНОВЛЕНИЯ: 2025-05-17
*/

document.addEventListener('DOMContentLoaded', function () {
    // Элементы DOM
    const singleModeBtn = document.getElementById('single-mode');
    const compareModeBtn = document.getElementById('compare-mode');
    const fileInput = document.getElementById('file-input');
    const fileDropArea = document.getElementById('file-drop-area');
    const previewContainer = document.getElementById('preview-container');
    const analysisForm = document.getElementById('analysis-form');
    const uploadSection = document.getElementById('upload-section');
    const resultSection = document.getElementById('result-section');
    const backButton = document.getElementById('back-button');
    const submitButton = document.getElementById('submit-button');
    const resultContent = document.getElementById('result-content');
    const loadingIndicator = document.getElementById('loading-indicator');
    const aboutLink = document.getElementById('about-link');
    const aboutModal = document.getElementById('about-modal');
    const closeModal = document.querySelector('.close-modal');
    const singleModeText = document.querySelector('.single-mode-text');
    const compareModeText = document.querySelector('.compare-mode-text');

    // Состояние приложения
    let currentMode = 'single'; // 'single' или 'compare'
    let selectedFiles = []; // Массив выбранных файлов

    // Инициализация
    initApp();

    // Функция инициализации приложения
    function initApp() {
        // Установка обработчиков событий
        setupEventListeners();

        // Проверка размера экрана и адаптация интерфейса
        adaptForScreenSize();

        // Проверка мобильного устройства для добавления эффекта нажатия
        if (isMobileDevice()) {
            addTouchEffects();
        }
    }

    // Настройка обработчиков событий
    function setupEventListeners() {
        // Переключение режимов
        singleModeBtn.addEventListener('click', () => switchMode('single'));
        compareModeBtn.addEventListener('click', () => switchMode('compare'));

        // Обработка файлов
        fileInput.addEventListener('change', handleFileSelect);

        // Drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, unhighlight, false);
        });

        fileDropArea.addEventListener('drop', handleDrop, false);

        // Форма анализа
        analysisForm.addEventListener('submit', handleFormSubmit);

        // Кнопка "Назад"
        backButton.addEventListener('click', resetApp);

        // Модальное окно
        aboutLink.addEventListener('click', e => {
            e.preventDefault();
            aboutModal.classList.remove('hidden');
        });

        closeModal.addEventListener('click', () => {
            aboutModal.classList.add('hidden');
        });

        // Закрытие модального окна при клике вне его содержимого
        aboutModal.addEventListener('click', e => {
            if (e.target === aboutModal) {
                aboutModal.classList.add('hidden');
            }
        });

        // Обработка изменения размера окна
        window.addEventListener('resize', adaptForScreenSize);
    }

    // Функция переключения режимов
    function switchMode(mode) {
        currentMode = mode;

        // Обновление состояния кнопок
        if (mode === 'single') {
            singleModeBtn.classList.add('active');
            compareModeBtn.classList.remove('active');
            singleModeText.style.display = 'block';
            compareModeText.style.display = 'none';
            // Важно для мобильных устройств
            fileInput.setAttribute('multiple', ''); // Очищаем атрибут
            fileInput.removeAttribute('multiple');
        } else {
            singleModeBtn.classList.remove('active');
            compareModeBtn.classList.add('active');
            singleModeText.style.display = 'none';
            compareModeText.style.display = 'block';
            fileInput.setAttribute('multiple', 'multiple');
        }

        // Сброс выбранных файлов
        selectedFiles = [];
        updateFilePreview();

        // Для отладки
        console.log("Режим изменен на:", mode);
        console.log("Multiple атрибут:", fileInput.multiple);
    }

    // Обработка выбора файлов
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files && files.length > 0) {
            console.log("Файлы выбраны через input:", files.length);
            // На мобильном устройстве принудительно проверяем режим
            if (isMobileDevice() && currentMode === 'compare' && !fileInput.multiple) {
                console.log("Мобильное устройство - принудительно устанавливаем multiple");
                fileInput.setAttribute('multiple', 'multiple');
                // На мобильных устройствах после установки multiple требуется заново открыть выбор файлов
                alert("Пожалуйста, выберите файлы снова для режима сравнения");
                return;
            }
            processFiles(files);
        } else {
            console.log("Файлы не выбраны");
        }
    }

    // Обработка перетаскивания файлов
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            console.log("Файлы получены при перетаскивании:", files.length);
            processFiles(files);
        } else {
            console.log("Файлы не получены при перетаскивании");
        }
    }

    // Обработка файлов
    function processFiles(files) {
        console.log("Обработка файлов:", files.length, "текущий режим:", currentMode);

        if (currentMode === 'single') {
            // В режиме одиночного анализа берем только первый файл
            selectedFiles = files.length > 0 ? [files[0]] : [];
        } else {
            // В режиме сравнения добавляем файлы к уже выбранным
            const newFiles = Array.from(files);

            // Ограничиваем количество файлов до 4
            if (selectedFiles.length + newFiles.length > 4) {
                const remainingSlots = 4 - selectedFiles.length;
                alert(`Вы можете выбрать максимум 4 изображения. Добавлено только ${remainingSlots} из выбранных.`);
                selectedFiles = [...selectedFiles, ...newFiles.slice(0, remainingSlots)];
            } else {
                selectedFiles = [...selectedFiles, ...newFiles];
            }
        }

        console.log("Выбранные файлы:", selectedFiles.length);
        updateFilePreview();
    }

    // Обновление предпросмотра файлов
    function updateFilePreview() {
        previewContainer.innerHTML = '';

        if (selectedFiles.length > 0) {
            fileDropArea.classList.add('hidden');
            previewContainer.classList.remove('hidden');

            selectedFiles.forEach((file, index) => {
                const reader = new FileReader();

                reader.onload = function (e) {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'preview-item';

                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-image';
                    img.alt = file.name;

                    const removeBtn = document.createElement('div');
                    removeBtn.className = 'remove-preview';
                    removeBtn.innerHTML = '✕';
                    removeBtn.addEventListener('click', () => removeFile(index));

                    previewItem.appendChild(img);
                    previewItem.appendChild(removeBtn);
                    previewContainer.appendChild(previewItem);
                };

                reader.readAsDataURL(file);
            });
        } else {
            fileDropArea.classList.remove('hidden');
            previewContainer.classList.add('hidden');
        }
    }

    // Удаление файла
    function removeFile(index) {
        selectedFiles.splice(index, 1);
        updateFilePreview();
    }

    // Обработка отправки формы
    function handleFormSubmit(e) {
        e.preventDefault();

        // Проверка наличия файлов
        if (selectedFiles.length === 0) {
            alert('Пожалуйста, загрузите изображение');
            return;
        }

        // Проверка выбора повода
        const occasion = document.getElementById('occasion').value;
        if (!occasion) {
            alert('Пожалуйста, выберите повод');
            return;
        }

        // Отображение индикатора загрузки
        uploadSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        loadingIndicator.classList.remove('hidden');
        resultContent.innerHTML = '';

        // Формирование данных для отправки
        const formData = new FormData();
        const preferences = document.getElementById('preferences').value;

        formData.append('occasion', occasion);
        if (preferences) {
            formData.append('preferences', preferences);
        }

        // Выбор API эндпоинта в зависимости от режима
        let endpoint;

        if (currentMode === 'single') {
            endpoint = '/analyze-outfit';
            formData.append('image', selectedFiles[0]);
        } else {
            endpoint = '/compare-outfits';
            selectedFiles.forEach(file => {
                formData.append('images', file);
            });
        }

        // Отправка запроса
        fetch(endpoint, {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                loadingIndicator.classList.add('hidden');

                if (data.status === 'success') {
                    // Преобразование Markdown в HTML
                    resultContent.innerHTML = markdownToHtml(data.advice);
                } else {
                    resultContent.innerHTML = `<div class="error-message">
                    <h3>Произошла ошибка</h3>
                    <p>${data.message || 'Не удалось выполнить анализ. Пожалуйста, попробуйте снова.'}</p>
                </div>`;
                }
            })
            .catch(error => {
                loadingIndicator.classList.add('hidden');
                resultContent.innerHTML = `<div class="error-message">
                <h3>Ошибка соединения</h3>
                <p>Не удалось отправить запрос на сервер. Пожалуйста, проверьте подключение к интернету и попробуйте снова.</p>
            </div>`;
                console.error('Error:', error);
            });
    }

    // Сброс приложения
    function resetApp() {
        uploadSection.classList.remove('hidden');
        resultSection.classList.add('hidden');
        selectedFiles = [];
        fileInput.value = '';
        updateFilePreview();
    }

    // Простая функция для преобразования Markdown в HTML
    function markdownToHtml(markdown) {
        if (!markdown) return '';

        let html = markdown;

        // Заголовки
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');

        // Жирный текст
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Курсив
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Списки
        html = html.replace(/^\s*-\s*(.*$)/gm, '<li>$1</li>');

        // Группировка элементов списка в <ul>
        let inList = false;
        const lines = html.split('\n');
        html = lines.map(line => {
            if (line.includes('<li>')) {
                if (!inList) {
                    inList = true;
                    return '<ul>' + line;
                }
                return line;
            } else if (inList) {
                inList = false;
                return '</ul>' + line;
            }
            return line;
        }).join('\n');

        if (inList) {
            html += '</ul>';
        }

        // Параграфы (игнорируем строки, которые уже содержат HTML-теги)
        const paragraphs = html.split('\n\n');
        html = paragraphs.map(para => {
            // Если параграф содержит HTML-теги, оставляем как есть
            if (para.trim().startsWith('<') || para.trim() === '') {
                return para;
            }
            // Иначе оборачиваем в теги <p>
            return '<p>' + para + '</p>';
        }).join('\n\n');

        return html;
    }

    // Вспомогательные функции для Drag and Drop
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        fileDropArea.classList.add('drag-over');
    }

    function unhighlight() {
        fileDropArea.classList.remove('drag-over');
    }

    // Проверка, является ли устройство мобильным
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    }

    // Адаптация интерфейса для различных размеров экрана
    function adaptForScreenSize() {
        if (window.innerWidth < 768) {
            // Включаем режим мобильной версии
            addTouchEffects();
        }
    }

    // Добавление эффектов касания для мобильных устройств
    function addTouchEffects() {
        const buttons = document.querySelectorAll('.mode-button, .primary-button, .secondary-button');

        buttons.forEach(button => {
            // Удаляем существующие обработчики, чтобы избежать дублирования
            button.removeEventListener('touchstart', handleTouchStart);
            button.removeEventListener('touchend', handleTouchEnd);

            // Добавляем новые обработчики
            button.addEventListener('touchstart', handleTouchStart);
            button.addEventListener('touchend', handleTouchEnd);
        });
    }

    // Обработчик начала касания
    function handleTouchStart(e) {
        // Сначала удаляем все активные эффекты свечения
        document.querySelectorAll('.glow-active').forEach(el => {
            if (el !== this.querySelector('.glow-border')) {
                el.classList.remove('glow-active');
            }
        });

        // Добавляем эффект свечения для текущей кнопки
        const glowBorder = this.querySelector('.glow-border');
        if (glowBorder) {
            glowBorder.style.opacity = '0.7'; // Используем конкретное значение вместо var()
            glowBorder.classList.add('glow-active');
        }
    }

    // Обработчик окончания касания
    function handleTouchEnd(e) {
        // Если это не кнопка режима или это не активная кнопка режима, убираем свечение
        if (!this.classList.contains('mode-button') || !this.classList.contains('active')) {
            const glowBorder = this.querySelector('.glow-border');
            if (glowBorder) {
                glowBorder.style.opacity = '0';
            }
        }
    }
});