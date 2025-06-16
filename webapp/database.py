import sqlite3
import logging
from typing import Optional, Dict, Any, List
import os

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Путь к базе данных
DATABASE_PATH = 'stylist.db'

def get_connection():
    """Получение соединения с базой данных"""
    return sqlite3.connect(DATABASE_PATH)

def init_db():
    """Инициализация базы данных"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Создаем таблицу пользователей
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    telegram_id INTEGER PRIMARY KEY,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    balance INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Создаем таблицу консультаций
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS consultations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    occasion TEXT,
                    preferences TEXT,
                    advice TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (telegram_id)
                )
            ''')
            
            conn.commit()
            logger.info("✅ База данных инициализирована")
            
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации базы данных: {e}")
        raise

def get_user_by_telegram_id(telegram_id):
    """Получить пользователя по Telegram ID"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM users WHERE telegram_id = ?
            """, (telegram_id,))
            
            user = cursor.fetchone()
            return dict(user) if user else None
            
    except Exception as e:
        logger.error(f"❌ Ошибка получения пользователя {telegram_id}: {e}")
        return None

def get_user_consultations(telegram_id, limit=50):
    """Получить список консультаций пользователя"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM consultations 
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (telegram_id, limit))
            
            consultations = cursor.fetchall()
            return [dict(consultation) for consultation in consultations]
            
    except Exception as e:
        logger.error(f"❌ Ошибка получения консультаций для {telegram_id}: {e}")
        return []

def update_user_telegram_data(telegram_id, username=None, first_name=None, last_name=None):
    """Обновить данные Telegram пользователя"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Обновляем только непустые поля
            updates = []
            params = []
            
            if username is not None:
                updates.append("username = ?")
                params.append(username)
            
            if first_name is not None:
                updates.append("first_name = ?")
                params.append(first_name)
                
            if last_name is not None:
                updates.append("last_name = ?")
                params.append(last_name)
            
            if updates:
                params.append(telegram_id)
                query = f"UPDATE users SET {', '.join(updates)} WHERE telegram_id = ?"
                cursor.execute(query, params)
                conn.commit()
                
                logger.info(f"✅ Данные Telegram обновлены для пользователя {telegram_id}")
                return True
            
        return False
        
    except Exception as e:
        logger.error(f"❌ Ошибка обновления данных Telegram для {telegram_id}: {e}")
        return False

def get_user_stats(telegram_id):
    """Получить статистику пользователя"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Получаем основные данные пользователя
            cursor.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,))
            user = cursor.fetchone()
            
            if not user:
                return None
            
            # Считаем консультации
            cursor.execute("""
                SELECT COUNT(*) as total_consultations 
                FROM consultations 
                WHERE user_id = ?
            """, (telegram_id,))
            
            stats = cursor.fetchone()
            
            return {
                "user_id": telegram_id,
                "username": user["username"],
                "first_name": user["first_name"],
                "balance": user["balance"],
                "total_consultations": stats["total_consultations"] if stats else 0,
                "consultations_available": max(0, user["balance"] // 10),
                "created_at": user["created_at"]
            }
            
    except Exception as e:
        logger.error(f"❌ Ошибка получения статистики для {telegram_id}: {e}")
        return None

def cleanup_old_sessions(days_old=30):
    """Очистка старых данных сессий (для оптимизации)"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            # Удаляем старые консультации (старше 30 дней)
            cursor.execute("""
                DELETE FROM consultations 
                WHERE created_at < datetime('now', '-{} days')
            """.format(days_old))
            
            deleted_count = cursor.rowcount
            conn.commit()
            
            logger.info(f"✅ Очищено {deleted_count} старых консультаций")
            return deleted_count
            
    except Exception as e:
        logger.error(f"❌ Ошибка очистки старых данных: {e}")
        return 0

# Обновляем существующие функции для использования контекстного менеджера

def get_user(telegram_id: int) -> Optional[Dict[str, Any]]:
    """Получение данных пользователя"""
    return get_user_by_telegram_id(telegram_id)

def save_user(telegram_id: int, username: str, first_name: str, last_name: str) -> bool:
    """Сохранение нового пользователя"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO users (telegram_id, username, first_name, last_name)
                VALUES (?, ?, ?, ?)
            """, (telegram_id, username, first_name, last_name))
            
            conn.commit()
            logger.info(f"✅ Создан новый пользователь {telegram_id}")
            return True
            
    except Exception as e:
        logger.error(f"❌ Ошибка сохранения пользователя: {e}")
        return False

def get_user_balance(telegram_id: int) -> int:
    """Получение баланса пользователя"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT balance
                FROM users
                WHERE telegram_id = ?
            """, (telegram_id,))
            
            result = cursor.fetchone()
            return result[0] if result else 0
            
    except Exception as e:
        logger.error(f"❌ Ошибка получения баланса: {e}")
        return 0

def update_user_balance(telegram_id: int, amount: int) -> bool:
    """Обновление баланса пользователя"""
    try:
        with sqlite3.connect(DATABASE_PATH) as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE users
                SET balance = balance + ?
                WHERE telegram_id = ?
            """, (amount, telegram_id))
            
            conn.commit()
            logger.info(f"✅ Баланс пользователя {telegram_id} обновлен на {amount}")
            return True
            
    except Exception as e:
        logger.error(f"❌ Ошибка обновления баланса: {e}")
        return False

# Инициализация базы данных при импорте модуля
init_db() 