#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🎭 МИШУРА - Payment Service
Сервис для работы с платежами ЮKassa
Версия 3.0.0 - Поддержка PostgreSQL
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
        """Универсальная инициализация таблицы платежей для SQLite и PostgreSQL"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # Универсальная проверка существования таблицы
            db_config = getattr(self.db, 'DB_CONFIG', {'type': 'sqlite'})
            db_type = db_config.get('type', 'sqlite')
            
            if db_type == 'postgresql':
                # PostgreSQL: проверка через information_schema
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'payments'
                    );
                """)
                table_exists = cursor.fetchone()[0]
                
                if table_exists:
                    # Получаем колонки для PostgreSQL
                    cursor.execute("""
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_name = 'payments'
                        ORDER BY ordinal_position
                    """)
                    columns = [row[0] for row in cursor.fetchall()]
                    logger.info(f"PostgreSQL: Существующие колонки в payments: {columns}")
                else:
                    logger.info("PostgreSQL: Таблица payments будет создана через schema")
                    
            else:
                # SQLite: оригинальная логика
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='payments'
                """)
                table_exists = cursor.fetchone() is not None
                
                if table_exists:
                    cursor.execute("PRAGMA table_info(payments)")
                    columns = [row[1] for row in cursor.fetchall()]
                    logger.info(f"SQLite: Существующие колонки в payments: {columns}")
                else:
                    logger.info("SQLite: Таблица payments будет создана через schema")
            
            logger.info("✅ Таблица payments проверена")
            
        except Exception as e:
            logger.error(f"❌ Ошибка инициализации таблицы payments: {e}")
            if conn:
                conn.rollback()
        finally:
            if conn:
                conn.close()
    
    def _execute_payment_query(self, query: str, params=None, fetch_one=False, fetch_all=False):
        """Универсальный метод выполнения запросов для платежей"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            
            # Адаптируем параметры для PostgreSQL
            db_config = getattr(self.db, 'DB_CONFIG', {'type': 'sqlite'})
            if db_config.get('type') == 'postgresql' and params:
                # PostgreSQL использует %s вместо ?
                query = query.replace('?', '%s')
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            result = None
            if fetch_one:
                result = cursor.fetchone()
            elif fetch_all:
                result = cursor.fetchall()
            
            if query.strip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')):
                conn.commit()
                if query.strip().upper().startswith('INSERT'):
                    # Получаем ID последней вставленной записи
                    if db_config.get('type') == 'postgresql':
                        cursor.execute("SELECT LASTVAL()")
                        result = cursor.fetchone()[0]
                    else:
                        result = cursor.lastrowid
            
            conn.close()
            return result
            
        except Exception as e:
            logger.error(f"❌ Ошибка выполнения платежного запроса: {e}")
            if 'conn' in locals():
                conn.rollback()
                conn.close()
            raise
    
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
            db_config = getattr(self.db, 'DB_CONFIG', {'type': 'sqlite'})
            
            if db_config.get('type') == 'postgresql':
                query = """
                    INSERT INTO payments (
                        payment_id, yookassa_payment_id, user_id, telegram_id, 
                        plan_id, amount, stcoins_amount, status, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', %s)
                    RETURNING id
                """
                conn = self.db.get_connection()
                cursor = conn.cursor()
                cursor.execute(query, (
                    payment_id, yookassa_payment_id, user_id, telegram_id,
                    plan_id, amount, stcoins_amount, datetime.now()
                ))
                payment_db_id = cursor.fetchone()[0]
                conn.commit()
                conn.close()
            else:
                query = """
                    INSERT INTO payments (
                        payment_id, yookassa_payment_id, user_id, telegram_id, 
                        plan_id, amount, stcoins_amount, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
                """
                payment_db_id = self._execute_payment_query(query, (
                    payment_id, yookassa_payment_id, user_id, telegram_id,
                    plan_id, amount, stcoins_amount, datetime.now()
                ))
            
            logger.info(f"Payment saved: {payment_id} for user {telegram_id}, plan {plan_id}, amount {amount}, stcoins {stcoins_amount}")
            
        except Exception as e:
            logger.error(f"❌ Ошибка сохранения платежа: {e}")
            raise
    
    def process_successful_payment(self, yookassa_payment_id: str) -> bool:
        """🚨 КРИТИЧЕСКИ ВАЖНЫЙ МЕТОД: Обработка успешного платежа"""
        
        try:
            # Ищем платеж по yookassa_payment_id
            find_query = """
                SELECT payment_id, user_id, telegram_id, plan_id, amount, stcoins_amount, status
                FROM payments 
                WHERE yookassa_payment_id = ?
            """
            
            payment = self._execute_payment_query(find_query, (yookassa_payment_id,), fetch_one=True)
            
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
            update_payment_query = """
                UPDATE payments 
                SET status = 'succeeded', processed_at = ?, updated_at = ?
                WHERE yookassa_payment_id = ?
            """
            
            self._execute_payment_query(update_payment_query, (datetime.now(), datetime.now(), yookassa_payment_id))
            
            # 💰 КРИТИЧЕСКИ ВАЖНО: Пополняем баланс пользователя
            current_balance = self.db.get_user_balance(telegram_id)
            new_balance = current_balance + stcoins_amount
            
            logger.info(f"💰 Пополнение баланса: {current_balance} + {stcoins_amount} = {new_balance}")
            
            # Обновляем баланс через универсальный метод БД
            self.db.update_user_balance(telegram_id, stcoins_amount, "payment_processed")
            
            logger.info(f"✅ Платеж {payment_id} успешно обработан, баланс пользователя {telegram_id} обновлен: {new_balance}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка обработки платежа {yookassa_payment_id}: {e}", exc_info=True)
            return False
    
    def get_payment_status(self, payment_id: str, telegram_id: int) -> dict:
        """Получение статуса платежа"""
        
        try:
            query = """
                SELECT payment_id, yookassa_payment_id, plan_id, amount, 
                       stcoins_amount, status, created_at, processed_at
                FROM payments 
                WHERE payment_id = ? AND telegram_id = ?
            """
            
            payment = self._execute_payment_query(query, (payment_id, telegram_id), fetch_one=True)
            
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
    
    def get_user_payments(self, telegram_id: int, limit: int = 10) -> list:
        """Получение списка платежей пользователя"""
        
        try:
            query = """
                SELECT payment_id, plan_id, amount, stcoins_amount, 
                       status, created_at, processed_at
                FROM payments 
                WHERE telegram_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """
            
            payments_data = self._execute_payment_query(query, (telegram_id, limit), fetch_all=True)
            
            payments = []
            for row in payments_data:
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