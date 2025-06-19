#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🎭 МИШУРА - Payment Service
Сервис для работы с платежами ЮKassa
"""

import os
import uuid
import logging
from datetime import datetime
from yookassa import Configuration, Payment

# Настройка логирования
logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self, shop_id: str, secret_key: str, db, test_mode: bool = False):
        """Инициализация сервиса платежей"""
        self.db = db
        self.test_mode = test_mode
        
        # Настройка ЮKassa
        Configuration.account_id = shop_id
        Configuration.secret_key = secret_key
        
        logger.info(f"ЮKassa настроена: shop_id={shop_id}")
        
        # Инициализация таблицы платежей
        self._init_payments_db()
    
    def _init_payments_db(self):
        """Инициализация/обновление таблицы платежей"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # Создаем таблицу если не существует
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    payment_id TEXT UNIQUE NOT NULL,
                    yookassa_payment_id TEXT UNIQUE,
                    user_id INTEGER NOT NULL,
                    telegram_id INTEGER NOT NULL,
                    plan_id TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT DEFAULT 'RUB',
                    status TEXT DEFAULT 'pending',
                    stcoins_amount INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Проверяем существующие колонки
            cursor.execute("PRAGMA table_info(payments)")
            columns = [row[1] for row in cursor.fetchall()]
            
            # Добавляем отсутствующие колонки
            required_columns = {
                'yookassa_payment_id': 'TEXT UNIQUE',
                'processed_at': 'TIMESTAMP',
                'updated_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
            }
            
            for column, column_type in required_columns.items():
                if column not in columns:
                    cursor.execute(f"ALTER TABLE payments ADD COLUMN {column} {column_type}")
                    logger.info(f"✅ Добавлена колонка {column} в таблицу payments")
            
            # Создаем индексы для быстрого поиска
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_payments_yookassa_id 
                ON payments(yookassa_payment_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_payments_telegram_id 
                ON payments(telegram_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_payments_status 
                ON payments(status)
            """)
            
            conn.commit()
            logger.info("✅ Таблица payments уже содержит все необходимые поля")
            
        except Exception as e:
            logger.error(f"❌ Ошибка инициализации таблицы payments: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
        
        logger.info("Payment schema migration completed")
    
    def create_payment(self, payment_id: str, amount: float, description: str, 
                      return_url: str, user_id: int, telegram_id: int, 
                      plan_id: str, stcoins_amount: int) -> dict:
        """Создание платежа через ЮKassa"""
        
        try:
            logger.info(f"🔧 Создание платежа ЮKassa:")
            logger.info(f"   payment_id: {payment_id}")
            logger.info(f"   amount: {amount}")
            logger.info(f"   return_url: {return_url}")
            logger.info(f"   test_mode: {self.test_mode}")
            
            # Создаем платеж в ЮKassa
            payment_data = {
                "amount": {
                    "value": str(amount),
                    "currency": "RUB"
                },
                "confirmation": {
                    "type": "redirect",
                    "return_url": return_url
                },
                "capture": True,
                "description": description,
                "test": self.test_mode,
                "metadata": {
                    "payment_id": payment_id,
                    "telegram_id": str(telegram_id),
                    "plan_id": plan_id,
                    "stcoins": str(stcoins_amount)
                }
            }
            
            logger.info(f"📤 Отправка данных в ЮKassa: {payment_data}")
            
            # Отправляем запрос в ЮKassa
            payment = Payment.create(payment_data)
            
            logger.info(f"📥 Ответ от ЮKassa: {payment}")
            
            if not payment or not payment.id:
                raise Exception("ЮKassa не вернула ID платежа")
            
            yookassa_payment_id = payment.id
            payment_url = payment.confirmation.confirmation_url
            
            logger.info(f"✅ ЮKassa платеж создан: {yookassa_payment_id}")
            logger.info(f"🔗 URL оплаты: {payment_url}")
            
            # Сохраняем платеж с yookassa_payment_id
            self.save_payment(
                payment_id=payment_id,
                yookassa_payment_id=yookassa_payment_id,
                user_id=user_id,
                telegram_id=telegram_id,
                plan_id=plan_id,
                amount=amount,
                stcoins_amount=stcoins_amount
            )
            
            return {
                "payment_id": payment_id,
                "yookassa_payment_id": yookassa_payment_id,
                "payment_url": payment_url,
                "status": payment.status
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка создания платежа ЮKassa: {e}", exc_info=True)
            raise
    
    def save_payment(self, payment_id: str, yookassa_payment_id: str, user_id: int, 
                    telegram_id: int, plan_id: str, amount: float, stcoins_amount: int):
        """Сохранение платежа в базу данных"""
        
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO payments (
                    payment_id, yookassa_payment_id, user_id, telegram_id, 
                    plan_id, amount, stcoins_amount, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            """, (
                payment_id, yookassa_payment_id, user_id, telegram_id,
                plan_id, amount, stcoins_amount, datetime.now()
            ))
            
            conn.commit()
            
            logger.info(f"Payment saved: {payment_id} for user {telegram_id}, plan {plan_id}, amount {amount}, stcoins {stcoins_amount}")
            
        except Exception as e:
            logger.error(f"❌ Ошибка сохранения платежа: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def process_successful_payment(self, yookassa_payment_id: str) -> bool:
        """🚨 КРИТИЧЕСКИ ВАЖНЫЙ МЕТОД: Обработка успешного платежа"""
        
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # Ищем платеж по yookassa_payment_id
            cursor.execute("""
                SELECT payment_id, user_id, telegram_id, plan_id, amount, stcoins_amount, status
                FROM payments 
                WHERE yookassa_payment_id = ?
            """, (yookassa_payment_id,))
            
            payment = cursor.fetchone()
            
            if not payment:
                logger.error(f"Payment {yookassa_payment_id} not found in database")
                return False
            
            payment_id, user_id, telegram_id, plan_id, amount, stcoins_amount, current_status = payment
            
            # Проверяем, не был ли платеж уже обработан
            if current_status == 'succeeded':
                logger.info(f"Payment {payment_id} already processed")
                return True
            
            logger.info(f"💰 Обработка платежа: payment_id={payment_id}, stcoins={stcoins_amount}")
            
            # Обновляем статус платежа
            cursor.execute("""
                UPDATE payments 
                SET status = 'succeeded', processed_at = ?, updated_at = ?
                WHERE yookassa_payment_id = ?
            """, (datetime.now(), datetime.now(), yookassa_payment_id))
            
            # 💰 КРИТИЧЕСКИ ВАЖНО: Пополняем баланс пользователя
            current_balance = self.db.get_user_balance(telegram_id)
            new_balance = current_balance + stcoins_amount
            
            logger.info(f"💰 Пополнение баланса: {current_balance} + {stcoins_amount} = {new_balance}")
            
            # Обновляем баланс напрямую в БД
            cursor.execute("""
                UPDATE users 
                SET balance = ?, updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            """, (new_balance, telegram_id))
            
            conn.commit()
            
            logger.info(f"✅ Платеж {payment_id} успешно обработан, баланс пользователя {telegram_id} обновлен: {new_balance}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка обработки платежа {yookassa_payment_id}: {e}", exc_info=True)
            if conn:
                conn.rollback()
            return False
        finally:
            if conn:
                conn.close()
    
    def get_payment_status(self, payment_id: str, telegram_id: int) -> dict:
        """Получение статуса платежа"""
        
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT payment_id, yookassa_payment_id, plan_id, amount, 
                       stcoins_amount, status, created_at, processed_at
                FROM payments 
                WHERE payment_id = ? AND telegram_id = ?
            """, (payment_id, telegram_id))
            
            payment = cursor.fetchone()
            
            if not payment:
                return None
            
            payment_id, yookassa_payment_id, plan_id, amount, stcoins_amount, status, created_at, processed_at = payment
            
            # Если платеж в статусе pending, проверяем актуальный статус в ЮKassa
            if status == 'pending' and yookassa_payment_id:
                try:
                    yookassa_payment = Payment.find_one(yookassa_payment_id)
                    if yookassa_payment and yookassa_payment.status == 'succeeded':
                        # Обрабатываем успешный платеж
                        self.process_successful_payment(yookassa_payment_id)
                        status = 'succeeded'
                except Exception as e:
                    logger.error(f"Ошибка проверки статуса в ЮKassa: {e}")
            
            return {
                "payment_id": payment_id,
                "yookassa_payment_id": yookassa_payment_id,
                "plan_id": plan_id,
                "amount": amount,
                "stcoins_amount": stcoins_amount,
                "status": status,
                "created_at": created_at,
                "processed_at": processed_at
            }
            
        except Exception as e:
            logger.error(f"Ошибка получения статуса платежа {payment_id}: {e}")
            return None
        finally:
            if conn:
                conn.close()
    
    def get_user_payments(self, telegram_id: int, limit: int = 10) -> list:
        """Получение списка платежей пользователя"""
        
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT payment_id, plan_id, amount, stcoins_amount, 
                       status, created_at, processed_at
                FROM payments 
                WHERE telegram_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (telegram_id, limit))
            
            payments = []
            for row in cursor.fetchall():
                payment_id, plan_id, amount, stcoins_amount, status, created_at, processed_at = row
                payments.append({
                    "payment_id": payment_id,
                    "plan_id": plan_id,
                    "amount": amount,
                    "stcoins_amount": stcoins_amount,
                    "status": status,
                    "created_at": created_at,
                    "processed_at": processed_at
                })
            
            return payments
            
        except Exception as e:
            logger.error(f"Ошибка получения платежей пользователя {telegram_id}: {e}")
            return []
        finally:
            if conn:
                conn.close()