#!/usr/bin/env python3
"""
Скрипт проверки переменных окружения для МИШУРА
Проверяет корректность настроек ЮКассы перед запуском

Использование:
1. Сохраните этот код в файл environment_validation.py
2. Запустите: python environment_validation.py
"""

import os
import sys
import logging
from yookassa import Configuration, Settings
from yookassa.domain.exceptions import ApiError

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def check_environment_variables():
    """Проверка обязательных переменных окружения"""
    
    required_vars = {
        'TELEGRAM_BOT_TOKEN': 'Токен Telegram бота',
        'GEMINI_API_KEY': 'API ключ Google Gemini',
        'YOOKASSA_SHOP_ID': 'ID магазина ЮКассы',
        'YOOKASSA_SECRET_KEY': 'Секретный ключ ЮКассы'
    }
    
    missing_vars = []
    
    logger.info("🔍 Проверка переменных окружения...")
    
    for var_name, description in required_vars.items():
        value = os.getenv(var_name)
        
        if not value:
            missing_vars.append(f"❌ {var_name} - {description}")
            logger.error(f"❌ Отсутствует: {var_name}")
        else:
            # Показываем только первые и последние символы для безопасности
            masked_value = f"{value[:4]}...{value[-4:]}" if len(value) > 8 else "****"
            logger.info(f"✅ {var_name}: {masked_value}")
    
    if missing_vars:
        logger.error("❌ Отсутствуют обязательные переменные окружения:")
        for var in missing_vars:
            logger.error(f"   {var}")
        return False
    
    logger.info("✅ Все обязательные переменные окружения установлены")
    return True

def validate_yookassa_credentials():
    """Проверка корректности данных ЮКассы"""
    
    shop_id = os.getenv('YOOKASSA_SHOP_ID')
    secret_key = os.getenv('YOOKASSA_SECRET_KEY')
    
    logger.info("🏪 Проверка данных ЮКассы...")
    
    # Проверка формата shop_id
    try:
        shop_id_int = int(shop_id)
        logger.info(f"✅ Shop ID корректный: {shop_id}")
    except (ValueError, TypeError):
        logger.error(f"❌ Shop ID должен быть числом: {shop_id}")
        return False
    
    # Проверка длины secret_key
    if len(secret_key) < 20:
        logger.error(f"❌ Secret Key слишком короткий: {len(secret_key)} символов")
        return False
    
    logger.info(f"✅ Secret Key корректной длины: {len(secret_key)} символов")
    
    # Попытка конфигурации ЮКассы
    try:
        Configuration.configure(
            account_id=shop_id,
            secret_key=secret_key
        )
        logger.info("✅ Конфигурация ЮКассы успешна")
    except Exception as e:
        logger.error(f"❌ Ошибка конфигурации ЮКассы: {e}")
        return False
    
    # Тест API подключения
    try:
        logger.info("🧪 Тестирование подключения к ЮКассе...")
        settings = Settings.get_account_settings()
        logger.info(f"✅ ЮКасса API работает: {settings}")
        
        # Дополнительная информация об аккаунте
        if hasattr(settings, 'account_id'):
            logger.info(f"   Account ID: {settings.account_id}")
        if hasattr(settings, 'status'):
            logger.info(f"   Статус: {settings.status}")
            
        return True
        
    except ApiError as e:
        logger.error(f"❌ ЮКасса API ошибка: {e}")
        logger.error(f"   HTTP код: {getattr(e, 'http_code', 'неизвестно')}")
        logger.error(f"   Код ошибки: {getattr(e, 'error_code', 'неизвестно')}")
        logger.error(f"   Описание: {getattr(e, 'description', 'неизвестно')}")
        
        # Специфичные советы по ошибкам
        if hasattr(e, 'http_code'):
            if e.http_code == 401:
                logger.error("🔑 Проверьте правильность Shop ID и Secret Key")
                logger.error("🔑 Убедитесь, что используете ПРОДАКШН ключи для продакшн среды")
            elif e.http_code == 400:
                logger.error("📋 Проверьте формат данных и настройки магазина в ЮКассе")
        
        return False
        
    except Exception as e:
        logger.error(f"❌ Неожиданная ошибка подключения к ЮКассе: {e}")
        return False

def check_test_mode():
    """Проверка режима работы"""
    
    test_mode = os.getenv('TEST_MODE', 'False').lower() == 'true'
    environment = os.getenv('ENVIRONMENT', 'development')
    
    logger.info(f"🔧 Режим работы: {'ТЕСТ' if test_mode else 'ПРОДАКШН'}")
    logger.info(f"🌍 Окружение: {environment}")
    
    if test_mode:
        logger.warning("⚠️  ВНИМАНИЕ: Работаем в тестовом режиме")
        logger.warning("⚠️  Платежи будут тестовыми!")
    else:
        logger.info("💰 Работаем в продакшн режиме")
        logger.info("💰 Платежи будут реальными!")
    
    return True

def main():
    """Основная функция проверки"""
    
    logger.info("🎭 МИШУРА - Проверка конфигурации")
    logger.info("=" * 50)
    
    all_checks_passed = True
    
    # Проверка переменных окружения
    if not check_environment_variables():
        all_checks_passed = False
    
    logger.info("-" * 30)
    
    # Проверка ЮКассы
    if not validate_yookassa_credentials():
        all_checks_passed = False
    
    logger.info("-" * 30)
    
    # Проверка режима
    if not check_test_mode():
        all_checks_passed = False
    
    logger.info("=" * 50)
    
    if all_checks_passed:
        logger.info("🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!")
        logger.info("🚀 Можно запускать приложение")
        return 0
    else:
        logger.error("❌ ОБНАРУЖЕНЫ ПРОБЛЕМЫ В КОНФИГУРАЦИИ")
        logger.error("🔧 Исправьте ошибки перед запуском")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)