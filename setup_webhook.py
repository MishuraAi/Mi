import os
import logging
import asyncio
from dotenv import load_dotenv
from telegram import Bot

# Загружаем токен так же, как в bot_check.py
if "TELEGRAM_TOKEN" in os.environ:
    del os.environ["TELEGRAM_TOKEN"]
load_dotenv(override=True)
env_path = os.path.join(os.getcwd(), '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('TELEGRAM_TOKEN='):
            TOKEN = line.strip().split('=', 1)[1]
            break

# URL вашего сервера на Render
SERVER_URL = "https://style-ai-bot.onrender.com"

async def setup_webhook():
    bot = Bot(token=TOKEN)
    
    # Получаем текущую информацию о webhook
    webhook_info = await bot.get_webhook_info()
    print(f"Текущий webhook URL: {webhook_info.url}")
    
    # Настраиваем новый webhook
    webhook_url = f"{SERVER_URL}/telegram-webhook"
    print(f"Настраиваем webhook на: {webhook_url}")
    
    result = await bot.set_webhook(url=webhook_url)
    print(f"Результат установки webhook: {result}")
    
    # Проверяем новые настройки
    webhook_info = await bot.get_webhook_info()
    print(f"Новый webhook URL: {webhook_info.url}")

if __name__ == "__main__":
    asyncio.run(setup_webhook())