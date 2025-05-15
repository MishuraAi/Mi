// Инициализация Telegram WebApp
const tgApp = window.Telegram.WebApp;
tgApp.expand(); // Расширяем на весь экран

// API URL - замените на ваш реальный URL, когда он будет доступен
const API_URL = 'https://your-backend-url.com';

// Элементы DOM
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const submitBtn = document.getElementById('submitBtn');
const resultContent = document.getElementById('resultContent');
const mainSection = document.querySelector('.main-section');
const resultSection = document.querySelector('.result-section');
const newConsultationBtn = document.getElementById('newConsultationBtn');
const uploadIcon = document.getElementById('uploadIcon');

// Создаем элемент для индикатора загрузки
const loadingIndicator = document.createElement('div');
loadingIndicator.className = 'loading-indicator';
loadingIndicator.innerHTML = '<div class="spinner"></div><p>Анализирую изображение...</p>';

// Переменные для хранения выбранного изображения
let selectedFile = null;
let imagePreview = null;

// Обработчик клика по области загрузки
uploadBox.addEventListener('click', () => {
    fileInput.click();
});

// Обработчик выбора файла
fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        selectedFile = e.target.files[0];
        
        // Создаем превью изображения
        const reader = new FileReader();
        reader.onload = (e) => {
            // Удаляем предыдущее превью если оно было
            if (imagePreview) {
                uploadBox.removeChild(imagePreview);
            }
            
            // Удаляем иконку и текст
            uploadIcon.style.display = 'none';
            uploadBox.querySelector('p').style.display = 'none';
            
            // Создаем и добавляем новое превью
            imagePreview = document.createElement('img');
            imagePreview.src = e.target.result;
            imagePreview.style.maxWidth = '100%';
            imagePreview.style.maxHeight = '200px';
            imagePreview.style.borderRadius = '5px';
            uploadBox.appendChild(imagePreview);
            
            // Активируем кнопку
            submitBtn.disabled = false;
        };
        reader.readAsDataURL(selectedFile);
    }
});

// Функция для показа индикатора загрузки
function showLoading() {
    document.body.appendChild(loadingIndicator);
}

// Функция для скрытия индикатора загрузки
function hideLoading() {
    if (document.body.contains(loadingIndicator)) {
        document.body.removeChild(loadingIndicator);
    }
}

// Функция для преобразования текста Markdown в HTML
function markdownToHtml(markdown) {
    // Замена заголовков
    let html = markdown
        .replace(/^# (.*$)/gm, '<h2>$1</h2>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        .replace(/^### (.*$)/gm, '<h4>$1</h4>');
    
    // Замена выделений
    html = html
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Замена списков
    html = html
        .replace(/^\s*- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');
    
    // Замена параграфов (пустые строки разделяют параграфы)
    html = html
        .replace(/\n\n/g, '</p><p>')
        .replace(/^([^<].*$)/gm, '<p>$1</p>');
    
    // Удаление лишних параграфов
    html = html
        .replace(/<p><\/p>/g, '')
        .replace(/<p><(h|ul)/g, '<$1')
        .replace(/<\/(h|ul)><\/p>/g, '</$1>');
    
    return html;
}

// Обработчик отправки формы
submitBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        alert('Пожалуйста, выберите изображение');
        return;
    }
    
    // Показываем индикатор загрузки
    showLoading();
    
    // Собираем данные формы
    const occasion = document.getElementById('occasion').value;
    const preferences = document.getElementById('preferences').value;
    
    try {
        // Создаем объект FormData для отправки файла
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('occasion', occasion);
        formData.append('preferences', preferences);
        
        // В реальной версии здесь будет запрос к серверу API
        // const response = await fetch(`${API_URL}/analyze-outfit`, {
        //     method: 'POST',
        //     body: formData
        // });
        // const data = await response.json();
        
        // Заглушка для тестирования (эмуляция ответа от сервера)
        // Имитируем задержку ответа от сервера
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const data = {
            status: 'success',
            advice: `
# Анализ вашей одежды

## Описание
На изображении представлена классическая белая блуза с V-образным вырезом и длинными рукавами. Материал выглядит как легкий хлопок или шелковая смесь.

## Оценка для повода "${occasion}"
Эта блуза является универсальным предметом гардероба и подходит для многих случаев, включая "${occasion}". ${occasion === 'work' ? 'Для офиса она создаст профессиональный образ' : occasion === 'date' ? 'Для свидания она может стать основой романтичного наряда' : occasion === 'party' ? 'Для вечеринки её можно дополнить яркими аксессуарами' : 'Для повседневных выходов она создаст элегантный кэжуал'}.

## Рекомендации по сочетанию
- **Для работы/офиса**: Сочетайте с классическими брюками или юбкой-карандаш темно-синего или черного цвета.
- **Для повседневного образа**: Подойдут джинсы или цветные брюки, можно заправить блузу или оставить навыпуск.
- **Для вечернего выхода**: Комбинируйте с элегантной юбкой миди или узкими брюками и добавьте яркие аксессуары.

## Советы по аксессуарам
- Добавьте ожерелье средней длины, которое будет хорошо смотреться с V-образным вырезом
- Элегантные серьги подчеркнут образ
- Для придания образу цвета можно использовать яркий шарф или платок
- Пояс на талии поможет подчеркнуть силуэт

Эта блуза - прекрасная базовая вещь, которая послужит основой для множества разнообразных образов.
            `
        };
        
        // Скрываем индикатор загрузки
        hideLoading();
        
        // Показываем результат
        mainSection.style.display = 'none';
        resultSection.style.display = 'block';
        
        // Преобразуем markdown в HTML и заполняем контент
        resultContent.innerHTML = markdownToHtml(data.advice);
        
        // Отправляем данные в Telegram
        tgApp.sendData(JSON.stringify({
            action: 'consultation_result',
            occasion: occasion,
            preferences: preferences
        }));
        
    } catch (error) {
        // Скрываем индикатор загрузки
        hideLoading();
        
        // Показываем ошибку
        alert('Произошла ошибка при отправке изображения. Пожалуйста, попробуйте позже.');
        console.error('Error:', error);
    }
});

// Обработчик кнопки "Новая консультация"
newConsultationBtn.addEventListener('click', () => {
    // Сбрасываем форму
    fileInput.value = '';
    selectedFile = null;
    
    if (imagePreview) {
        uploadBox.removeChild(imagePreview);
    }
    
    uploadIcon.style.display = 'block';
    uploadBox.querySelector('p').style.display = 'block';
    document.getElementById('occasion').value = 'everyday';
    document.getElementById('preferences').value = '';
    submitBtn.disabled = true;
    
    // Показываем основную секцию
    mainSection.style.display = 'block';
    resultSection.style.display = 'none';
});

// Событие при закрытии окна
tgApp.onEvent('viewportChanged', () => {
    if (!tgApp.isExpanded) {
        tgApp.expand();
    }
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Настройка темы в соответствии с Telegram
    document.body.style.backgroundColor = tgApp.backgroundColor;
    
    // Если в Telegram используется темная тема
    if (tgApp.colorScheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
});