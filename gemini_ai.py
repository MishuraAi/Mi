"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Модуль ИИ (gemini_ai.py)
ВЕРСИЯ: 0.5.0 (УЛУЧШЕНО ФОРМАТИРОВАНИЕ ОТВЕТОВ)
ДАТА ОБНОВЛЕНИЯ: 2025-06-20

ИСПРАВЛЕНИЯ В ВЕРСИИ 0.5.0:
- Улучшено форматирование ответов с визуальными блоками
- Добавлены иконки и разделители для лучшей читаемости
- Структурированные промпты с четкими инструкциями по формату
- Убраны цифры в конце предложений
- Добавлены чекбоксы ✅ и буллеты для списков
==========================================================================================
"""
import os
import logging
import time
import asyncio
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image, ImageOps, ImageDraw
from io import BytesIO
from typing import Optional, List, Tuple, Union, Dict, Any
import traceback

# Настройка логирования
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

logger.info("🎭 Инициализация модуля Gemini AI для МИШУРА")

# Загрузка переменных окружения
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Простой заглушка кеш-менеджера
class DummyCacheManager:
    def __init__(self):
        logger.info("DummyCacheManager инициализирован")
    
    def get_from_cache(self, *args, **kwargs):
        return None
    
    def save_to_cache(self, *args, **kwargs):
        pass

# Конфигурация Gemini API
API_CONFIGURED_SUCCESSFULLY = False

if not GEMINI_API_KEY:
    logger.error("❌ GEMINI_API_KEY не найден в переменных окружения")
    raise ValueError("GEMINI_API_KEY не найден в .env файле или переменных окружения")

try:
    # Конфигурируем API
    genai.configure(api_key=GEMINI_API_KEY)
    
    # Проверяем доступные модели
    logger.info("🔍 Проверка доступных моделей Gemini...")
    
    # Список моделей для тестирования
    models_to_try = [
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash", 
        "gemini-pro-vision",
        "gemini-pro"
    ]
    
    VISION_MODEL = None
    
    for model_name in models_to_try:
        try:
            # Создаем модель для проверки
            test_model = genai.GenerativeModel(model_name)
            VISION_MODEL = model_name
            logger.info(f"✅ Модель {model_name} доступна")
            break
        except Exception as model_error:
            logger.warning(f"⚠️ Модель {model_name} недоступна: {str(model_error)}")
            continue
    
    if VISION_MODEL:
        API_CONFIGURED_SUCCESSFULLY = True
        logger.info(f"✅ Gemini API успешно сконфигурирован с моделью: {VISION_MODEL}")
    else:
        raise RuntimeError("Ни одна из моделей Gemini не доступна")
        
except Exception as e:
    logger.error(f"❌ КРИТИЧЕСКАЯ ОШИБКА при конфигурации Gemini API: {str(e)}")
    raise RuntimeError(f"Не удалось сконфигурировать Gemini API: {str(e)}")

# Параметры повторных запросов
MAX_RETRIES = 3
RETRY_DELAY = 2

# Инициализация кэша
cache_manager = DummyCacheManager()

async def test_gemini_connection() -> bool:
    """
    Тестирует соединение с Gemini API.
    
    Returns:
        bool: True если соединение успешно, False в случае ошибки
    """
    logger.info("🧪 Тестирование соединения с Gemini API...")
    
    if not API_CONFIGURED_SUCCESSFULLY:
        logger.error("❌ Gemini API не сконфигурирован")
        return False
    
    try:
        model = genai.GenerativeModel(VISION_MODEL)
        
        # Используем простой текстовый запрос
        response = model.generate_content("Привет! Ответь одним словом: работает")
        
        if response and response.text:
            logger.info(f"✅ Gemini API работает! Ответ: {response.text.strip()}")
            return True
        else:
            logger.error("❌ API не вернул текстовый ответ")
            return False
            
    except Exception as e:
        logger.error(f"❌ Ошибка при тестировании Gemini API: {str(e)}")
        return False

def handle_gemini_error(error: Exception, context: str = "Gemini AI") -> str:
    """Обработка ошибок Gemini API с понятными сообщениями."""
    error_str = str(error).lower()
    logger.error(f"❌ Ошибка {context}: {type(error).__name__} - {error_str}")
    
    if "api key" in error_str or "authentication" in error_str:
        return "Ошибка аутентификации API. Проверьте API ключ."
    elif "content filtered" in error_str or "safety" in error_str:
        return "Изображение не может быть обработано из-за ограничений безопасности."
    elif "quota" in error_str or "limit" in error_str:
        return "Превышен лимит запросов. Попробуйте позже."
    elif "deadline" in error_str or "timeout" in error_str:
        return "Превышено время ожидания. Попробуйте еще раз."
    else:
        return f"Произошла ошибка при обработке запроса: {type(error).__name__}"

def optimize_image(img_pil: Image.Image, max_size: int = 1024, quality: int = 85) -> bytes:
    """
    Оптимизирует изображение для отправки в API.
    
    Args:
        img_pil: Объект PIL.Image
        max_size: Максимальный размер стороны
        quality: Качество JPEG
        
    Returns:
        bytes: Оптимизированные данные изображения
    """
    logger.info(f"📷 Оптимизация изображения: исходный размер {img_pil.size}")
    
    try:
        # Изменение размера если нужно
        width, height = img_pil.size
        if width > max_size or height > max_size:
            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))
            
            img_pil = img_pil.resize((new_width, new_height), Image.Resampling.LANCZOS)
            logger.info(f"📏 Размер изменен на {new_width}x{new_height}")
        
        # Конвертация в RGB если нужно
        if img_pil.mode in ('RGBA', 'LA') or (img_pil.mode == 'P' and 'transparency' in img_pil.info):
            background = Image.new("RGB", img_pil.size, (255, 255, 255))
            if img_pil.mode == 'P':
                img_pil = img_pil.convert('RGBA')
            background.paste(img_pil, mask=img_pil.split()[-1] if img_pil.mode == 'RGBA' else None)
            img_pil = background
        elif img_pil.mode != 'RGB':
            img_pil = img_pil.convert('RGB')
        
        # Сохранение в JPEG
        img_byte_arr = BytesIO()
        img_pil.save(img_byte_arr, format='JPEG', quality=quality, optimize=True)
        optimized_bytes = img_byte_arr.getvalue()
        
        logger.info(f"✅ Изображение оптимизировано: {len(optimized_bytes)} байт")
        return optimized_bytes
        
    except Exception as e:
        logger.error(f"❌ Ошибка оптимизации изображения: {str(e)}")
        raise ValueError(f"Ошибка оптимизации изображения: {str(e)}")

def create_analysis_prompt(occasion: str, preferences: Optional[str] = None) -> str:
    """Создает промпт для анализа одежды с улучшенным форматированием."""
    base_prompt = f"""Ты - профессиональный стилист МИШУРА. Проанализируй одежду на изображении для повода: {occasion}.

ВАЖНО! Используй точно такую структуру ответа:

🎽 **АНАЛИЗ ОБРАЗА**

**🎯 Общая оценка**
✅ Краткая оценка уместности образа для указанного повода

**🎨 Цветовая гамма**  
✅ Анализ цветов и их сочетания в образе

**⚖️ Гармония образа**
✅ Оценка сбалансированности всех элементов

**👟 Практичность**
✅ Удобство и функциональность для повода

⸻

**📌 РЕКОМЕНДАЦИИ**

**Дополнить образ:**
• Конкретные предметы гардероба
• Аксессуары и обувь

**Общие советы:**
• Практические рекомендации по стилю

⸻

💡 **Совет от МИШУРЫ:** [практический совет для будущих консультаций]

Отвечай на русском языке, дружелюбно и профессионально. НЕ используй цифры в конце предложений."""
    
    if preferences:
        base_prompt += f"\n\nУчитывай дополнительный вопрос: {preferences}"
    
    return base_prompt

def create_comparison_prompt(occasion: str, num_images: int, preferences: Optional[str] = None) -> str:
    """Создает ПРИНУДИТЕЛЬНЫЙ промпт для анализа ВСЕХ образов."""
    image_emojis = ["🎽", "👖", "👔", "👗", "🧥", "👕"]

    base_prompt = f"""Ты - профессиональный стилист МИШУРА.

⚠️ КРИТИЧЕСКИ ВАЖНО: Я отправляю тебе ТОЧНО {num_images} изображений. Ты ОБЯЗАН проанализировать КАЖДОЕ из {num_images} изображений. НЕ пропускай ни одного!

Сравни ВСЕ {num_images} представленных образов для повода: {occasion}.

СТРУКТУРА ОБЯЗАТЕЛЬНОГО ОТВЕТА (АНАЛИЗИРУЙ КАЖДЫЙ ОБРАЗ, НЕ ПРОПУСКАЙ!):

"""

    for i in range(num_images):
        emoji = image_emojis[i % len(image_emojis)]
        base_prompt += f"""{emoji} **ОБРАЗ {i+1} (ОБЯЗАТЕЛЬНО АНАЛИЗИРУЙ):** [опиши что видишь на {i+1}-м изображении]

**Уместность для {occasion}**
✅ Подходит ли этот образ для {occasion}

**Цветовая гамма образа {i+1}**
✅ Какие цвета в {i+1}-м образе

**Гармония образа {i+1}**
✅ Насколько сбалансирован {i+1}-й образ

**Практичность образа {i+1}**
✅ Удобство {i+1}-го образа для {occasion}

⸻

"""

    base_prompt += f"""🏆 **ОБЯЗАТЕЛЬНОЕ СРАВНЕНИЕ ВСЕХ {num_images} ОБРАЗОВ**

⚠️ ВАЖНО: Ты ДОЛЖЕН сравнить ВСЕ {num_images} образов!

**Лучший образ из {num_images}:** Образ [номер от 1 до {num_images}] - [почему именно этот]

**Худший образ из {num_images}:** Образ [номер от 1 до {num_images}] - [почему именно этот]

**Рекомендации по улучшению (ДЛЯ КАЖДОГО ИЗ {num_images} ОБРАЗОВ):**"""

    for i in range(num_images):
        base_prompt += f"\n• ОБРАЗ {i+1}: [как улучшить {i+1}-й образ]"

    base_prompt += f"""

⸻

💡 **Совет от МИШУРЫ:** [практический совет учитывая все {num_images} образа]

⚠️ ПРОВЕРЬ СЕБЯ: Ты проанализировал ВСЕ {num_images} образов? Если нет - начни заново!

**ЧЕК-ЛИСТ для тебя:**
- [ ] Проанализированы ВСЕ {num_images} образов
- [ ] Даны рекомендации для КАЖДОГО образа
- [ ] Выбран лучший и худший образ
- [ ] Дана финальная рекомендация

Отвечай на русском языке, дружелюбно и профессионально."""

    if preferences:
        base_prompt += f"\n\nДополнительно учитывай: {preferences}"

    return base_prompt

async def _send_to_gemini_with_retries(parts: List[Any], context: str) -> str:
    """Отправляет запрос к Gemini API с повторными попытками."""
    logger.info(f"📤 Отправка запроса к Gemini: {context}")
    
    for attempt in range(MAX_RETRIES):
        try:
            model = genai.GenerativeModel(VISION_MODEL)
            response = model.generate_content(parts)
            
            if response and response.text:
                logger.info(f"✅ Получен ответ от Gemini ({len(response.text)} символов)")
                return response.text
            else:
                error_msg = "API не вернул текстовый ответ"
                if response and hasattr(response, 'prompt_feedback'):
                    if response.prompt_feedback and hasattr(response.prompt_feedback, 'block_reason'):
                        error_msg += f": {response.prompt_feedback.block_reason}"
                raise ValueError(error_msg)
                
        except Exception as e:
            logger.warning(f"⚠️ Попытка {attempt + 1}/{MAX_RETRIES} не удалась: {str(e)}")
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY)
            else:
                error_msg = handle_gemini_error(e, context)
                logger.error(f"❌ Все попытки исчерпаны: {error_msg}")
                raise RuntimeError(error_msg)

async def analyze_clothing_image(image_data: bytes, occasion: str, preferences: Optional[str] = None) -> str:
    """
    Анализирует одежду на изображении с помощью Gemini AI.
    
    Args:
        image_data: Бинарные данные изображения
        occasion: Повод для консультации
        preferences: Предпочтения пользователя
        
    Returns:
        str: Анализ и рекомендации
    """
    logger.info(f"🎨 Начало анализа образа для повода: {occasion}")
    
    try:
        # Оптимизируем изображение
        img = Image.open(BytesIO(image_data))
        optimized_image = optimize_image(img)
        
        # Создаем промпт
        prompt = create_analysis_prompt(occasion, preferences)
        
        # Подготавливаем части запроса
        parts = [
            prompt,
            {
                "mime_type": "image/jpeg",
                "data": optimized_image
            }
        ]
        
        # Отправляем запрос
        response = await _send_to_gemini_with_retries(
            parts,
            f"анализ образа для {occasion}"
        )
        
        logger.info("✅ Анализ образа завершен успешно")
        return response
        
    except Exception as e:
        error_msg = handle_gemini_error(e, f"анализ образа для {occasion}")
        logger.error(f"❌ Ошибка анализа: {error_msg}")
        raise RuntimeError(error_msg)

async def compare_clothing_images(image_data_list: List[bytes], occasion: str, preferences: Optional[str] = None) -> str:
    """
    Сравнивает несколько образов одежды.
    
    Args:
        image_data_list: Список бинарных данных изображений
        occasion: Повод для консультации
        preferences: Предпочтения пользователя
        
    Returns:
        str: Сравнительный анализ
    """
    num_images = len(image_data_list)
    logger.info(f"⚖️ Начало сравнения {num_images} образов для: {occasion}")
    
    try:
        # Оптимизируем изображения
        optimized_images = []
        mime_types = []
        for i, img_data in enumerate(image_data_list):
            img = Image.open(BytesIO(img_data))
            optimized = optimize_image(img)
            optimized_images.append(optimized)
            # Определяем mime_type динамически
            fmt = img.format if hasattr(img, 'format') and img.format else 'JPEG'
            mime_type = f"image/{fmt.lower()}"
            mime_types.append(mime_type)
            logger.info(f"📷 Оптимизировано изображение {i+1}/{num_images}")
        
        # Создаем ДИНАМИЧЕСКИЙ промпт с учетом количества изображений
        prompt = create_comparison_prompt(occasion, num_images, preferences)
        
        # Подготавливаем части запроса
        parts = [prompt]
        for img, mime_type in zip(optimized_images, mime_types):
            parts.append({
                "mime_type": mime_type, 
                "data": img
            })
        
        # Отправляем запрос
        response = await _send_to_gemini_with_retries(
            parts,
            f"сравнение {num_images} образов для {occasion}"
        )
        
        logger.info("✅ Сравнение образов завершено успешно")
        return response
        
    except Exception as e:
        error_msg = handle_gemini_error(e, f"сравнение образов для {occasion}")
        logger.error(f"❌ Ошибка сравнения: {error_msg}\n{traceback.format_exc()}")
        raise RuntimeError(error_msg)

# Версия модуля
__version__ = "0.5.0"

class MishuraGeminiAI:
    """
    Основной класс для работы с Gemini AI в проекте МИШУРА.
    Обеспечивает совместимость с api.py и другими модулями.
    """
    
    def __init__(self):
        """Инициализация класса MishuraGeminiAI"""
        self.cache_manager = cache_manager
        self.model_name = VISION_MODEL
        self.api_configured = API_CONFIGURED_SUCCESSFULLY
        
        if not self.api_configured:
            logger.error("❌ Gemini API не сконфигурирован при инициализации класса")
            raise RuntimeError("Gemini API не сконфигурирован")
        
        logger.info(f"✅ MishuraGeminiAI инициализирован с моделью: {self.model_name}")
    
    async def test_gemini_connection(self) -> bool:
        """
        Тестирует соединение с Gemini API.
        
        Returns:
            bool: True если соединение успешно, False в случае ошибки
        """
        return await test_gemini_connection()
    
    async def analyze_clothing_image(self, image_data: bytes, occasion: str, 
                                   preferences: Optional[str] = None) -> str:
        """
        Анализирует одежду на изображении с помощью Gemini AI.
        
        Args:
            image_data: Бинарные данные изображения
            occasion: Повод для консультации
            preferences: Предпочтения пользователя
            
        Returns:
            str: Анализ и рекомендации
        """
        return await analyze_clothing_image(image_data, occasion, preferences)
    
    async def compare_clothing_images(self, image_data_list: List[bytes], occasion: str, 
                                    preferences: Optional[str] = None) -> str:
        """
        Сравнивает несколько образов одежды.
        
        Args:
            image_data_list: Список бинарных данных изображений
            occasion: Повод для консультации
            preferences: Предпочтения пользователя
            
        Returns:
            str: Сравнительный анализ
        """
        return await compare_clothing_images(image_data_list, occasion, preferences)
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Возвращает информацию о текущей модели.
        
        Returns:
            dict: Информация о модели и статусе API
        """
        return {
            "model_name": self.model_name,
            "api_configured": self.api_configured,
            "version": __version__,
            "max_retries": MAX_RETRIES,
            "retry_delay": RETRY_DELAY
        }

# Тестирование при прямом запуске
if __name__ == "__main__":
    async def test_module():
        logger.info("🧪 Запуск тестирования модуля Gemini AI")
        
        # Тест подключения
        connection_ok = await test_gemini_connection()
        logger.info(f"🔗 Тест подключения: {'✅ ОК' if connection_ok else '❌ ОШИБКА'}")
        
        if connection_ok:
            # Создаем тестовое изображение
            test_img = Image.new('RGB', (400, 300), (100, 150, 200))
            draw = ImageDraw.Draw(test_img)
            draw.text((50, 50), "Тестовый образ\nдля МИШУРЫ", fill=(255, 255, 255))
            
            img_byte_arr = BytesIO()
            test_img.save(img_byte_arr, format='JPEG')
            test_image_data = img_byte_arr.getvalue()
            
            # Тест анализа
            try:
                analysis = await analyze_clothing_image(
                    test_image_data, 
                    "деловая встреча",
                    "классический стиль"
                )
                logger.info(f"📝 Результат анализа получен ({len(analysis)} символов)")
            except Exception as e:
                logger.error(f"❌ Ошибка анализа: {str(e)}")
        
        logger.info("🎉 Тестирование завершено")
    
    # Запуск тестов
    asyncio.run(test_module())