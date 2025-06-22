"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Модуль Базы Данных (database.py)
ВЕРСИЯ: 3.0.0 - POSTGRESQL SUPPORT
ДАТА ОБНОВЛЕНИЯ: 2025-06-22

НОВОЕ: Поддержка PostgreSQL для продакшена + SQLite для разработки
==========================================================================================
"""
import sqlite3
import os
from datetime import datetime
import logging
from typing import Optional, Dict, Any, List, Union

# PostgreSQL поддержка для продакшена
try:
    import psycopg2
    import psycopg2.extras
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
    """Определить тип базы данных"""
    database_url = os.getenv('DATABASE_URL')
    
    if database_url and database_url.startswith('postgresql') and POSTGRES_AVAILABLE:
        logger.info(f"🐘 Используется PostgreSQL для продакшена")
        return {'type': 'postgresql', 'url': database_url}
    else:
        logger.info(f"🗃️ Используется SQLite для разработки: {DB_PATH}")
        return {'type': 'sqlite', 'path': DB_PATH}

# Глобальная конфигурация БД
DB_CONFIG = get_database_config()

class MishuraDB:
    """
    🎭 МИШУРА Database Class
    Универсальный класс для работы с SQLite и PostgreSQL
    """
    
    def __init__(self, db_path: str = DB_PATH):
        """Инициализация базы данных МИШУРА"""
        self.db_path = db_path
        self.logger = logger
        self.DB_CONFIG = DB_CONFIG
        
        # Инициализация БД
        if DB_CONFIG['type'] == 'postgresql':
            self.logger.info(f"🐘 Инициализация PostgreSQL...")
            self.init_db()
        else:
            if not os.path.exists(self.db_path):
                self.logger.info(f"🆕 SQLite БД не существует, создаем: {self.db_path}")
                self.init_db()
            else:
                self.logger.info(f"✅ SQLite БД существует: {self.db_path}")
        
        self.logger.info(f"✅ MishuraDB инициализирована")
    
    def get_connection(self):
        """Подключение к базе данных (SQLite или PostgreSQL)"""
        if DB_CONFIG['type'] == 'postgresql':
            # PostgreSQL подключение
            try:
                conn = psycopg2.connect(DB_CONFIG['url'])
                return conn
            except Exception as e:
                self.logger.error(f"❌ Ошибка подключения к PostgreSQL: {e}")
                raise
        else:
            # SQLite подключение (локальная разработка)
            try:
                conn = sqlite3.connect(self.db_path, timeout=10)
                conn.execute("PRAGMA foreign_keys = ON;")
                return conn
            except sqlite3.Error as e:
                self.logger.critical(f"❌ Ошибка подключения к SQLite: {e}")
                raise
    
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
            balance INTEGER DEFAULT 200,
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
        CREATE INDEX IF NOT EXISTS idx_wardrobe_user_id ON wardrobe(user_id);
        """
        
        cursor.execute(schema_sql)
        conn.commit()
        self.logger.info("✅ PostgreSQL схема создана")
    
    def init_db(self, schema_file_path: str = SCHEMA_FILE) -> bool:
        """Инициализация базы данных"""
        
        try:
            conn = self.get_connection()
            
            if DB_CONFIG['type'] == 'postgresql':
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
            if DB_CONFIG['type'] == 'postgresql' and params:
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
                    if DB_CONFIG['type'] == 'postgresql':
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

    def save_user(self, telegram_id, username=None, first_name=None, last_name=None, initial_balance=200):
        """Сохранить пользователя, возвращает user_id"""
        try:
            # Проверяем, существует ли пользователь
            existing_query = "SELECT id, balance FROM users WHERE telegram_id = ?"
            existing_user = self._execute_query(existing_query, (telegram_id,), fetch_one=True)
            
            if existing_user:
                # Пользователь существует, обновляем только основную информацию
                user_id, current_balance = existing_user
                update_query = """
                    UPDATE users 
                    SET username = COALESCE(?, username),
                        first_name = COALESCE(?, first_name),
                        last_name = COALESCE(?, last_name),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = ?
                """
                
                self._execute_query(update_query, (username, first_name, last_name, telegram_id))
                
                self.logger.info(f"Пользователь обновлен: ID={user_id}, telegram_id={telegram_id}, баланс={current_balance}")
                return user_id
            else:
                # Создаем нового пользователя с начальным балансом
                if DB_CONFIG['type'] == 'postgresql':
                    insert_query = """
                        INSERT INTO users (telegram_id, username, first_name, last_name, balance, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING id
                    """
                    conn = self.get_connection()
                    cursor = conn.cursor()
                    cursor.execute(insert_query, (
                        telegram_id, username or 'webapp_user', first_name or 'WebApp', 
                        last_name or 'User', initial_balance
                    ))
                    user_id = cursor.fetchone()[0]
                    conn.commit()
                    conn.close()
                else:
                    insert_query = """
                        INSERT INTO users (telegram_id, username, first_name, last_name, balance, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """
                    user_id = self._execute_query(insert_query, (
                        telegram_id, username or 'webapp_user', first_name or 'WebApp', 
                        last_name or 'User', initial_balance
                    ))
                
                self.logger.info(f"Пользователь создан: ID={user_id}, telegram_id={telegram_id}, баланс={initial_balance}")
                return user_id
                
        except Exception as e:
            self.logger.error(f"Ошибка сохранения пользователя telegram_id={telegram_id}: {e}")
            raise

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
        
    def get_user_balance(self, telegram_id: int) -> int:
        """Получает текущий баланс консультаций пользователя"""
        self.logger.debug(f"Запрос баланса для пользователя: telegram_id={telegram_id}")
        
        try:
            query = 'SELECT balance FROM users WHERE telegram_id = ?'
            result = self._execute_query(query, (telegram_id,), fetch_one=True)
            
            if result:
                balance = result[0]
                self.logger.info(f"Баланс для пользователя telegram_id={telegram_id} составляет: {balance}")
                return balance
            else:
                # Пользователь не найден, создаем с начальным балансом
                self.logger.warning(f"Пользователь telegram_id={telegram_id} не найден при запросе баланса")
                
                # Создаем пользователя с начальным балансом 200 STCoins
                initial_balance = 200
                user_id = self.save_user(
                    telegram_id=telegram_id,
                    username='webapp_user',
                    first_name='WebApp',
                    last_name='User',
                    initial_balance=initial_balance
                )
                
                if user_id:
                    self.logger.info(f"Создан новый пользователь telegram_id={telegram_id} с начальным балансом {initial_balance}")
                    return initial_balance
                else:
                    return 0
                    
        except Exception as e:
            self.logger.error(f"Ошибка при получении баланса пользователя telegram_id={telegram_id}: {e}", exc_info=True)
            return 0
        
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
            
            if DB_CONFIG['type'] == 'postgresql':
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
            
            if DB_CONFIG['type'] == 'postgresql':
                daily_query = "SELECT COUNT(*) FROM consultations WHERE created_at >= NOW() - INTERVAL '1 day'"
            else:
                daily_query = "SELECT COUNT(*) FROM consultations WHERE created_at >= datetime('now', '-1 day')"
            
            stats['daily_consultations'] = self._execute_query(daily_query, fetch_one=True)[0]
            
            self.logger.info(f"Статистика сервиса МИШУРА получена: {stats}")
        except Exception as e:
            self.logger.error(f"Ошибка при получении статистики: {e}", exc_info=True)
        return stats


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