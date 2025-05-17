/**
 * ИИ СТИЛИСТ - ВЕРСИЯ: 0.3.1
 * ФАЙЛ: script.js
 * НАЗНАЧЕНИЕ: Клиентский JavaScript для веб-приложения стилиста
 * ДАТА ОБНОВЛЕНИЯ: 2025-05-17
 *
 * МЕТОДОЛОГИЯ ОБНОВЛЕНИЯ КОДА:
 * При внесении любых изменений в этот файл необходимо предоставлять полный код файла целиком,
 * а не только изменившиеся части. Это обеспечивает целостность кода и исключает ошибки интеграции.
 */

document.addEventListener('DOMContentLoaded', function () {
    // Инициализация Telegram WebApp
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();

    // Применение темы Telegram
    applyTelegramTheme();

    // Получение ссылок на элементы DOM - Общие элементы
    const loadingSection = document.getElementById('loading-section');
    const resultSection = document.getElementById('result-section');
    const resultContent = document.getElementById('result-content');
    const newAnalysisBtn = document.getElementById('new-analysis-btn');

    // Получение ссылок на элементы DOM - Переключение режимов
    const singleModeBtn = document.getElementById('single-mode-btn');
    const compareModeBtn = document.getElementById('compare-mode-btn');
    const singleMode = document.getElementById('single-mode');
    const compareMode = document.getElementById('compare-mode');

    // Получение ссылок на элементы DOM - Одиночный режим
    const uploadContainer = document.getElementById('upload-container');
    const fileInput = document.getElementById('file-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const changeImageBtn = document.getElementById('change-image-btn');
    const formSection = document.getElementById('form-section');
    const analyzeBtn = document.getElementById('analyze-btn');

    // Получение ссылок на элементы DOM - Режим сравнения
    const compareUploadContainer = document.getElementById('compare-upload-container');
    const compareFileInput = document.getElementById('compare-file-input');
    const imagesGallery = document.getElementById('images-gallery');
    const compareFormSection = document.getElementById('compare-form-section');
    const compareAnalyzeBtn = document.getElementById('compare-analyze-btn');

    // Массив для хранения загруженных изображений в режиме сравнения
    let comparisonImages = [];

    // Отладка - проверка загрузки скрипта
    console.log("Скрипт инициализирован");
    console.log("URL страницы:", window.location.href);
    console.log("Базовый URL:", window.location.origin);

    // Применение цветовой схемы Telegram
    function applyTelegramTheme() {
        const root = document.documentElement;

        if (window.Telegram.WebApp.colorScheme === 'dark') {
            root.style.setProperty('--tg-theme-bg-color', window.Telegram.WebApp.backgroundColor || '#252526');
            root.style.setProperty('--tg-theme-text-color', window.Telegram.WebApp.textColor || '#ffffff');
            root.style.setProperty('--tg-theme-hint-color', window.Telegram.WebApp.hintColor || '#aaaaaa');
            root.style.setProperty('--tg-theme-link-color', window.Telegram.WebApp.linkColor || '#64baff');
            root.style.setProperty('--tg-theme-button-color', window.Telegram.WebApp.buttonColor || '#64baff');
            root.style.setProperty('--tg-theme-button-text-color', window.Telegram.WebApp.buttonTextColor || '#ffffff');

            root.style.setProperty('--primary-color', '#81A1C1');
            root.style.setProperty('--secondary-color', '#5E81AC');
            root.style.setProperty('--light-color', '#3B4252');
            root.style.setProperty('--dark-color', '#D8DEE9');
        } else {
            root.style.setProperty('--tg-theme-bg-color', window.Telegram.WebApp.backgroundColor || '#ffffff');
            root.style.setProperty('--tg-theme-text-color', window.Telegram.WebApp.textColor || '#000000');
            root.style.setProperty('--tg-theme-hint-color', window.Telegram.WebApp.hintColor || '#999999');
            root.style.setProperty('--tg-theme-link-color', window.Telegram.WebApp.linkColor || '#2481cc');
            root.style.setProperty('--tg-theme-button-color', window.Telegram.WebApp.buttonColor || '#2481cc');
            root.style.setProperty('--tg-theme-button-text-color', window.Telegram.WebApp.buttonTextColor || '#ffffff');
        }

        console.log("Тема Telegram применена:", window.Telegram.WebApp.colorScheme);
    }

    // Обработчики переключения режимов
    singleModeBtn.addEventListener('click', function () {
        singleModeBtn.classList.add('active');
        compareModeBtn.classList.remove('active');
        singleMode.style.display = 'block';
        compareMode.style.display = 'none';
        resetComparison();
    });

    compareModeBtn.addEventListener('click', function () {
        compareModeBtn.classList.add('active');
        singleModeBtn.classList.remove('active');
        compareMode.style.display = 'block';
        singleMode.style.display = 'none';
        resetSingleMode();
    });

    // Функция для сброса одиночного режима
    function resetSingleMode() {
        imagePreview.src = '';
        fileInput.value = '';
        document.getElementById('preferences').value = '';
        uploadContainer.style.display = 'block';
        imagePreviewContainer.style.display = 'none';
        formSection.style.display = 'none';
    }

    // Функция для сброса режима сравнения
    function resetComparison() {
        comparisonImages = [];
        compareFileInput.value = '';
        document.getElementById('compare-preferences').value = '';
        imagesGallery.innerHTML = '';
        compareUploadContainer.style.display = 'block';
        compareFormSection.style.display = 'none';
    }

    // Функция для обновления предпросмотра изображения (одиночный режим)
    function updateImagePreview(file) {
        if (file) {
            // Проверка типа файла
            if (!file.type.match('image.*')) {
                alert('Пожалуйста, выберите изображение');
                return false;
            }

            // Отображение предпросмотра
            const reader = new FileReader();
            reader.onload = function (e) {
                // Очищаем предыдущее изображение из памяти
                if (imagePreview.src) {
                    URL.revokeObjectURL(imagePreview.src);
                }

                imagePreview.src = e.target.result;
                uploadContainer.style.display = 'none';
                imagePreviewContainer.style.display = 'block';
                formSection.style.display = 'block';

                console.log("Предпросмотр изображения обновлен");
            };
            reader.readAsDataURL(file);
            return true;
        }
        return false;
    }

    // Функция для добавления изображений в галерею (режим сравнения)
    function addImagesToGallery(files) {
        if (files && files.length > 0) {
            // Проверяем, что выбрано не более 5 изображений
            if (comparisonImages.length + files.length > 5) {
                alert('Можно загрузить не более 5 изображений для сравнения');
                return false;
            }

            // Очищаем галерею, если это первая загрузка
            if (comparisonImages.length === 0) {
                imagesGallery.innerHTML = '';
            }

            // Добавляем каждое изображение в галерею
            Array.from(files).forEach((file, index) => {
                // Проверка типа файла
                if (!file.type.match('image.*')) {
                    alert('Один из файлов не является изображением. Пожалуйста, выберите только изображения.');
                    return;
                }

                // Создаем объект для хранения данных изображения
                const imageData = {
                    file: file,
                    id: Date.now() + index
                };

                // Добавляем в массив
                comparisonImages.push(imageData);

                // Создаем элемент для отображения в галерее
                const imageContainer = document.createElement('div');
                imageContainer.className = 'gallery-item';
                imageContainer.dataset.imageId = imageData.id;

                // Создаем предпросмотр
                const reader = new FileReader();
                reader.onload = function (e) {
                    // Шаблон элемента галереи
                    imageContainer.innerHTML = `
                        <div class="gallery-image-container">
                            <img src="${e.target.result}" alt="Предмет ${comparisonImages.length}" class="gallery-image">
                            <button class="remove-image-btn" data-id="${imageData.id}">×</button>
                        </div>
                        <p class="gallery-label">Предмет ${comparisonImages.length}</p>
                    `;

                    // Добавляем обработчик удаления
                    imageContainer.querySelector('.remove-image-btn').addEventListener('click', function (e) {
                        e.stopPropagation();
                        const imageId = this.dataset.id;
                        removeComparisonImage(imageId);
                    });
                };
                reader.readAsDataURL(file);

                // Добавляем в галерею
                imagesGallery.appendChild(imageContainer);
            });

            // Показываем форму, если есть хотя бы 2 изображения
            if (comparisonImages.length >= 2) {
                compareUploadContainer.style.display = 'none';
                compareFormSection.style.display = 'block';
            } else {
                compareUploadContainer.style.display = 'block';
            }

            // Показываем галерею
            imagesGallery.style.display = 'flex';

            console.log(`Добавлено ${files.length} изображений в галерею`);
            return true;
        }
        return false;
    }

    // Функция для удаления изображения из сравнения
    function removeComparisonImage(imageId) {
        // Находим индекс изображения в массиве
        const index = comparisonImages.findIndex(img => img.id == imageId);
        if (index !== -1) {
            // Удаляем из массива
            comparisonImages.splice(index, 1);

            // Удаляем из DOM
            const imageElement = document.querySelector(`.gallery-item[data-image-id="${imageId}"]`);
            if (imageElement) {
                imagesGallery.removeChild(imageElement);
            }

            // Обновляем нумерацию
            document.querySelectorAll('.gallery-label').forEach((label, idx) => {
                label.textContent = `Предмет ${idx + 1}`;
            });

            // Если осталось меньше 2 изображений, скрываем форму
            if (comparisonImages.length < 2) {
                compareFormSection.style.display = 'none';

                // Если не осталось изображений, показываем контейнер загрузки
                if (comparisonImages.length === 0) {
                    imagesGallery.style.display = 'none';
                    compareUploadContainer.style.display = 'block';
                }
            }

            console.log(`Удалено изображение из галереи, осталось: ${comparisonImages.length}`);
        }
    }

    // Обработчик для события нажатия на область загрузки (одиночный режим)
    uploadContainer.addEventListener('click', function () {
        console.log("Нажатие на область загрузки (одиночный режим)");
        fileInput.click();
    });

    // Обработчик для выбора файла (одиночный режим)
    fileInput.addEventListener('change', function (e) {
        console.log("Файл выбран (одиночный режим)");
        // Сбрасываем предыдущие результаты
        resultSection.style.display = 'none';

        if (e.target.files && e.target.files[0]) {
            updateImagePreview(e.target.files[0]);
        }
    });

    // Обработчик для кнопки смены изображения (одиночный режим)
    changeImageBtn.addEventListener('click', function () {
        console.log("Нажата кнопка смены изображения");
        // Сбрасываем предыдущие результаты
        resultSection.style.display = 'none';
        fileInput.click();
    });

    // Обработчик для области загрузки (режим сравнения)
    compareUploadContainer.addEventListener('click', function () {
        console.log("Нажатие на область загрузки (режим сравнения)");
        compareFileInput.click();
    });

    // Обработчик для выбора файлов (режим сравнения)
    compareFileInput.addEventListener('change', function (e) {
        console.log("Файлы выбраны (режим сравнения)");
        // Сбрасываем предыдущие результаты
        resultSection.style.display = 'none';

        if (e.target.files && e.target.files.length > 0) {
            addImagesToGallery(e.target.files);
        }
    });

    // Обработчик для кнопки анализа (одиночный режим)
    analyzeBtn.addEventListener('click', function () {
        console.log("Кнопка анализа нажата (одиночный режим)");

        if (!fileInput.files || !fileInput.files[0]) {
            alert('Пожалуйста, выберите изображение для анализа');
            return;
        }

        // Показать загрузку
        formSection.style.display = 'none';
        imagePreviewContainer.style.display = 'none';
        loadingSection.style.display = 'block';

        console.log("Подготовка данных для отправки");
        // Отправка данных на сервер
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        formData.append('occasion', document.getElementById('occasion').value);
        formData.append('preferences', document.getElementById('preferences').value);

        // Получаем абсолютный URL для API конечной точки
        const apiUrl = window.location.origin + '/analyze-outfit';
        console.log("Отправка запроса на:", apiUrl);

        fetch(apiUrl, {
            method: 'POST',
            body: formData
        })
            .then(response => {
                console.log("Получен ответ от сервера, статус:", response.status);
                return response.json();
            })
            .then(data => {
                console.log("Данные ответа:", data);
                // Скрыть загрузку
                loadingSection.style.display = 'none';

                if (data.status === 'success') {
                    // Показать результат
                    console.log("Успешный анализ, отображаем результат");
                    // Конвертация Markdown в HTML для отображения
                    resultContent.innerHTML = markdownToHtml(data.advice);
                    resultSection.style.display = 'block';

                    // Отправить данные в Telegram при успешном анализе
                    try {
                        window.Telegram.WebApp.sendData(JSON.stringify({
                            status: 'success',
                            occasion: document.getElementById('occasion').value,
                            preferences: document.getElementById('preferences').value
                        }));
                        console.log("Данные отправлены в Telegram");
                    } catch (e) {
                        console.error("Ошибка при отправке данных в Telegram:", e);
                    }
                } else {
                    console.error("Ошибка анализа:", data.message);
                    alert('Ошибка при анализе: ' + data.message);
                    // Вернуть к форме загрузки
                    uploadContainer.style.display = 'block';
                    imagePreviewContainer.style.display = 'none';
                    formSection.style.display = 'none';
                }
            })
            .catch(error => {
                console.error("Ошибка запроса:", error);
                loadingSection.style.display = 'none';
                alert('Ошибка при отправке данных: ' + error);
                // Вернуть к форме загрузки
                uploadContainer.style.display = 'block';
                imagePreviewContainer.style.display = 'none';
                formSection.style.display = 'none';
            });
    });

    // Обработчик для кнопки сравнения (режим сравнения)
    compareAnalyzeBtn.addEventListener('click', function () {
        console.log("Кнопка сравнения нажата");

        if (comparisonImages.length < 2) {
            alert('Пожалуйста, загрузите не менее 2 изображений для сравнения');
            return;
        }

        // Показать загрузку
        compareFormSection.style.display = 'none';
        imagesGallery.style.display = 'none';
        loadingSection.style.display = 'block';

        console.log("Подготовка данных для отправки сравнения");
        const formData = new FormData();

        // Добавляем все изображения
        comparisonImages.forEach((img, index) => {
            formData.append('images', img.file);
        });

        formData.append('occasion', document.getElementById('compare-occasion').value);
        formData.append('preferences', document.getElementById('compare-preferences').value);

        // Получаем абсолютный URL для API конечной точки сравнения
        const apiUrl = window.location.origin + '/compare-outfits';
        console.log("Отправка запроса на:", apiUrl);

        fetch(apiUrl, {
            method: 'POST',
            body: formData
        })
            .then(response => {
                console.log("Получен ответ от сервера, статус:", response.status);
                return response.json();
            })
            .then(data => {
                console.log("Данные ответа:", data);
                // Скрыть загрузку
                loadingSection.style.display = 'none';

                if (data.status === 'success') {
                    // Показать результат
                    console.log("Успешный анализ, отображаем результат сравнения");
                    // Конвертация Markdown в HTML для отображения
                    resultContent.innerHTML = markdownToHtml(data.advice);
                    resultSection.style.display = 'block';

                    // Отправить данные в Telegram при успешном анализе
                    try {
                        window.Telegram.WebApp.sendData(JSON.stringify({
                            status: 'success',
                            type: 'comparison',
                            occasion: document.getElementById('compare-occasion').value,
                            preferences: document.getElementById('compare-preferences').value
                        }));
                        console.log("Данные отправлены в Telegram");
                    } catch (e) {
                        console.error("Ошибка при отправке данных в Telegram:", e);
                    }
                } else {
                    console.error("Ошибка анализа:", data.message);
                    alert('Ошибка при анализе: ' + data.message);
                    // Вернуть к форме сравнения
                    imagesGallery.style.display = 'flex';
                    compareFormSection.style.display = 'block';
                }
            })
            .catch(error => {
                console.error("Ошибка запроса:", error);
                loadingSection.style.display = 'none';
                alert('Ошибка при отправке данных: ' + error);
                // Вернуть к форме сравнения
                imagesGallery.style.display = 'flex';
                compareFormSection.style.display = 'block';
            });
    });

    // Обработчик для кнопки нового анализа
    newAnalysisBtn.addEventListener('click', function () {
        console.log("Нажата кнопка нового анализа");
        // Сбросить форму и вернуться к загрузке
        resultSection.style.display = 'none';

        // Определить активный режим и сбросить его
        if (singleModeBtn.classList.contains('active')) {
            resetSingleMode();
        } else {
            resetComparison();
        }
    });

    // Функция для конвертации Markdown в HTML
    function markdownToHtml(markdown) {
        if (!markdown) return '';

        console.log("Преобразование Markdown в HTML");
        // Базовое форматирование
        return markdown
            // Заголовки
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            // Жирный текст
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            // Курсив
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            // Списки с пунктами
            .replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
            // Объединение соседних UL элементов
            .replace(/<\/ul>\s*<ul>/gim, '')
            // Абзацы
            .replace(/\n(?!<)/gim, '<br>');
    }
});