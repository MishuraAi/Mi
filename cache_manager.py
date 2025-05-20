"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Менеджер Кэширования (cache_manager.py)
ВЕРСИЯ: 0.3.1 (Внедрение методологических комментариев, улучшенное логирование)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

МЕТОДОЛОГИЯ РАБОТЫ И ОБНОВЛЕНИЯ КОДА:
1.  Целостность Обновлений: Любые изменения файлов предоставляются целиком.
    Частичные изменения кода не допускаются для обеспечения стабильности интеграции.
2.  Язык Коммуникации: Комментарии и документация ведутся на русском языке.
3.  Стандарт Качества: Данный код является частью проекта "МИШУРА", разработанного
    с применением высочайших стандартов программирования и дизайна, соответствуя
    уровню лучших мировых практик.

НАЗНАЧЕНИЕ ФАЙЛА:
Реализация системы кэширования результатов анализа изображений.
Предназначен для снижения нагрузки на Gemini API и ускорения получения ответов
на повторяющиеся запросы. Кэш хранится в файловой системе.
==========================================================================================
"""
import os
import json
import hashlib
import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Настройка логирования для этого модуля
logger = logging.getLogger("MishuraCacheManager")
if not logger.handlers:
    logging.basicConfig(
        format="%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s",
        level=logging.INFO
    )

logger.info("Инициализация модуля менеджера кэша МИШУРА.")

class AnalysisCacheManager:
    """
    Менеджер кэширования результатов анализа изображений для проекта МИШУРА.
    
    Использует хеширование данных изображения и параметров запроса для создания
    уникальных ключей кэша. Результаты сохраняются в JSON-файлы в указанной
    директории. Поддерживает TTL (время жизни) для записей и ограничение
    максимального размера кэша.
    """
    
    def __init__(self, cache_dir: str = "analysis_cache", ttl_days: int = 30, max_cache_size: int = 1000):
        """
        Инициализация менеджера кэша.

        Args:
            cache_dir (str): Директория для хранения файлов кэша.
            ttl_days (int): Время жизни записи кэша в днях.
            max_cache_size (int): Максимальное количество записей в кэше (старые удаляются).
        """
        self.cache_dir = os.path.abspath(cache_dir) # Используем абсолютный путь для надежности
        self.ttl_days = ttl_days
        self.max_cache_size = max_cache_size
        
        logger.info(f"Инициализация AnalysisCacheManager: cache_dir='{self.cache_dir}', ttl_days={ttl_days}, max_cache_size={max_cache_size}")

        try:
            if not os.path.exists(self.cache_dir):
                os.makedirs(self.cache_dir, exist_ok=True) # exist_ok=True для избежания ошибок, если папка уже создана
                logger.info(f"Создана директория кэша: {self.cache_dir}")
        except OSError as e_mkdir:
            logger.error(f"Не удалось создать директорию кэша '{self.cache_dir}': {e_mkdir}. Кэширование может не работать.", exc_info=True)
            # В случае ошибки создания директории, кэширование фактически не будет работать,
            # но объект будет создан, чтобы не прерывать работу приложения.
            # Методы get/save будут тихо завершаться.
        
        self.cache_index_file = os.path.join(self.cache_dir, "cache_index.json")
        self.cache_index = self._load_cache_index()
        
        # Периодическая очистка устаревших записей (например, при инициализации)
        self._cleanup_expired_cache()
        
    def _load_cache_index(self) -> Dict[str, Any]:
        """Загрузка индекса кэша из JSON-файла."""
        if not os.path.exists(self.cache_dir): # Если директория кэша недоступна
            logger.warning(f"Директория кэша '{self.cache_dir}' не существует. Невозможно загрузить индекс.")
            return {"entries": {}, "metadata": {"last_cleanup": None}}

        if os.path.exists(self.cache_index_file):
            try:
                with open(self.cache_index_file, 'r', encoding='utf-8') as f:
                    index_data = json.load(f)
                    logger.info(f"Индекс кэша успешно загружен из: {self.cache_index_file}")
                    # Проверка структуры индекса
                    if "entries" not in index_data or "metadata" not in index_data:
                        logger.warning("Структура файла индекса кэша некорректна. Создается новый индекс.")
                        return {"entries": {}, "metadata": {"last_cleanup": None}}
                    return index_data
            except json.JSONDecodeError as e_json:
                logger.warning(f"Ошибка декодирования JSON при загрузке индекса кэша из '{self.cache_index_file}': {e_json}. Файл будет перезаписан.")
                return {"entries": {}, "metadata": {"last_cleanup": None}}
            except Exception as e_load:
                logger.error(f"Непредвиденная ошибка при загрузке индекса кэша: {e_load}", exc_info=True)
                return {"entries": {}, "metadata": {"last_cleanup": None}} # Отказоустойчивость
        else:
            logger.info(f"Файл индекса кэша '{self.cache_index_file}' не найден. Будет создан новый.")
            return {"entries": {}, "metadata": {"last_cleanup": None}}
    
    def _save_cache_index(self):
        """Сохранение текущего состояния индекса кэша в JSON-файл."""
        if not os.path.exists(self.cache_dir):
            logger.warning(f"Директория кэша '{self.cache_dir}' не существует. Невозможно сохранить индекс.")
            return

        try:
            with open(self.cache_index_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache_index, f, ensure_ascii=False, indent=4) # Добавлен indent для читаемости
            logger.debug(f"Индекс кэша успешно сохранен в: {self.cache_index_file}")
        except Exception as e_save:
            logger.error(f"Ошибка при сохранении индекса кэша в '{self.cache_index_file}': {e_save}", exc_info=True)
    
    def _generate_image_hash(self, image_data: bytes) -> str:
        """Создание MD5 хеша для бинарных данных изображения."""
        return hashlib.md5(image_data).hexdigest()
    
    def _generate_cache_key(self, image_hash: str, occasion: str, preferences: Optional[str] = None) -> str:
        """
        Создание уникального ключа для кэша на основе хеша изображения и параметров анализа.
        Использует SHA256 для ключа кэша для большей надежности и распределения.
        """
        # Нормализация параметров для консистентности ключа
        norm_occasion = occasion.strip().lower()
        norm_preferences = (preferences or "").strip().lower()
        
        params_string = f"{image_hash}:{norm_occasion}:{norm_preferences}"
        return hashlib.sha256(params_string.encode('utf-8')).hexdigest()
    
    def get_from_cache(self, image_data: bytes, occasion: str, preferences: Optional[str] = None) -> Optional[str]:
        """
        Получение результата анализа из кэша.

        Args:
            image_data: Бинарные данные изображения.
            occasion: Повод/ситуация для одежды.
            preferences: Дополнительные предпочтения пользователя.

        Returns:
            Optional[str]: Кэшированный результат (строка с советом) или None, если не найден.
        """
        if not os.path.exists(self.cache_dir): # Проверка доступности директории кэша
            logger.debug("Попытка чтения из кэша, но директория кэша недоступна.")
            return None

        image_hash = self._generate_image_hash(image_data)
        cache_key = self._generate_cache_key(image_hash, occasion, preferences)
        
        logger.debug(f"Поиск в кэше по ключу: {cache_key} (image_hash: {image_hash[:8]}...)")

        if cache_key in self.cache_index.get("entries", {}):
            cache_info = self.cache_index["entries"][cache_key]
            cache_file_name = cache_info.get("file")
            
            if not cache_file_name:
                logger.warning(f"В индексе для ключа {cache_key} отсутствует имя файла. Запись будет проигнорирована.")
                # Можно удалить некорректную запись из индекса
                # del self.cache_index["entries"][cache_key]
                # self._save_cache_index()
                return None

            cache_file_path = os.path.join(self.cache_dir, cache_file_name)
            
            if os.path.exists(cache_file_path) and os.path.isfile(cache_file_path):
                try:
                    with open(cache_file_path, 'r', encoding='utf-8') as f:
                        cache_data = json.load(f)
                    
                    # Проверка TTL (времени жизни)
                    created_iso = self.cache_index["entries"][cache_key].get("created")
                    if created_iso:
                        created_dt = datetime.fromisoformat(created_iso)
                        if datetime.now() > created_dt + timedelta(days=self.ttl_days):
                            logger.info(f"Запись кэша для ключа {cache_key} устарела (TTL {self.ttl_days} дней). Удаление.")
                            self._remove_cache_entry(cache_key) # Удаляем устаревшую запись
                            return None
                    
                    # Обновляем время последнего доступа
                    self.cache_index["entries"][cache_key]["last_accessed"] = datetime.now().isoformat()
                    self._save_cache_index() # Сохраняем обновленный индекс
                    
                    logger.info(f"Результат найден в кэше для ключа: {cache_key} (Файл: {cache_file_name})")
                    return cache_data.get("result") # Убедимся, что ключ "result" существует
                    
                except json.JSONDecodeError as e_json_read:
                    logger.warning(f"Ошибка декодирования JSON при чтении файла кэша '{cache_file_path}': {e_json_read}. Файл будет удален.")
                    self._remove_cache_entry(cache_key, remove_file_on_error=True)
                    return None
                except Exception as e_read_cache:
                    logger.error(f"Непредвиденная ошибка при чтении файла кэша '{cache_file_path}': {e_read_cache}", exc_info=True)
                    return None # Не удаляем файл при неизвестной ошибке, но не возвращаем кэш
            else:
                logger.warning(f"Файл кэша '{cache_file_path}', указанный в индексе для ключа {cache_key}, не найден. Запись будет удалена из индекса.")
                self._remove_cache_entry(cache_key, remove_file_on_error=False) # Файла и так нет
                return None
        
        logger.debug(f"Результат для ключа {cache_key} в кэше не найден.")
        return None
    
    def save_to_cache(self, image_data: bytes, occasion: str, result: str, preferences: Optional[str] = None):
        """
        Сохранение результата анализа в кэш.

        Args:
            image_data: Бинарные данные изображения.
            occasion: Повод/ситуация для одежды.
            result: Результат анализа (строка с советом).
            preferences: Дополнительные предпочтения пользователя.
        """
        if not os.path.exists(self.cache_dir):
            logger.warning(f"Попытка сохранения в кэш, но директория кэша '{self.cache_dir}' недоступна. Сохранение отменено.")
            return

        if len(self.cache_index.get("entries", {})) >= self.max_cache_size:
            logger.info(f"Достигнут максимальный размер кэша ({self.max_cache_size}). Очистка старых записей...")
            self._cleanup_oldest_cache_entries(count_to_remove=max(1, int(self.max_cache_size * 0.1))) # Удаляем 10% или хотя бы 1

        image_hash = self._generate_image_hash(image_data)
        cache_key = self._generate_cache_key(image_hash, occasion, preferences)
        
        # Имя файла кэша включает часть ключа для удобства идентификации (но не весь, т.к. ключ может быть длинным)
        timestamp_str = datetime.now().strftime("%Y%m%d%H%M%S")
        cache_file_name = f"cache_{cache_key[:16]}_{timestamp_str}.json" # Используем только часть ключа для имени файла
        cache_file_path = os.path.join(self.cache_dir, cache_file_name)
        
        cache_data_to_save = {
            "image_hash": image_hash, # Для информации, не для ключа файла
            "occasion": occasion,
            "preferences": preferences,
            "result": result,
            "created_at_timestamp": time.time() # Unix timestamp для возможного использования
        }
        
        try:
            with open(cache_file_path, 'w', encoding='utf-8') as f:
                json.dump(cache_data_to_save, f, ensure_ascii=False, indent=4) # indent для отладки
            
            # Обновляем индекс кэша
            now_iso = datetime.now().isoformat()
            self.cache_index.setdefault("entries", {})[cache_key] = {
                "file": cache_file_name, # Сохраняем только имя файла, а не полный путь
                "image_hash_ref": image_hash, # Для справки
                "created": now_iso,
                "last_accessed": now_iso
            }
            
            self._save_cache_index()
            logger.info(f"Результат для ключа {cache_key} сохранен в кэш: {cache_file_path}")
            
        except Exception as e_save_cache:
            logger.error(f"Ошибка при сохранении результата в кэш (ключ {cache_key}, файл {cache_file_path}): {e_save_cache}", exc_info=True)
            # Если не удалось сохранить файл, удаляем его, чтобы не было мусора
            if os.path.exists(cache_file_path):
                try:
                    os.remove(cache_file_path)
                except OSError as e_remove_failed:
                    logger.error(f"Не удалось удалить частично сохраненный файл кэша {cache_file_path}: {e_remove_failed}")

    def _remove_cache_entry(self, cache_key: str, remove_file_on_error: bool = True):
        """Внутренний метод для удаления записи из индекса и опционально файла."""
        logger.debug(f"Удаление записи кэша по ключу: {cache_key}")
        entry_info = self.cache_index.get("entries", {}).pop(cache_key, None)
        if entry_info and remove_file_on_error:
            file_name = entry_info.get("file")
            if file_name:
                file_path = os.path.join(self.cache_dir, file_name)
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                        logger.info(f"Файл кэша {file_path} удален.")
                    except OSError as e_remove:
                        logger.error(f"Не удалось удалить файл кэша {file_path}: {e_remove}")
        self._save_cache_index()

    def _cleanup_expired_cache(self):
        """Очистка устаревших записей кэша на основе TTL."""
        if not self.cache_index.get("entries"):
            return

        now = datetime.now()
        cutoff_datetime = now - timedelta(days=self.ttl_days)
        
        expired_keys = []
        for key, entry in list(self.cache_index["entries"].items()): # list() для безопасного удаления во время итерации
            try:
                created_dt = datetime.fromisoformat(entry["created"])
                if created_dt < cutoff_datetime:
                    expired_keys.append(key)
            except (ValueError, KeyError) as e_parse_date: # Обработка ошибок парсинга даты или отсутствия ключа
                logger.warning(f"Не удалось обработать дату создания для записи кэша {key}: {e_parse_date}. Запись будет помечена для удаления.")
                expired_keys.append(key) # Удаляем проблемные записи
        
        if expired_keys:
            logger.info(f"Найдено {len(expired_keys)} устаревших/некорректных записей кэша для удаления.")
            for key in expired_keys:
                self._remove_cache_entry(key, remove_file_on_error=True) # Удаляем и файл, и запись из индекса
        
        self.cache_index.setdefault("metadata", {})["last_cleanup_expired"] = now.isoformat()
        self._save_cache_index()
    
    def _cleanup_oldest_cache_entries(self, count_to_remove: int = 100):
        """
        Очистка наиболее старых по доступу записей кэша, если превышен max_cache_size.
        Удаляет `count_to_remove` записей.
        """
        entries = self.cache_index.get("entries", {})
        if len(entries) <= self.max_cache_size: # Если размер кэша в норме, или уже меньше после удаления по TTL
            if len(entries) < self.max_cache_size - count_to_remove : # Если есть запас для новых записей
                 return

        # Сортируем записи по времени последнего доступа (от старых к новым)
        # Используем текущее время для записей без last_accessed, чтобы они не удалялись первыми без причины
        now_iso = datetime.now().isoformat()
        sorted_entries = sorted(
            entries.items(),
            key=lambda item: item[1].get("last_accessed", now_iso) 
        )
        
        num_to_delete_actually = min(count_to_remove, len(sorted_entries))
        if num_to_delete_actually <=0 :
            return

        keys_to_delete = [item[0] for item in sorted_entries[:num_to_delete_actually]]
        
        if keys_to_delete:
            logger.info(f"Очистка {len(keys_to_delete)} самых старых по доступу записей кэша для освобождения места...")
            for key in keys_to_delete:
                self._remove_cache_entry(key, remove_file_on_error=True)
        
        self.cache_index.setdefault("metadata", {})["last_cleanup_size"] = datetime.now().isoformat()
        self._save_cache_index()

# Пример использования (можно раскомментировать для теста)
# if __name__ == "__main__":
#     logger.info("Тестирование AnalysisCacheManager...")
#     cache = AnalysisCacheManager(cache_dir="test_cache_dir", ttl_days=1, max_cache_size=5)
    
#     # Тест сохранения
#     cache.save_to_cache(b"image_data_1", "повседневный", "Совет 1")
#     cache.save_to_cache(b"image_data_2", "деловой", "Совет 2", preferences="классика")
#     time.sleep(1)
#     cache.save_to_cache(b"image_data_3", "вечеринка", "Совет 3")

#     # Тест получения
#     result1 = cache.get_from_cache(b"image_data_1", "повседневный")
#     logger.info(f"Результат из кэша для image_data_1: {result1}")
#     assert result1 == "Совет 1"

#     result_non_existent = cache.get_from_cache(b"image_data_non_existent", "спорт", "нет")
#     logger.info(f"Результат из кэша для image_data_non_existent: {result_non_existent}")
#     assert result_non_existent is None

#     # Тест превышения размера и очистки
#     for i in range(4, 8):
#         cache.save_to_cache(f"image_data_{i}".encode(), "тест", f"Совет {i}")
    
#     logger.info(f"Количество записей в кэше после добавления: {len(cache.cache_index.get('entries', {}))}")
#     assert len(cache.cache_index.get("entries", {})) <= cache.max_cache_size

#     # Очистка тестовой директории (если она была создана)
#     import shutil
#     if os.path.exists("test_cache_dir"):
#         shutil.rmtree("test_cache_dir")
#         logger.info("Тестовая директория кэша 'test_cache_dir' удалена.")
#     logger.info("Тестирование AnalysisCacheManager завершено.")