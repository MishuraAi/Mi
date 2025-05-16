"""
ИИ СТИЛИСТ - ВЕРСИЯ: 0.2.0
ЭТАП РАЗРАБОТКИ: Тестирование интеграции Gemini AI
ДАТА: 2025-05-16

ОПИСАНИЕ:
Скрипт для тестирования улучшенной интеграции с Gemini AI.
Проверяет работу анализа изображений с разными параметрами.

ТЕКУЩЕЕ СОСТОЯНИЕ:
- Тестирование оптимизации изображений
- Тестирование улучшенного промпта
- Тестирование обработки ошибок
"""

import asyncio
import os
import logging
from PIL import Image
from datetime import datetime
from gemini_ai import analyze_clothing_image, analyze_clothing_file, optimize_image
from io import BytesIO

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Путь для тестовых изображений
TEST_IMAGES_DIR = "test_images"
# Путь для сохранения результатов тестов
RESULTS_DIR = "test_results"

# Проверка и создание директорий
for directory in [TEST_IMAGES_DIR, RESULTS_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)
        logger.info(f"Создана директория: {directory}")

async def test_image_optimization():
    """Тестирование функции оптимизации изображений"""
    logger.info("Тестирование оптимизации изображений...")
    
    # Проверяем, есть ли тестовые изображения
    if not os.listdir(TEST_IMAGES_DIR):
        # Создаем тестовое изображение, если нет
        img = Image.new('RGB', (1200, 800), color=(73, 109, 137))
        test_path = os.path.join(TEST_IMAGES_DIR, "test_large.jpg")
        img.save(test_path, quality=95)
        logger.info(f"Создано тестовое изображение: {test_path}")
    
    # Берем первое изображение из директории
    test_image_path = os.path.join(TEST_IMAGES_DIR, os.listdir(TEST_IMAGES_DIR)[0])
    logger.info(f"Используем тестовое изображение: {test_image_path}")
    
    # Загружаем изображение
    img = Image.open(test_image_path)
    original_size = os.path.getsize(test_image_path)
    logger.info(f"Оригинальный размер: {original_size/1024:.2f} KB, размеры: {img.size}")
    
    # Оптимизируем с разными параметрами
    for max_size, quality in [(1024, 85), (800, 75), (512, 65)]:
        optimized_bytes = optimize_image(img, max_size=max_size, quality=quality)
        optimized_size = len(optimized_bytes)
        
        # Сохраняем оптимизированное изображение для визуальной проверки
        optimized_img = Image.open(BytesIO(optimized_bytes))
        output_path = os.path.join(RESULTS_DIR, f"optimized_{max_size}_{quality}.jpg")
        optimized_img.save(output_path)
        
        # Выводим результаты
        logger.info(f"Оптимизация (max_size={max_size}, quality={quality}):")
        logger.info(f"  - Новый размер: {optimized_size/1024:.2f} KB ({optimized_img.size})")
        logger.info(f"  - Уменьшение: {(1 - optimized_size/original_size) * 100:.1f}%")
        logger.info(f"  - Сохранено в: {output_path}")
    
    return True

async def test_clothing_analysis():
    """Тестирование анализа одежды с разными параметрами"""
    logger.info("Тестирование анализа одежды...")
    
    # Используем изображения из директории test_images или user_photos
    test_dirs = [TEST_IMAGES_DIR, "user_photos"]
    test_image_path = None
    
    for directory in test_dirs:
        if os.path.exists(directory) and os.listdir(directory):
            test_image_path = os.path.join(directory, os.listdir(directory)[0])
            break
    
    if not test_image_path:
        logger.error("Не найдены тестовые изображения!")
        return False
    
    logger.info(f"Используем тестовое изображение: {test_image_path}")
    
    # Тестовые сценарии с разными поводами и предпочтениями
    test_scenarios = [
        {"occasion": "повседневный", "preferences": None},
        {"occasion": "работа", "preferences": "предпочитаю классический стиль"},
        {"occasion": "вечеринка", "preferences": "яркие цвета, молодежный стиль"}
    ]
    
    for i, scenario in enumerate(test_scenarios, 1):
        logger.info(f"Сценарий #{i}: повод={scenario['occasion']}, предпочтения={scenario['preferences']}")
        
        # Анализируем изображение
        result = await analyze_clothing_file(
            test_image_path, 
            scenario['occasion'], 
            scenario['preferences']
        )
        
        # Создаем имя файла на основе текущего времени и сценария
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"result_{timestamp}_occasion_{scenario['occasion']}.md"
        result_path = os.path.join(RESULTS_DIR, filename)
        
        # Сохраняем результат в файл
        with open(result_path, "w", encoding="utf-8") as f:
            f.write(result)
        
        logger.info(f"Результат сохранен в: {result_path}")
        logger.info(f"Длина результата: {len(result)} символов")
        
        # Краткое резюме результата (первые 100 символов)
        preview = result.replace("\n", " ")[:100] + "..."
        logger.info(f"Предпросмотр: {preview}")
        
        # Пауза между запросами, чтобы не перегружать API
        if i < len(test_scenarios):
            logger.info("Пауза 5 секунд перед следующим тестом...")
            await asyncio.sleep(5)
    
    return True

async def test_error_handling():
    """Тестирование обработки ошибок"""
    logger.info("Тестирование обработки ошибок...")
    
    # Тест с некорректным изображением
    try:
        # Создаем некорректные данные изображения
        invalid_image_data = b"This is not an image data"
        
        # Анализируем некорректное изображение
        result = await analyze_clothing_image(invalid_image_data, "повседневный")
        
        # Проверяем, что получено сообщение об ошибке, а не исключение
        if "ошибка" in result.lower():
            logger.info("Тест обработки ошибок пройден успешно")
            logger.info(f"Результат: {result}")
        else:
            logger.warning("Тест обработки ошибок не пройден - не обнаружено сообщение об ошибке")
            logger.info(f"Результат: {result}")
    
    except Exception as e:
        logger.error(f"Тест обработки ошибок не пройден - возникло исключение: {e}")
        return False
    
    return True

async def run_all_tests():
    """Запуск всех тестов"""
    logger.info("=== НАЧАЛО ТЕСТИРОВАНИЯ ИНТЕГРАЦИИ С GEMINI AI ===")
    
    tests = [
        ("Оптимизация изображений", test_image_optimization),
        ("Анализ одежды", test_clothing_analysis),
        ("Обработка ошибок", test_error_handling)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        logger.info(f"\n=== ТЕСТ: {test_name} ===")
        try:
            result = await test_func()
            results[test_name] = "Успешно" if result else "Не пройден"
        except Exception as e:
            logger.error(f"Исключение при выполнении теста '{test_name}': {e}")
            results[test_name] = f"Ошибка: {e}"
    
    # Вывод итогов
    logger.info("\n=== РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ===")
    for test_name, status in results.items():
        logger.info(f"{test_name}: {status}")
    
    logger.info("=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===")
    
    return all(status == "Успешно" for status in results.values())

if __name__ == "__main__":
    asyncio.run(run_all_tests())