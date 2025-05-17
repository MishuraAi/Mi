"""
ИИ СТИЛИСТ - ВЕРСИЯ: 0.3.1
ФАЙЛ: gemini_ai.py
НАЗНАЧЕНИЕ: Модуль для анализа одежды на фотографиях с использованием Gemini AI
ДАТА ОБНОВЛЕНИЯ: 2025-05-17

МЕТОДОЛОГИЯ ОБНОВЛЕНИЯ КОДА:
При внесении любых изменений в этот файл необходимо предоставлять полный код файла целиком,
а не только изменившиеся части. Это обеспечивает целостность кода и исключает ошибки интеграции.

ТЕКУЩЕЕ СОСТОЯНИЕ:
- Реализована интеграция с Gemini AI
- Настроен промпт для анализа одежды
- Добавлена обработка различных форматов изображений
- Добавлено кэширование результатов для оптимизации
- Улучшена обработка ошибок и диагностика проблем API
- Добавлены механизмы повторных попыток при ошибках
- Добавлена функция сравнения нескольких предметов одежды

СЛЕДУЮЩИЕ ШАГИ:
- Добавить агрегацию знаний о трендах из внешних источников
- Реализовать персонализацию рекомендаций на основе истории пользователя
- Добавить режим экспресс-анализа для быстрых консультаций
"""

import os
import logging
import base64
import time
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image, ImageOps
from io import BytesIO
from cache_manager import AnalysisCacheManager

# Настройка логирования
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
logger.info(f"Gemini API Key loaded: {'Yes' if GEMINI_API_KEY else 'No'}")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY не найден в .env файле")

# Полные имена моделей (с префиксом "models/")
VISION_MODEL = "models/gemini-1.5-flash"  # Актуальная модель для анализа изображений

# Максимальное количество попыток при ошибках API
MAX_RETRIES = 3
# Время ожидания между повторными попытками (в секундах)
RETRY_DELAY = 2

# КОМПОНЕНТ: Инициализация Gemini API
# СТАТУС: Обновлено
# ИЗМЕНЕНО: 2025-05-16
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY не найден в .env файле")
else:
    try:
        # Конфигурация Gemini API
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Gemini API успешно настроен")
        
        # Тестовое соединение с API
        try:
            model = genai.GenerativeModel("models/gemini-1.5-flash")
            response = model.generate_content("Test connection")
            if response and response.text:
                logger.info("Тестовое соединение с Gemini API успешно")
            else:
                logger.error("Тестовое соединение с Gemini API не вернуло текста")
        except Exception as e:
            logger.error(f"Ошибка при тестовом соединении с Gemini API: {e}")
    except Exception as e:
        logger.error(f"Ошибка при инициализации Gemini API: {e}")

# Инициализация менеджера кэша
cache_manager = AnalysisCacheManager()
logger.info("Менеджер кэша инициализирован")

# КОМПОНЕНТ: Тестирование соединения с Gemini API
# СТАТУС: Добавлено
# ИЗМЕНЕНО: 2025-05-16
async def test_gemini_connection():
    """
    Тестирует соединение с Gemini API
    
    Returns:
        tuple: (bool, str) - (успех, сообщение)
    """
    if not GEMINI_API_KEY:
        return False, "API ключ не настроен. Добавьте GEMINI_API_KEY в .env файл."
    
    try:
        # Конфигурация API
        genai.configure(api_key=GEMINI_API_KEY)
        
        # Попытка создать простой запрос без изображения
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        response = model.generate_content("Test connection")
        
        if response and response.text:
            return True, "Соединение с Gemini API работает нормально."
        else:
            return False, "API не вернул ответ на тестовый запрос."
    except Exception as e:
        return False, f"Ошибка при тестировании соединения с Gemini API: {str(e)}"

# КОМПОНЕНТ: Обработка ошибок Gemini API
# СТАТУС: Добавлено
# ИЗМЕНЕНО: 2025-05-16
def handle_gemini_error(error):
    """
    Преобразует технические ошибки API в понятные сообщения для пользователя
    
    Args:
        error: Исключение, полученное при вызове API
        
    Returns:
        str: Пользовательское сообщение об ошибке
    """
    error_str = str(error).lower()
    
    if "api key" in error_str or "authentication" in error_str or "auth" in error_str:
        return "Ошибка аутентификации API. Пожалуйста, сообщите администратору о необходимости проверить API ключ."
    
    elif "rate limit" in error_str or "quota" in error_str:
        return "Превышен лимит запросов к API. Пожалуйста, попробуйте позже."
    
    elif "invalid image" in error_str or "unsupported format" in error_str:
        return "Формат изображения не поддерживается. Пожалуйста, загрузите фото в формате JPG или PNG."
    
    elif "too large" in error_str or "size limit" in error_str:
        return "Изображение слишком большое. Пожалуйста, загрузите фото меньшего размера."
    
    elif "timeout" in error_str or "deadline exceeded" in error_str:
        return "Время обработки запроса превышено. Пожалуйста, загрузите другое фото или попробуйте позже."
    
    elif "service unavailable" in error_str or "server error" in error_str:
        return "Сервис временно недоступен. Пожалуйста, попробуйте позже."
    
    elif "content filtered" in error_str or "safety" in error_str:
        return "Изображение не может быть обработано из-за ограничений содержания. Пожалуйста, загрузите другое фото."
    
    elif "network" in error_str or "connection" in error_str:
        return "Проблемы с сетевым соединением при обращении к API. Пожалуйста, проверьте подключение к интернету."
    
    else:
        logger.error(f"Необработанная ошибка Gemini API: {error}")
        return f"Ошибка при обработке изображения: {str(error)}"

# КОМПОНЕНТ: Оптимизация изображения перед отправкой
# СТАТУС: Обновлено
# ИЗМЕНЕНО: 2025-05-16
def optimize_image(img, max_size=1024, quality=85):
    """
    Оптимизирует изображение для отправки в API:
    - Изменяет размер, сохраняя пропорции
    - Конвертирует в RGB
    - Оптимизирует качество для уменьшения размера файла
    
    Args:
        img: PIL.Image объект
        max_size: Максимальный размер наибольшей стороны
        quality: Качество JPEG сжатия (1-100)
        
    Returns:
        bytes: Оптимизированное изображение в формате байтов
    """
    try:
        # Проверка размера изображения
        width, height = img.size
        
        # Изменение размера с сохранением пропорций, если нужно
        if width > max_size or height > max_size:
            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))
            img = img.resize((new_width, new_height), Image.LANCZOS)
            logger.info(f"Изображение изменено до размера {new_width}x{new_height}")
        
        # Конвертация в RGB если нужно
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            img = img.convert('RGB')
            logger.info(f"Изображение конвертировано из {img.mode} в RGB")
        
        # Автокоррекция и улучшение
        img = ImageOps.autocontrast(img)
        
        # Сохранение в формате JPEG с указанным качеством
        img_byte_arr = BytesIO()
        img.save(img_byte_arr, format='JPEG', quality=quality, optimize=True)
        img_bytes = img_byte_arr.getvalue()
        
        logger.info(f"Изображение оптимизировано, итоговый размер: {len(img_bytes) / 1024:.1f} KB")
        return img_bytes
    
    except Exception as e:
        logger.error(f"Ошибка при оптимизации изображения: {e}")
        raise ValueError(f"Не удалось оптимизировать изображение: {str(e)}")

# КОМПОНЕНТ: Формирование промпта для анализа одежды
# СТАТУС: Улучшено
# ИЗМЕНЕНО: 2025-05-16
def create_analysis_prompt(occasion, preferences=None):
    """
    Создает детальный промпт для анализа одежды для Gemini,
    с улучшенной структурой и инструкциями
    
    Args:
        occasion: Повод/случай для одежды
        preferences: Дополнительные предпочтения пользователя
        
    Returns:
        str: Промпт для Gemini
    """
    # Улучшенный базовый промпт для анализа
    prompt = f"""
    # Запрос на анализ предмета одежды

    ## Роль и задача
    Ты - профессиональный стилист с 15-летним опытом работы, эксперт в современной моде, трендах 2025 года и классических принципах стилистики. 
    Проанализируй предмет одежды на фотографии и дай детальные, персонализированные рекомендации.

    ## Входные данные
    - **Фотография**: Предмет одежды, который нужно проанализировать
    - **Повод/ситуация**: {occasion}
    {f'- **Предпочтения пользователя**: {preferences}' if preferences else ''}

    ## Инструкции по анализу
    Выполни профессиональный анализ, учитывая:
    1. **Определение**: Точно определи тип, фасон, крой, материал и цветовую гамму предмета
    2. **Стиль**: Определи к какому стилевому направлению относится предмет (классический, кэжуал, спортивный, бохо и т.д.)
    3. **Сезонность**: Определи сезон ношения (лето, зима, демисезон, всесезонный)
    4. **Цветотип**: Определи, каким цветотипам подходит этот предмет (если возможно определить)
    5. **Универсальность**: Оцени насколько универсален этот предмет (можно ли носить в разных ситуациях)
    6. **Повод**: Оцени соответствие указанному поводу ({occasion})
    7. **Тренды**: Соотнеси с актуальными трендами 2025 года
    8. **Особенности**: Отметь особенности, которые делают этот предмет интересным или уникальным

    ## Рекомендации
    Предоставь конкретные, практические рекомендации:
    1. **Сочетания**: С чем конкретно сочетать (верх/низ, обувь, верхняя одежда) - с указанием типов, фасонов и цветов
    2. **Аксессуары**: Какие конкретные аксессуары дополнят образ (украшения, сумки, шарфы, очки и т.д.)
    3. **Многослойность**: Варианты слоев в образе (если применимо)
    4. **Случаи**: Для каких других случаев подходит эта вещь, кроме указанного
    5. **Уход**: Рекомендации по уходу за вещью (если можно определить по материалу)

    ## Формат ответа
    Предоставь анализ в следующем формате Markdown:
    
    # Анализ вашей одежды
    
    ## Описание
    [Детальное описание предмета одежды: тип, цвет, фасон, материал, стиль. Опиши видимые детали, особенности кроя и дизайнерские элементы]
    
    ## Оценка для {occasion}
    [Насколько этот предмет подходит для указанного повода. Конкретные рекомендации, как можно адаптировать его для данной ситуации]
    
    ## Рекомендации по сочетанию
    - [3-5 конкретных сочетаний с описанием верха/низа/обуви/верхней одежды]
    - [Для каждого сочетания укажи конкретные цвета, фасоны и стили]
    - [Предложи несколько разных вариантов образов с этой вещью]
    
    ## Советы по аксессуарам
    - [3-4 конкретных рекомендации по аксессуарам: украшения, сумки, ремни, шарфы, головные уборы]
    - [Для каждого аксессуара укажи стиль, цвет и материал]
    
    ## Дополнительные рекомендации
    - [Сезонные особенности ношения]
    - [Советы по уходу за вещью]
    - [Актуальные тренды, связанные с этим типом одежды]
    - [Альтернативные поводы, для которых подходит эта вещь]
    
    ## Важно:
    - Будь конкретным, указывай цвета, фасоны и материалы
    - Пиши профессионально, но доступно
    - Избегай общих фраз и банальных советов
    - Сосредоточься именно на том предмете, который виден на фото
    - Если какой-то параметр невозможно определить по фото, укажи это
    """
    
    return prompt

# КОМПОНЕНТ: Создание промпта для сравнения одежды
# СТАТУС: Добавлено
# ИЗМЕНЕНО: 2025-05-17
def create_comparison_prompt(occasion, preferences=None):
    """
    Создает промпт для сравнения нескольких предметов одежды
    
    Args:
        occasion: Повод/случай для одежды
        preferences: Дополнительные предпочтения пользователя
        
    Returns:
        str: Промпт для Gemini
    """
    prompt = f"""
    # Запрос на сравнительный анализ нескольких предметов одежды

    ## Роль и задача
    Ты - профессиональный стилист с 15-летним опытом работы. Тебе предоставлены фотографии нескольких предметов одежды. 
    Твоя задача - провести детальный сравнительный анализ и определить, какой из вариантов лучше всего подходит для указанного случая.

    ## Входные данные
    - **Фотографии**: Несколько предметов одежды для сравнения
    - **Повод/ситуация**: {occasion}
    {f'- **Предпочтения пользователя**: {preferences}' if preferences else ''}

    ## Инструкции по анализу
    1. **Описание каждого предмета**: Кратко опиши каждый из предметов (тип, цвет, фасон, стиль)
    2. **Сравнительный анализ**: Проведи сравнение предметов по следующим критериям:
       - Соответствие указанному поводу
       - Универсальность и функциональность
       - Сочетаемость с другими предметами гардероба
       - Актуальность в текущем сезоне
       - Соответствие модным трендам 2025 года
    3. **Ранжирование**: Расположи предметы в порядке от наиболее до наименее подходящего для указанного повода
    4. **Рекомендации**: Дай обоснованный ответ, какой вариант лучше выбрать и почему

    ## Формат ответа
    Предоставь анализ в следующем формате Markdown:
    
    # Сравнительный анализ предметов одежды
    
    ## Обзор предметов
    1. **Предмет 1**: [Краткое описание]
    2. **Предмет 2**: [Краткое описание]
    (и так далее для всех предметов)
    
    ## Сравнительный анализ
    [Подробное сравнение предметов по указанным критериям]
    
    ## Рейтинг для {occasion}
    1. **Лучший выбор**: [Предмет X] - [Причины]
    2. **Второй по предпочтительности**: [Предмет Y] - [Причины]
    (и так далее для всех предметов)
    
    ## Рекомендация
    [Окончательная рекомендация с обоснованием, какой предмет лучше всего подходит для указанного повода]
    
    ## Советы по сочетанию
    [3-5 рекомендаций, с чем лучше всего сочетать рекомендованный предмет]
    
    ## Важно:
    - Будь конкретным, давай обоснованную оценку каждому предмету
    - Учитывай указанный повод и предпочтения пользователя
    - Избегай общих фраз и предоставь действительно полезный сравнительный анализ
    """
    
    return prompt

# КОМПОНЕНТ: Анализ изображения одежды
# СТАТУС: Улучшено
# ИЗМЕНЕНО: 2025-05-16
# ЗАВИСИМОСТИ: Gemini AI API, AnalysisCacheManager
async def analyze_clothing_image(image_data, occasion, preferences=None):
    """
    Анализ изображения одежды с помощью Gemini с улучшенной обработкой ошибок и кэшированием
    
    Args:
        image_data: Бинарные данные изображения
        occasion: Повод/случай для одежды
        preferences: Дополнительные предпочтения пользователя
    
    Returns:
        str: Анализ и рекомендации по стилю в формате Markdown
    """
    try:
        logger.info(f"Начало анализа изображения для повода: {occasion}")
        
        # Проверяем, что ключ API установлен
        if not GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY не найден в конфигурации")
            return "Ошибка конфигурации Gemini API. API ключ не настроен. Пожалуйста, сообщите администратору о необходимости добавить GEMINI_API_KEY в .env файл."
        
        # Проверяем наличие результата в кэше
        cached_result = cache_manager.get_from_cache(image_data, occasion, preferences)
        if cached_result:
            logger.info("Использован кэшированный результат анализа")
            return cached_result
        
        # Преобразование бинарных данных в изображение
        try:
            img = Image.open(BytesIO(image_data))
            logger.info(f"Изображение успешно загружено, размер: {img.size}, формат: {img.format}, режим: {img.mode}")
        except Exception as e:
            logger.error(f"Не удалось открыть изображение: {e}")
            return f"Ошибка при обработке изображения. Возможно, файл поврежден или имеет неподдерживаемый формат. Подробности: {str(e)}"
        
        # Оптимизация изображения
        try:
            img_bytes = optimize_image(img)
        except Exception as e:
            logger.error(f"Ошибка при оптимизации изображения: {e}")
            return f"Не удалось оптимизировать изображение для анализа. Пожалуйста, попробуйте загрузить другое фото. Подробности: {str(e)}"
        
        # Создание промпта для Gemini
        prompt = create_analysis_prompt(occasion, preferences)
        
        logger.info("Отправка запроса к Gemini API...")
        
        # Реализация повторных попыток при ошибках
        retry_count = 0
        last_error = None
        
        while retry_count < MAX_RETRIES:
            try:
                # Переконфигурируем API перед каждым запросом для уверенности
                genai.configure(api_key=GEMINI_API_KEY)
                
                # Создаем экземпляр модели
                model = genai.GenerativeModel(VISION_MODEL)
                
                # Отправка запроса к Gemini
                parts = [prompt, {"mime_type": "image/jpeg", "data": img_bytes}]
                response = model.generate_content(parts)
                
                # Проверка на наличие ответа
                if not response.text:
                    raise ValueError("Gemini не вернул текстовый ответ")
                
                logger.info(f"Получен ответ от Gemini, длина: {len(response.text)} символов")
                
                # Сохраняем результат в кэш
                cache_manager.save_to_cache(image_data, occasion, response.text, preferences)
                
                return response.text
            
            except Exception as e:
                retry_count += 1
                last_error = e
                logger.warning(f"Попытка {retry_count}/{MAX_RETRIES} не удалась: {e}")
                
                if retry_count < MAX_RETRIES:
                    logger.info(f"Ожидание {RETRY_DELAY} сек перед следующей попыткой...")
                    time.sleep(RETRY_DELAY)
        
        # Если все попытки не удались
        logger.error(f"Все попытки запроса к Gemini не удались: {last_error}")
        return handle_gemini_error(last_error)
    
    except Exception as e:
        logger.error(f"Ошибка при анализе изображения с Gemini: {e}")
        return f"Произошла неожиданная ошибка при обработке запроса: {str(e)}"

# КОМПОНЕНТ: Сравнительный анализ нескольких изображений одежды
# СТАТУС: Добавлено
# ИЗМЕНЕНО: 2025-05-17
async def compare_clothing_images(image_data_list, occasion, preferences=None):
    """
    Сравнительный анализ нескольких изображений одежды с помощью Gemini
    
    Args:
        image_data_list: Список с бинарными данными изображений
        occasion: Повод/случай для одежды
        preferences: Дополнительные предпочтения пользователя
    
    Returns:
        str: Сравнительный анализ и рекомендации в формате Markdown
    """
    try:
        logger.info(f"Начало сравнительного анализа {len(image_data_list)} изображений для повода: {occasion}")
        
        # Проверяем, что ключ API установлен
        if not GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY не найден в конфигурации")
            return "Ошибка конфигурации Gemini API. API ключ не настроен."
        
        # Ограничение по количеству изображений
        if len(image_data_list) < 2:
            return "Для сравнения необходимо не менее 2 изображений"
        
        if len(image_data_list) > 5:
            return "Для сравнения можно использовать не более 5 изображений"
        
        # Оптимизация всех изображений
        optimized_images = []
        for i, img_data in enumerate(image_data_list):
            try:
                # Преобразование бинарных данных в изображение
                img = Image.open(BytesIO(img_data))
                logger.info(f"Изображение {i+1} успешно загружено, размер: {img.size}")
                
                # Оптимизация изображения
                img_bytes = optimize_image(img)
                optimized_images.append({"mime_type": "image/jpeg", "data": img_bytes})
                
            except Exception as e:
                logger.error(f"Ошибка при обработке изображения {i+1}: {e}")
                return f"Ошибка при обработке изображения {i+1}. Пожалуйста, проверьте формат и размер файла."
        
        # Создание промпта для Gemini
        prompt = create_comparison_prompt(occasion, preferences)
        
        logger.info(f"Отправка запроса на сравнение {len(optimized_images)} изображений в Gemini API...")
        
        # Реализация повторных попыток при ошибках
        retry_count = 0
        last_error = None
        
        while retry_count < MAX_RETRIES:
            try:
                # Переконфигурируем API перед каждым запросом
                genai.configure(api_key=GEMINI_API_KEY)
                
                # Создаем экземпляр модели
                model = genai.GenerativeModel(VISION_MODEL)
                
                # Формируем запрос с несколькими изображениями
                # Первым элементом идет текстовый промпт, затем все изображения
                parts = [prompt] + optimized_images
                
                # Отправка запроса к Gemini
                response = model.generate_content(parts)
                
                # Проверка на наличие ответа
                if not response.text:
                    raise ValueError("Gemini не вернул текстовый ответ")
                
                logger.info(f"Получен ответ от Gemini, длина: {len(response.text)} символов")
                
                return response.text
            
            except Exception as e:
                retry_count += 1
                last_error = e
                logger.warning(f"Попытка {retry_count}/{MAX_RETRIES} не удалась: {e}")
                
                if retry_count < MAX_RETRIES:
                    logger.info(f"Ожидание {RETRY_DELAY} сек перед следующей попыткой...")
                    time.sleep(RETRY_DELAY)
        
        # Если все попытки не удались
        logger.error(f"Все попытки запроса к Gemini не удались: {last_error}")
        return handle_gemini_error(last_error)
    
    except Exception as e:
        logger.error(f"Ошибка при сравнительном анализе изображений: {e}")
        return f"Произошла неожиданная ошибка при обработке запроса: {str(e)}"

# КОМПОНЕНТ: Анализ изображения из файла
# СТАТУС: Улучшено
# ИЗМЕНЕНО: 2025-05-16
# ЗАВИСИМОСТИ: analyze_clothing_image
async def analyze_clothing_file(file_path, occasion, preferences=None):
    """
    Анализ изображения одежды из файла с помощью Gemini
    
    Args:
        file_path: Путь к файлу изображения
        occasion: Повод/случай для одежды
        preferences: Дополнительные предпочтения пользователя
    
    Returns:
        str: Анализ и рекомендации по стилю в формате Markdown
    """
    try:
        logger.info(f"Анализ файла: {file_path}")
        
        # Проверка существования файла
        if not os.path.exists(file_path):
            logger.error(f"Файл не найден: {file_path}")
            return "Ошибка: Файл не найден"
        
        # Чтение файла
        try:
            with open(file_path, "rb") as image_file:
                image_data = image_file.read()
        except Exception as e:
            logger.error(f"Ошибка при чтении файла: {e}")
            return f"Ошибка при чтении файла. Подробности: {str(e)}"
            
        # Анализ изображения
        return await analyze_clothing_image(image_data, occasion, preferences)
    
    except Exception as e:
        logger.error(f"Ошибка при анализе файла: {e}")
        return f"Произошла ошибка при обработке файла. Подробности: {str(e)}"

# Простой тест, если файл запущен напрямую
if __name__ == "__main__":
    import asyncio
    import sys
    
    async def test_gemini():
        print("Тестирование Gemini API...")
        print(f"API ключ установлен: {'Да' if GEMINI_API_KEY else 'Нет'}")
        
        if not GEMINI_API_KEY:
            print("ОШИБКА: API ключ не установлен в .env файле")
            return
        
        # Проверка соединения
        connection_test, message = await test_gemini_connection()
        print(f"Тест соединения: {'УСПЕШНО' if connection_test else 'ОШИБКА'}")
        print(f"Сообщение: {message}")
        
        if not connection_test:
            print("Пропуск дальнейших тестов из-за ошибки соединения.")
            return
            
        # Список доступных моделей
        try:
            models = genai.list_models()
            print("Доступные модели:")
            for model in models:
                print(f"• {model.name}")
        except Exception as e:
            print(f"ОШИБКА при получении списка моделей: {e}")
        
        # Тестируем модель Gemini
        try:
            print(f"\nТестирование {VISION_MODEL}...")
            # Создаем простое тестовое изображение
            from PIL import Image, ImageDraw
            
            # Создаем простое тестовое изображение
            img = Image.new('RGB', (100, 100), color = (73, 109, 137))
            d = ImageDraw.Draw(img)
            d.rectangle([(20, 20), (80, 80)], fill=(255, 255, 255))
            
            # Сохраняем во временный файл
            img_path = "test_image.jpg"
            img.save(img_path)
            
            with open(img_path, "rb") as f:
                test_result = await analyze_clothing_file(img_path, "повседневный")
                print(f"Результат анализа: {test_result[:100]}...")
        except Exception as e:
            print(f"ОШИБКА при тестировании: {e}")
    
    asyncio.run(test_gemini())