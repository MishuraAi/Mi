"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Модуль Базы Данных (database.py)
ВЕРСИЯ: 0.1.2 (Улучшенное логирование, пути, методологические комментарии)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

МЕТОДОЛОГИЯ РАБОТЫ И ОБНОВЛЕНИЯ КОДА:
1.  Целостность Обновлений: Любые изменения файлов предоставляются целиком.
    Частичные изменения кода не допускаются для обеспечения стабильности интеграции.
2.  Язык Коммуникации: Комментарии и документация ведутся на русском языке.
3.  Стандарт Качества: Данный код является частью проекта "МИШУРА", разработанного
    с применением высочайших стандартов программирования и дизайна, соответствуя
    уровню лучших мировых практик.

НАЗНАЧЕНИЕ ФАЙЛА:
Модуль для взаимодействия с базой данных SQLite. Включает функции для
инициализации БД, сохранения и получения информации о пользователях,
консультациях, платежах и статистике для проекта "МИШУРА".
==========================================================================================
"""
import sqlite3
import os
from datetime import datetime
import logging

# Настройка логирования для этого модуля
logger = logging.getLogger("MishuraDB")
if not logger.handlers:
    logging.basicConfig(
        format="%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s",
        level=logging.INFO
    )

logger.info("Инициализация модуля базы данных МИШУРА.")

# Имя файла БД. Предполагается, что он будет в корне проекта или там, где запускается основной скрипт.
DB_FILENAME = "styleai.db"
# Определяем базовую директорию (где находится этот скрипт database.py)
# Это более надежно, если скрипты запускаются не из корня проекта.
# Однако, schema.sql по-прежнему ищется относительно CWD в init_db.
# Для консистентности, можно сделать DB_PATH также относительно CWD или передавать его.
# Пока оставим DB_FILENAME, подразумевая, что CWD - корень проекта при инициализации.
DB_PATH = DB_FILENAME 
SCHEMA_FILE = "schema.sql" # Имя файла схемы

def get_connection() -> sqlite3.Connection:
    """
    Устанавливает и возвращает соединение с базой данных SQLite.
    Включает поддержку внешних ключей.
    """
    logger.debug(f"Запрос на соединение с БД: {DB_PATH}")
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10) # Добавлен таймаут
        conn.execute("PRAGMA foreign_keys = ON;") # Включаем поддержку внешних ключей для сессии
        logger.debug(f"Соединение с БД {DB_PATH} установлено.")
        return conn
    except sqlite3.Error as e:
        logger.critical(f"Критическая ошибка при подключении к БД {DB_PATH}: {e}", exc_info=True)
        raise # Перевыбрасываем исключение, т.к. без БД работа невозможна

def init_db(schema_file_path: str = SCHEMA_FILE) -> bool:
    """
    Инициализирует базу данных: создает таблицы на основе SQL-схемы, если они не существуют.

    Args:
        schema_file_path (str): Путь к файлу SQL-схемы.

    Returns:
        bool: True, если инициализация прошла успешно, иначе False.
    """
    logger.info(f"Начало инициализации/проверки базы данных '{DB_PATH}' со схемой '{schema_file_path}'")
    
    # Проверка существования файла схемы
    # Предполагаем, что schema.sql находится в той же директории, откуда запускается приложение (CWD)
    # или рядом с database.py, если CWD другая.
    actual_schema_path = schema_file_path
    if not os.path.exists(actual_schema_path):
        logger.warning(f"Файл схемы '{actual_schema_path}' не найден в текущей директории ({os.getcwd()}). Попытка найти рядом с database.py...")
        script_dir = os.path.dirname(os.path.abspath(__file__))
        path_near_script = os.path.join(script_dir, schema_file_path)
        if os.path.exists(path_near_script):
            actual_schema_path = path_near_script
            logger.info(f"Файл схемы найден по альтернативному пути: {actual_schema_path}")
        else:
            logger.critical(f"КРИТИЧЕСКАЯ ОШИБКА: Файл SQL-схемы '{schema_file_path}' не найден. Инициализация БД невозможна.")
            return False
            
    try:
        with get_connection() as conn: # Используем context manager для автоматического закрытия
            cursor = conn.cursor()
            with open(actual_schema_path, 'r', encoding='utf-8') as f:
                sql_script = f.read()
            
            cursor.executescript(sql_script)
            conn.commit() # Хотя executescript часто сам коммитит DDL, явный commit не помешает
            logger.info(f"База данных '{DB_PATH}' успешно инициализирована/проверена схемой '{actual_schema_path}'.")
            return True
    except sqlite3.Error as e_sql:
        logger.error(f"Ошибка SQLite при инициализации базы данных ({DB_PATH}): {e_sql}", exc_info=True)
    except FileNotFoundError:
        logger.error(f"Файл SQL-схемы '{actual_schema_path}' не найден.", exc_info=True)
    except Exception as e:
        logger.critical(f"Непредвиденная критическая ошибка при инициализации базы данных: {e}", exc_info=True)
    return False

# --- ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ---
def save_user(telegram_id: int, username: Optional[str], first_name: Optional[str], last_name: Optional[str]) -> bool:
    """Сохраняет или обновляет (по telegram_id) информацию о пользователе."""
    logger.debug(f"Сохранение/обновление пользователя: telegram_id={telegram_id}, username={username}")
    sql = '''
    INSERT INTO users (telegram_id, username, first_name, last_name, balance, created_at)
    VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_id) DO UPDATE SET
        username = excluded.username,
        first_name = excluded.first_name,
        last_name = excluded.last_name;
    '''
    # Примечание: created_at не будет обновляться при конфликте, что обычно и требуется.
    # Баланс при первой регистрации устанавливается в 0 (или другое значение по умолчанию из схемы).
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (telegram_id, username, first_name, last_name))
            conn.commit()
        logger.info(f"Пользователь telegram_id={telegram_id} успешно сохранен/обновлен.")
        return True
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при сохранении пользователя telegram_id={telegram_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при сохранении пользователя telegram_id={telegram_id}: {e_gen}", exc_info=True)
    return False

def get_user(telegram_id: int) -> Optional[Dict[str, Any]]:
    """Получает информацию о пользователе по его telegram_id."""
    logger.debug(f"Запрос информации о пользователе: telegram_id={telegram_id}")
    sql = 'SELECT id, telegram_id, username, first_name, last_name, balance, created_at FROM users WHERE telegram_id = ?'
    try:
        with get_connection() as conn:
            conn.row_factory = sqlite3.Row # Для доступа к колонкам по имени
            cursor = conn.cursor()
            cursor.execute(sql, (telegram_id,))
            user_row = cursor.fetchone()
        
        if user_row:
            user_dict = dict(user_row)
            logger.info(f"Пользователь telegram_id={telegram_id} найден: {user_dict}")
            return user_dict
        else:
            logger.info(f"Пользователь telegram_id={telegram_id} не найден.")
            return None
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при получении пользователя telegram_id={telegram_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при получении пользователя telegram_id={telegram_id}: {e_gen}", exc_info=True)
    return None
    
def get_user_balance(telegram_id: int) -> int:
    """Получает текущий баланс консультаций пользователя."""
    logger.debug(f"Запрос баланса для пользователя: telegram_id={telegram_id}")
    sql = 'SELECT balance FROM users WHERE telegram_id = ?'
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (telegram_id,))
            result = cursor.fetchone()
        
        if result:
            balance = result[0]
            logger.info(f"Баланс для пользователя telegram_id={telegram_id} составляет: {balance}")
            return balance
        else: # Если пользователь не найден, или нет записи о балансе
            logger.warning(f"Пользователь telegram_id={telegram_id} не найден при запросе баланса, возвращен баланс 0.")
            # Возможно, стоит создать пользователя здесь, если его нет, или это обрабатывается в другом месте.
            # save_user(telegram_id, None, None, None) # Опционально, если нужно гарантировать наличие записи
            return 0
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при получении баланса пользователя telegram_id={telegram_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при получении баланса пользователя telegram_id={telegram_id}: {e_gen}", exc_info=True)
    return 0 # Возвращаем 0 в случае любой ошибки
    
def update_user_balance(telegram_id: int, amount_change: int) -> bool:
    """
    Обновляет баланс пользователя на указанную величину (может быть положительной или отрицательной).
    Не позволяет балансу стать отрицательным.
    """
    logger.info(f"Обновление баланса для telegram_id={telegram_id}, изменение: {amount_change}")
    # Сначала получаем текущий баланс, чтобы не допустить отрицательного значения
    # Это можно сделать и в одном SQL запросе с CASE или MAX, но так нагляднее
    current_balance = get_user_balance(telegram_id)
    new_balance = current_balance + amount_change
    
    if new_balance < 0:
        logger.warning(f"Попытка установить отрицательный баланс ({new_balance}) для telegram_id={telegram_id}. Баланс будет установлен в 0.")
        new_balance = 0 # Гарантируем, что баланс не станет отрицательным
        # amount_to_set = 0 # Если мы хотим установить 0
        amount_to_set = new_balance # Если хотим позволить уменьшить до 0, но не ниже
    else:
        amount_to_set = new_balance

    sql = 'UPDATE users SET balance = ? WHERE telegram_id = ?'
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (amount_to_set, telegram_id))
            conn.commit()
            if cursor.rowcount > 0:
                logger.info(f"Баланс пользователя telegram_id={telegram_id} успешно обновлен на {amount_change}. Новый баланс: {amount_to_set}")
                return True
            else:
                logger.warning(f"Пользователь telegram_id={telegram_id} не найден при попытке обновления баланса.")
                return False # Пользователь не найден
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при обновлении баланса пользователя telegram_id={telegram_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при обновлении баланса telegram_id={telegram_id}: {e_gen}", exc_info=True)
    return False

# --- ФУНКЦИИ ДЛЯ РАБОТЫ С КОНСУЛЬТАЦИЯМИ ---
def save_consultation(user_id: int, occasion: Optional[str], preferences: Optional[str], image_path: Optional[str], advice: Optional[str]) -> Optional[int]:
    """Сохраняет новую консультацию в базу данных."""
    logger.info(f"Сохранение консультации для user_id={user_id}, повод: {occasion}")
    sql = '''
    INSERT INTO consultations (user_id, occasion, preferences, image_path, advice, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    '''
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            # user_internal_id = get_user_internal_id(user_id, conn) # Если FK на users.id, а не telegram_id
            # if not user_internal_id:
            #     logger.error(f"Не удалось найти внутреннего ID для telegram_id={user_id}. Консультация не сохранена.")
            #     return None
            # cursor.execute(sql, (user_internal_id, occasion, preferences, image_path, advice))

            # В текущей схеме consultations.user_id ссылается на users.telegram_id
            # Это не очень хорошо с точки зрения нормализации, но схема такая.
            # Правильнее было бы ссылаться на users.id и получать его.
            # Для текущей схемы:
            # Сначала убедимся, что пользователь существует, иначе INSERT не пройдет из-за FK (если он настроен)
            # или будет ссылаться на несуществующего пользователя.
            user_exists = get_user(user_id) # Проверяем по telegram_id
            if not user_exists:
                logger.error(f"Попытка сохранить консультацию для несуществующего пользователя telegram_id={user_id}.")
                # Можно либо создать пользователя, либо вернуть ошибку.
                # Если схема требует users.telegram_id, то user_id (telegram_id) должно быть в users.
                # save_user(user_id, None, None, None) # Пример автоматического создания
                return None


            cursor.execute(sql, (user_id, occasion, preferences, image_path, advice))
            consultation_id = cursor.lastrowid # Получаем ID только что вставленной записи
            conn.commit()
        logger.info(f"Консультация для user_id={user_id} успешно сохранена с ID={consultation_id}.")
        return consultation_id
    except sqlite3.IntegrityError as e_int: # Например, если user_id не существует в таблице users (FK constraint)
        logger.error(f"Ошибка целостности SQLite при сохранении консультации для user_id={user_id}: {e_int}", exc_info=True)
    except sqlite3.Error as e_sql:
        logger.error(f"Ошибка SQLite при сохранении консультации для user_id={user_id}: {e_sql}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при сохранении консультации для user_id={user_id}: {e_gen}", exc_info=True)
    return None

def get_consultation(consultation_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Получает информацию о консультации.
    Если user_id указан, проверяет, что консультация принадлежит этому пользователю.
    """
    logger.debug(f"Запрос консультации ID={consultation_id}" + (f" для user_id={user_id}" if user_id else ""))
    
    if user_id:
        sql = 'SELECT * FROM consultations WHERE id = ? AND user_id = ?'
        params = (consultation_id, user_id)
    else: # Для административных целей, без проверки user_id
        sql = 'SELECT * FROM consultations WHERE id = ?'
        params = (consultation_id,)
        
    try:
        with get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(sql, params)
            consultation_row = cursor.fetchone()
        
        if consultation_row:
            consultation_dict = dict(consultation_row)
            logger.info(f"Консультация ID={consultation_id} найдена.")
            return consultation_dict
        else:
            logger.info(f"Консультация ID={consultation_id} не найдена" + (f" для user_id={user_id}." if user_id else "."))
            return None
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при получении консультации ID={consultation_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при получении консультации ID={consultation_id}: {e_gen}", exc_info=True)
    return None

def get_user_consultations(user_id: int, limit: int = 5) -> list[Dict[str, Any]]:
    """Получает последние N консультаций для указанного пользователя."""
    logger.debug(f"Запрос последних {limit} консультаций для user_id={user_id}")
    sql = '''
    SELECT id, occasion, preferences, image_path, advice, created_at 
    FROM consultations 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
    '''
    consultations_list = []
    try:
        with get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(sql, (user_id, limit))
            rows = cursor.fetchall()
        
        for row in rows:
            consultations_list.append(dict(row))
        logger.info(f"Найдено {len(consultations_list)} консультаций для user_id={user_id}.")
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при получении консультаций для user_id={user_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при получении консультаций для user_id={user_id}: {e_gen}", exc_info=True)
    return consultations_list

# --- ФУНКЦИИ ДЛЯ РАБОТЫ С ПЛАТЕЖАМИ ---
def record_payment(user_id: int, amount_rub: int, status: str = "pending", payment_provider_id: Optional[str] = None) -> Optional[int]:
    """Записывает информацию о платеже в базу данных."""
    logger.info(f"Запись платежа для user_id={user_id}, сумма: {amount_rub} RUB, статус: {status}")
    sql = '''
    INSERT INTO payments (user_id, amount, status, created_at, payment_provider_id) 
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
    ''' # Добавил payment_provider_id
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (user_id, amount_rub, status, payment_provider_id))
            payment_id = cursor.lastrowid
            conn.commit()
        logger.info(f"Платеж для user_id={user_id} успешно записан с ID={payment_id}.")
        return payment_id
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при записи платежа для user_id={user_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при записи платежа для user_id={user_id}: {e_gen}", exc_info=True)
    return None

def update_payment_status(payment_id: int, new_status: str) -> bool:
    """Обновляет статус указанного платежа."""
    logger.info(f"Обновление статуса платежа ID={payment_id} на '{new_status}'")
    sql = 'UPDATE payments SET status = ? WHERE id = ?'
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (new_status, payment_id))
            conn.commit()
            if cursor.rowcount > 0:
                logger.info(f"Статус платежа ID={payment_id} успешно обновлен на '{new_status}'.")
                return True
            else:
                logger.warning(f"Платеж ID={payment_id} не найден при попытке обновления статуса.")
                return False # Платеж не найден
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при обновлении статуса платежа ID={payment_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при обновлении статуса платежа ID={payment_id}: {e_gen}", exc_info=True)
    return False

# --- ФУНКЦИИ ДЛЯ СТАТИСТИКИ ---
def get_stats() -> Dict[str, int]:
    """Получает общую статистику сервиса МИШУРА."""
    logger.debug("Запрос общей статистики сервиса.")
    stats = {
        'total_users': 0,
        'total_consultations': 0,
        'daily_consultations': 0, # Консультации за последние 24 часа
        'total_payments_completed': 0 # Пример дополнительной статистики
    }
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT COUNT(*) FROM users')
            stats['total_users'] = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM consultations')
            stats['total_consultations'] = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM consultations WHERE created_at >= datetime('now', '-1 day')")
            stats['daily_consultations'] = cursor.fetchone()[0]

            # cursor.execute("SELECT COUNT(*) FROM payments WHERE status LIKE 'completed%'") # Если есть разные completed статусы
            # stats['total_payments_completed'] = cursor.fetchone()[0]
            
        logger.info(f"Статистика сервиса МИШУРА получена: {stats}")
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при получении статистики: {e}", exc_info=True)
        # Возвращаем пустые или дефолтные значения, чтобы не прерывать работу
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при получении статистики: {e_gen}", exc_info=True)
    return stats

# Пример инициализации при импорте или запуске (если нужно)
# Обычно init_db() вызывается один раз при старте основного приложения (бота или API).
if __name__ == "__main__":
    logger.info("Запуск database.py как основного скрипта (для тестов или инициализации).")
    if init_db():
        logger.info("База данных успешно инициализирована из __main__.")
        # Можно добавить тестовые вызовы функций
        # save_user(12345, "testuser", "Test", "User")
        # print(get_user(12345))
        # print(get_user_balance(12345))
        # update_user_balance(12345, 10)
        # print(get_user_balance(12345))
        # consultation_id = save_consultation(12345, "тест", "тест", "path/to/image.jpg", "Тестовый совет")
        # if consultation_id:
        #     print(get_consultation(consultation_id, 12345))
        # print(get_user_consultations(12345))
        # print(get_stats())
    else:
        logger.error("Не удалось инициализировать базу данных из __main__.")