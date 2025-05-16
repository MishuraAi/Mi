# check_env.py
import os
from dotenv import load_dotenv

# Явно указываем путь к файлу .env для уверенности
env_path = os.path.join(os.getcwd(), '.env')
print(f"Ищем .env файл по пути: {env_path}")
print(f"Файл существует: {os.path.exists(env_path)}")

# Загружаем переменные окружения
load_dotenv(env_path)

# Выводим значение токена
token = os.getenv("TELEGRAM_TOKEN")
print(f"Загруженный токен: {token}")