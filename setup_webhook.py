"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Настройщик Webhook (setup_webhook.py)
ВЕРСИЯ: 0.1.2 (Стандартизация комментариев, улучшенная загрузка переменных)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

МЕТОДОЛОГИЯ РАБОТЫ И ОБНОВЛЕНИЯ КОДА:
1.  Целостность Обновлений: Любые изменения файлов предоставляются целиком.
    Частичные изменения кода не допускаются для обеспечения стабильности интеграции.
2.  Язык Коммуникации: Комментарии и документация ведутся на русском языке.
3.  Стандарт Качества: Данный код является частью проекта "МИШУРА", разработанного
    с применением высочайших стандартов программирования и дизайна, соответствуя
    уровню лучших мировых практик.

НАЗНАЧЕНИЕ ФАЙЛА:
Скрипт для установки или проверки URL вебхука для Telegram бота "МИШУРА".
Используется для перенаправления обновлений от Telegram на указанный сервер,
где запущен API и обработчик вебхуков.
==========================================================================================
"""
import os
import logging
import asyncio
from dotenv import load_dotenv
from telegram import Bot
from telegram.error import TelegramError

# Настройка логирования
logger_webhook = logging.getLogger(__name__)
if not logger_webhook.handlers:
    logging.basicConfig(
        format="%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s",
        level=logging.INFO
    )

logger_webhook.info("Инициализация скрипта настройки вебхука для проекта МИШУРА.")

# Загрузка переменных окружения
# Сначала пытаемся загрузить из .env, потом смотрим системные переменные
# Это позволяет .env переопределять системные, если он существует и override=True
# Для production часто лучше override=False или не использовать .env вообще,
# а полагаться на переменные среды, установленные на сервере.
if load_dotenv(override=True): # True - .env переопределяет существующие системные переменные
    logger_webhook.info(".env файл найден и загружен (может переопределять системные переменные).")
else:
    logger_webhook.info(".env файл не найден. Используются только системные переменные окружения.")

TOKEN = os.getenv("TELEGRAM_TOKEN")
# URL вашего сервера, где запущен API и слушатель вебхуков
# Этот URL должен быть доступен извне (HTTPS)
SERVER_URL = os.getenv("SERVER_URL") # Например, https://your-app-name.onrender.com
# Эндпоинт на вашем сервере, который будет обрабатывать обновления от Telegram
WEBHOOK_ENDPOINT_PATH = os.getenv("WEBHOOK_ENDPOINT_PATH", "/telegram-webhook") # По умолчанию /telegram-webhook

if not TOKEN:
    logger_webhook.critical("КРИТИЧЕСКАЯ ОШИБКА: TELEGRAM_TOKEN не найден. Проверьте .env или переменные окружения.")
if not SERVER_URL:
    logger_webhook.critical("КРИТИЧЕСКАЯ ОШИБКА: SERVER_URL не найден. Проверьте .env или переменные окружения.")

logger_webhook.info(f"Используемый URL сервера для вебхука: {SERVER_URL}")
logger_webhook.info(f"Используемый эндпоинт для вебхука: {WEBHOOK_ENDPOINT_PATH}")


async def setup_or_check_webhook():
    """
    Устанавливает или проверяет текущий вебхук для Telegram бота.
    """
    if not TOKEN or not SERVER_URL:
        logger_webhook.error("Невозможно настроить/проверить вебхук: TELEGRAM_TOKEN или SERVER_URL отсутствуют.")
        return False

    try:
        bot = Bot(token=TOKEN)
        logger_webhook.info("Объект Telegram бота успешно создан.")
        
        # Получаем текущую информацию о вебхуке
        current_webhook_info = await bot.get_webhook_info()
        logger_webhook.info(f"Текущая информация о вебхуке: URL='{current_webhook_info.url}', "
                            f"Ожидающих обновлений={current_webhook_info.pending_update_count}, "
                            f"Последняя ошибка='{current_webhook_info.last_error_message or 'Нет'}'.")
        
        # Формируем целевой URL для вебхука
        # Убедимся, что нет двойных слэшей и путь эндпоинта начинается с /
        target_webhook_url = f"{SERVER_URL.rstrip('/')}/{WEBHOOK_ENDPOINT_PATH.lstrip('/')}"
        
        if current_webhook_info.url == target_webhook_url:
            logger_webhook.info(f"Вебхук уже корректно установлен на: {target_webhook_url}. Дополнительная настройка не требуется.")
            return True
        else:
            logger_webhook.info(f"Текущий URL вебхука '{current_webhook_info.url}' отличается от целевого '{target_webhook_url}'. Попытка установки нового вебхука.")
            
            # Установка нового вебхука
            # allowed_updates - список типов обновлений, которые вы хотите получать. Экономит ресурсы.
            # Например: ["message", "callback_query", "inline_query", "chosen_inline_result"]
            # Если None (по умолчанию), бот будет получать все типы обновлений.
            allowed_updates = None # или ["message", "callback_query"] и т.д.
            
            # drop_pending_updates=True рекомендуется при смене вебхука, чтобы не обрабатывать старые "зависшие" обновления.
            success = await bot.set_webhook(
                url=target_webhook_url,
                allowed_updates=allowed_updates,
                drop_pending_updates=True
            )
            
            if success:
                logger_webhook.info(f"Вебхук успешно установлен на: {target_webhook_url}")
                # Дополнительная проверка после установки
                new_webhook_info = await bot.get_webhook_info()
                logger_webhook.info(f"Подтвержденная информация о вебхуке: URL='{new_webhook_info.url}'")
                return True
            else:
                logger_webhook.error(f"Не удалось установить вебхук на {target_webhook_url}. API Telegram вернул 'False'.")
                return False

    except TelegramError as e_telegram: # Более специфичная обработка ошибок Telegram
        logger_webhook.error(f"Ошибка Telegram API при настройке/проверке вебхука: {e_telegram}", exc_info=True)
        if "Unauthorized" in str(e_telegram):
            logger_webhook.critical("Ошибка авторизации! Проверьте правильность TELEGRAM_TOKEN.")
        return False
    except Exception as e_setup:
        logger_webhook.error(f"Непредвиденная ошибка при настройке/проверке вебхука: {e_setup}", exc_info=True)
        return False

if __name__ == "__main__":
    logger_webhook.info("Запуск асинхронной настройки/проверки вебхука из __main__...")
    setup_successful = asyncio.run(setup_or_check_webhook())
    
    if setup_successful:
        logger_webhook.info("Скрипт настройки/проверки вебхука завершил работу УСПЕШНО.")
    else:
        logger_webhook.error("Скрипт настройки/проверки вебхука завершил работу С ОШИБКАМИ.")
    
    # Вывод финального статуса для ясности
    print(f"\nРабота скрипта setup_webhook завершена. Статус: {'УСПЕХ' if setup_successful else 'ОШИБКА'}")
    print("Пожалуйста, проверьте логи выше для деталей.")