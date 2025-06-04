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
from typing import Optional, Dict, Any, List, Union

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

    Returns:
        sqlite3.Connection: Объект соединения с базой данных.

    Raises:
        sqlite3.Error: Если не удалось установить соединение с базой данных.
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

    Raises:
        sqlite3.Error: При ошибках выполнения SQL-запросов.
        FileNotFoundError: Если файл схемы не найден.
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
    """
    Сохраняет или обновляет (по telegram_id) информацию о пользователе.

    Args:
        telegram_id (int): Telegram ID пользователя.
        username (Optional[str]): Имя пользователя в Telegram.
        first_name (Optional[str]): Имя пользователя.
        last_name (Optional[str]): Фамилия пользователя.

    Returns:
        bool: True, если операция выполнена успешно, иначе False.

    Raises:
        sqlite3.Error: При ошибках выполнения SQL-запросов.
    """
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
    """
    Получает информацию о пользователе по его telegram_id.

    Args:
        telegram_id (int): Telegram ID пользователя.

    Returns:
        Optional[Dict[str, Any]]: Словарь с информацией о пользователе или None, если пользователь не найден.

    Raises:
        sqlite3.Error: При ошибках выполнения SQL-запросов.
    """
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
    """
    Получает текущий баланс консультаций пользователя.

    Args:
        telegram_id (int): Telegram ID пользователя.

    Returns:
        int: Текущий баланс пользователя. Возвращает 0, если пользователь не найден или произошла ошибка.

    Raises:
        sqlite3.Error: При ошибках выполнения SQL-запросов.
    """
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

    Args:
        telegram_id (int): Telegram ID пользователя.
        amount_change (int): Изменение баланса (может быть положительным или отрицательным).

    Returns:
        bool: True, если операция выполнена успешно, иначе False.

    Raises:
        sqlite3.Error: При ошибках выполнения SQL-запросов.
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
    """
    Сохраняет новую консультацию в базу данных.

    Args:
        user_id (int): Telegram ID пользователя.
        occasion (Optional[str]): Повод/ситуация для консультации.
        preferences (Optional[str]): Предпочтения пользователя.
        image_path (Optional[str]): Путь к изображению.
        advice (Optional[str]): Текст консультации/совета.

    Returns:
        Optional[int]: ID сохраненной консультации или None в случае ошибки.

    Raises:
        sqlite3.IntegrityError: При нарушении ограничений целостности БД.
        sqlite3.Error: При других ошибках SQL.
    """
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

    Args:
        consultation_id (int): ID консультации.
        user_id (Optional[int]): Telegram ID пользователя для проверки принадлежности.

    Returns:
        Optional[Dict[str, Any]]: Словарь с информацией о консультации или None, если не найдена.

    Raises:
        sqlite3.Error: При ошибках выполнения SQL-запросов.
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

def get_user_consultations(user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Получает последние N консультаций для указанного пользователя.

    Args:
        user_id (int): Telegram ID пользователя.
        limit (int): Максимальное количество консультаций для получения.

    Returns:
        List[Dict[str, Any]]: Список словарей с информацией о консультациях.

    Raises:
        sqlite3.Error: При ошибках выполнения SQL-запросов.
    """
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
    """
    Записывает информацию о платеже в базу данных.

    Args:
        user_id (int): Telegram ID пользователя.
        amount_rub (int): Сумма платежа в рублях.
        status (str): Статус платежа (по умолчанию "pending").
        payment_provider_id (Optional[str]): ID платежа в платежной системе.

    Returns:
        Optional[int]: ID сохраненного платежа или None в случае ошибки.

    Raises:
        sqlite3.Error: При ошибках выполнения SQL-запросов.
    """
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
    """
    Обновляет статус указанного платежа.

    Args:
        payment_id (int): ID платежа.
        new_status (str): Новый статус платежа.

    Returns:
        bool: True, если операция выполнена успешно, иначе False.

    Raises:
        sqlite3.Error: При ошибках выполнения SQL-запросов.
    """
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
    """
    Получает общую статистику сервиса МИШУРА.

    Returns:
        Dict[str, int]: Словарь со статистикой:
            - total_users: общее количество пользователей
            - total_consultations: общее количество консультаций
            - daily_consultations: количество консультаций за последние 24 часа
            - total_payments_completed: количество завершенных платежей

    Raises:
        sqlite3.Error: При ошибках выполнения SQL-запросов.
    """
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

# --- ФУНКЦИИ ДЛЯ РАБОТЫ С ГАРДЕРОБОМ ---
def save_wardrobe_item(user_id: int, telegram_file_id: str, item_name: Optional[str] = None, 
                      item_tag: Optional[str] = None, category: Optional[str] = None) -> Optional[int]:
    """
    Сохраняет предмет одежды в гардероб пользователя.

    Args:
        user_id (int): Telegram ID пользователя.
        telegram_file_id (str): File ID изображения в Telegram.
        item_name (Optional[str]): Название предмета.
        item_tag (Optional[str]): Тег для поиска/категоризации.
        category (Optional[str]): Категория одежды.

    Returns:
        Optional[int]: ID сохраненного предмета или None в случае ошибки.
    """
    logger.info(f"Сохранение предмета в гардероб для user_id={user_id}, name={item_name}")
    sql = '''
    INSERT INTO wardrobe (user_id, telegram_file_id, item_name, item_tag, category, created_at) 
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    '''
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (user_id, telegram_file_id, item_name, item_tag, category))
            item_id = cursor.lastrowid
            conn.commit()
        logger.info(f"Предмет для user_id={user_id} успешно сохранен в гардероб с ID={item_id}.")
        return item_id
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при сохранении предмета в гардероб для user_id={user_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при сохранении предмета в гардероб для user_id={user_id}: {e_gen}", exc_info=True)
    return None

def get_user_wardrobe(user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Получает предметы гардероба пользователя.

    Args:
        user_id (int): Telegram ID пользователя.
        limit (int): Максимальное количество предметов для получения.

    Returns:
        List[Dict[str, Any]]: Список словарей с информацией о предметах гардероба.
    """
    logger.debug(f"Запрос предметов гардероба для user_id={user_id}, limit={limit}")
    sql = '''
    SELECT id, telegram_file_id, item_name, item_tag, category, created_at 
    FROM wardrobe 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
    '''
    wardrobe_items = []
    try:
        with get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(sql, (user_id, limit))
            rows = cursor.fetchall()
        
        for row in rows:
            wardrobe_items.append(dict(row))
        logger.info(f"Найдено {len(wardrobe_items)} предметов в гардеробе для user_id={user_id}.")
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при получении гардероба для user_id={user_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при получении гардероба для user_id={user_id}: {e_gen}", exc_info=True)
    return wardrobe_items

def get_wardrobe_item(item_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Получает конкретный предмет гардероба по ID с проверкой прав доступа.

    Args:
        item_id (int): ID предмета гардероба.
        user_id (int): Telegram ID пользователя для проверки прав.

    Returns:
        Optional[Dict[str, Any]]: Словарь с информацией о предмете или None.
    """
    logger.debug(f"Запрос предмета гардероба item_id={item_id} для user_id={user_id}")
    sql = 'SELECT * FROM wardrobe WHERE id = ? AND user_id = ?'
    try:
        with get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(sql, (item_id, user_id))
            item_row = cursor.fetchone()
        
        if item_row:
            item_dict = dict(item_row)
            logger.info(f"Предмет гардероба ID={item_id} найден для user_id={user_id}.")
            return item_dict
        else:
            logger.info(f"Предмет гардероба ID={item_id} не найден для user_id={user_id}.")
            return None
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при получении предмета гардероба ID={item_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при получении предмета гардероба ID={item_id}: {e_gen}", exc_info=True)
    return None

def update_wardrobe_item(item_id: int, user_id: int, item_name: Optional[str] = None, 
                        item_tag: Optional[str] = None, category: Optional[str] = None) -> bool:
    """
    Обновляет информацию о предмете гардероба.

    Args:
        item_id (int): ID предмета гардероба.
        user_id (int): Telegram ID пользователя для проверки прав.
        item_name (Optional[str]): Новое название предмета.
        item_tag (Optional[str]): Новый тег.
        category (Optional[str]): Новая категория.

    Returns:
        bool: True, если операция выполнена успешно, иначе False.
    """
    logger.info(f"Обновление предмета гардероба ID={item_id} для user_id={user_id}")
    
    # Проверяем, что хотя бы одно поле для обновления указано
    if all(value is None for value in [item_name, item_tag, category]):
        logger.warning(f"Попытка обновления предмета ID={item_id} без указания полей для обновления.")
        return False
    
    # Динамически составляем SQL запрос
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
    
    values.extend([item_id, user_id])  # Добавляем ID для WHERE
    
    sql = f"UPDATE wardrobe SET {', '.join(update_fields)} WHERE id = ? AND user_id = ?"
    
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, values)
            conn.commit()
            if cursor.rowcount > 0:
                logger.info(f"Предмет гардероба ID={item_id} успешно обновлен для user_id={user_id}.")
                return True
            else:
                logger.warning(f"Предмет гардероба ID={item_id} не найден для user_id={user_id} при обновлении.")
                return False
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при обновлении предмета гардероба ID={item_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при обновлении предмета гардероба ID={item_id}: {e_gen}", exc_info=True)
    return False

def delete_wardrobe_item(item_id: int, user_id: int) -> bool:
    """
    Удаляет предмет из гардероба пользователя.

    Args:
        item_id (int): ID предмета гардероба.
        user_id (int): Telegram ID пользователя для проверки прав.

    Returns:
        bool: True, если операция выполнена успешно, иначе False.
    """
    logger.info(f"Удаление предмета гардероба ID={item_id} для user_id={user_id}")
    sql = 'DELETE FROM wardrobe WHERE id = ? AND user_id = ?'
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, (item_id, user_id))
            conn.commit()
            if cursor.rowcount > 0:
                logger.info(f"Предмет гардероба ID={item_id} успешно удален для user_id={user_id}.")
                return True
            else:
                logger.warning(f"Предмет гардероба ID={item_id} не найден для user_id={user_id} при удалении.")
                return False
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при удалении предмета гардероба ID={item_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при удалении предмета гардероба ID={item_id}: {e_gen}", exc_info=True)
    return False

def get_wardrobe_stats(user_id: int) -> Dict[str, int]:
    """
    Получает статистику гардероба пользователя.

    Args:
        user_id (int): Telegram ID пользователя.

    Returns:
        Dict[str, int]: Словарь со статистикой гардероба.
    """
    logger.debug(f"Запрос статистики гардероба для user_id={user_id}")
    stats = {
        'total_items': 0,
        'items_this_month': 0
    }
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT COUNT(*) FROM wardrobe WHERE user_id = ?', (user_id,))
            stats['total_items'] = cursor.fetchone()[0]
            
            cursor.execute(
                "SELECT COUNT(*) FROM wardrobe WHERE user_id = ? AND created_at >= datetime('now', '-1 month')", 
                (user_id,)
            )
            stats['items_this_month'] = cursor.fetchone()[0]
            
        logger.info(f"Статистика гардероба для user_id={user_id}: {stats}")
    except sqlite3.Error as e:
        logger.error(f"Ошибка SQLite при получении статистики гардероба для user_id={user_id}: {e}", exc_info=True)
    except Exception as e_gen:
        logger.error(f"Непредвиденная ошибка при получении статистики гардероба для user_id={user_id}: {e_gen}", exc_info=True)
    return stats

# Пример инициализации при импорте или запуске (если нужно)
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