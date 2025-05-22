"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Интеграция с Gemini AI (gemini_ai.py)
ВЕРСИЯ: 0.3.2 (Добавлена функция виртуальной примерки)
ДАТА ОБНОВЛЕНИЯ: 2025-05-22

МЕТОДОЛОГИЯ РАБОТЫ И ОБНОВЛЕНИЯ КОДА:
1.  Целостность Обновлений: Любые изменения файлов предоставляются целиком.
    Частичные изменения кода не допускаются для обеспечения стабильности интеграции.
2.  Язык Коммуникации: Комментарии и документация ведутся на русском языке.
3.  Стандарт Качества: Данный код является частью проекта "МИШУРА", разработанного
    с применением высочайших стандартов программирования и дизайна, соответствуя
    уровню лучших мировых практик.

НАЗНАЧЕНИЕ ФАЙЛА:
Модуль для взаимодействия с Google Gemini AI. Включает функции для анализа
одежды по фотографиям, сравнения образов, генерации стилистических рекомендаций
и виртуальной примерки одежды. Использует кэширование для оптимизации запросов.
==========================================================================================
"""
import os
import logging
import time
import asyncio # Для асинхронных операций и задержек
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image, ImageOps, ImageDraw # ImageDraw для тестового блока
from io import BytesIO
from typing import Optional, List, Tuple, Union, Dict, Any
from fastapi import UploadFile  # Добавлен импорт UploadFile
from cache_manager import AnalysisCacheManager # Предполагаем, что он есть и работает

# Настройка логирования
logger_gemini = logging.getLogger(__name__)
if not logger_gemini.handlers: # Предотвращение многократного добавления обработчиков
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - [%(levelname)s] - %(name)s - [%(funcName)s:%(lineno)d] %(message)s'
    )

logger_gemini.info("Инициализация модуля интеграции с Gemini AI для проекта МИШУРА.")

# Загрузка переменных окружения
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Конфигурация Gemini API
API_CONFIGURED_SUCCESSFULLY = False
if not GEMINI_API_KEY:
    logger_gemini.critical("КРИТИЧЕСКАЯ ОШИБКА: GEMINI_API_KEY не найден в .env файле или переменных окружения.")
    raise ValueError("GEMINI_API_KEY не найден в .env файле или переменных окружения. Пожалуйста, добавьте его в .env файл.")
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        API_CONFIGURED_SUCCESSFULLY = True
        logger_gemini.info("Gemini API успешно сконфигурирован.")
    except Exception as e:
        logger_gemini.critical(f"КРИТИЧЕСКАЯ ОШИБКА при конфигурации Gemini API: {e}", exc_info=True)
        raise RuntimeError(f"Не удалось сконфигурировать Gemini API: {str(e)}")

# Модели Gemini
VISION_MODEL = "models/gemini-1.5-flash"  # Используем актуальную модель

# Параметры повторных запросов
MAX_RETRIES = 3
RETRY_DELAY = 5 # Немного увеличена задержка для стабильности

# Инициализация менеджера кэша
CACHE_ENABLED = False # По умолчанию кэш выключен, если менеджер не инициализируется
cache_manager = None
try:
    cache_manager = AnalysisCacheManager() # Используем параметры по умолчанию из cache_manager.py
    CACHE_ENABLED = True
    logger_gemini.info("Менеджер кэша AnalysisCacheManager успешно инициализирован.")
except ImportError:
    logger_gemini.warning("Модуль cache_manager.py не найден. Кэширование будет ОТКЛЮЧЕНО.")
    class DummyCacheManager: # Заглушка для работы без кэша
        def get_from_cache(self, *args: Any, **kwargs: Any) -> None: 
            logger_gemini.debug("DummyCache: get_from_cache вызван.")
            return None
        def save_to_cache(self, *args: Any, **kwargs: Any) -> None: 
            logger_gemini.debug("DummyCache: save_to_cache вызван.")
    cache_manager = DummyCacheManager()
except Exception as e_cache:
    logger_gemini.error(f"Ошибка при инициализации AnalysisCacheManager: {e_cache}. Кэширование будет ОТКЛЮЧЕНО.", exc_info=True)
    if not isinstance(cache_manager, DummyCacheManager): # Если заглушка не была создана
        class DummyCacheManagerOnError:
            def get_from_cache(self, *args: Any, **kwargs: Any) -> None: 
                logger_gemini.debug("DummyCacheOnError: get_from_cache вызван.")
                return None
            def save_to_cache(self, *args: Any, **kwargs: Any) -> None: 
                logger_gemini.debug("DummyCacheOnError: save_to_cache вызван.")
        cache_manager = DummyCacheManagerOnError()


async def test_gemini_connection() -> Tuple[bool, str]:
    """
    Тестирует соединение с Gemini API.
    
    Returns:
        Tuple[bool, str]: Кортеж из двух элементов:
            - bool: True если соединение успешно, False в случае ошибки
            - str: Сообщение о результате теста или описание ошибки
    """
    logger_gemini.debug("Вызов функции test_gemini_connection.")
    if not API_CONFIGURED_SUCCESSFULLY:
        logger_gemini.error("Тест соединения: Gemini API не сконфигурирован.")
        return False, "Gemini API не сконфигурирован (отсутствует API ключ или ошибка инициализации)."
    try:
        model = genai.GenerativeModel(VISION_MODEL)
        # Используем простой текстовый запрос для проверки доступности модели
        response = await model.generate_content_async("Это тест соединения с Gemini API. Ответь кратко.")
        if response and response.text:
            logger_gemini.info(f"Тестовое соединение с Gemini API ({VISION_MODEL}) успешно. Ответ: {response.text[:50]}...")
            return True, f"Соединение с Gemini API ({VISION_MODEL}) работает нормально."
        else:
            # Анализ возможных причин отсутствия текста в ответе
            reason_message = "API не вернул текстовый ответ."
            if response and response.prompt_feedback and response.prompt_feedback.block_reason:
                reason_message += f" Причина блокировки промпта: {response.prompt_feedback.block_reason_message or response.prompt_feedback.block_reason}."
            elif response and response.candidates and not response.text:
                 if response.candidates[0].finish_reason:
                     reason_message += f" Причина завершения генерации: {response.candidates[0].finish_reason.name}."

            logger_gemini.error(f"Тестовое соединение с Gemini API не вернуло ожидаемый текст. {reason_message} Полный ответ: {response}")
            return False, f"API не вернул текстовый ответ на тестовый запрос. {reason_message}"
    except Exception as e:
        logger_gemini.error(f"Ошибка при тестовом соединении с Gemini API: {e}", exc_info=True)
        return False, f"Ошибка при тестировании соединения с Gemini API: {str(e)}"

def handle_gemini_error(error: Exception, context: str = "Gemini AI") -> str:
    """Обработка ошибок Gemini API с понятными сообщениями для пользователя."""
    error_str = str(error).lower()
    logger_gemini.error(f"Ошибка {context}: {type(error).__name__} - {error_str}")
    
    # Проверяем наличие ключевых слов в сообщении об ошибке
    if "api key" in error_str or "authentication" in error_str:
        return "Ошибка аутентификации API. Пожалуйста, проверьте ваш API ключ."
    elif "content filtered" in error_str:
        return "Извините, изображение не может быть обработано из-за ограничений безопасности."
    elif "deadline" in error_str:
        return "Превышено время ожидания ответа от сервера. Пожалуйста, попробуйте еще раз."
    elif "resource exhausted" in error_str:
        return "Превышен лимит запросов. Пожалуйста, попробуйте позже."
    else:
        return f"Произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз. ({type(error).__name__})"


def optimize_image(img_pil: Image.Image, max_size: int = 1024, quality: int = 85, format: str = 'JPEG') -> bytes:
    """
    Оптимизирует изображение PIL.Image для отправки в API.
    Изменяет размер, конвертирует в RGB (удаляя альфа-канал), применяет автоконтраст
    и сохраняет в указанном формате (по умолчанию JPEG) с заданным качеством.

    Args:
        img_pil (Image.Image): Объект PIL.Image для оптимизации
        max_size (int): Максимальный размер большей стороны изображения
        quality (int): Качество сохранения для JPEG (1-95)
        format (str): Формат сохранения ('JPEG', 'PNG')

    Returns:
        bytes: Оптимизированные бинарные данные изображения
    
    Raises:
        ValueError: Если не удалось оптимизировать изображение
        IOError: При ошибках ввода-вывода при сохранении изображения
    """
    logger_gemini.debug(f"Начало оптимизации изображения: исходный размер {img_pil.size}, режим {img_pil.mode}, целевой формат {format}")
    
    try:
        # 1. Изменение размера (если необходимо) с сохранением пропорций
        original_width, original_height = img_pil.size
        if original_width > max_size or original_height > max_size:
            if original_width > original_height:
                new_width = max_size
                new_height = int(original_height * (max_size / original_width))
            else:
                new_height = max_size
                new_width = int(original_width * (max_size / original_height))
            
            logger_gemini.info(f"Изменение размера изображения с {original_width}x{original_height} до {new_width}x{new_height}")
            img_pil = img_pil.resize((new_width, new_height), Image.Resampling.LANCZOS) # LANCZOS для лучшего качества

        # 2. Конвертация в RGB (если есть альфа-канал или не RGB)
        # Это важно для JPEG и часто для моделей ИИ, которые не ожидают альфа-канал
        if img_pil.mode in ('RGBA', 'LA') or (img_pil.mode == 'P' and 'transparency' in img_pil.info):
            logger_gemini.info(f"Конвертация изображения из режима {img_pil.mode} в RGB для удаления альфа-канала.")
            # Создаем белый фон и накладываем изображение, используя его альфа-канал как маску
            background = Image.new("RGB", img_pil.size, (255, 255, 255))
            img_rgba_for_paste = img_pil.convert("RGBA") # Гарантируем RGBA для доступа к маске
            # Используем альфа-канал изображения как маску
            alpha_mask = img_rgba_for_paste.split()[3] if len(img_rgba_for_paste.split()) == 4 else None
            background.paste(img_rgba_for_paste, mask=alpha_mask)
            img_pil = background
        elif img_pil.mode != 'RGB':
            logger_gemini.info(f"Конвертация изображения из режима {img_pil.mode} в RGB.")
            img_pil = img_pil.convert('RGB')
        
        logger_gemini.debug(f"Изображение после конвертации: режим {img_pil.mode}, размер {img_pil.size}.")

        # 3. Автоконтраст для улучшения четкости (опционально, но часто полезно)
        try:
            img_pil = ImageOps.autocontrast(img_pil, cutoff=0.5) # cutoff может помочь с некоторыми изображениями
            logger_gemini.debug("Автоконтраст применен.")
        except Exception as e_ac:
            logger_gemini.warning(f"Не удалось применить автоконтраст: {e_ac}. Продолжаем без него.")
        
        # 4. Сохранение в байтовый поток в целевом формате
        img_byte_arr = BytesIO()
        save_params = {'optimize': True}
        if format.upper() == 'JPEG':
            save_params['quality'] = quality
        img_pil.save(img_byte_arr, format=format.upper(), **save_params)
        img_byte_arr.seek(0)
        optimized_bytes = img_byte_arr.getvalue()
        
        logger_gemini.info(f"Изображение успешно оптимизировано: размер {len(optimized_bytes)} байт, формат {format.upper()}")
        return optimized_bytes
        
    except Exception as e:
        error_msg = f"Ошибка при оптимизации изображения: {str(e)}"
        logger_gemini.error(error_msg, exc_info=True)
        raise ValueError(error_msg) from e


def create_analysis_prompt(occasion: str, preferences: Optional[str] = None) -> str:
    """
    Создает промпт для анализа одежды на изображении.
    
    Args:
        occasion (str): Повод/ситуация для консультации
        preferences (Optional[str]): Предпочтения пользователя по стилю
        
    Returns:
        str: Сформированный промпт для Gemini API
    """
    base_prompt = f"""
    Проанализируй одежду на изображении и дай рекомендации по стилю для {occasion}.
    Оцени:
    1. Общий стиль и уместность для указанного повода
    2. Цветовую гамму и сочетание цветов
    3. Соответствие фигуре
    4. Возможные улучшения образа
    
    Дай конкретные рекомендации по:
    - Дополнительным предметам гардероба
    - Аксессуарам
    - Обуви
    - Прическе и макияжу
    """
    
    if preferences:
        base_prompt += f"\n\nУчитывай следующие предпочтения пользователя:\n{preferences}"
    
    return base_prompt

def create_comparison_prompt(occasion: str, preferences: Optional[str] = None) -> str:
    """
    Создает промпт для сравнения нескольких образов.
    
    Args:
        occasion (str): Повод/ситуация для консультации
        preferences (Optional[str]): Предпочтения пользователя по стилю
        
    Returns:
        str: Сформированный промпт для Gemini API
    """
    base_prompt = f"""
    Сравни представленные образы для {occasion} и выбери лучший вариант.
    Для каждого образа оцени:
    1. Общий стиль и уместность
    2. Цветовую гамму
    3. Соответствие фигуре
    4. Практичность и комфорт
    
    В конце дай:
    - Рейтинг образов от лучшего к худшему
    - Объяснение выбора лучшего образа
    - Рекомендации по улучшению каждого варианта
    """
    
    if preferences:
        base_prompt += f"\n\nУчитывай следующие предпочтения пользователя:\n{preferences}"
    
    return base_prompt

async def _send_to_gemini_with_retries(parts: List[Any], context_for_log: str) -> str:
    """
    Отправляет запрос к Gemini API с повторными попытками при ошибках.
    
    Args:
        parts (List[Any]): Список частей запроса (текст и/или изображения)
        context_for_log (str): Контекст для логирования
        
    Returns:
        str: Ответ от Gemini API
        
    Raises:
        RuntimeError: Если все попытки запроса завершились неудачей
    """
    logger_gemini.debug(f"Подготовка запроса к Gemini API: {context_for_log}")
    
    for attempt in range(MAX_RETRIES):
        try:
            model = genai.GenerativeModel(VISION_MODEL)
            response = await model.generate_content_async(parts)
            
            if response and response.text:
                logger_gemini.info(f"Успешный ответ от Gemini API ({context_for_log})")
                return response.text
            else:
                error_msg = "API не вернул текстовый ответ"
                if response and response.prompt_feedback and response.prompt_feedback.block_reason:
                    error_msg += f": {response.prompt_feedback.block_reason_message or response.prompt_feedback.block_reason}"
                raise ValueError(error_msg)
                
        except Exception as e:
            logger_gemini.warning(f"Попытка {attempt + 1}/{MAX_RETRIES} не удалась: {str(e)}")
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY)
            else:
                error_msg = handle_gemini_error(e, context_for_log)
                logger_gemini.error(f"Все попытки запроса к Gemini API исчерпаны: {error_msg}")
                raise RuntimeError(error_msg)

async def analyze_clothing_image(image_data: bytes, occasion: str, preferences: Optional[str] = None) -> str:
    """
    Анализирует одежду на изображении с помощью Gemini API.
    
    Args:
        image_data (bytes): Бинарные данные изображения
        occasion (str): Повод/ситуация для консультации
        preferences (Optional[str]): Предпочтения пользователя по стилю
        
    Returns:
        str: Анализ и рекомендации по стилю
        
    Raises:
        RuntimeError: При ошибках взаимодействия с API
        ValueError: При проблемах с обработкой изображения
    """
    logger_gemini.info(f"Начало анализа изображения для повода: {occasion}")
    
    try:
        # Проверяем кэш только если он включен
        if CACHE_ENABLED and cache_manager:
            try:
                cached_result = cache_manager.get_from_cache(image_data, occasion, preferences)
                if cached_result:
                    logger_gemini.info("Результат найден в кэше")
                    return cached_result
            except Exception as cache_error:
                logger_gemini.warning(f"Ошибка при работе с кэшем: {cache_error}. Продолжаем без кэша.")
        
        # Оптимизируем изображение
        img = Image.open(BytesIO(image_data))
        optimized_image = optimize_image(img)
        
        # Создаем промпт
        prompt = create_analysis_prompt(occasion, preferences)
        
        # Отправляем запрос
        response = await _send_to_gemini_with_retries(
            [prompt, {"mime_type": "image/jpeg", "data": optimized_image}],
            f"анализ одежды для {occasion}"
        )
        
        # Сохраняем в кэш только если он включен
        if CACHE_ENABLED and cache_manager:
            try:
                cache_manager.save_to_cache(image_data, occasion, response, preferences)
            except Exception as cache_error:
                logger_gemini.warning(f"Ошибка при сохранении в кэш: {cache_error}. Продолжаем без сохранения в кэш.")
        
        return response
        
    except Exception as e:
        error_msg = handle_gemini_error(e, f"анализ одежды для {occasion}")
        logger_gemini.error(error_msg, exc_info=True)
        raise RuntimeError(error_msg)

async def compare_clothing_images(image_data_list: List[bytes], occasion: str, preferences: Optional[str] = None) -> str:
    """
    Сравнивает несколько образов одежды с помощью Gemini API.
    
    Args:
        image_data_list (List[bytes]): Список бинарных данных изображений
        occasion (str): Повод/ситуация для консультации
        preferences (Optional[str]): Предпочтения пользователя по стилю
        
    Returns:
        str: Сравнительный анализ и рекомендации по стилю
        
    Raises:
        RuntimeError: При ошибках взаимодействия с API
        ValueError: При проблемах с обработкой изображений
    """
    logger_gemini.info(f"Начало сравнения {len(image_data_list)} образов для повода: {occasion}")
    
    try:
        # Проверяем кэш
        if CACHE_ENABLED:
            # Для сравнения используем хеш первого изображения как ключ
            cached_result = cache_manager.get_from_cache(image_data_list[0], occasion, preferences)
            if cached_result:
                logger_gemini.info("Результат сравнения найден в кэше")
                return cached_result
        
        # Оптимизируем изображения
        optimized_images = []
        for img_data in image_data_list:
            img = Image.open(BytesIO(img_data))
            optimized_images.append(optimize_image(img))
        
        # Создаем промпт
        prompt = create_comparison_prompt(occasion, preferences)
        
        # Подготавливаем части запроса
        parts = [prompt]
        for img in optimized_images:
            parts.append({"mime_type": "image/jpeg", "data": img})
        
        # Отправляем запрос
        response = await _send_to_gemini_with_retries(
            parts,
            f"сравнение {len(image_data_list)} образов для {occasion}"
        )
        
        # Сохраняем в кэш
        if CACHE_ENABLED:
            cache_manager.save_to_cache(image_data_list[0], occasion, response, preferences)
        
        return response
        
    except Exception as e:
        error_msg = handle_gemini_error(e, f"сравнение образов для {occasion}")
        logger_gemini.error(error_msg, exc_info=True)
        raise RuntimeError(error_msg)

def _is_error_message(text: str) -> bool:
    """
    Проверяет, является ли текст сообщением об ошибке.
    
    Args:
        text (str): Текст для проверки
        
    Returns:
        bool: True если текст похож на сообщение об ошибке
    """
    error_indicators = [
        "ошибка", "error", "failed", "не удалось", "не получилось",
        "проблема", "problem", "issue", "exception", "исключение"
    ]
    text_lower = text.lower()
    return any(indicator in text_lower for indicator in error_indicators)

async def analyze_clothing_file(file_path: str, occasion: str, preferences: Optional[str] = None) -> str:
    """
    Анализирует одежду на изображении из файла.
    
    Args:
        file_path (str): Путь к файлу изображения
        occasion (str): Повод/ситуация для консультации
        preferences (Optional[str]): Предпочтения пользователя по стилю
        
    Returns:
        str: Анализ и рекомендации по стилю
        
    Raises:
        FileNotFoundError: Если файл не найден
        RuntimeError: При ошибках взаимодействия с API
        ValueError: При проблемах с обработкой изображения
    """
    logger_gemini.info(f"Начало анализа файла {file_path} для повода: {occasion}")
    
    try:
        with open(file_path, 'rb') as f:
            image_data = f.read()
        return await analyze_clothing_image(image_data, occasion, preferences)
    except FileNotFoundError:
        error_msg = f"Файл не найден: {file_path}"
        logger_gemini.error(error_msg)
        raise FileNotFoundError(error_msg)
    except Exception as e:
        error_msg = handle_gemini_error(e, f"анализ файла {file_path}")
        logger_gemini.error(error_msg, exc_info=True)
        raise RuntimeError(error_msg)

def create_virtual_fitting_prompt(style_type: str = "default") -> str:
    """
    Создает промпт для виртуальной примерки одежды на фотографию человека.
    
    Args:
        style_type (str): Тип стиля примерки (default, casual, business, evening)
        
    Returns:
        str: Сформированный промпт для Gemini API
    """
    base_prompt = f"""
    Ты - профессиональный эксперт по цифровой моде и виртуальной примерке одежды.
    
    Задача: Создать реалистичную виртуальную примерку, где одежда со второго изображения будет наложена на фигуру человека с первого изображения.

    Пошаговая инструкция:
    1. Проанализируй антропометрические данные человека на первом изображении:
       - Рост и пропорции тела
       - Положение рук и ног
       - Осанку и позу
       - Особенности фигуры
    
    2. Проанализируй одежду на втором изображении:
       - Тип и стиль одежды
       - Ткань и текстуру
       - Цвет и узор
       - Особенности кроя
    
    3. Выполни виртуальную примерку:
       - Удали существующую одежду с человека на первом изображении
       - Подгони новую одежду под пропорции человека
       - Сохрани естественные складки и посадку
       - Учти освещение и тени с первого изображения
       - Сохрани позу и фон человека неизменными
    
    4. Создай финальное изображение:
       - Одежда должна выглядеть естественно на человеке
       - Сохрани все детали и текстуры оригинальной одежды
       - Учти тип стиля: {style_type}
       - Результат должен быть фотореалистичным
    
    Важно:
    - Сохрани оригинальную позу и фон человека
    - Одежда должна быть идеально подогнана под фигуру
    - Естественные складки и тени должны соответствовать позе
    - Результат должен выглядеть как реальная фотография
    
    Формат ответа:
    1. Сначала верни изображение с результатом примерки в формате base64
    2. После изображения добавь краткое описание выполненной примерки
    3. Изображение должно быть в формате JPEG с хорошим качеством
    4. Размер изображения должен быть не менее 512x512 пикселей
    
    Пример формата ответа:
    ```
    data:image/jpeg;base64,/9j/4AAQSkZJRg...
    
    Описание примерки:
    Успешно выполнена виртуальная примерка делового костюма. Одежда идеально подогнана под фигуру, сохранены все детали и текстуры.
    ```
    """
    
    return base_prompt


async def virtual_fitting_with_gemini(
    person_image_data: Union[bytes, UploadFile], 
    outfit_image_data: Union[bytes, UploadFile], 
    style_type: str = "default"
) -> Dict[str, Any]:
    """
    Генерирует виртуальную примерку одежды на фотографию человека с помощью Gemini AI.
    
    Args:
        person_image_data: Фотография человека в полный рост (байты или UploadFile)
        outfit_image_data: Фотография одежды для примерки (байты или UploadFile)
        style_type: Тип стиля примерки (default, casual, business, evening)
        
    Returns:
        Dict[str, Any]: Словарь с результатами примерки:
            - resultImage (str): Base64 изображение с результатом примерки
            - advice (str): Рекомендации по стилю (опционально)
            - status (str): Статус операции ('ok' или 'error')
            - message (str): Сообщение об ошибке (если status=='error')
    """
    logger_gemini.info(f"Начало обработки виртуальной примерки. Тип стиля: {style_type}")
    
    start_time = time.time()
    
    try:
        # Обработка входных данных в зависимости от типа
        if isinstance(person_image_data, UploadFile):
            person_image_bytes = await person_image_data.read()
        else:
            person_image_bytes = person_image_data
            
        if isinstance(outfit_image_data, UploadFile):
            outfit_image_bytes = await outfit_image_data.read()
        else:
            outfit_image_bytes = outfit_image_data
        
        if not person_image_bytes or not outfit_image_bytes:
            error_message = "Пустые данные изображений для виртуальной примерки."
            logger_gemini.error(error_message)
            return {"status": "error", "message": error_message}
        
        # Проверка формата и оптимизация изображений для API
        try:
            # Преобразуем байты в PIL Image для оптимизации
            person_img = Image.open(BytesIO(person_image_bytes))
            outfit_img = Image.open(BytesIO(outfit_image_bytes))
            
            # Проверка соотношения сторон изображения человека
            person_width, person_height = person_img.size
            aspect_ratio = person_width / person_height
            
            # Более гибкая проверка соотношения сторон
            if aspect_ratio > 1.5 or aspect_ratio < 0.5:  # Допускаем более широкий диапазон
                logger_gemini.warning(f"Соотношение сторон изображения человека ({aspect_ratio:.2f}) может быть не оптимальным для примерки.")
            
            # Оптимизируем изображения
            optimized_person_img = optimize_image(person_img, max_size=1024)  # Увеличиваем максимальный размер
            optimized_outfit_img = optimize_image(outfit_img, max_size=1024)
            
            logger_gemini.info(f"Изображения оптимизированы: человек - {len(optimized_person_img)} байт, одежда - {len(optimized_outfit_img)} байт")
        except Exception as e_img:
            error_message = f"Ошибка при обработке изображений для виртуальной примерки: {str(e_img)}"
            logger_gemini.error(error_message, exc_info=True)
            return {"status": "error", "message": error_message}
        
        # Генерация промпта для Gemini
        prompt = create_virtual_fitting_prompt(style_type)
        
        # Подготовка запроса для Gemini
        model = genai.GenerativeModel(VISION_MODEL)
        person_img_part = {"mime_type": "image/jpeg", "data": optimized_person_img}
        outfit_img_part = {"mime_type": "image/jpeg", "data": optimized_outfit_img}
        parts = [prompt, person_img_part, outfit_img_part]
        
        # Отправка запроса с повторными попытками
        context_for_log = f"virtual_fitting ({style_type})"
        try:
            response = await _send_to_gemini_with_retries(parts, context_for_log)
            logger_gemini.debug(f"Получен ответ от Gemini: {response[:200]}...")
            
            # Проверка на ошибки в ответе
            if _is_error_message(response):
                logger_gemini.error(f"Gemini вернул сообщение об ошибке: {response}")
                return {"status": "error", "message": response}
            
            # Извлечение base64 изображения из ответа
            import re
            
            # Расширенный шаблон для поиска base64 данных изображения
            img_patterns = [
                r"data:image\/[^;]+;base64,[A-Za-z0-9+/=]+",  # Просто base64
                r"!\[.*?\]\((data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)\)",  # Markdown формат
                r"<img[^>]+src=[\"'](data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)[\"']"  # HTML формат
            ]
            
            image_base64 = None
            for pattern in img_patterns:
                matches = re.findall(pattern, response)
                if matches:
                    image_base64 = matches[0]
                    logger_gemini.debug(f"Найдено изображение в формате {pattern}")
                    break
            
            if image_base64:
                # Извлекаем текст рекомендаций, удаляя все возможные форматы изображений
                advice_text = response
                for pattern in img_patterns:
                    advice_text = re.sub(pattern, "", advice_text)
                advice_text = advice_text.strip()
                
                # Проверяем, что base64 строка действительно содержит изображение
                try:
                    import base64
                    # Проверяем, что строка начинается с правильного префикса
                    if not image_base64.startswith('data:image/'):
                        image_base64 = f"data:image/jpeg;base64,{image_base64}"
                    
                    # Пробуем декодировать base64
                    image_data = base64.b64decode(image_base64.split(',')[1])
                    # Проверяем, что это действительно изображение
                    result_img = Image.open(BytesIO(image_data))
                    
                    # Проверяем размер изображения
                    width, height = result_img.size
                    if width < 512 or height < 512:
                        logger_gemini.warning(f"Размер полученного изображения ({width}x{height}) меньше минимального (512x512)")
                    
                    processing_time = time.time() - start_time
                    logger_gemini.info(f"Виртуальная примерка успешно выполнена за {processing_time:.2f} секунд. Размер изображения: {width}x{height}")
                    
                    return {
                        "status": "ok",
                        "resultImage": image_base64,
                        "advice": advice_text if advice_text else "Виртуальная примерка выполнена успешно!"
                    }
                except Exception as e_base64:
                    logger_gemini.error(f"Ошибка при проверке base64 изображения: {str(e_base64)}", exc_info=True)
                    return {
                        "status": "error",
                        "message": "Получено некорректное изображение от Gemini AI. Попробуйте другие изображения."
                    }
            else:
                # Если изображение не найдено, проверим, есть ли в ответе текст с ошибкой
                logger_gemini.warning(f"В ответе Gemini не найдено изображение с результатом примерки. Ответ: {response[:200]}...")
                return {
                    "status": "error", 
                    "message": "Не удалось сгенерировать результат примерки. Попробуйте другие изображения."
                }
        
        except Exception as e_api:
            error_message = handle_gemini_error(e_api, context_for_log)
            logger_gemini.error(f"Ошибка при обращении к Gemini API: {str(e_api)}", exc_info=True)
            return {"status": "error", "message": error_message}
    
    except Exception as e:
        error_message = f"Внутренняя ошибка при обработке виртуальной примерки: {str(e)}"
        logger_gemini.error(error_message, exc_info=True)
        return {"status": "error", "message": error_message}

# Тестовый блок
if __name__ == "__main__":
    async def main_test():
        """Тестирование основных функций модуля."""
        logger_gemini.info("Запуск тестового режима gemini_ai.py")
        
        # Тест соединения
        connection_ok, message = await test_gemini_connection()
        logger_gemini.info(f"Тест соединения: {'OK' if connection_ok else 'FAILED'} - {message}")
        
        if connection_ok:
            # Создаем тестовое изображение
            def get_test_image_bytes(
                image_id: str, 
                text_on_img: str, 
                rgb_color: Tuple[int, int, int] = (100, 100, 200),
                size: Tuple[int, int] = (400, 500), 
                quality: int = 75, 
                img_format: str = 'JPEG'
            ) -> bytes:
                """
                Создает тестовое изображение с текстом.
                
                Args:
                    image_id (str): Идентификатор изображения
                    text_on_img (str): Текст для отображения на изображении
                    rgb_color (Tuple[int, int, int]): RGB цвет фона
                    size (Tuple[int, int]): Размер изображения
                    quality (int): Качество JPEG
                    img_format (str): Формат изображения
                    
                Returns:
                    bytes: Бинарные данные изображения
                """
                img = Image.new('RGB', size, rgb_color)
                draw = ImageDraw.Draw(img)
                draw.text((10, 10), f"Test Image {image_id}\n{text_on_img}", fill=(255, 255, 255))
                img_byte_arr = BytesIO()
                img.save(img_byte_arr, format=img_format, quality=quality)
                return img_byte_arr.getvalue()
            
            # Тестируем анализ одного изображения
            test_image = get_test_image_bytes("1", "Test outfit for analysis")
            try:
                analysis = await analyze_clothing_image(
                    test_image,
                    "деловая встреча",
                    "предпочитаю классический стиль"
                )
                logger_gemini.info(f"Результат анализа:\n{analysis}")
            except Exception as e:
                logger_gemini.error(f"Ошибка при тестировании анализа: {e}")
            
            # Тестируем сравнение нескольких изображений
            test_images = [
                get_test_image_bytes("1", "First outfit", (100, 100, 200)),
                get_test_image_bytes("2", "Second outfit", (200, 100, 100))
            ]
            try:
                comparison = await compare_clothing_images(
                    test_images,
                    "вечернее мероприятие",
                    "люблю яркие цвета"
                )
                logger_gemini.info(f"Результат сравнения:\n{comparison}")
            except Exception as e:
                logger_gemini.error(f"Ошибка при тестировании сравнения: {e}")
    
    # Запускаем тесты
    asyncio.run(main_test())

# Для информации о версии модуля, если потребуется
__version__ = "0.3.1.4"