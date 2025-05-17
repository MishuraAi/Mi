/* 
ИИ СТИЛИСТ - ВЕРСИЯ: 0.3.2
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
    const singleUploadContainer = document.getElementById('single-upload-container');
    const multiUploadContainer = document.getElementById('multi-upload-container');
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

    // Элементы для многослотовой загрузки
    const imageSlots = document.querySelectorAll('.image-slot');
    const slotInputs = document.querySelectorAll('.slot-input');

    // Состояние приложения
    let currentMode = 'single'; // 'single' или 'compare'
    let selectedFiles = []; // Массив выбранных файлов для одиночного режима
    let slotFiles = [null, null, null, null]; // Массив файлов для слотов в режиме сравнения

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

        // Обработка файлов для одиночного режима
        fileInput.addEventListener('change', handleFileSelect);

        // Drag and drop для одиночного режима
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

        // Настройка обработчиков для слотов изображений
        imageSlots.forEach((slot, index) => {
            // Обработка клика по слоту
            slot.addEventListener('click', () => {
                if (!slot.classList.contains('has-image')) {
                    slotInputs[index].click();
                }
            });

            // Обработка выбора файла
            slotInputs[index].addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    handleSlotFileSelect(index, e.target.files[0]);
                }
            });

            // Обработка drag and drop
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                slot.addEventListener(eventName, preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                slot.addEventListener(eventName, function (e) {
                    slot.classList.add('drag-over');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                slot.addEventListener(eventName, function (e) {
                    slot.classList.remove('drag-over');
                }, false);
            });

            slot.addEventListener('drop', function (e) {
                if (e.dataTransfer.files.length > 0) {
                    handleSlotFileSelect(index, e.dataTransfer.files[0]);
                }
            }, false);

            // Обработка удаления изображения
            const removeBtn = slot.querySelector('.remove-image');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Предотвращаем открытие диалога выбора файла
                    removeSlotFile(index);
                });
            }
        });

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

            // Показываем одиночную загрузку, скрываем множественную
            singleUploadContainer.classList.remove('hidden');
            multiUploadContainer.classList.add('hidden');
        } else {
            singleModeBtn.classList.remove('active');
            compareModeBtn.classList.add('active');
            singleModeText.style.display = 'none';
            compareModeText.style.display = 'block';

            // Показываем множественную загрузку, скрываем одиночную
            singleUploadContainer.classList.add('hidden');
            multiUploadContainer.classList.remove('hidden');
        }

        // Сброс выбранных файлов
        selectedFiles = [];
        slotFiles = [null, null, null, null];
        updateFilePreview();
        updateSlotPreviews();

        // Для отладки
        console.log("Режим изменен на:", mode);
    }

    // ОБРАБОТКА ФАЙЛОВ ДЛЯ ОДИНОЧНОГО РЕЖИМА

    // Обработка выбора файлов
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files && files.length > 0) {
            selectedFiles = [files[0]];
            updateFilePreview();
        }
    }

    // Обработка перетаскивания файлов
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            selectedFiles = [files[0]];
            updateFilePreview();
        }
    }

    // Обновление предпросмотра файлов для одиночного режима
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

    // Удаление файла в одиночном режиме
    function removeFile(index) {
        selectedFiles.splice(index, 1);
        updateFilePreview();
    }

    // ОБРАБОТКА ФАЙЛОВ ДЛЯ РЕЖИМА СРАВНЕНИЯ

    // Обработка выбора файла для слота
    function handleSlotFileSelect(slotIndex, file) {
        slotFiles[slotIndex] = file;
        updateSlotPreview(slotIndex);
    }

    // Обновление предпросмотра для слота
    function updateSlotPreview(slotIndex) {
        const slot = imageSlots[slotIndex];
        const file = slotFiles[slotIndex];

        // Удаляем существующее изображение, если оно есть
        const existingImg = slot.querySelector('.preview-image');
        if (existingImg) {
            slot.removeChild(existingImg);
        }

        if (file) {
            const reader = new FileReader();

            reader.onload = function (e) {
                // Добавляем класс, что в слоте есть изображение
                slot.classList.add('has-image');

                // Скрываем иконку и текст
                const uploadLabel = slot.querySelector('.upload-label');
                uploadLabel.style.opacity = '0';

                // Создаем элемент изображения
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                img.alt = file.name;

                slot.appendChild(img);
            };

            reader.readAsDataURL(file);
        } else {
            // Удаляем класс, возвращаем видимость иконки и текста
            slot.classList.remove('has-image');
            const uploadLabel = slot.querySelector('.upload-label');
            uploadLabel.style.opacity = '1';
        }
    }

    // Обновление предпросмотра для всех слотов
    function updateSlotPreviews() {
        slotFiles.forEach((file, index) => {
            updateSlotPreview(index);
        });
    }

    // Удаление файла из слота
    function removeSlotFile(slotIndex) {
        slotFiles[slotIndex] = null;
        updateSlotPreview(slotIndex);
    }

    // Обработка отправки формы
    function handleFormSubmit(e) {
        e.preventDefault();

        // Проверка наличия файлов в зависимости от режима
        let hasFiles = false;

        if (currentMode === 'single') {
            hasFiles = selectedFiles.length > 0;
            if (!hasFiles) {
                alert('Пожалуйста, загрузите изображение');
                return;
            }
        } else {
            // В режиме сравнения проверяем, есть ли хотя бы 2 файла
            const filesCount = slotFiles.filter(file => file !== null).length;
            hasFiles = filesCount >= 2;
            if (!hasFiles) {
                alert('Пожалуйста, загрузите не менее 2 изображений для сравнения');
                return;
            }
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
            // Добавляем только непустые файлы из слотов
            slotFiles.forEach(file => {
                if (file !== null) {
                    formData.append('images', file);
                }
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

        if (currentMode === 'single') {
            selectedFiles = [];
            fileInput.value = '';
            updateFilePreview();
        } else {
            slotFiles = [null, null, null, null];
            slotInputs.forEach(input => {
                input.value = '';
            });
            updateSlotPreviews();
        }
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