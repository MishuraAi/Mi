"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Модуль Базы Данных (database.py)
ВЕРСИЯ: 3.1.0 - POSTGRESQL SUPPORT + PAYMENT METHODS
ДАТА ОБНОВЛЕНИЯ: 2025-06-25

НОВОЕ: Поддержка PostgreSQL для продакшена + SQLite для разработки + методы для платежей
==========================================================================================
"""
import sqlite3
import os
from datetime import datetime
import logging
from typing import Optional, Dict, Any, List, Union

# PostgreSQL поддержка для продакшена
try:
    import psycopg  # ✅ ИСПРАВЛЕНО
    from urllib.parse import urlparse
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False

# Настройка логирования для этого модуля
logger = logging.getLogger("MishuraDB")
if not logger.handlers:
    logging.basicConfig(
        format="%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s",
        level=logging.INFO
    )

logger.info("Инициализация модуля базы данных МИШУРА.")

def get_database_path():
    """Определить путь к базе данных из переменной окружения"""
    # Проверяем переменную окружения
    env_path = os.getenv('DATABASE_PATH')
    if env_path:
        # Создаем директорию если нужно
        db_dir = os.path.dirname(env_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        return env_path
    
    # Fallback: проверяем persistent disk
    if os.path.exists('/opt/render/project/data'):
        return '/opt/render/project/data/styleai.db'
    
    # Локальная разработка
    return 'styleai.db'

# Имя файла БД
DB_FILENAME = "styleai.db"
DB_PATH = get_database_path()
SCHEMA_FILE = "schema.sql"

def get_database_config():
    """Определить тип базы данных (для backward compatibility)"""
    database_url = os.getenv('DATABASE_URL')
    
    if database_url and database_url.startswith('postgresql') and POSTGRES_AVAILABLE:
        return {'type': 'postgresql', 'url': database_url}
    else:
        return {'type': 'sqlite', 'path': DB_PATH}

def get_current_db_config():
    """Получить актуальную конфигурацию БД (использует кэш если доступен)"""
    # Если есть экземпляр MishuraDB с кэшированной конфигурацией, используем её
    if hasattr(MishuraDB, '_db_config') and MishuraDB._db_config is not None:
        return MishuraDB._db_config
    
    # Иначе определяем заново (для backward compatibility)
    return get_database_config()

# Обновляем переменную для backward compatibility
DB_CONFIG = get_database_config()

# Добавляем свойство к классу для совместимости с financial_service

def _add_db_config_property():
    """Добавляет свойство DB_CONFIG к экземплярам MishuraDB"""
    def get_db_config(self):
        return self.config
    MishuraDB.DB_CONFIG = property(get_db_config)

# Применяем совместимость
_add_db_config_property()

class MishuraDB:
    _db_config = None
    
    def __init__(self):
        # Инициализируем конфигурацию только один раз
        if MishuraDB._db_config is None:
            MishuraDB._db_config = self._initialize_db_config()
        
        self.config = MishuraDB._db_config
        self.logger = logger  # ← ЭТА СТРОКА КРИТИЧЕСКИ ВАЖНА!
        logger.info(f"✅ MishuraDB инициализирована ({self.config['type']})")
    
    def _initialize_db_config(self):
        database_url = os.getenv('DATABASE_URL')
        if database_url and database_url.startswith('postgresql') and POSTGRES_AVAILABLE:
            logger.info("🐘 PostgreSQL конфигурация загружена")
            return {'type': 'postgresql', 'url': database_url}
        else:
            logger.info("🗃️ SQLite конфигурация загружена") 
            return {'type': 'sqlite', 'path': DB_PATH}
    
    def get_connection(self):
        # Используем закэшированную конфигурацию
        if self.config['type'] == 'postgresql':
            return psycopg.connect(self.config['url'])
        else:
            return sqlite3.connect(self.config['path'], timeout=10)
    
    def create_postgres_schema(self, conn):
        """Создать схему для PostgreSQL"""
        cursor = conn.cursor()
        
        # Создаем таблицы для PostgreSQL
        schema_sql = """
        -- Таблица пользователей
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT UNIQUE NOT NULL,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            balance INTEGER DEFAULT 50,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Таблица консультаций
        CREATE TABLE IF NOT EXISTS consultations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            occasion TEXT,
            preferences TEXT,
            image_path TEXT,
            advice TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- Таблица платежей
        CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            payment_id TEXT UNIQUE NOT NULL,
            yookassa_payment_id TEXT,
            user_id INTEGER NOT NULL,
            telegram_id BIGINT NOT NULL,
            plan_id TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency TEXT DEFAULT 'RUB',
            status TEXT DEFAULT 'pending',
            stcoins_amount INTEGER NOT NULL,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- Таблица гардероба
        CREATE TABLE IF NOT EXISTS wardrobe (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            telegram_file_id TEXT NOT NULL,
            item_name TEXT,
            item_tag TEXT,
            category TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- Создаем индексы
        CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
        CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
        CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
        CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
        CREATE INDEX IF NOT EXISTS idx_payments_yookassa_id ON payments(yookassa_payment_id);
        CREATE INDEX IF NOT EXISTS idx_wardrobe_user_id ON wardrobe(user_id);
        """
        
        cursor.execute(schema_sql)
        conn.commit()
        self.logger.info("✅ PostgreSQL схема создана")
    
    def init_db(self, schema_file_path: str = SCHEMA_FILE) -> bool:
        """Инициализация базы данных"""
        
        try:
            conn = self.get_connection()
            
            if get_current_db_config()['type'] == 'postgresql':
                # PostgreSQL
                self.create_postgres_schema(conn)
            else:
                # SQLite (существующий код)
                cursor = conn.cursor()
                with open(schema_file_path, 'r', encoding='utf-8') as f:
                    sql_script = f.read()
                cursor.executescript(sql_script)
            
            conn.commit()
            conn.close()
            self.logger.info("✅ База данных инициализирована")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка инициализации БД: {e}")
            return False

    def _execute_query(self, query: str, params=None, fetch_one=False, fetch_all=False):
        """Универсальный метод выполнения запросов"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Адаптируем параметры для PostgreSQL
            if get_current_db_config()['type'] == 'postgresql' and params:
                # PostgreSQL использует %s вместо ?
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
                    # Получаем ID последней вставленной записи
                    if get_current_db_config()['type'] == 'postgresql':
                        try:
                            cursor.execute("SELECT LASTVAL()")
                            result = cursor.fetchone()[0]
                        except:
                            # Если LASTVAL не работает, используем currval
                            result = cursor.lastrowid
                    else:
                        result = cursor.lastrowid
            
            conn.close()
            return result
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка выполнения запроса: {e}")
            if 'conn' in locals():
                conn.rollback()
                conn.close()
            raise

    # --- ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ---
    
    def get_user_by_telegram_id(self, telegram_id):
        """Получить пользователя по telegram_id"""
        try:
            query = """
                SELECT id, telegram_id, username, first_name, last_name, created_at
                FROM users 
                WHERE telegram_id = ?
            """
            user = self._execute_query(query, (telegram_id,), fetch_one=True)
            
            if user:
                return {
                    'id': user[0],
                    'telegram_id': user[1], 
                    'username': user[2],
                    'first_name': user[3],
                    'last_name': user[4],
                    'created_at': user[5]
                }
            return None
            
        except Exception as e:
            self.logger.error(f"Ошибка получения пользователя {telegram_id}: {str(e)}")
            return None

    def save_user(self, telegram_id, username=None, first_name=None, last_name=None):
        """
        Сохранение нового пользователя с начальным балансом 50 STcoin
        """
        try:
            # 🔧 ИСПРАВЛЕНО: Начальный баланс 50 вместо 200
            initial_balance = 50  # Было: 200
            
            query = '''
                INSERT OR REPLACE INTO users 
                (telegram_id, username, first_name, last_name, balance, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            '''
            
            # ✅ ИСПОЛЬЗУЕМ ПРАВИЛЬНУЮ АРХИТЕКТУРУ
            user_id = self._execute_query(
                query, 
                (telegram_id, username, first_name, last_name, initial_balance)
            )
            
            self.logger.info(f"Пользователь {telegram_id} сохранен с начальным балансом {initial_balance} STcoin")
            return user_id
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка сохранения пользователя {telegram_id}: {e}")
            return None

    def get_user(self, telegram_id: int) -> Optional[Dict[str, Any]]:
        """Получает информацию о пользователе по его telegram_id"""
        self.logger.debug(f"Запрос информации о пользователе: telegram_id={telegram_id}")
        
        try:
            query = 'SELECT id, telegram_id, username, first_name, last_name, balance, created_at FROM users WHERE telegram_id = ?'
            user_row = self._execute_query(query, (telegram_id,), fetch_one=True)
            
            if user_row:
                user_dict = {
                    'id': user_row[0],
                    'telegram_id': user_row[1],
                    'username': user_row[2],
                    'first_name': user_row[3],
                    'last_name': user_row[4],
                    'balance': user_row[5],
                    'created_at': user_row[6]
                }
                self.logger.info(f"Пользователь telegram_id={telegram_id} найден: {user_dict}")
                return user_dict
            else:
                self.logger.info(f"Пользователь telegram_id={telegram_id} не найден.")
                return None
                
        except Exception as e:
            self.logger.error(f"Ошибка при получении пользователя telegram_id={telegram_id}: {e}", exc_info=True)
        return None
        
    def get_user_balance(self, telegram_id):
        """
        Получение баланса пользователя
        """
        try:
            query = 'SELECT balance FROM users WHERE telegram_id = ?'
            result = self._execute_query(query, (telegram_id,), fetch_one=True)
            
            if result:
                balance = result[0]
                self.logger.info(f"Баланс для пользователя telegram_id={telegram_id} составляет: {balance}")
                return balance
            else:
                # 🔧 ИСПРАВЛЕНО: Создаем нового пользователя с балансом 50
                self.logger.info(f"Пользователь {telegram_id} не найден, создаем с начальным балансом 50 STcoin")
                self.save_user(telegram_id)
                return 50  # Было: 200
                
        except Exception as e:
            self.logger.error(f"❌ Ошибка получения баланса для {telegram_id}: {e}")
            return 50  # Возвращаем стандартный баланс при ошибке

    def update_user_balance(self, telegram_id: int, amount_change: int, operation_type="manual") -> int:
        """Обновляет баланс пользователя на указанную величину"""
        try:
            # Получаем текущий баланс
            current_balance = self.get_user_balance(telegram_id)
            new_balance = current_balance + amount_change
            
            # Обновляем баланс
            update_query = """
                UPDATE users 
                SET balance = ?, updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            """
            
            result = self._execute_query(update_query, (new_balance, telegram_id))
            
            self.logger.info(f"Баланс пользователя {telegram_id} обновлен: {current_balance} {'+' if amount_change >= 0 else ''}{amount_change} = {new_balance} ({operation_type})")
            
            return new_balance
            
        except Exception as e:
            self.logger.error(f"Ошибка обновления баланса для telegram_id={telegram_id}: {e}")
            return current_balance if 'current_balance' in locals() else 0

    # --- ФУНКЦИИ ДЛЯ РАБОТЫ С КОНСУЛЬТАЦИЯМИ ---
    
    def save_consultation(self, user_id: int, occasion: Optional[str], preferences: Optional[str], image_path: Optional[str], advice: Optional[str]) -> Optional[int]:
        """Сохраняет новую консультацию в базу данных"""
        self.logger.info(f"Сохранение консультации для user_id={user_id}, повод: {occasion}")
        
        try:
            # ИСПРАВЛЕНИЕ: user_id теперь это telegram_id, получаем правильный internal ID
            user_query = "SELECT id FROM users WHERE telegram_id = ?"
            user_row = self._execute_query(user_query, (user_id,), fetch_one=True)
            
            if not user_row:
                self.logger.error(f"Пользователь с telegram_id={user_id} не найден")
                return None
            
            internal_user_id = user_row[0]
            
            if get_current_db_config()['type'] == 'postgresql':
                consultation_query = '''
                INSERT INTO consultations (user_id, occasion, preferences, image_path, advice, created_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                RETURNING id
                '''
                conn = self.get_connection()
                cursor = conn.cursor()
                cursor.execute(consultation_query, (internal_user_id, occasion, preferences, image_path, advice))
                consultation_id = cursor.fetchone()[0]
                conn.commit()
                conn.close()
            else:
                consultation_query = '''
                INSERT INTO consultations (user_id, occasion, preferences, image_path, advice, created_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                '''
                consultation_id = self._execute_query(consultation_query, (internal_user_id, occasion, preferences, image_path, advice))
            
            self.logger.info(f"Консультация для telegram_id={user_id} (internal_id={internal_user_id}) успешно сохранена с ID={consultation_id}.")
            return consultation_id
        except Exception as e:
            self.logger.error(f"Ошибка при сохранении консультации для user_id={user_id}: {e}", exc_info=True)
        return None

    def get_consultation(self, consultation_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Получает информацию о консультации"""
        self.logger.debug(f"Запрос консультации ID={consultation_id}" + (f" для user_id={user_id}" if user_id else ""))
        
        try:
            if user_id:
                query = 'SELECT * FROM consultations WHERE id = ? AND user_id = ?'
                params = (consultation_id, user_id)
            else:
                query = 'SELECT * FROM consultations WHERE id = ?'
                params = (consultation_id,)
            
            consultation_row = self._execute_query(query, params, fetch_one=True)
            
            if consultation_row:
                consultation_dict = {
                    'id': consultation_row[0],
                    'user_id': consultation_row[1],
                    'occasion': consultation_row[2],
                    'preferences': consultation_row[3],
                    'image_path': consultation_row[4],
                    'advice': consultation_row[5],
                    'created_at': consultation_row[6]
                }
                self.logger.info(f"Консультация ID={consultation_id} найдена.")
                return consultation_dict
            else:
                self.logger.info(f"Консультация ID={consultation_id} не найдена" + (f" для user_id={user_id}." if user_id else "."))
                return None
        except Exception as e:
            self.logger.error(f"Ошибка при получении консультации ID={consultation_id}: {e}", exc_info=True)
        return None

    def get_user_consultations(self, user_id: int, limit: int = 20):
        """Получить консультации пользователя"""
        try:
            query = """
                SELECT id, user_id, occasion, preferences, image_path, advice, created_at
                FROM consultations 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            """
            
            consultations = self._execute_query(query, (user_id, limit), fetch_all=True)
            
            self.logger.info(f"📚 Получено {len(consultations)} консультаций для пользователя {user_id}")
            return consultations
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка получения консультаций для пользователя {user_id}: {e}")
            return []

    # === ФУНКЦИИ ДЛЯ РАБОТЫ С ПЛАТЕЖАМИ ===

    def save_payment(self, payment_id: str, user_id: int, telegram_id: int, 
                    plan_id: str, amount: float, stcoins_amount: int, 
                    status: str = 'pending') -> bool:
        """Сохранить платеж в базу данных"""
        try:
            query = """
                INSERT INTO payments (
                    payment_id, user_id, telegram_id, plan_id, 
                    amount, stcoins_amount, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """
            
            self._execute_query(query, (
                payment_id, user_id, telegram_id, plan_id,
                amount, stcoins_amount, status
            ))
            
            self.logger.info(f"💾 Платеж сохранен: {payment_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка сохранения платежа {payment_id}: {e}")
            return False

    def update_payment_yookassa_id(self, payment_id: str, yookassa_payment_id: str) -> bool:
        """Обновить ID платежа от ЮKassa"""
        try:
            query = """
                UPDATE payments 
                SET yookassa_payment_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE payment_id = ?
            """
            
            self._execute_query(query, (yookassa_payment_id, payment_id))
            
            self.logger.info(f"🔄 Обновлен YooKassa ID: {payment_id} -> {yookassa_payment_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка обновления YooKassa ID {payment_id}: {e}")
            return False

    def update_payment_status(self, payment_id: str, status: str, 
                             error_message: str = None) -> bool:
        """Обновить статус платежа"""
        try:
            if error_message:
                query = """
                    UPDATE payments 
                    SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE payment_id = ?
                """
                params = (status, error_message, payment_id)
            else:
                query = """
                    UPDATE payments 
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE payment_id = ?
                """
                params = (status, payment_id)
            
            self._execute_query(query, params)
            
            if error_message:
                self.logger.error(f"💳 Статус платежа {payment_id}: {status} - {error_message}")
            else:
                self.logger.info(f"💳 Статус платежа {payment_id}: {status}")
                
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка обновления статуса платежа {payment_id}: {e}")
            return False

    def get_payment_by_yookassa_id(self, yookassa_payment_id: str) -> Optional[Dict[str, Any]]:
        """Получить платеж по ID ЮKassa"""
        try:
            query = """
                SELECT payment_id, user_id, telegram_id, plan_id, amount, 
                       stcoins_amount, status, yookassa_payment_id, 
                       created_at, updated_at, processed_at
                FROM payments 
                WHERE yookassa_payment_id = ?
            """
            
            payment_row = self._execute_query(query, (yookassa_payment_id,), fetch_one=True)
            
            if payment_row:
                return {
                    'payment_id': payment_row[0],
                    'user_id': payment_row[1],
                    'telegram_id': payment_row[2],
                    'plan_id': payment_row[3],
                    'amount': payment_row[4],
                    'stcoins_amount': payment_row[5],
                    'status': payment_row[6],
                    'yookassa_payment_id': payment_row[7],
                    'created_at': payment_row[8],
                    'updated_at': payment_row[9],
                    'processed_at': payment_row[10]
                }
            return None
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка получения платежа по YooKassa ID {yookassa_payment_id}: {e}")
            return None

    def get_payment_status(self, payment_id: str, telegram_id: int = None) -> Optional[Dict[str, Any]]:
        """Получить статус платежа"""
        try:
            if telegram_id:
                query = """
                    SELECT payment_id, yookassa_payment_id, status, amount, 
                           stcoins_amount, created_at, processed_at, error_message
                    FROM payments 
                    WHERE payment_id = ? AND telegram_id = ?
                """
                params = (payment_id, telegram_id)
            else:
                query = """
                    SELECT payment_id, yookassa_payment_id, status, amount, 
                           stcoins_amount, created_at, processed_at, error_message
                    FROM payments 
                    WHERE payment_id = ?
                """
                params = (payment_id,)
            
            payment_row = self._execute_query(query, params, fetch_one=True)
            
            if payment_row:
                return {
                    'payment_id': payment_row[0],
                    'yookassa_payment_id': payment_row[1],
                    'status': payment_row[2],
                    'amount': payment_row[3],
                    'stcoins_amount': payment_row[4],
                    'created_at': payment_row[5],
                    'processed_at': payment_row[6],
                    'error_message': payment_row[7]
                }
            return None
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка получения статуса платежа {payment_id}: {e}")
            return None

    def mark_payment_processed(self, payment_id: str) -> bool:
        """Отметить платеж как обработанный"""
        try:
            query = """
                UPDATE payments 
                SET status = 'succeeded', processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE payment_id = ?
            """
            
            self._execute_query(query, (payment_id,))
            
            self.logger.info(f"✅ Платеж отмечен как обработанный: {payment_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка отметки платежа как обработанного {payment_id}: {e}")
            return False

    def get_pending_payments(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Получить ожидающие платежи для recovery"""
        try:
            query = """
                SELECT payment_id, yookassa_payment_id, telegram_id, stcoins_amount, created_at
                FROM payments 
                WHERE status = 'pending' 
                AND yookassa_payment_id IS NOT NULL
                ORDER BY created_at DESC 
                LIMIT ?
            """
            
            payments = self._execute_query(query, (limit,), fetch_all=True)
            
            result = []
            for payment in payments:
                result.append({
                    'payment_id': payment[0],
                    'yookassa_payment_id': payment[1],
                    'telegram_id': payment[2],
                    'stcoins_amount': payment[3],
                    'created_at': payment[4]
                })
            
            self.logger.info(f"📋 Получено {len(result)} ожидающих платежей")
            return result
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка получения ожидающих платежей: {e}")
            return []

    def get_stats(self) -> Dict[str, int]:
        """Получает общую статистику сервиса МИШУРА"""
        self.logger.debug("Запрос общей статистики сервиса.")
        stats = {
            'total_users': 0,
            'total_consultations': 0,
            'daily_consultations': 0,
            'total_payments_completed': 0
        }
        try:
            stats['total_users'] = self._execute_query('SELECT COUNT(*) FROM users', fetch_one=True)[0]
            stats['total_consultations'] = self._execute_query('SELECT COUNT(*) FROM consultations', fetch_one=True)[0]
            
            if get_current_db_config()['type'] == 'postgresql':
                daily_query = "SELECT COUNT(*) FROM consultations WHERE created_at >= NOW() - INTERVAL '1 day'"
            else:
                daily_query = "SELECT COUNT(*) FROM consultations WHERE created_at >= datetime('now', '-1 day')"
            
            stats['daily_consultations'] = self._execute_query(daily_query, fetch_one=True)[0]
            
            # Добавляем статистику платежей
            try:
                stats['total_payments_completed'] = self._execute_query(
                    "SELECT COUNT(*) FROM payments WHERE status = 'succeeded'", fetch_one=True
                )[0]
            except:
                stats['total_payments_completed'] = 0
                
            self.logger.info(f"Статистика сервиса МИШУРА получена: {stats}")
        except Exception as e:
            self.logger.error(f"Ошибка при получении статистики: {e}", exc_info=True)
        return stats

    def create_feedback_tables(self):
        """Создание таблиц для системы отзывов"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            if get_current_db_config()['type'] == 'postgresql':
                # PostgreSQL схема
                feedback_schema = """
                -- Таблица отзывов пользователей
                CREATE TABLE IF NOT EXISTS feedback_submissions (
                    id SERIAL PRIMARY KEY,
                    telegram_id BIGINT NOT NULL,
                    feedback_text TEXT NOT NULL,
                    feedback_rating VARCHAR(10) DEFAULT 'positive',
                    character_count INTEGER NOT NULL,
                    consultation_id INTEGER,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    google_sheets_synced BOOLEAN DEFAULT FALSE,
                    google_sheets_row_id VARCHAR(50),
                    bonus_awarded BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (consultation_id) REFERENCES consultations(id)
                );

                -- Таблица отслеживания показов форм
                CREATE TABLE IF NOT EXISTS feedback_prompts (
                    id SERIAL PRIMARY KEY,
                    telegram_id BIGINT NOT NULL,
                    consultation_id INTEGER NOT NULL,
                    prompt_shown_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_action VARCHAR(20) DEFAULT 'shown',
                    dismissal_reason VARCHAR(50),
                    FOREIGN KEY (consultation_id) REFERENCES consultations(id)
                );

                -- Индексы
                CREATE INDEX IF NOT EXISTS idx_feedback_telegram_id ON feedback_submissions(telegram_id);
                CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback_submissions(created_at);
                CREATE INDEX IF NOT EXISTS idx_prompts_telegram_user_time ON feedback_prompts(telegram_id, prompt_shown_at);
                """
            else:
                # SQLite схема
                feedback_schema = """
                -- Таблица отзывов пользователей
                CREATE TABLE IF NOT EXISTS feedback_submissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id INTEGER NOT NULL,
                    feedback_text TEXT NOT NULL,
                    feedback_rating TEXT DEFAULT 'positive',
                    character_count INTEGER NOT NULL,
                    consultation_id INTEGER,
                    ip_address TEXT,
                    user_agent TEXT,
                    google_sheets_synced INTEGER DEFAULT 0,
                    google_sheets_row_id TEXT,
                    bonus_awarded INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (consultation_id) REFERENCES consultations(id)
                );

                -- Таблица отслеживания показов форм
                CREATE TABLE IF NOT EXISTS feedback_prompts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id INTEGER NOT NULL,
                    consultation_id INTEGER NOT NULL,
                    prompt_shown_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_action TEXT DEFAULT 'shown',
                    dismissal_reason TEXT,
                    FOREIGN KEY (consultation_id) REFERENCES consultations(id)
                );

                -- Индексы
                CREATE INDEX IF NOT EXISTS idx_feedback_telegram_id ON feedback_submissions(telegram_id);
                CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback_submissions(created_at);
                CREATE INDEX IF NOT EXISTS idx_prompts_telegram_user_time ON feedback_prompts(telegram_id, prompt_shown_at);
                """
            
            # Выполняем создание таблиц
            for statement in feedback_schema.split(';'):
                statement = statement.strip()
                if statement:
                    cursor.execute(statement)
            
            conn.commit()
            conn.close()
            
            self.logger.info("✅ Таблицы системы отзывов созданы успешно")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка создания таблиц отзывов: {e}")
            if 'conn' in locals():
                conn.rollback()
                conn.close()
            return False

    def save_feedback_submission(self, telegram_id: int, feedback_text: str, 
                               feedback_rating: str, consultation_id: int = None,
                               ip_address: str = None, user_agent: str = None) -> Optional[int]:
        """Сохранить отзыв пользователя"""
        try:
            char_count = len(feedback_text.strip())
            
            if get_current_db_config()['type'] == 'postgresql':
                query = """
                    INSERT INTO feedback_submissions 
                    (telegram_id, feedback_text, feedback_rating, character_count, 
                     consultation_id, ip_address, user_agent)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """
                conn = self.get_connection()
                cursor = conn.cursor()
                cursor.execute(query, (telegram_id, feedback_text, feedback_rating, 
                                     char_count, consultation_id, ip_address, user_agent))
                feedback_id = cursor.fetchone()[0]
                conn.commit()
                conn.close()
            else:
                # ✅ ИСПРАВЛЕНО: Используем _execute_query() правильно
                query = """
                    INSERT INTO feedback_submissions 
                    (telegram_id, feedback_text, feedback_rating, character_count, 
                     consultation_id, ip_address, user_agent)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """
                
                # _execute_query для INSERT возвращает lastrowid автоматически
                feedback_id = self._execute_query(
                    query, 
                    (telegram_id, feedback_text, feedback_rating, char_count, 
                     consultation_id, ip_address, user_agent)
                )
            
            self.logger.info(f"✅ Отзыв сохранен: ID={feedback_id}, user={telegram_id}, rating={feedback_rating}, chars={char_count}")
            return feedback_id
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка сохранения отзыва: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            return None

    def can_show_feedback_prompt(self, telegram_id: int) -> bool:
        """Проверить можно ли показать форму отзыва (не чаще раза в 10 дней)"""
        try:
            if get_current_db_config()['type'] == 'postgresql':
                query = """
                    SELECT prompt_shown_at 
                    FROM feedback_prompts 
                    WHERE telegram_id = %s 
                    ORDER BY prompt_shown_at DESC 
                    LIMIT 1
                """
                params = (telegram_id,)
            else:
                query = """
                    SELECT prompt_shown_at 
                    FROM feedback_prompts 
                    WHERE telegram_id = ? 
                    ORDER BY prompt_shown_at DESC 
                    LIMIT 1
                """
                params = (telegram_id,)
            
            result = self._execute_query(query, params, fetch_one=True)
            
            if not result:
                return True  # Первый раз показываем
            
            from datetime import datetime, timedelta
            last_prompt = result[0]
            
            # Парсим дату в зависимости от типа БД
            if isinstance(last_prompt, str):
                last_prompt = datetime.fromisoformat(last_prompt.replace('Z', '+00:00'))
            
            days_since = (datetime.now() - last_prompt).days
            can_show = days_since >= 10
            
            self.logger.info(f"🔍 Проверка показа отзыва: user={telegram_id}, days_since={days_since}, can_show={can_show}")
            return can_show
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка проверки возможности показа отзыва: {e}")
            return False  # В случае ошибки не показываем

    def log_feedback_prompt(self, telegram_id: int, consultation_id: int, 
                           action: str = 'shown', dismissal_reason: str = None) -> bool:
        """Записать факт показа/действия с формой отзыва"""
        try:
            if get_current_db_config()['type'] == 'postgresql':
                query = """
                    INSERT INTO feedback_prompts 
                    (telegram_id, consultation_id, user_action, dismissal_reason)
                    VALUES (%s, %s, %s, %s)
                """
                params = (telegram_id, consultation_id, action, dismissal_reason)
            else:
                query = """
                    INSERT INTO feedback_prompts 
                    (telegram_id, consultation_id, user_action, dismissal_reason)
                    VALUES (?, ?, ?, ?)
                """
                params = (telegram_id, consultation_id, action, dismissal_reason)
            
            self._execute_query(query, params)
            
            self.logger.info(f"📝 Зафиксировано действие с формой отзыва: user={telegram_id}, action={action}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка логирования действия с формой отзыва: {e}")
            return False

    def get_pending_feedback_sync(self, limit: int = 50) -> List[Dict]:
        """Получить отзывы для синхронизации с Google Sheets"""
        try:
            if get_current_db_config()['type'] == 'postgresql':
                query = """
                    SELECT id, telegram_id, feedback_text, feedback_rating, 
                           character_count, created_at, consultation_id
                    FROM feedback_submissions 
                    WHERE google_sheets_synced = FALSE 
                    ORDER BY created_at ASC 
                    LIMIT %s
                """
            else:
                query = """
                    SELECT id, telegram_id, feedback_text, feedback_rating, 
                           character_count, created_at, consultation_id
                    FROM feedback_submissions 
                    WHERE google_sheets_synced = 0 
                    ORDER BY created_at ASC 
                    LIMIT ?
                """
            
            results = self._execute_query(query, (limit,), fetch_all=True)
            
            feedback_list = []
            for row in results:
                feedback_list.append({
                    'id': row[0],
                    'telegram_id': row[1],
                    'feedback_text': row[2],
                    'feedback_rating': row[3],
                    'character_count': row[4],
                    'created_at': row[5],
                    'consultation_id': row[6]
                })
            
            self.logger.info(f"📊 Получено {len(feedback_list)} отзывов для синхронизации")
            return feedback_list
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка получения отзывов для синхронизации: {e}")
            return []

    def mark_feedback_synced(self, feedback_id: int, sheets_row_id: str = None) -> bool:
        """Отметить отзыв как синхронизированный с Google Sheets"""
        try:
            if get_current_db_config()['type'] == 'postgresql':
                query = """
                    UPDATE feedback_submissions 
                    SET google_sheets_synced = TRUE, google_sheets_row_id = %s
                    WHERE id = %s
                """
                params = (sheets_row_id, feedback_id)
            else:
                query = """
                    UPDATE feedback_submissions 
                    SET google_sheets_synced = 1, google_sheets_row_id = ?
                    WHERE id = ?
                """
                params = (sheets_row_id, feedback_id)
            
            self._execute_query(query, params)
            
            self.logger.info(f"✅ Отзыв ID={feedback_id} отмечен как синхронизированный")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка отметки синхронизации отзыва ID={feedback_id}: {e}")
            return False

    def mark_feedback_bonus_awarded(self, feedback_id: int) -> bool:
        """Отметить что бонус за отзыв начислен"""
        try:
            if get_current_db_config()['type'] == 'postgresql':
                query = "UPDATE feedback_submissions SET bonus_awarded = TRUE WHERE id = %s"
            else:
                query = "UPDATE feedback_submissions SET bonus_awarded = 1 WHERE id = ?"
            
            self._execute_query(query, (feedback_id,))
            
            self.logger.info(f"💰 Бонус за отзыв ID={feedback_id} отмечен как начисленный")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка отметки начисления бонуса: {e}")
            return False

    def get_feedback_stats(self) -> Dict[str, Any]:
        """Получить статистику по отзывам"""
        try:
            stats = {}
            
            # Общее количество отзывов
            total_query = "SELECT COUNT(*) FROM feedback_submissions"
            stats['total_feedback'] = self._execute_query(total_query, fetch_one=True)[0]
            
            # Отзывы за сегодня
            if get_current_db_config()['type'] == 'postgresql':
                today_query = "SELECT COUNT(*) FROM feedback_submissions WHERE created_at >= CURRENT_DATE"
            else:
                today_query = "SELECT COUNT(*) FROM feedback_submissions WHERE created_at >= date('now')"
            
            stats['feedback_today'] = self._execute_query(today_query, fetch_one=True)[0]
            
            # Средняя длина отзывов
            avg_query = "SELECT AVG(character_count) FROM feedback_submissions"
            avg_result = self._execute_query(avg_query, fetch_one=True)[0]
            stats['avg_feedback_length'] = round(avg_result, 1) if avg_result else 0
            
            # Процент положительных отзывов
            if stats['total_feedback'] > 0:
                positive_query = "SELECT COUNT(*) FROM feedback_submissions WHERE feedback_rating = 'positive'"
                positive_count = self._execute_query(positive_query, fetch_one=True)[0]
                stats['positive_feedback_percent'] = round((positive_count / stats['total_feedback']) * 100, 1)
            else:
                stats['positive_feedback_percent'] = 0
            
            # Количество начисленных бонусов
            if get_current_db_config()['type'] == 'postgresql':
                bonus_query = "SELECT COUNT(*) FROM feedback_submissions WHERE bonus_awarded = TRUE"
            else:
                bonus_query = "SELECT COUNT(*) FROM feedback_submissions WHERE bonus_awarded = 1"
            
            stats['bonuses_awarded'] = self._execute_query(bonus_query, fetch_one=True)[0]
            
            return stats
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка получения статистики отзывов: {e}")
            return {}


# === ФУНКЦИИ СОВМЕСТИМОСТИ ===

def get_connection():
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.get_connection()

def init_db(schema_file_path: str = SCHEMA_FILE) -> bool:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.init_db(schema_file_path)

if __name__ == "__main__":
    logger.info("Запуск database.py как основного скрипта (для тестов или инициализации).")
    db_instance = MishuraDB()
    if db_instance:
        logger.info("База данных успешно инициализирована из __main__.")
    else:
        logger.error("Не удалось инициализировать базу данных из __main__.")