# test_image_analysis.py
import asyncio
import os
from gemini_ai import analyze_clothing_file
import logging

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)

async def test_image():
    # Путь к любой тестовой фотографии у вас на компьютере
    # Можно использовать фото из папки user_photos, если там есть файлы
    photo_dir = "user_photos"
    if not os.path.exists(photo_dir) or not os.listdir(photo_dir):
        print(f"Папка {photo_dir} пуста или не существует. Создаем тестовое изображение...")
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (200, 200), color=(73, 109, 137))
        d = ImageDraw.Draw(img)
        d.rectangle([(50, 50), (150, 150)], fill=(255, 255, 255))
        test_path = "test_clothing.jpg"
        img.save(test_path)
        file_path = test_path
    else:
        # Берем первый файл из папки
        file_path = os.path.join(photo_dir, os.listdir(photo_dir)[0])
    
    print(f"Тестируем анализ файла: {file_path}")
    
    # Вызываем функцию анализа
    result = await analyze_clothing_file(file_path, "повседневный", "комфорт")
    
    print("\n--- РЕЗУЛЬТАТ АНАЛИЗА ---")
    print(result)
    print("-------------------------")

if __name__ == "__main__":
    asyncio.run(test_image())