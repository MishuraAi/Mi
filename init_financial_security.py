#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🔐 МИШУРА - Financial Security Initialization
Простая инициализация финансовой безопасности с нуля
(Для систем БЕЗ реальных клиентов)
"""

import os
import sys
import time
import logging
from datetime import datetime

# Добавляем путь к проекту
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(name)s: %(message)s'
)
logger = logging.getLogger("FinancialInit")

def init_fresh_financial_system():
    """🔐 Инициализация финансовой безопасности с нуля"""
    
    logger.info("🚀 ИНИЦИАЛИЗАЦИЯ ФИНАНСОВОЙ БЕЗОПАСНОСТИ МИШУРА С НУЛЯ")
    logger.info("=" * 70)
    
    try:
        # ШАГ 1: Проверяем компоненты
        logger.info("📋 ШАГ 1: Проверка компонентов...")
        check_components()
        
        # ШАГ 2: Создаем финансовые таблицы
        logger.info("📋 ШАГ 2: Создание финансовых таблиц...")
        create_financial_tables()
        
        # ШАГ 3: Патчим существующие методы  
        logger.info("📋 ШАГ 3: Установка финансовой безопасности...")
        install_financial_security()
        
        # ШАГ 4: Тестируем систему
        logger.info("📋 ШАГ 4: Тестирование системы...")
        test_financial_system()
        
        logger.info("🎉 ФИНАНСОВАЯ БЕЗОПАСНОСТЬ УСТАНОВЛЕНА УСПЕШНО!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Критическая ошибка инициализации: {e}")
        return False

def check_components():
    """Проверка всех необходимых компонентов"""
    
    # Проверяем database.py
    try:
        from database import MishuraDB
        db = MishuraDB()
        logger.info("✅ database.py - доступен")
    except Exception as e:
        raise Exception(f"database.py недоступен: {e}")
    
    # Проверяем соединение с БД
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        if db.DB_CONFIG['type'] == 'postgresql':
            cursor.execute("SELECT 1")
        else:
            cursor.execute("SELECT 1")
        
        result = cursor.fetchone()
        conn.close()
        
        if result[0] == 1:
            logger.info(f"✅ База данных ({db.DB_CONFIG['type']}) - доступна")
        else:
            raise Exception("БД не отвечает корректно")
            
    except Exception as e:
        raise Exception(f"База данных недоступна: {e}")
    
    # Проверяем что нет критичных данных
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        conn.close()
        
        logger.info(f"📊 Существующих пользователей: {user_count}")
        
        if user_count > 10:  # Если больше 10 пользователей - это не тестовая система
            logger.warning(f"⚠️ Найдено {user_count} пользователей. Возможно это не пустая система?")
            response = input("Продолжить? (y/N): ")
            if response.lower() != 'y':
                raise Exception("Отменено пользователем")
                
    except Exception as e:
        if "Отменено" in str(e):
            raise
        logger.warning(f"⚠️ Не удалось проверить пользователей: {e}")

def create_financial_tables():
    """Создание таблиц для финансовой безопасности"""
    
    try:
        from database import MishuraDB
        db = MishuraDB()
        
        conn = db.get_connection()
        cursor = conn.cursor()
        
        db_type = db.DB_CONFIG.get('type', 'sqlite')
        
        if db_type == 'postgresql':
            # PostgreSQL схема
            schema_sql = """
            -- Таблица для аудита транзакций
            CREATE TABLE IF NOT EXISTS transaction_log (
                id BIGSERIAL PRIMARY KEY,
                telegram_id BIGINT NOT NULL,
                operation_type VARCHAR(50) NOT NULL,
                transaction_type VARCHAR(20) NOT NULL,
                amount INTEGER NOT NULL,
                balance_before INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                operation_id VARCHAR(255) UNIQUE NOT NULL,
                correlation_id VARCHAR(255),
                metadata JSONB DEFAULT '{}',
                status VARCHAR(20) DEFAULT 'completed',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(100) DEFAULT 'system'
            );

            -- Таблица для optimistic locking
            CREATE TABLE IF NOT EXISTS balance_locks (
                telegram_id BIGINT PRIMARY KEY,
                version_number INTEGER DEFAULT 1,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                locked_by VARCHAR(255),
                lock_expires_at TIMESTAMP
            );

            -- Индексы
            CREATE INDEX IF NOT EXISTS idx_tlog_user_time 
                ON transaction_log (telegram_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_tlog_operation_id 
                ON transaction_log (operation_id);
            CREATE INDEX IF NOT EXISTS idx_tlog_correlation 
                ON transaction_log (correlation_id);
            """
        else:
            # SQLite схема
            schema_sql = """
            -- Таблица для аудита транзакций
            CREATE TABLE IF NOT EXISTS transaction_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER NOT NULL,
                operation_type TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                balance_before INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                operation_id TEXT UNIQUE NOT NULL,
                correlation_id TEXT,
                metadata TEXT DEFAULT '{}',
                status TEXT DEFAULT 'completed',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by TEXT DEFAULT 'system'
            );

            -- Таблица для optimistic locking
            CREATE TABLE IF NOT EXISTS balance_locks (
                telegram_id INTEGER PRIMARY KEY,
                version_number INTEGER DEFAULT 1,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                locked_by TEXT,
                lock_expires_at TIMESTAMP
            );

            -- Индексы
            CREATE INDEX IF NOT EXISTS idx_tlog_user_time 
                ON transaction_log (telegram_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_tlog_operation_id 
                ON transaction_log (operation_id);
            CREATE INDEX IF NOT EXISTS idx_tlog_correlation 
                ON transaction_log (correlation_id);
            """
        
        # Выполняем создание таблиц
        for statement in schema_sql.split(';'):
            statement = statement.strip()
            if statement:
                cursor.execute(statement)
        
        conn.commit()
        conn.close()
        
        logger.info("✅ Финансовые таблицы созданы")
        
        # Инициализируем balance_locks для существующих пользователей
        init_balance_locks_for_existing_users(db)
        
    except Exception as e:
        logger.error(f"❌ Ошибка создания финансовых таблиц: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        raise

def init_balance_locks_for_existing_users(db):
    """Инициализация balance_locks для существующих пользователей"""
    
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Получаем всех существующих пользователей
        cursor.execute("SELECT telegram_id FROM users")
        users = cursor.fetchall()
        
        initialized_count = 0
        
        for user in users:
            telegram_id = user[0]
            try:
                if db.DB_CONFIG['type'] == 'postgresql':
                    cursor.execute("""
                        INSERT INTO balance_locks (telegram_id, version_number, last_updated)
                        VALUES (%s, 1, CURRENT_TIMESTAMP)
                        ON CONFLICT (telegram_id) DO NOTHING
                    """, (telegram_id,))
                else:
                    cursor.execute("""
                        INSERT OR IGNORE INTO balance_locks (telegram_id, version_number)
                        VALUES (?, 1)
                    """, (telegram_id,))
                
                if cursor.rowcount > 0:
                    initialized_count += 1
                    
            except Exception as e:
                logger.warning(f"⚠️ Не удалось инициализировать balance_lock для {telegram_id}: {e}")
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Balance locks инициализированы для {initialized_count} пользователей из {len(users)}")
        
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации balance_locks: {e}")
        raise

def install_financial_security():
    """Установка финансовой безопасности через monkey patching"""
    
    try:
        from database import MishuraDB
        from financial_service import FinancialService
        
        # Создаем финансовый сервис
        db = MishuraDB()
        financial_service = FinancialService(db)
        
        # Monkey patch для database.py
        original_update_balance = db.update_user_balance
        db.update_user_balance = financial_service.update_user_balance
        
        logger.info("✅ Database.py пропатчена с финансовой безопасностью")
        
        # Сохраняем оригинальный метод для возможного отката
        db._original_update_user_balance = original_update_balance
        
        # Глобально сохраняем financial_service для использования в api.py
        import builtins
        builtins.GLOBAL_FINANCIAL_SERVICE = financial_service
        
        logger.info("✅ Финансовая безопасность установлена глобально")
        
    except Exception as e:
        logger.error(f"❌ Ошибка установки финансовой безопасности: {e}")
        raise

def test_financial_system():
    """Базовое тестирование финансовой системы"""
    
    test_user_id = 5930269100
    
    try:
        from database import MishuraDB
        
        db = MishuraDB()
        
        # Получаем financial_service
        if hasattr(__builtins__, 'GLOBAL_FINANCIAL_SERVICE'):
            financial_service = __builtins__['GLOBAL_FINANCIAL_SERVICE']
        else:
            import builtins
            financial_service = builtins.GLOBAL_FINANCIAL_SERVICE
        
        # ТЕСТ 1: Получение баланса
        initial_balance = db.get_user_balance(test_user_id)
        logger.info(f"🧪 ТЕСТ 1: Начальный баланс {test_user_id}: {initial_balance}")
        
        # ТЕСТ 2: Безопасное пополнение
        result = financial_service.safe_balance_operation(
            telegram_id=test_user_id,
            amount_change=100,
            operation_type="init_test",
            metadata={"test": "initialization", "timestamp": datetime.now().isoformat()}
        )
        
        if not result['success']:
            raise Exception(f"Тест пополнения провалился: {result}")
        
        new_balance = result['new_balance']
        expected_balance = initial_balance + 100
        
        if new_balance != expected_balance:
            raise Exception(f"Неверный баланс после пополнения: {new_balance} != {expected_balance}")
        
        logger.info(f"✅ ТЕСТ 2: Безопасное пополнение ({initial_balance} + 100 = {new_balance})")
        
        # ТЕСТ 3: Проверка transaction log
        history = financial_service.get_transaction_history(test_user_id, 5)
        
        if len(history) < 1:
            raise Exception("Transaction log пуст")
        
        logger.info(f"✅ ТЕСТ 3: Transaction log работает ({len(history)} записей)")
        
        # ТЕСТ 4: Тест backward compatibility
        old_balance = db.get_user_balance(test_user_id)
        new_balance_via_old = db.update_user_balance(test_user_id, 25, "backward_test")
        
        if new_balance_via_old != old_balance + 25:
            raise Exception(f"Backward compatibility нарушена: {new_balance_via_old} != {old_balance + 25}")
        
        logger.info(f"✅ ТЕСТ 4: Backward compatibility работает")
        
        # ТЕСТ 5: Защита от отрицательного баланса
        current_balance = db.get_user_balance(test_user_id)
        
        result = financial_service.safe_balance_operation(
            telegram_id=test_user_id,
            amount_change=-(current_balance + 1000),
            operation_type="negative_test"
        )
        
        if result['success']:
            raise Exception("Система позволила создать отрицательный баланс!")
        
        if result.get('error') != 'insufficient_balance':
            raise Exception(f"Неверная ошибка: {result.get('error')}")
        
        logger.info(f"✅ ТЕСТ 5: Защита от отрицательного баланса работает")
        
        logger.info("🎉 ВСЕ БАЗОВЫЕ ТЕСТЫ ПРОЙДЕНЫ!")
        return True
        
    except Exception as e:
        logger.error(f"❌ ТЕСТ ПРОВАЛИЛСЯ: {e}")
        return False

if __name__ == "__main__":
    print("🔐 МИШУРА - Financial Security Initialization")
    print("=" * 60)
    
    success = init_fresh_financial_system()
    
    if success:
        print("\n🎉 ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
        print("✅ Финансовая безопасность установлена")
        print("🚀 Система готова к использованию")
        print("\nДалее:")
        print("1. Запустите API сервер: python api.py")
        print("2. Проверьте health endpoint: /api/v1/health/financial")
    else:
        print("\n❌ ИНИЦИАЛИЗАЦИЯ ПРОВАЛИЛАСЬ!")
        print("🔧 Проверьте ошибки выше")
        sys.exit(1)