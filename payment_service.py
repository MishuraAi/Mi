import os
import uuid
import asyncio
import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional

import requests
from yookassa import Configuration, Payment, Settings
from yookassa.domain.models import Currency
from yookassa.domain.exceptions import ApiError, ResponseProcessingError

from database import MishuraDB

logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self, shop_id: str, secret_key: str, db: MishuraDB, test_mode: bool = False):
        """Инициализация сервиса платежей"""
        self.shop_id = shop_id
        self.secret_key = secret_key
        self.db = db
        self.test_mode = test_mode
        
        # Конфигурация ЮКассы
        try:
            Configuration.configure(
                account_id=shop_id,
                secret_key=secret_key
            )
            logger.info(f"✅ ЮKassa инициализирована: shop_id={shop_id}, test_mode={test_mode}")
        except Exception as e:
            logger.error(f"❌ Ошибка инициализации ЮKassa: {e}")
            raise

    def create_payment(self, payment_id: str, amount: float, description: str, 
                      return_url: str, user_id: int, telegram_id: int, 
                      plan_id: str, stcoins_amount: int) -> Dict[str, Any]:
        """Создание платежа с детальным логированием ошибок"""
        
        try:
            # Сохранение в БД
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO payments (
                    payment_id, user_id, telegram_id, plan_id, 
                    amount, stcoins_amount, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                payment_id, user_id, telegram_id, plan_id,
                amount, stcoins_amount, 'pending'
            ))
            conn.commit()
            conn.close()
            
            # Подготовка данных для ЮKassa
            payment_data = {
                "amount": {
                    "value": f"{amount:.1f}",
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
                },
                "receipt": {
                    "customer": {
                        "email": f"user{telegram_id}@mishura.style"
                    },
                    "items": [
                        {
                            "description": f"{description} ({stcoins_amount} STCoins)",
                            "quantity": "1.00",
                            "amount": {
                                "value": f"{amount:.2f}",
                                "currency": "RUB"
                            },
                            "vat_code": 1,
                            "payment_mode": "full_payment",
                            "payment_subject": "service"
                        }
                    ]
                }
            }
            
            logger.info(f"📤 Отправка данных в ЮKassa: {payment_data}")
            
            # КРИТИЧНО: Создание платежа с перехватом детальных ошибок
            try:
                payment = Payment.create(payment_data)
                
            except Exception as e:
                # Получаем детальную информацию об ошибке
                error_details = self._extract_error_details(e)
                logger.error(f"❌ ДЕТАЛЬНАЯ ОШИБКА ЮКАССЫ: {error_details}")
                
                # Обновляем статус в БД
                self._update_payment_status(payment_id, 'failed', str(e))
                
                # Поднимаем исключение с детальной информацией
                raise Exception(f"ЮKassa ошибка: {error_details}")
            
            logger.info(f"✅ Платеж создан в ЮKassa: {payment.id}")
            
            # Обновление записи с ID от ЮKassa
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE payments 
                SET yookassa_payment_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE payment_id = ?
            """, (payment.id, payment_id))
            conn.commit()
            conn.close()
            
            return {
                "status": "success",
                "payment_id": payment_id,
                "yookassa_payment_id": payment.id,
                "payment_url": payment.confirmation.confirmation_url,
                "amount": amount,
                "currency": "RUB"
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка создания платежа: {e}")
            raise

    def _extract_error_details(self, error: Exception) -> str:
        """Извлечение детальной информации об ошибке"""
        
        try:
            # Для HTTP ошибок пытаемся получить тело ответа
            if hasattr(error, 'response'):
                response = error.response
                
                error_info = {
                    "http_status": getattr(response, 'status_code', 'unknown'),
                    "url": getattr(response, 'url', 'unknown'),
                    "headers": dict(getattr(response, 'headers', {})),
                }
                
                # Пытаемся получить JSON тело ответа
                try:
                    if hasattr(response, 'text'):
                        response_text = response.text
                        error_info["response_body"] = response_text
                        
                        # Пытаемся парсить как JSON
                        try:
                            response_json = json.loads(response_text)
                            error_info["response_json"] = response_json
                        except:
                            pass
                            
                except Exception as e:
                    error_info["response_extraction_error"] = str(e)
                
                return json.dumps(error_info, indent=2, ensure_ascii=False)
                
            # Для API ошибок ЮКассы
            elif isinstance(error, (ApiError, ResponseProcessingError)):
                api_error_info = {
                    "error_type": type(error).__name__,
                    "error_message": str(error),
                    "http_code": getattr(error, 'http_code', 'unknown'),
                    "error_code": getattr(error, 'error_code', 'unknown'),
                    "description": getattr(error, 'description', 'unknown'),
                    "parameter": getattr(error, 'parameter', 'unknown'),
                    "retry_after": getattr(error, 'retry_after', 'unknown'),
                }
                
                return json.dumps(api_error_info, indent=2, ensure_ascii=False)
            
            # Общие ошибки
            else:
                return f"Общая ошибка: {type(error).__name__}: {str(error)}"
                
        except Exception as extraction_error:
            return f"Ошибка извлечения деталей: {extraction_error}. Исходная ошибка: {error}"

    def _update_payment_status(self, payment_id: str, status: str, error_message: str = None):
        """Обновление статуса платежа"""
        try:
            if error_message:
                logger.error(f"💳 Обновление статуса платежа {payment_id}: {status} - {error_message}")
            else:
                logger.info(f"💳 Обновление статуса платежа {payment_id}: {status}")
                
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE payments 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE payment_id = ?
            """, (status, payment_id))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"❌ Ошибка обновления статуса платежа: {e}")

    def process_successful_payment(self, yookassa_payment_id: str) -> bool:
        """Обработка успешного платежа"""
        try:
            # Поиск в локальной БД
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT payment_id, user_id, telegram_id, stcoins_amount, status
                FROM payments 
                WHERE yookassa_payment_id = ?
            """, (yookassa_payment_id,))
            
            payment_record = cursor.fetchone()
            if not payment_record:
                logger.error(f"❌ Платеж {yookassa_payment_id} не найден в локальной БД")
                conn.close()
                return False

            local_payment_id, user_id, telegram_id, stcoins_amount, current_status = payment_record

            # Проверяем, что платеж еще не обработан
            if current_status == "succeeded":
                logger.info(f"⚠️ Платеж {yookassa_payment_id} уже был обработан")
                conn.close()
                return True

            logger.info(f"💰 Обработка успешного платежа: {yookassa_payment_id}, начисляем {stcoins_amount} STCoins")
            
            # Начисление STCoins
            new_balance = self.db.update_user_balance(telegram_id, stcoins_amount, "payment")
            
            # Обновление статуса платежа
            cursor.execute("""
                UPDATE payments 
                SET status = 'succeeded', processed_at = CURRENT_TIMESTAMP
                WHERE payment_id = ?
            """, (local_payment_id,))
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Платеж {yookassa_payment_id} успешно обработан. Новый баланс: {new_balance}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка обработки платежа {yookassa_payment_id}: {e}")
            return False

    def get_payment_status(self, payment_id: str, telegram_id: int) -> Optional[Dict[str, Any]]:
        """Получение статуса платежа"""
        try:
            conn = self.db.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT payment_id, yookassa_payment_id, status, amount, 
                       stcoins_amount, created_at, processed_at
                FROM payments 
                WHERE payment_id = ? AND telegram_id = ?
            """, (payment_id, telegram_id))
            
            payment = cursor.fetchone()
            conn.close()
            if not payment:
                return None

            return {
                "payment_id": payment[0],
                "yookassa_payment_id": payment[1],
                "status": payment[2],
                "amount": payment[3],
                "stcoins_amount": payment[4],
                "created_at": payment[5],
                "processed_at": payment[6]
            }
        except Exception as e:
            logger.error(f"❌ Ошибка получения статуса платежа: {e}")
            return None 