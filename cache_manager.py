"""
ИИ СТИЛИСТ - ВЕРСИЯ: 0.3.0
КОМПОНЕНТ: Система кэширования результатов анализа
ДАТА: 2025-05-16

ОПИСАНИЕ:
Реализация системы кэширования результатов анализа изображений.
Снижает нагрузку на Gemini API и ускоряет получение результатов.

ФУНКЦИОНАЛЬНОСТЬ:
- Кэширование результатов на основе хеша изображения и параметров
- Автоматическая очистка старых записей кэша
- Управление размером кэша
"""

import os
import json
import hashlib
import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnalysisCacheManager:
    """
    Менеджер кэширования результатов анализа изображений
    
    Использует хеширование изображений для создания уникальных идентификаторов
    и сохраняет результаты анализа в JSON-файлы.
    
    Attributes:
        cache_dir (str): Директория для хранения файлов кэша
        ttl_days (int): Время жизни кэша в днях
        max_cache_size (int): Максимальное количество кэшированных записей
    """
    
    def __init__(self, cache_dir: str = "analysis_cache", ttl_days: int = 30, max_cache_size: int = 1000):
        """
        Инициализация менеджера кэша
        
        Args:
            cache_dir: Директория для хранения кэша
            ttl_days: Время жизни кэша в днях
            max_cache_size: Максимальное количество кэшированных записей
        """
        self.cache_dir = cache_dir
        self.ttl_days = ttl_days
        self.max_cache_size = max_cache_size
        
        # Создаем директорию кэша, если она не существует
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir)
            logger.info(f"Создана директория кэша: {cache_dir}")
        
        # Индекс кэша для быстрого доступа
        self.cache_index = self._load_cache_index()
        
        # Очистка устаревших записей при инициализации
        self._cleanup_expired_cache()
        
    def _load_cache_index(self) -> Dict[str, Any]:
        """Загрузка индекса кэша из файла"""
        index_path = os.path.join(self.cache_dir, "cache_index.json")
        
        if os.path.exists(index_path):
            try:
                with open(index_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Ошибка при загрузке индекса кэша: {e}")
                return {"entries": {}, "metadata": {"last_cleanup": None}}
        else:
            return {"entries": {}, "metadata": {"last_cleanup": None}}
    
    def _save_cache_index(self):
        """Сохранение индекса кэша в файл"""
        index_path = os.path.join(self.cache_dir, "cache_index.json")
        try:
            with open(index_path, 'w', encoding='utf-8') as f:
                json.dump(self.cache_index, f)
        except Exception as e:
            logger.error(f"Ошибка при сохранении индекса кэша: {e}")
    
    def _generate_image_hash(self, image_data: bytes) -> str:
        """
        Создание уникального хеша для изображения
        
        Args:
            image_data: Бинарные данные изображения
            
        Returns:
            str: MD5 хеш изображения
        """
        return hashlib.md5(image_data).hexdigest()
    
    def _generate_cache_key(self, image_hash: str, occasion: str, preferences: Optional[str] = None) -> str:
        """
        Создание ключа кэша на основе хеша изображения и параметров анализа
        
        Args:
            image_hash: Хеш изображения
            occasion: Повод/случай для одежды
            preferences: Дополнительные предпочтения
            
        Returns:
            str: Уникальный ключ кэша
        """
        # Преобразуем все параметры в строку и создаем общий хеш
        params = f"{image_hash}:{occasion}:{preferences or ''}"
        return hashlib.sha256(params.encode()).hexdigest()
    
    def get_from_cache(self, image_data: bytes, occasion: str, preferences: Optional[str] = None) -> Optional[str]:
        """
        Получение результата из кэша
        
        Args:
            image_data: Бинарные данные изображения
            occasion: Повод/случай для одежды
            preferences: Дополнительные предпочтения
            
        Returns:
            Optional[str]: Кэшированный результат анализа или None, если кэш не найден
        """
        image_hash = self._generate_image_hash(image_data)
        cache_key = self._generate_cache_key(image_hash, occasion, preferences)
        
        # Проверяем наличие ключа в индексе
        if cache_key in self.cache_index["entries"]:
            cache_info = self.cache_index["entries"][cache_key]
            cache_file = cache_info["file"]
            cache_path = os.path.join(self.cache_dir, cache_file)
            
            # Проверяем существование файла
            if os.path.exists(cache_path):
                try:
                    with open(cache_path, 'r', encoding='utf-8') as f:
                        cache_data = json.load(f)
                    
                    # Обновляем время последнего доступа
                    self.cache_index["entries"][cache_key]["last_accessed"] = datetime.now().isoformat()
                    self._save_cache_index()
                    
                    logger.info(f"Найден кэш для изображения: {image_hash[:8]}... и повода: {occasion}")
                    return cache_data["result"]
                    
                except Exception as e:
                    logger.warning(f"Ошибка при чтении кэша: {e}")
                    return None
            
        return None
    
    def save_to_cache(self, image_data: bytes, occasion: str, result: str, preferences: Optional[str] = None):
        """
        Сохранение результата анализа в кэш
        
        Args:
            image_data: Бинарные данные изображения
            occasion: Повод/случай для одежды
            result: Результат анализа
            preferences: Дополнительные предпочтения
        """
        image_hash = self._generate_image_hash(image_data)
        cache_key = self._generate_cache_key(image_hash, occasion, preferences)
        
        # Создаем имя файла и путь для сохранения
        timestamp = int(time.time())
        cache_file = f"{cache_key}_{timestamp}.json"
        cache_path = os.path.join(self.cache_dir, cache_file)
        
        # Сохраняем результат в файл
        try:
            cache_data = {
                "image_hash": image_hash,
                "occasion": occasion,
                "preferences": preferences,
                "result": result,
                "timestamp": timestamp
            }
            
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False)
            
            # Обновляем индекс кэша
            self.cache_index["entries"][cache_key] = {
                "file": cache_file,
                "image_hash": image_hash,
                "occasion": occasion,
                "preferences": preferences,
                "created": datetime.now().isoformat(),
                "last_accessed": datetime.now().isoformat()
            }
            
            self._save_cache_index()
            logger.info(f"Сохранен кэш для изображения: {image_hash[:8]}... и повода: {occasion}")
            
            # Проверяем размер кэша и очищаем при необходимости
            if len(self.cache_index["entries"]) > self.max_cache_size:
                self._cleanup_oldest_cache()
                
        except Exception as e:
            logger.error(f"Ошибка при сохранении в кэш: {e}")
    
    def _cleanup_expired_cache(self):
        """Очистка устаревших записей кэша"""
        now = datetime.now()
        cutoff_date = now - timedelta(days=self.ttl_days)
        cutoff_iso = cutoff_date.isoformat()
        
        # Находим все устаревшие записи
        expired_keys = []
        for key, entry in self.cache_index["entries"].items():
            try:
                if entry["created"] < cutoff_iso:
                    expired_keys.append(key)
                    # Удаляем файл
                    cache_file = entry["file"]
                    cache_path = os.path.join(self.cache_dir, cache_file)
                    if os.path.exists(cache_path):
                        os.remove(cache_path)
            except Exception as e:
                logger.warning(f"Ошибка при обработке записи кэша: {e}")
        
        # Удаляем записи из индекса
        for key in expired_keys:
            del self.cache_index["entries"][key]
        
        # Обновляем время последней очистки
        self.cache_index["metadata"]["last_cleanup"] = now.isoformat()
        self._save_cache_index()
        
        if expired_keys:
            logger.info(f"Очищено {len(expired_keys)} устаревших записей кэша")
    
    def _cleanup_oldest_cache(self, count: int = 100):
        """
        Очистка самых старых неиспользуемых записей кэша
        
        Args:
            count: Количество записей для удаления
        """
        if len(self.cache_index["entries"]) <= self.max_cache_size - count:
            return
        
        # Сортируем записи по времени последнего доступа
        entries = list(self.cache_index["entries"].items())
        entries.sort(key=lambda x: x[1]["last_accessed"])
        
        # Удаляем самые старые записи
        for i in range(min(count, len(entries))):
            key, entry = entries[i]
            try:
                # Удаляем файл
                cache_file = entry["file"]
                cache_path = os.path.join(self.cache_dir, cache_file)
                if os.path.exists(cache_path):
                    os.remove(cache_path)
                # Удаляем запись из индекса
                del self.cache_index["entries"][key]
            except Exception as e:
                logger.warning(f"Ошибка при удалении записи кэша: {e}")
        
        self._save_cache_index()
        logger.info(f"Очищено {count} старых записей кэша")