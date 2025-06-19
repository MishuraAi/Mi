"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Модуль Базы Данных (database.py)
ВЕРСИЯ: 0.1.3 - ДОБАВЛЕН КЛАСС MishuraDB
ДАТА ОБНОВЛЕНИЯ: 2025-06-19

КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Добавлен класс MishuraDB для совместимости с api.py
==========================================================================================
"""
import sqlite3
import os
from datetime import datetime
import logging
from typing import Optional, Dict, Any, List, Union

# Настройка логирования для этого модуля
logger = logging.getLogger("MishuraDB")
if not logger.handlers:
    logging.basicConfig(
        format="%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s",
        level=logging.INFO
    )

logger.info("Инициализация модуля базы данных МИШУРА.")

# Имя файла БД
DB_FILENAME = "styleai.db"
DB_PATH = DB_FILENAME 
SCHEMA_FILE = "schema.sql"

class MishuraDB:
    """
    🎭 МИШУРА Database Class
    Основной класс для работы с базой данных SQLite
    """
    
    def __init__(self, db_path: str = DB_PATH):
        """Инициализация базы данных МИШУРА"""
        self.db_path = db_path
        self.logger = logger
        
        # Инициализируем базу данных при создании экземпляра
        self.init_db()
        
        self.logger.info(f"✅ MishuraDB инициализирована: {self.db_path}")
    
    def get_connection(self) -> sqlite3.Connection:
        """
        Устанавливает и возвращает соединение с базой данных SQLite.
        Включает поддержку внешних ключей.
        """
        try:
            conn = sqlite3.connect(self.db_path, timeout=10)
            conn.execute("PRAGMA foreign_keys = ON;")
            return conn
        except sqlite3.Error as e:
            self.logger.critical(f"Критическая ошибка при подключении к БД {self.db_path}: {e}", exc_info=True)
            raise
    
    def init_db(self, schema_file_path: str = SCHEMA_FILE) -> bool:
        """Инициализирует базу данных"""
        self.logger.info(f"Начало инициализации/проверки базы данных '{self.db_path}' со схемой '{schema_file_path}'")
        
        # Проверка существования файла схемы
        actual_schema_path = schema_file_path
        if not os.path.exists(actual_schema_path):
            self.logger.warning(f"Файл схемы '{actual_schema_path}' не найден в текущей директории ({os.getcwd()}). Попытка найти рядом с database.py...")
            script_dir = os.path.dirname(os.path.abspath(__file__))
            path_near_script = os.path.join(script_dir, schema_file_path)
            if os.path.exists(path_near_script):
                actual_schema_path = path_near_script
                self.logger.info(f"Файл схемы найден по альтернативному пути: {actual_schema_path}")
            else:
                self.logger.critical(f"КРИТИЧЕСКАЯ ОШИБКА: Файл SQL-схемы '{schema_file_path}' не найден. Инициализация БД невозможна.")
                return False
                
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                with open(actual_schema_path, 'r', encoding='utf-8') as f:
                    sql_script = f.read()
                
                cursor.executescript(sql_script)
                conn.commit()
                self.logger.info(f"База данных '{self.db_path}' успешно инициализирована/проверена схемой '{actual_schema_path}'.")
                return True
        except sqlite3.Error as e_sql:
            self.logger.error(f"Ошибка SQLite при инициализации базы данных ({self.db_path}): {e_sql}", exc_info=True)
        except FileNotFoundError:
            self.logger.error(f"Файл SQL-схемы '{actual_schema_path}' не найден.", exc_info=True)
        except Exception as e:
            self.logger.critical(f"Непредвиденная критическая ошибка при инициализации базы данных: {e}", exc_info=True)
        return False

    # --- ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ---
    
    def get_user_by_telegram_id(self, telegram_id):
        """Получить пользователя по telegram_id"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, telegram_id, username, first_name, last_name, created_at
                FROM users 
                WHERE telegram_id = ?
            """, (telegram_id,))
            user = cursor.fetchone()
            conn.close()
            
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
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Проверяем, существует ли пользователь
            cursor.execute("SELECT id, balance FROM users WHERE telegram_id = ?", (telegram_id,))
            existing_user = cursor.fetchone()
            
            if existing_user:
                # Пользователь существует, обновляем только основную информацию
                user_id, current_balance = existing_user
                cursor.execute("""
                    UPDATE users 
                    SET username = COALESCE(?, username),
                        first_name = COALESCE(?, first_name),
                        last_name = COALESCE(?, last_name),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = ?
                """, (username, first_name, last_name, telegram_id))
                
                conn.commit()
                conn.close()
                
                self.logger.info(f"Пользователь обновлен: ID={user_id}, telegram_id={telegram_id}, баланс={current_balance}")
                return user_id
            else:
                # Создаем нового пользователя с начальным балансом
                cursor.execute("""
                    INSERT INTO users (telegram_id, username, first_name, last_name, balance, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (telegram_id, username or 'webapp_user', first_name or 'WebApp', 
                      last_name or 'User', initial_balance, datetime.now()))
                
                user_id = cursor.lastrowid
                conn.commit()
                conn.close()
                
                self.logger.info(f"Пользователь создан: ID={user_id}, telegram_id={telegram_id}, баланс={initial_balance}")
                return user_id
                
        except Exception as e:
            self.logger.error(f"Ошибка сохранения пользователя telegram_id={telegram_id}: {e}")
            if 'conn' in locals():
                conn.rollback()
                conn.close()
            raise

    def get_user(self, telegram_id: int) -> Optional[Dict[str, Any]]:
        """Получает информацию о пользователе по его telegram_id"""
        self.logger.debug(f"Запрос информации о пользователе: telegram_id={telegram_id}")
        sql = 'SELECT id, telegram_id, username, first_name, last_name, balance, created_at FROM users WHERE telegram_id = ?'
        try:
            with self.get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(sql, (telegram_id,))
                user_row = cursor.fetchone()
            
            if user_row:
                user_dict = dict(user_row)
                self.logger.info(f"Пользователь telegram_id={telegram_id} найден: {user_dict}")
                return user_dict
            else:
                self.logger.info(f"Пользователь telegram_id={telegram_id} не найден.")
                return None
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при получении пользователя telegram_id={telegram_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при получении пользователя telegram_id={telegram_id}: {e_gen}", exc_info=True)
        return None
        
    def get_user_balance(self, telegram_id: int) -> int:
        """Получает текущий баланс консультаций пользователя"""
        self.logger.debug(f"Запрос баланса для пользователя: telegram_id={telegram_id}")
        sql = 'SELECT balance FROM users WHERE telegram_id = ?'
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (telegram_id,))
                result = cursor.fetchone()
            
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
                    
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при получении баланса пользователя telegram_id={telegram_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при получении баланса пользователя telegram_id={telegram_id}: {e_gen}", exc_info=True)
        return 0
        
    def update_user_balance(self, telegram_id: int, amount_change: int, operation_type="manual") -> int:
        """Обновляет баланс пользователя на указанную величину"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Получаем текущий баланс
            current_balance = self.get_user_balance(telegram_id)
            new_balance = current_balance + amount_change
            
            # Обновляем баланс
            cursor.execute("""
                UPDATE users 
                SET balance = ?, updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            """, (new_balance, telegram_id))
            
            if cursor.rowcount == 0:
                # Пользователь не существует, создаем его
                user_id = self.save_user(
                    telegram_id=telegram_id,
                    username='webapp_user',
                    first_name='WebApp',
                    last_name='User',
                    initial_balance=new_balance
                )
                
                if not user_id:
                    conn.rollback()
                    conn.close()
                    return current_balance
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Баланс пользователя {telegram_id} обновлен: {current_balance} {'+' if amount_change >= 0 else ''}{amount_change} = {new_balance} ({operation_type})")
            
            return new_balance
            
        except Exception as e:
            self.logger.error(f"Ошибка обновления баланса для telegram_id={telegram_id}: {e}")
            if 'conn' in locals():
                conn.rollback()
                conn.close()
            return current_balance if 'current_balance' in locals() else 0

    # --- ФУНКЦИИ ДЛЯ РАБОТЫ С КОНСУЛЬТАЦИЯМИ ---
    
    def save_consultation(self, user_id: int, occasion: Optional[str], preferences: Optional[str], image_path: Optional[str], advice: Optional[str]) -> Optional[int]:
        """Сохраняет новую консультацию в базу данных"""
        self.logger.info(f"Сохранение консультации для user_id={user_id}, повод: {occasion}")
        sql = '''
        INSERT INTO consultations (user_id, occasion, preferences, image_path, advice, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        '''
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Проверяем существование пользователя
                user_exists = self.get_user(user_id)
                if not user_exists:
                    self.logger.error(f"Попытка сохранить консультацию для несуществующего пользователя telegram_id={user_id}.")
                    return None

                cursor.execute(sql, (user_id, occasion, preferences, image_path, advice))
                consultation_id = cursor.lastrowid
                conn.commit()
            self.logger.info(f"Консультация для user_id={user_id} успешно сохранена с ID={consultation_id}.")
            return consultation_id
        except sqlite3.IntegrityError as e_int:
            self.logger.error(f"Ошибка целостности SQLite при сохранении консультации для user_id={user_id}: {e_int}", exc_info=True)
        except sqlite3.Error as e_sql:
            self.logger.error(f"Ошибка SQLite при сохранении консультации для user_id={user_id}: {e_sql}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при сохранении консультации для user_id={user_id}: {e_gen}", exc_info=True)
        return None

    def get_consultation(self, consultation_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Получает информацию о консультации"""
        self.logger.debug(f"Запрос консультации ID={consultation_id}" + (f" для user_id={user_id}" if user_id else ""))
        
        if user_id:
            sql = 'SELECT * FROM consultations WHERE id = ? AND user_id = ?'
            params = (consultation_id, user_id)
        else:
            sql = 'SELECT * FROM consultations WHERE id = ?'
            params = (consultation_id,)
            
        try:
            with self.get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(sql, params)
                consultation_row = cursor.fetchone()
            
            if consultation_row:
                consultation_dict = dict(consultation_row)
                self.logger.info(f"Консультация ID={consultation_id} найдена.")
                return consultation_dict
            else:
                self.logger.info(f"Консультация ID={consultation_id} не найдена" + (f" для user_id={user_id}." if user_id else "."))
                return None
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при получении консультации ID={consultation_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при получении консультации ID={consultation_id}: {e_gen}", exc_info=True)
        return None

    def get_user_consultations(self, user_id: int, limit: int = 20):
        """Получить консультации пользователя"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, user_id, occasion, preferences, image_path, advice, created_at
                FROM consultations 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            """, (user_id, limit))
            
            consultations = cursor.fetchall()
            conn.close()
            
            self.logger.info(f"📚 Получено {len(consultations)} консультаций для пользователя {user_id}")
            return consultations
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка получения консультаций для пользователя {user_id}: {e}")
            return []

    # --- ФУНКЦИИ ДЛЯ РАБОТЫ С ПЛАТЕЖАМИ ---
    
    def record_payment(self, user_id: int, amount_rub: int, status: str = "pending", payment_provider_id: Optional[str] = None) -> Optional[int]:
        """Записывает информацию о платеже в базу данных"""
        self.logger.info(f"Запись платежа для user_id={user_id}, сумма: {amount_rub} RUB, статус: {status}")
        sql = '''
        INSERT INTO payments (user_id, amount, status, created_at, payment_provider_id) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
        '''
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (user_id, amount_rub, status, payment_provider_id))
                payment_id = cursor.lastrowid
                conn.commit()
            self.logger.info(f"Платеж для user_id={user_id} успешно записан с ID={payment_id}.")
            return payment_id
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при записи платежа для user_id={user_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при записи платежа для user_id={user_id}: {e_gen}", exc_info=True)
        return None

    def update_payment_status(self, payment_id: int, new_status: str) -> bool:
        """Обновляет статус указанного платежа"""
        self.logger.info(f"Обновление статуса платежа ID={payment_id} на '{new_status}'")
        sql = 'UPDATE payments SET status = ? WHERE id = ?'
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (new_status, payment_id))
                conn.commit()
                if cursor.rowcount > 0:
                    self.logger.info(f"Статус платежа ID={payment_id} успешно обновлен на '{new_status}'.")
                    return True
                else:
                    self.logger.warning(f"Платеж ID={payment_id} не найден при попытке обновления статуса.")
                    return False
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при обновлении статуса платежа ID={payment_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при обновлении статуса платежа ID={payment_id}: {e_gen}", exc_info=True)
        return False

    # --- ФУНКЦИИ ДЛЯ СТАТИСТИКИ ---
    
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
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('SELECT COUNT(*) FROM users')
                stats['total_users'] = cursor.fetchone()[0]
                
                cursor.execute('SELECT COUNT(*) FROM consultations')
                stats['total_consultations'] = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM consultations WHERE created_at >= datetime('now', '-1 day')")
                stats['daily_consultations'] = cursor.fetchone()[0]
                
            self.logger.info(f"Статистика сервиса МИШУРА получена: {stats}")
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при получении статистики: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при получении статистики: {e_gen}", exc_info=True)
        return stats

    # --- ФУНКЦИИ ДЛЯ РАБОТЫ С ГАРДЕРОБОМ ---
    
    def save_wardrobe_item(self, user_id: int, telegram_file_id: str, item_name: Optional[str] = None, 
                          item_tag: Optional[str] = None, category: Optional[str] = None) -> Optional[int]:
        """Сохраняет предмет одежды в гардероб пользователя"""
        self.logger.info(f"Сохранение предмета в гардероб для user_id={user_id}, name={item_name}")
        sql = '''
        INSERT INTO wardrobe (user_id, telegram_file_id, item_name, item_tag, category, created_at) 
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        '''
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (user_id, telegram_file_id, item_name, item_tag, category))
                item_id = cursor.lastrowid
                conn.commit()
            self.logger.info(f"Предмет для user_id={user_id} успешно сохранен в гардероб с ID={item_id}.")
            return item_id
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при сохранении предмета в гардероб для user_id={user_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при сохранении предмета в гардероб для user_id={user_id}: {e_gen}", exc_info=True)
        return None

    def get_user_wardrobe(self, user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Получает предметы гардероба пользователя"""
        self.logger.debug(f"Запрос предметов гардероба для user_id={user_id}, limit={limit}")
        sql = '''
        SELECT id, telegram_file_id, item_name, item_tag, category, created_at 
        FROM wardrobe 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
        '''
        wardrobe_items = []
        try:
            with self.get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(sql, (user_id, limit))
                rows = cursor.fetchall()
            
            for row in rows:
                wardrobe_items.append(dict(row))
            self.logger.info(f"Найдено {len(wardrobe_items)} предметов в гардеробе для user_id={user_id}.")
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при получении гардероба для user_id={user_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при получении гардероба для user_id={user_id}: {e_gen}", exc_info=True)
        return wardrobe_items

    def get_wardrobe_item(self, item_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Получает конкретный предмет гардероба по ID с проверкой прав доступа"""
        self.logger.debug(f"Запрос предмета гардероба item_id={item_id} для user_id={user_id}")
        sql = 'SELECT * FROM wardrobe WHERE id = ? AND user_id = ?'
        try:
            with self.get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(sql, (item_id, user_id))
                item_row = cursor.fetchone()
            
            if item_row:
                item_dict = dict(item_row)
                self.logger.info(f"Предмет гардероба ID={item_id} найден для user_id={user_id}.")
                return item_dict
            else:
                self.logger.info(f"Предмет гардероба ID={item_id} не найден для user_id={user_id}.")
                return None
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при получении предмета гардероба ID={item_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при получении предмета гардероба ID={item_id}: {e_gen}", exc_info=True)
        return None

    def update_wardrobe_item(self, item_id: int, user_id: int, item_name: Optional[str] = None, 
                            item_tag: Optional[str] = None, category: Optional[str] = None) -> bool:
        """Обновляет информацию о предмете гардероба"""
        self.logger.info(f"Обновление предмета гардероба ID={item_id} для user_id={user_id}")
        
        if all(value is None for value in [item_name, item_tag, category]):
            self.logger.warning(f"Попытка обновления предмета ID={item_id} без указания полей для обновления.")
            return False
        
        update_fields = []
        values = []
        
        if item_name is not None:
            update_fields.append("item_name = ?")
            values.append(item_name)
        if item_tag is not None:
            update_fields.append("item_tag = ?")
            values.append(item_tag)
        if category is not None:
            update_fields.append("category = ?")
            values.append(category)
        
        values.extend([item_id, user_id])
        
        sql = f"UPDATE wardrobe SET {', '.join(update_fields)} WHERE id = ? AND user_id = ?"
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, values)
                conn.commit()
                if cursor.rowcount > 0:
                    self.logger.info(f"Предмет гардероба ID={item_id} успешно обновлен для user_id={user_id}.")
                    return True
                else:
                    self.logger.warning(f"Предмет гардероба ID={item_id} не найден для user_id={user_id} при обновлении.")
                    return False
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при обновлении предмета гардероба ID={item_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при обновлении предмета гардероба ID={item_id}: {e_gen}", exc_info=True)
        return False

    def delete_wardrobe_item(self, item_id: int, user_id: int) -> bool:
        """Удаляет предмет из гардероба пользователя"""
        self.logger.info(f"Удаление предмета гардероба ID={item_id} для user_id={user_id}")
        sql = 'DELETE FROM wardrobe WHERE id = ? AND user_id = ?'
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (item_id, user_id))
                conn.commit()
                if cursor.rowcount > 0:
                    self.logger.info(f"Предмет гардероба ID={item_id} успешно удален для user_id={user_id}.")
                    return True
                else:
                    self.logger.warning(f"Предмет гардероба ID={item_id} не найден для user_id={user_id} при удалении.")
                    return False
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при удалении предмета гардероба ID={item_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при удалении предмета гардероба ID={item_id}: {e_gen}", exc_info=True)
        return False

    def get_wardrobe_stats(self, user_id: int) -> Dict[str, int]:
        """Получает статистику гардероба пользователя"""
        self.logger.debug(f"Запрос статистики гардероба для user_id={user_id}")
        stats = {
            'total_items': 0,
            'items_this_month': 0
        }
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('SELECT COUNT(*) FROM wardrobe WHERE user_id = ?', (user_id,))
                stats['total_items'] = cursor.fetchone()[0]
                
                cursor.execute(
                    "SELECT COUNT(*) FROM wardrobe WHERE user_id = ? AND created_at >= datetime('now', '-1 month')", 
                    (user_id,)
                )
                stats['items_this_month'] = cursor.fetchone()[0]
                
            self.logger.info(f"Статистика гардероба для user_id={user_id}: {stats}")
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при получении статистики гардероба для user_id={user_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при получении статистики гардероба для user_id={user_id}: {e_gen}", exc_info=True)
        return stats


# === ФУНКЦИИ СОВМЕСТИМОСТИ (сохраняем для обратной совместимости) ===

def get_connection() -> sqlite3.Connection:
    """Функция совместимости"""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn
    except sqlite3.Error as e:
        logger.critical(f"Критическая ошибка при подключении к БД {DB_PATH}: {e}", exc_info=True)
        raise

def init_db(schema_file_path: str = SCHEMA_FILE) -> bool:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.init_db(schema_file_path)

def get_user_by_telegram_id(telegram_id):
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.get_user_by_telegram_id(telegram_id)

def save_user(telegram_id, username=None, first_name=None, last_name=None):
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.save_user(telegram_id, username, first_name, last_name)

def get_user(telegram_id: int) -> Optional[Dict[str, Any]]:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.get_user(telegram_id)
    
def get_user_balance(telegram_id: int) -> int:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.get_user_balance(telegram_id)
    
def update_user_balance(telegram_id: int, amount_change: int) -> bool:
    """Функция совместимости"""
    db_instance = MishuraDB()
    new_balance = db_instance.update_user_balance(telegram_id, amount_change)
    return new_balance is not None

def save_consultation(user_id: int, occasion: Optional[str], preferences: Optional[str], image_path: Optional[str], advice: Optional[str]) -> Optional[int]:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.save_consultation(user_id, occasion, preferences, image_path, advice)

def get_consultation(consultation_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.get_consultation(consultation_id, user_id)

def get_user_consultations(user_id: int, limit: int = 20):
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.get_user_consultations(user_id, limit)

def record_payment(user_id: int, amount_rub: int, status: str = "pending", payment_provider_id: Optional[str] = None) -> Optional[int]:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.record_payment(user_id, amount_rub, status, payment_provider_id)

def update_payment_status(payment_id: int, new_status: str) -> bool:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.update_payment_status(payment_id, new_status)

def get_stats() -> Dict[str, int]:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.get_stats()

def save_wardrobe_item(user_id: int, telegram_file_id: str, item_name: Optional[str] = None, 
                      item_tag: Optional[str] = None, category: Optional[str] = None) -> Optional[int]:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.save_wardrobe_item(user_id, telegram_file_id, item_name, item_tag, category)

def get_user_wardrobe(user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.get_user_wardrobe(user_id, limit)

def get_wardrobe_item(item_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.get_wardrobe_item(item_id, user_id)

def update_wardrobe_item(item_id: int, user_id: int, item_name: Optional[str] = None, 
                        item_tag: Optional[str] = None, category: Optional[str] = None) -> bool:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.update_wardrobe_item(item_id, user_id, item_name, item_tag, category)

def delete_wardrobe_item(item_id: int, user_id: int) -> bool:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.delete_wardrobe_item(item_id, user_id)

def get_wardrobe_stats(user_id: int) -> Dict[str, int]:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.get_wardrobe_stats(user_id)

# Пример инициализации при импорте или запуске
if __name__ == "__main__":
    logger.info("Запуск database.py как основного скрипта (для тестов или инициализации).")
    db_instance = MishuraDB()
    if db_instance:
        logger.info("База данных успешно инициализирована из __main__.")
    else:
        logger.error("Не удалось инициализировать базу данных из __main__.")