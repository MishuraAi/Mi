document.addEventListener('DOMContentLoaded', function () {
    // Инициализация Telegram WebApp
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();

    // Применение темы Telegram
    applyTelegramTheme();

    // Получение ссылок на элементы DOM
    const uploadContainer = document.getElementById('upload-container');
    const fileInput = document.getElementById('file-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const changeImageBtn = document.getElementById('change-image-btn');
    const formSection = document.getElementById('form-section');
    const analyzeBtn = document.getElementById('analyze-btn');
    const loadingSection = document.getElementById('loading-section');
    const resultSection = document.getElementById('result-section');
    const resultContent = document.getElementById('result-content');
    const newAnalysisBtn = document.getElementById('new-analysis-btn');

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
    }

    // Функция для обновления предпросмотра изображения
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
            };
            reader.readAsDataURL(file);
            return true;
        }
        return false;
    }

    // Обработчик для события нажатия на область загрузки
    uploadContainer.addEventListener('click', function () {
        fileInput.click();
    });

    // Обработчик для выбора файла
    fileInput.addEventListener('change', function (e) {
        // Сбрасываем предыдущие результаты
        resultSection.style.display = 'none';

        if (e.target.files && e.target.files[0]) {
            updateImagePreview(e.target.files[0]);
        }
    });

    // Обработчик для кнопки смены изображения
    changeImageBtn.addEventListener('click', function () {
        // Сбрасываем предыдущие результаты
        resultSection.style.display = 'none';
        fileInput.click();
    });

    // Обработчик для кнопки анализа
    analyzeBtn.addEventListener('click', function () {
        if (!fileInput.files || !fileInput.files[0]) {
            alert('Пожалуйста, выберите изображение для анализа');
            return;
        }

        // Показать загрузку
        formSection.style.display = 'none';
        imagePreviewContainer.style.display = 'none';
        loadingSection.style.display = 'block';

        // Отправка данных на сервер
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        formData.append('occasion', document.getElementById('occasion').value);
        formData.append('preferences', document.getElementById('preferences').value);

        fetch('/analyze-outfit', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                // Скрыть загрузку
                loadingSection.style.display = 'none';

                if (data.status === 'success') {
                    // Показать результат
                    // Конвертация Markdown в HTML для отображения
                    resultContent.innerHTML = markdownToHtml(data.advice);
                    resultSection.style.display = 'block';

                    // Отправить данные в Telegram при успешном анализе
                    window.Telegram.WebApp.sendData(JSON.stringify({
                        status: 'success',
                        occasion: document.getElementById('occasion').value,
                        preferences: document.getElementById('preferences').value
                    }));
                } else {
                    alert('Ошибка при анализе: ' + data.message);
                    // Вернуть к форме загрузки
                    uploadContainer.style.display = 'block';
                    imagePreviewContainer.style.display = 'none';
                    formSection.style.display = 'none';
                }
            })
            .catch(error => {
                loadingSection.style.display = 'none';
                alert('Ошибка при отправке данных: ' + error);
                // Вернуть к форме загрузки
                uploadContainer.style.display = 'block';
                imagePreviewContainer.style.display = 'none';
                formSection.style.display = 'none';
            });
    });

    // Обработчик для кнопки нового анализа
    newAnalysisBtn.addEventListener('click', function () {
        // Сбросить форму и вернуться к загрузке
        imagePreview.src = '';
        fileInput.value = '';
        document.getElementById('preferences').value = '';
        resultSection.style.display = 'none';
        uploadContainer.style.display = 'block';
        imagePreviewContainer.style.display = 'none';
        formSection.style.display = 'none';
    });

    // Функция для конвертации Markdown в HTML
    function markdownToHtml(markdown) {
        if (!markdown) return '';

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