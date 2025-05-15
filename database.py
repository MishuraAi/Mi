import sqlite3
import os
from datetime import datetime
import logging

# Настройка логирования
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Путь к файлу базы данных
DB_PATH = "styleai.db"

def init_db():
    """Инициализация базы данных"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Чтение SQL-скрипта из файла
        with open('schema.sql', 'r') as f:
            sql_script = f.read()
        
        # Выполнение скрипта
        cursor.executescript(sql_script)
        
        conn.commit()
        conn.close()
        logger.info("База данных инициализирована успешно")
        return True
    except Exception as e:
        logger.error(f"Ошибка при инициализации базы данных: {e}")
        return False
    
def get_connection():
    """Получение соединения с базой данных"""
    return sqlite3.connect(DB_PATH)

# ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ

def save_user(telegram_id, username, first_name, last_name):
    """Сохранение пользователя в базу данных"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT OR IGNORE INTO users (telegram_id, username, first_name, last_name)
        VALUES (?, ?, ?, ?)
        ''', (telegram_id, username, first_name, last_name))
        
        conn.commit()
        conn.close()
        logger.info(f"Пользователь с telegram_id {telegram_id} сохранен в базу данных")
        return True
    except Exception as e:
        logger.error(f"Ошибка при сохранении пользователя: {e}")
        return False

def get_user(telegram_id):
    """Получение информации о пользователе"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE telegram_id = ?', (telegram_id,))
        user = cursor.fetchone()
        
        conn.close()
        
        if user:
            return {
                'id': user[0],
                'telegram_id': user[1],
                'username': user[2],
                'first_name': user[3],
                'last_name': user[4],
                'balance': user[5],
                'created_at': user[6]
            }
        return None
    except Exception as e:
        logger.error(f"Ошибка при получении информации о пользователе: {e}")
        return None
    
def get_user_balance(telegram_id):
    """Получение баланса пользователя"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT balance FROM users WHERE telegram_id = ?', (telegram_id,))
        result = cursor.fetchone()
        
        conn.close()
        
        if result:
            return result[0]
        return 0
    except Exception as e:
        logger.error(f"Ошибка при получении баланса пользователя: {e}")
        return 0
    
def update_user_balance(telegram_id, amount):
    """Обновление баланса пользователя"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE users
        SET balance = balance + ?
        WHERE telegram_id = ?
        ''', (amount, telegram_id))
        
        conn.commit()
        conn.close()
        logger.info(f"Баланс пользователя {telegram_id} обновлен на {amount}")
        return True
    except Exception as e:
        logger.error(f"Ошибка при обновлении баланса пользователя: {e}")
        return False

# ФУНКЦИИ ДЛЯ РАБОТЫ С КОНСУЛЬТАЦИЯМИ

def save_consultation(user_id, occasion=None, preferences=None, image_path=None, advice=None):
    """Сохранение консультации в базу данных"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO consultations (user_id, occasion, preferences, image_path, advice)
        VALUES (?, ?, ?, ?, ?)
        ''', (user_id, occasion, preferences, image_path, advice))
        
        # Получаем ID последней вставленной записи
        consultation_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        logger.info(f"Консультация сохранена с ID {consultation_id}")
        return consultation_id
    except Exception as e:
        logger.error(f"Ошибка при сохранении консультации: {e}")
        return None

def get_consultation(consultation_id, user_id=None):
    """Получение информации о консультации"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        if user_id:
            cursor.execute('''
            SELECT * FROM consultations 
            WHERE id = ? AND user_id = ?
            ''', (consultation_id, user_id))
        else:
            cursor.execute('SELECT * FROM consultations WHERE id = ?', (consultation_id,))
            
        consultation = cursor.fetchone()
        
        conn.close()
        
        if consultation:
            return {
                'id': consultation[0],
                'user_id': consultation[1],
                'occasion': consultation[2],
                'preferences': consultation[3],
                'image_path': consultation[4],
                'advice': consultation[5],
                'created_at': consultation[6]
            }
        return None
    except Exception as e:
        logger.error(f"Ошибка при получении информации о консультации: {e}")
        return None

def get_user_consultations(user_id, limit=5):
    """Получение последних консультаций пользователя"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT id, occasion, created_at 
        FROM consultations 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
        ''', (user_id, limit))
        
        consultations = cursor.fetchall()
        
        conn.close()
        
        result = []
        for c in consultations:
            result.append({
                'id': c[0],
                'occasion': c[1] or "Не указан",
                'created_at': c[2]
            })
            
        return result
    except Exception as e:
        logger.error(f"Ошибка при получении консультаций пользователя: {e}")
        return []

# ФУНКЦИИ ДЛЯ РАБОТЫ С ПЛАТЕЖАМИ

def record_payment(user_id, amount, status="pending"):
    """Запись информации о платеже"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO payments (user_id, amount, status)
        VALUES (?, ?, ?)
        ''', (user_id, amount, status))
        
        payment_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        logger.info(f"Платеж записан с ID {payment_id}")
        return payment_id
    except Exception as e:
        logger.error(f"Ошибка при записи платежа: {e}")
        return None

def update_payment_status(payment_id, status):
    """Обновление статуса платежа"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
        UPDATE payments
        SET status = ?
        WHERE id = ?
        ''', (status, payment_id))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Статус платежа {payment_id} обновлен на {status}")
        return True
    except Exception as e:
        logger.error(f"Ошибка при обновлении статуса платежа: {e}")
        return False

# ФУНКЦИИ ДЛЯ СТАТИСТИКИ

def get_stats():
    """Получение общей статистики сервиса"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Количество пользователей
        cursor.execute('SELECT COUNT(*) FROM users')
        total_users = cursor.fetchone()[0]
        
        # Количество консультаций
        cursor.execute('SELECT COUNT(*) FROM consultations')
        total_consultations = cursor.fetchone()[0]
        
        # Количество консультаций за последний день
        cursor.execute('''
        SELECT COUNT(*) FROM consultations
        WHERE created_at > datetime('now', '-1 day')
        ''')
        daily_consultations = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'total_users': total_users,
            'total_consultations': total_consultations,
            'daily_consultations': daily_consultations
        }
    except Exception as e:
        logger.error(f"Ошибка при получении статистики: {e}")
        return {
            'total_users': 0,
            'total_consultations': 0,
            'daily_consultations': 0
        }

# Инициализация при импорте
if __name__ == "__main__":
    init_db()
    print("База данных инициализирована")