import os
import logging
from dotenv import load_dotenv
from telegram import Bot

# Сбрасываем системную переменную если она существует
if "TELEGRAM_TOKEN" in os.environ:
    del os.environ["TELEGRAM_TOKEN"]

# Загружаем переменные из .env с принудительной перезаписью
load_dotenv(override=True)

# Путь к файлу .env
env_path = os.path.join(os.getcwd(), '.env')

# Явно читаем значение из файла
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('TELEGRAM_TOKEN='):
            TOKEN = line.strip().split('=', 1)[1]
            break

print(f"Используемый токен: {TOKEN}")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-webapp-url.com")
print(f"Используемый URL: {WEBAPP_URL}")

async def check_bot():
    # Создаем бота
    bot = Bot(token=TOKEN)
    
    # Получаем информацию о боте
    bot_info = await bot.get_me()
    print(f"Успешно подключились к боту: {bot_info.first_name} (@{bot_info.username})")
    
    # Получаем данные о webhook
    webhook_info = await bot.get_webhook_info()
    if webhook_info.url:
        print(f"Бот настроен на webhook URL: {webhook_info.url}")
        print("Для локального тестирования нужно удалить webhook.")
    else:
        print("Webhook не настроен. Бот готов к использованию в режиме polling.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(check_bot())