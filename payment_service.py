#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🎭 МИШУРА - Payment Service
Сервис для работы с платежами ЮKassa
"""

import os
import uuid
import structlog
from yookassa import Configuration, Payment

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

    def get_payment(self, payment_id):
        """Получить платеж по ID"""
        try:
            from database import get_connection
            
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT payment_id, telegram_id, plan_id, amount, status, 
                       yookassa_payment_id, created_at, updated_at
                FROM payments 
                WHERE payment_id = ?
            """, (payment_id,))
            
            payment = cursor.fetchone()
            conn.close()
            
            if payment:
                return {
                    'payment_id': payment[0],
                    'telegram_id': payment[1],
                    'plan_id': payment[2],
                    'amount': payment[3],
                    'status': payment[4],
                    'yookassa_payment_id': payment[5],
                    'created_at': payment[6],
                    'updated_at': payment[7]
                }
            return None
            
        except Exception as e:
            logger.error(f"Ошибка получения платежа {payment_id}: {str(e)}")
            return None

    def save_payment(self, payment_id, telegram_id, plan_id, amount, yookassa_payment_id=None):
        """Сохранить платеж в базе данных"""
        try:
            from database import get_connection
            
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO payments (payment_id, telegram_id, plan_id, amount, yookassa_payment_id)
                VALUES (?, ?, ?, ?, ?)
            """, (payment_id, telegram_id, plan_id, amount, yookassa_payment_id))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Payment saved: {payment_id} for user {telegram_id}, plan {plan_id}")
            
        except Exception as e:
            logger.error(f"Ошибка сохранения платежа: {str(e)}")
            raise

    def update_payment_status(self, payment_id, status):
        """Обновить статус платежа"""
        try:
            from database import get_connection
            
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE payments 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE payment_id = ?
            """, (status, payment_id))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Payment {payment_id} status updated to {status}")
            
        except Exception as e:
            logger.error(f"Ошибка обновления статуса платежа: {str(e)}")
            raise

    async def create_payment(self, amount, description, telegram_id, plan_id, return_url=None):
        """Создать новый платеж в ЮKassa"""
        try:
            # Генерируем уникальный ID платежа
            payment_id = str(uuid.uuid4())
            
            # Конфигурация платежа для ЮKassa
            payment_request = {
                "amount": {
                    "value": str(amount),
                    "currency": "RUB"
                },
                "confirmation": {
                    "type": "redirect",
                    "return_url": return_url or "https://style-ai-bot.onrender.com/webapp"
                },
                "capture": True,
                "description": description,
                "metadata": {
                    "telegram_id": str(telegram_id),
                    "plan_id": plan_id,
                    "internal_payment_id": payment_id
                }
            }
            
            # Создаем платеж в ЮKassa
            yookassa_payment = Payment.create(payment_request, payment_id)
            
            # Сохраняем в нашей базе данных
            self.save_payment(
                payment_id=payment_id,
                telegram_id=telegram_id,
                plan_id=plan_id,
                amount=amount,
                yookassa_payment_id=yookassa_payment.id
            )
            
            return {
                "payment_id": payment_id,
                "yookassa_payment_id": yookassa_payment.id,
                "payment_url": yookassa_payment.confirmation.confirmation_url,
                "amount": amount,
                "currency": "RUB",
                "status": yookassa_payment.status
            }
            
        except Exception as e:
            logger.error(f"Ошибка создания платежа: {str(e)}")
            raise

    def get_user_payments(self, telegram_id, limit=10):
        """Получить платежи пользователя"""
        try:
            from database import get_connection
            
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT payment_id, plan_id, amount, status, created_at, updated_at
                FROM payments 
                WHERE telegram_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (telegram_id, limit))
            
            payments = cursor.fetchall()
            conn.close()
            
            result = []
            for payment in payments:
                result.append({
                    'payment_id': payment[0],
                    'plan_id': payment[1],
                    'amount': payment[2],
                    'status': payment[3],
                    'created_at': payment[4],
                    'updated_at': payment[5]
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка получения платежей пользователя {telegram_id}: {str(e)}")
            return []