import os

# Проверяем переменную TELEGRAM_TOKEN напрямую из системы
token = os.environ.get("TELEGRAM_TOKEN")
print(f"Системная переменная TELEGRAM_TOKEN: {token}")