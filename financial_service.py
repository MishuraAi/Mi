#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🔐 МИШУРА - Financial Service
Production-ready сервис финансовых операций
Версия 1.0.0 - Bulletproof Financial Security
"""

import asyncio
import json
import uuid
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, Union
import logging

logger = logging.getLogger(__name__)


def get_db_config_safe():
    """Безопасное получение конфигурации БД"""
    try:
        from database import get_current_db_config
        return get_current_db_config()
    except Exception:
        # Fallback к определению через переменные окружения
        import os
        if os.getenv('DATABASE_URL') and 'postgresql' in os.getenv('DATABASE_URL', ''):
            return {'type': 'postgresql'}
        return {'type': 'sqlite'}

class FinancialService:
    """
    🔐 Production-ready сервис финансовых операций
    
    Особенности:
    - Optimistic locking вместо FOR UPDATE
    - Connection pooling ready
    - Graceful degradation
    - Comprehensive logging
    - Backward compatibility
    """
    
    def __init__(self, db_instance):
        self.db = db_instance
        self.max_retries = 3
        self.retry_delay = 0.1  # 100ms
        self.lock_timeout = 30  # секунд
        
        logger.info("🔐 FinancialService инициализирован")
        
        # Инициализируем таблицы если нужно
        self._init_financial_tables()
        
    def _init_financial_tables(self):
        """Инициализация финансовых таблиц с поддержкой PostgreSQL и SQLite"""
        try:
            # Получаем конфигурацию базы данных
            config = get_db_config_safe()
            
            # Определяем синтаксис для автоинкремента в зависимости от типа БД
            if config['type'] == 'postgresql':
                id_column = "id BIGSERIAL PRIMARY KEY"
            else:
                id_column = "id INTEGER PRIMARY KEY AUTOINCREMENT"
            
            # SQL для создания таблицы логов транзакций
            transaction_log_sql = f"""
            CREATE TABLE IF NOT EXISTS transaction_log (
                {id_column},
                telegram_id BIGINT NOT NULL,
                operation_type TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                balance_before INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                operation_id TEXT UNIQUE,
                correlation_id TEXT,
                metadata TEXT,
                created_by TEXT DEFAULT 'financial_service',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
            
            # SQL для создания таблицы блокировок баланса
            balance_locks_sql = f"""
            CREATE TABLE IF NOT EXISTS balance_locks (
                telegram_id BIGINT PRIMARY KEY,
                version_number INTEGER NOT NULL DEFAULT 1,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
            
            # Выполняем создание таблиц
            self._execute_query(transaction_log_sql)
            self._execute_query(balance_locks_sql)
            
            logger.info("✅ Финансовые таблицы инициализированы")
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка инициализации финансовых таблиц: {e}")
            return False

    def _execute_query(self, query: str, params=None, fetch_one=False, fetch_all=False):
        """Универсальный метод выполнения запросов"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            # Определяем тип БД
            db_config = getattr(self.db, 'DB_CONFIG', {'type': 'sqlite'})
            if hasattr(self.db, 'get_current_db_config'):
                db_config = self.db.get_current_db_config()
            db_type = db_config.get('type', 'sqlite')
            # Адаптируем параметры для PostgreSQL
            if db_type == 'postgresql' and params:
                query = query.replace('?', '%s')
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            result = None
            if fetch_one:
                result = cursor.fetchone()
            elif fetch_all:
                result = cursor.fetchall()
            if query.strip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')):
                conn.commit()
                if query.strip().upper().startswith('INSERT') and 'RETURNING' not in query.upper():
                    if db_type == 'postgresql':
                        try:
                            cursor.execute("SELECT LASTVAL()")
                            result = cursor.fetchone()[0]
                        except:
                            result = cursor.lastrowid
                    else:
                        result = cursor.lastrowid
            conn.close()
            return result
        except Exception as e:
            logger.error(f"❌ Ошибка выполнения запроса: {e}")
            if 'conn' in locals():
                conn.rollback()
                conn.close()
            raise

    def generate_operation_id(self, operation_type: str, user_id: int, 
                            extra_context: str = None) -> str:
        """Генерация детерминированного operation_id для idempotency"""
        
        # Для консультаций - используем временное окно (5 минут)
        if operation_type in ['consultation_analysis', 'consultation_compare']:
            timestamp_window = int(time.time() // 300)  # 5-минутные окна
            context = f"{user_id}_{operation_type}_{timestamp_window}"
            if extra_context:
                context += f"_{extra_context}"
            
            # Создаем короткий хеш для читаемости
            hash_obj = hashlib.md5(context.encode())
            return f"op_{hash_obj.hexdigest()[:8]}"
        
        # Для платежей - уникальный ID
        return f"{operation_type}_{uuid.uuid4().hex[:8]}"
    
    def safe_balance_operation(self, telegram_id: int, amount_change: int,
                             operation_type: str, operation_id: str = None,
                             correlation_id: str = None,
                             metadata: Dict = None) -> Dict[str, Any]:
        """
        🔐 БЕЗОПАСНАЯ операция с балансом (синхронная версия для совместимости)
        
        Returns:
            {
                'success': bool,
                'new_balance': int,
                'operation_id': str,
                'error': str (if failed),
                'retry_after': int (if rate limited)
            }
        """
        
        # Создаем event loop если его нет (для синхронного кода)
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Если loop уже запущен, используем create_task
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(
                        asyncio.run,
                        self._async_safe_balance_operation(
                            telegram_id, amount_change, operation_type,
                            operation_id, correlation_id, metadata
                        )
                    )
                    return future.result()
            else:
                return loop.run_until_complete(
                    self._async_safe_balance_operation(
                        telegram_id, amount_change, operation_type,
                        operation_id, correlation_id, metadata
                    )
                )
        except RuntimeError:
            # Нет активного loop
            return asyncio.run(
                self._async_safe_balance_operation(
                    telegram_id, amount_change, operation_type,
                    operation_id, correlation_id, metadata
                )
            )
    
    async def _async_safe_balance_operation(self, telegram_id: int, amount_change: int,
                                          operation_type: str, operation_id: str = None,
                                          correlation_id: str = None,
                                          metadata: Dict = None) -> Dict[str, Any]:
        """Асинхронная версия безопасной операции с балансом"""
        
        if not operation_id:
            operation_id = self.generate_operation_id(operation_type, telegram_id)
        
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
        
        # 1. БЫСТРАЯ ПРОВЕРКА IDEMPOTENCY (без блокировок)
        existing = self._check_operation_exists(operation_id)
        if existing:
            logger.info(f"Operation {operation_id} already exists (idempotent)")
            return {
                'success': True,
                'new_balance': existing['balance_after'],
                'operation_id': operation_id,
                'idempotent': True
            }
        
        # 2. OPTIMISTIC LOCKING с retry
        for attempt in range(self.max_retries):
            try:
                result = self._attempt_balance_operation(
                    telegram_id, amount_change, operation_type, 
                    operation_id, correlation_id, metadata
                )
                
                if result['success']:
                    return result
                    
                # Если недостаточно средств - не ретраим
                if result.get('error') == 'insufficient_balance':
                    return result
                    
            except Exception as e:
                logger.warning(f"Balance operation attempt {attempt + 1} failed: {e}")
                
                if attempt < self.max_retries - 1:
                    # Exponential backoff с jitter
                    delay = self.retry_delay * (2 ** attempt) + (time.time() % 0.1)
                    time.sleep(delay)
                else:
                    return {
                        'success': False,
                        'error': 'operation_failed',
                        'details': str(e)
                    }
        
        return {'success': False, 'error': 'max_retries_exceeded'}
    
    def _attempt_balance_operation(self, telegram_id: int, amount_change: int,
                                 operation_type: str, operation_id: str,
                                 correlation_id: str, metadata: Dict) -> Dict:
        """Одна попытка операции с optimistic locking"""
        
        conn = None
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # НАЧИНАЕМ БЫСТРУЮ ТРАНЗАКЦИЮ
            if self.db.DB_CONFIG['type'] == 'postgresql':
                # PostgreSQL: транзакции автоматически начинаются, ничего не делаем
                pass
            else:
                # SQLite: используем conn.execute() как раньше
                conn.execute("BEGIN")
            
            # 1. Получаем текущий баланс и версию (optimistic lock)
            user_data = self._get_user_with_version(conn, cursor, telegram_id)
            if not user_data:
                # Создаем пользователя если не существует
                user_data = self._create_user_if_not_exists(conn, cursor, telegram_id)
            
            current_balance = user_data['balance']
            current_version = user_data.get('version', 1)
            new_balance = current_balance + amount_change
            
            # 2. КРИТИЧЕСКАЯ ПРОВЕРКА: недостаточно средств
            if new_balance < 0:
                conn.rollback()
                return {
                    'success': False,
                    'error': 'insufficient_balance',
                    'required': abs(amount_change),
                    'available': current_balance
                }
            
            # 3. ATOMIC UPDATE с version check
            updated_rows = self._update_balance_with_version_check(
                conn, cursor, telegram_id, new_balance, current_version
            )
            
            if updated_rows == 0:
                # Version conflict - другая транзакция обновила баланс
                conn.rollback()
                raise Exception("Version conflict - concurrent modification")
            
            # 4. ЛОГИРУЕМ ТРАНЗАКЦИЮ
            transaction_id = self._log_transaction(
                conn, cursor, telegram_id, operation_type, amount_change,
                current_balance, new_balance, operation_id,
                correlation_id, metadata
            )
            
            # 5. КОММИТИМ
            conn.commit()
            
            logger.info(f"✅ Balance operation success: {telegram_id} {current_balance}->{new_balance} ({operation_id})")
            
            return {
                'success': True,
                'new_balance': new_balance,
                'operation_id': operation_id,
                'transaction_id': transaction_id,
                'correlation_id': correlation_id
            }
            
        except Exception as e:
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def _get_user_with_version(self, conn, cursor, telegram_id: int) -> Optional[Dict]:
        """Получение пользователя с версией для optimistic locking"""
        
        if self.db.DB_CONFIG['type'] == 'postgresql':
            query = """
                SELECT u.balance, COALESCE(bl.version_number, 1) as version
                FROM users u
                LEFT JOIN balance_locks bl ON u.telegram_id = bl.telegram_id
                WHERE u.telegram_id = %s
            """
            cursor.execute(query, (telegram_id,))
        else:
            query = """
                SELECT u.balance, COALESCE(bl.version_number, 1) as version
                FROM users u
                LEFT JOIN balance_locks bl ON u.telegram_id = bl.telegram_id
                WHERE u.telegram_id = ?
            """
            cursor.execute(query, (telegram_id,))
        
        result = cursor.fetchone()
        if result:
            return {'balance': result[0], 'version': result[1]}
        return None
    
    def _update_balance_with_version_check(self, conn, cursor, telegram_id: int, 
                                         new_balance: int, expected_version: int) -> int:
        """Обновление баланса с проверкой версии (optimistic locking)"""
        new_version = expected_version + 1
        db_config = getattr(self.db, 'DB_CONFIG', {'type': 'sqlite'})
        if hasattr(self.db, 'get_current_db_config'):
            db_config = self.db.get_current_db_config()
        db_type = db_config.get('type', 'sqlite')
        if db_type == 'postgresql':
            update_user_query = """
                UPDATE users 
                SET balance = %s, updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = %s
            """
            cursor.execute(update_user_query, (new_balance, telegram_id))
            upsert_version_query = """
                INSERT INTO balance_locks (telegram_id, version_number, last_updated)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (telegram_id) 
                DO UPDATE SET 
                    version_number = %s,
                    last_updated = CURRENT_TIMESTAMP
                WHERE balance_locks.version_number = %s
            """
            cursor.execute(upsert_version_query, 
                         (telegram_id, new_version, new_version, expected_version))
            return cursor.rowcount
        else:
            cursor.execute("""
                UPDATE users 
                SET balance = ?, updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            """, (new_balance, telegram_id))
            cursor.execute("""
                SELECT version_number FROM balance_locks WHERE telegram_id = ?
            """, (telegram_id,))
            current_version_row = cursor.fetchone()
            current_version = current_version_row[0] if current_version_row else 1
            if current_version != expected_version:
                return 0  # Version conflict
            cursor.execute("""
                INSERT OR REPLACE INTO balance_locks 
                (telegram_id, version_number, last_updated)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            """, (telegram_id, new_version))
            return 1

    def _log_transaction(self, conn, cursor, telegram_id: int, operation_type: str,
                       amount: int, balance_before: int, balance_after: int,
                       operation_id: str, correlation_id: str, 
                       metadata: dict) -> int:
        """Логирование транзакции"""
        safe_metadata = {}
        if metadata:
            for key, value in metadata.items():
                if isinstance(key, str) and len(key) < 100:
                    if isinstance(value, (str, int, float, bool)) and len(str(value)) < 1000:
                        safe_metadata[key] = value
        transaction_type = 'credit' if amount > 0 else 'debit'
        db_config = getattr(self.db, 'DB_CONFIG', {'type': 'sqlite'})
        if hasattr(self.db, 'get_current_db_config'):
            db_config = self.db.get_current_db_config()
        db_type = db_config.get('type', 'sqlite')
        import json
        metadata_json = json.dumps(safe_metadata)
        if db_type == 'postgresql':
            query = """
                INSERT INTO transaction_log 
                (telegram_id, operation_type, transaction_type, amount, 
                 balance_before, balance_after, operation_id, correlation_id, 
                 metadata, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            cursor.execute(query, (
                telegram_id, operation_type, transaction_type, amount,
                balance_before, balance_after, operation_id, correlation_id,
                metadata_json, 'financial_service'
            ))
            return cursor.fetchone()[0]
        else:
            cursor.execute("""
                INSERT INTO transaction_log 
                (telegram_id, operation_type, transaction_type, amount, balance_before, balance_after, 
                 operation_id, correlation_id, metadata, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (telegram_id, operation_type, transaction_type, amount, balance_before, balance_after,
                  operation_id, correlation_id, metadata_json, 'financial_service'))
            return cursor.lastrowid

    def _check_operation_exists(self, operation_id: str) -> Optional[Dict]:
        """Быстрая проверка существования операции"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            if self.db.DB_CONFIG['type'] == 'postgresql':
                query = "SELECT balance_after FROM transaction_log WHERE operation_id = %s LIMIT 1"
                cursor.execute(query, (operation_id,))
            else:
                cursor.execute("SELECT balance_after FROM transaction_log WHERE operation_id = ? LIMIT 1", 
                             (operation_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return {'balance_after': result[0]}
            return None
            
        except Exception as e:
            logger.warning(f"Error checking operation existence: {e}")
            return None
    
    def _create_user_if_not_exists(self, conn, cursor, telegram_id: int) -> Dict:
        """Создание пользователя если не существует"""
        
        initial_balance = 200  # Начальный баланс
        
        if self.db.DB_CONFIG['type'] == 'postgresql':
            query = """
                INSERT INTO users (telegram_id, username, first_name, last_name, balance)
                VALUES (%s, 'webapp_user', 'WebApp', 'User', %s)
                ON CONFLICT (telegram_id) DO NOTHING
                RETURNING balance
            """
            cursor.execute(query, (telegram_id, initial_balance))
            result = cursor.fetchone()
            balance = result[0] if result else self._get_existing_balance(cursor, telegram_id)
        else:
            cursor.execute("""
                INSERT OR IGNORE INTO users 
                (telegram_id, username, first_name, last_name, balance)
                VALUES (?, 'webapp_user', 'WebApp', 'User', ?)
            """, (telegram_id, initial_balance))
            
            # Получаем актуальный баланс
            cursor.execute("SELECT balance FROM users WHERE telegram_id = ?", (telegram_id,))
            balance = cursor.fetchone()[0]
        
        return {'balance': balance, 'version': 1}
    
    def _get_existing_balance(self, cursor, telegram_id: int) -> int:
        """Получение существующего баланса"""
        if self.db.DB_CONFIG['type'] == 'postgresql':
            cursor.execute("SELECT balance FROM users WHERE telegram_id = %s", (telegram_id,))
        else:
            cursor.execute("SELECT balance FROM users WHERE telegram_id = ?", (telegram_id,))
        
        result = cursor.fetchone()
        return result[0] if result else 200
    
    # BACKWARD COMPATIBILITY: обертки для старых методов
    def update_user_balance(self, telegram_id: int, amount_change: int, 
                          operation_type: str = "legacy") -> int:
        """
        🔄 BACKWARD COMPATIBLE wrapper для существующего кода
        
        ВАЖНО: Синхронная версия для совместимости с bot.py
        """
        try:
            result = self.safe_balance_operation(
                telegram_id=telegram_id,
                amount_change=amount_change,
                operation_type=operation_type
            )
            
            if result['success']:
                return result['new_balance']
            else:
                logger.error(f"Balance operation failed: {result}")
                # Возвращаем текущий баланс при ошибке
                return self.db.get_user_balance(telegram_id)
                
        except Exception as e:
            logger.error(f"Legacy balance operation failed: {e}")
            return self.db.get_user_balance(telegram_id)
    
    def get_transaction_history(self, telegram_id: int, limit: int = 20) -> list:
        """Получение истории транзакций пользователя"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            if self.db.DB_CONFIG['type'] == 'postgresql':
                query = """
                    SELECT operation_type, transaction_type, amount, balance_before, 
                           balance_after, created_at, correlation_id
                    FROM transaction_log 
                    WHERE telegram_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT %s
                """
                cursor.execute(query, (telegram_id, limit))
            else:
                cursor.execute("""
                    SELECT operation_type, transaction_type, amount, balance_before, 
                           balance_after, created_at, correlation_id
                    FROM transaction_log 
                    WHERE telegram_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT ?
                """, (telegram_id, limit))
            
            transactions = []
            for row in cursor.fetchall():
                transactions.append({
                    'operation_type': row[0],
                    'transaction_type': row[1],
                    'amount': row[2],
                    'balance_before': row[3],
                    'balance_after': row[4],
                    'created_at': row[5],
                    'correlation_id': row[6]
                })
            
            conn.close()
            return transactions
            
        except Exception as e:
            logger.error(f"Error getting transaction history: {e}")
            return []
    
    def get_financial_stats(self) -> Dict[str, Any]:
        """Получение финансовой статистики"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # Общая статистика
            stats = {}
            
            # Количество транзакций за сегодня
            if self.db.DB_CONFIG['type'] == 'postgresql':
                cursor.execute("""
                    SELECT COUNT(*) FROM transaction_log 
                    WHERE created_at >= CURRENT_DATE
                """)
            else:
                cursor.execute("""
                    SELECT COUNT(*) FROM transaction_log 
                    WHERE created_at >= date('now')
                """)
            
            stats['transactions_today'] = cursor.fetchone()[0]
            
            # Количество пользователей с нулевым балансом
            cursor.execute("SELECT COUNT(*) FROM users WHERE balance = 0")
            stats['zero_balance_users'] = cursor.fetchone()[0]
            
            # Общее количество пользователей
            cursor.execute("SELECT COUNT(*) FROM users")
            stats['total_users'] = cursor.fetchone()[0]
            
            # Средний баланс
            cursor.execute("SELECT AVG(balance) FROM users")
            avg_balance = cursor.fetchone()[0]
            stats['average_balance'] = round(avg_balance, 2) if avg_balance else 0
            
            conn.close()
            return stats
            
        except Exception as e:
            logger.error(f"Error getting financial stats: {e}")
            return {}

    def get_db_config_safe(self):
        """Безопасное получение конфигурации БД"""
        if hasattr(self.db, 'get_current_db_config'):
            return self.db.get_current_db_config()
        if hasattr(self.db, 'DB_CONFIG'):
            return self.db.DB_CONFIG
        return {'type': 'sqlite'}