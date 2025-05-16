import os
from dotenv import load_dotenv

# Загружаем .env
load_dotenv()

# Получаем значение WEBAPP_URL
webapp_url = os.getenv("WEBAPP_URL", "https://your-webapp-url.com")
print(f"Текущий WEBAPP_URL: {webapp_url}")

# Проверяем, указан ли правильный URL
is_default = webapp_url == "https://your-webapp-url.com"
print(f"Используется URL по умолчанию: {is_default}")

if is_default:
    print("ВНИМАНИЕ: Используется значение по умолчанию, а не из .env файла!")