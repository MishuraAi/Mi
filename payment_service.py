#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🎭 МИШУРА - Payment Service
Сервис для работы с платежами ЮKassa
"""

import os
import uuid
import logging
from yookassa import Configuration, Payment

# Заменяем structlog на обычный logging
logger = logging.getLogger(__name__)

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
            
            # ИСПРАВЛЕННАЯ схема платежей с правильными полями
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    payment_id TEXT UNIQUE NOT NULL,
                    telegram_id INTEGER NOT NULL,
                    plan_id TEXT NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    status TEXT DEFAULT 'pending',
                    yookassa_payment_id TEXT,
                    stcoins_amount INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # МИГРАЦИЯ: Добавляем недостающие поля в таблицу payments
            try:
                # Проверяем структуру таблицы payments
                cursor.execute("PRAGMA table_info(payments)")
                columns = cursor.fetchall()
                column_names = [col[1] for col in columns]
                
                # Добавляем недостающие поля если их нет
                migrations_needed = []
                
                if 'stcoins_amount' not in column_names:
                    migrations_needed.append("ALTER TABLE payments ADD COLUMN stcoins_amount INTEGER DEFAULT 0")
                    logger.info("Будет добавлено поле stcoins_amount в таблицу payments")
                
                if 'plan_id' not in column_names:
                    migrations_needed.append("ALTER TABLE payments ADD COLUMN plan_id TEXT")
                    logger.info("Будет добавлено поле plan_id в таблицу payments")
                    
                if 'telegram_id' not in column_names:
                    migrations_needed.append("ALTER TABLE payments ADD COLUMN telegram_id INTEGER")
                    logger.info("Будет добавлено поле telegram_id в таблицу payments")
                    
                if 'payment_id' not in column_names:
                    migrations_needed.append("ALTER TABLE payments ADD COLUMN payment_id TEXT UNIQUE")
                    logger.info("Будет добавлено поле payment_id в таблицу payments")
                    
                if 'yookassa_payment_id' not in column_names:
                    migrations_needed.append("ALTER TABLE payments ADD COLUMN yookassa_payment_id TEXT")
                    logger.info("Будет добавлено поле yookassa_payment_id в таблицу payments")
                    
                if 'updated_at' not in column_names:
                    migrations_needed.append("ALTER TABLE payments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                    logger.info("Будет добавлено поле updated_at в таблицу payments")
                
                # Выполняем миграции
                for migration in migrations_needed:
                    cursor.execute(migration)
                    logger.info(f"✅ Выполнена миграция: {migration}")
                
                if migrations_needed:
                    conn.commit()
                    logger.info(f"✅ Выполнено {len(migrations_needed)} миграций для таблицы payments")
                    
                    # Обновляем существующие записи
                    try:
                        # Карта план_id -> количество STcoin
                        plan_stcoins_map = {
                            'test': 10,
                            'basic': 100, 
                            'standard': 300,
                            'premium': 1000
                        }
                        
                        for plan_id, stcoins in plan_stcoins_map.items():
                            cursor.execute("""
                                UPDATE payments 
                                SET stcoins_amount = ? 
                                WHERE plan_id = ? AND (stcoins_amount = 0 OR stcoins_amount IS NULL)
                            """, (stcoins, plan_id))
                            
                            updated_rows = cursor.rowcount
                            if updated_rows > 0:
                                logger.info(f"✅ Обновлено {updated_rows} записей для плана {plan_id}")
                        
                        conn.commit()
                        logger.info("✅ Миграция stcoins_amount завершена")
                        
                    except Exception as migration_error:
                        logger.warning(f"⚠️ Ошибка обновления stcoins_amount: {migration_error}")
                else:
                    logger.info("✅ Таблица payments уже содержит все необходимые поля")
                    
            except Exception as migration_error:
                logger.error(f"❌ Ошибка миграции payments: {migration_error}")
                # Не прерываем работу, так как основная схема может быть создана
            
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
                       yookassa_payment_id, stcoins_amount, created_at, updated_at
                FROM payments 
                WHERE payment_id = ?
            """, (payment_id,))
            
            payment = cursor.fetchone()
            conn.close()
            
            if payment:
                return {
                    'payment_id': payment[0],
                    'user_id': payment[1],  # ИСПРАВЛЕНО: telegram_id как user_id
                    'telegram_id': payment[1],
                    'plan_id': payment[2],
                    'amount': payment[3],
                    'status': payment[4],
                    'yookassa_payment_id': payment[5],
                    'stcoins_amount': payment[6],
                    'created_at': payment[7],
                    'updated_at': payment[8]
                }
            return None
            
        except Exception as e:
            logger.error(f"Ошибка получения платежа {payment_id}: {str(e)}")
            return None

    def save_payment(self, payment_id, telegram_id, plan_id, amount, yookassa_payment_id=None, stcoins_amount=0):
        """Сохранить платеж в базе данных"""
        try:
            from database import get_connection
            
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO payments (payment_id, telegram_id, plan_id, amount, yookassa_payment_id, stcoins_amount)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (payment_id, telegram_id, plan_id, amount, yookassa_payment_id, stcoins_amount))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Payment saved: {payment_id} for user {telegram_id}, plan {plan_id}, amount {amount}, stcoins {stcoins_amount}")
            
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
                SET status = ?, updated_at = datetime('now')
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
            
            # ИСПРАВЛЕНИЕ: получаем stcoins_amount из конфигурации плана
            from pricing_config import PRICING_PLANS
            plan_config = PRICING_PLANS.get(plan_id)
            stcoins_amount = plan_config.get('stcoins', 0) if plan_config else 0
            
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
                    "internal_payment_id": payment_id,
                    "stcoins_amount": str(stcoins_amount)
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
                yookassa_payment_id=yookassa_payment.id,
                stcoins_amount=stcoins_amount
            )
            
            return {
                "payment_id": payment_id,
                "yookassa_payment_id": yookassa_payment.id,
                "payment_url": yookassa_payment.confirmation.confirmation_url,
                "amount": amount,
                "currency": "RUB",
                "status": yookassa_payment.status,
                "stcoins_amount": stcoins_amount
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
                SELECT payment_id, plan_id, amount, status, stcoins_amount, created_at, updated_at
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
                    'stcoins_amount': payment[4],
                    'created_at': payment[5],
                    'updated_at': payment[6]
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка получения платежей пользователя {telegram_id}: {str(e)}")
            return []