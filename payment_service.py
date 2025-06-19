#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🎭 МИШУРА - Payment Service
Сервис для работы с платежами ЮKassa
"""

import os
from yookassa import Configuration, Payment
import uuid
import structlog

logger = structlog.get_logger(__name__)

class PaymentService:
    def __init__(self):
        # Используем правильные названия переменных
        self.shop_id = os.getenv('YOOKASSA_SHOP_ID')
        self.secret_key = os.getenv('YOOKASSA_SECRET_KEY')
        
        if not self.shop_id or not self.secret_key:
            raise ValueError("ЮKassa credentials не найдены в переменных окружения")
        
        # Конфигурируем ЮKassa
        Configuration.account_id = self.shop_id
        Configuration.secret_key = self.secret_key
        
        logger.info(f"ЮKassa настроена: shop_id={self.shop_id}")
        
        # Инициализируем базу данных для платежей
        self._init_payments_db()
    
    def _init_payments_db(self):
        """Инициализация таблицы платежей"""
        try:
            from database import get_connection
            
            conn = get_connection()
            cursor = conn.cursor()
            
            # Создаем таблицу платежей если не существует
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    payment_id TEXT UNIQUE NOT NULL,
                    telegram_id INTEGER NOT NULL,
                    plan_id TEXT NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    status TEXT DEFAULT 'pending',
                    yookassa_payment_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            conn.close()
            logger.info("Payment schema migration completed")
            
        except Exception as e:
            logger.error(f"Ошибка инициализации БД платежей: {str(e)}")
            raise