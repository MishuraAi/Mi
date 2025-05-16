import os
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image
import requests
from io import BytesIO

# Загрузка переменных окружения
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

print(f"Используем API ключ: {GEMINI_API_KEY[:4]}...{GEMINI_API_KEY[-4:] if GEMINI_API_KEY else 'Not found'}")

# Настройка Gemini API
genai.configure(api_key=GEMINI_API_KEY)

def test_text_model():
    print("\n=== Тестирование текстовой модели (gemini-pro) ===")
    try:
        # Проверка текстовой модели
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content("Привет, представься пожалуйста!")
        print(f"Ответ от gemini-pro: {response.text[:100]}...")
        return True
    except Exception as e:
        print(f"❌ Ошибка при использовании gemini-pro: {e}")
        return False

def test_vision_model():
    print("\n=== Тестирование мультимодальной модели (gemini-pro-vision) ===")
    try:
        # Проверка мультимодальной модели с изображением
        # Загрузим тестовое изображение из интернета
        image_url = "https://storage.googleapis.com/github-repo/img/gemini/vision_capabilities/landmark6.jpg"
        response = requests.get(image_url)
        image = Image.open(BytesIO(response.content))
        
        model = genai.GenerativeModel('gemini-pro-vision')
        response = model.generate_content(["Что изображено на этой фотографии?", image])
        print(f"Ответ от gemini-pro-vision: {response.text[:100]}...")
        return True
    except Exception as e:
        print(f"❌ Ошибка при использовании gemini-pro-vision: {e}")
        return False

def check_available_models():
    print("\n=== Проверка всех доступных моделей ===")
    try:
        # Получение списка доступных моделей
        models = genai.list_models()
        print("Доступные модели:")
        for model in models:
            print(f"• {model.name}")
        return True
    except Exception as e:
        print(f"❌ Ошибка при получении списка моделей: {e}")
        return False

# Запуск всех тестов
print("🔍 ДИАГНОСТИКА GEMINI API КЛЮЧА И МОДЕЛЕЙ 🔍")
text_ok = test_text_model()
vision_ok = test_vision_model()
models_ok = check_available_models()

# Вывод итогов
print("\n=== РЕЗУЛЬТАТЫ ДИАГНОСТИКИ ===")
print(f"✓ Текстовая модель (gemini-pro): {'Доступна' if text_ok else 'Недоступна'}")
print(f"✓ Мультимодальная модель (gemini-pro-vision): {'Доступна' if vision_ok else 'Недоступна'}")
print(f"✓ Список моделей: {'Получен' if models_ok else 'Не получен'}")

if not vision_ok:
    print("\n⚠️ РЕКОМЕНДАЦИИ ДЛЯ ИСПРАВЛЕНИЯ ПРОБЛЕМ:")
    print("1. Проверьте, что API ключ верный и скопирован полностью.")
    print("2. Посетите Google AI Studio (https://makersuite.google.com/app/apikeys):")
    print("   - Создайте новый API ключ")
    print("   - Убедитесь, что у проекта настроен платежный аккаунт (даже для бесплатного уровня)")
    print("   - Проверьте ограничения по региону")
    print("3. Проверьте, включены ли все необходимые API в Google Cloud Console.")