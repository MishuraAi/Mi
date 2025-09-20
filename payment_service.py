import os
import uuid
import asyncio
import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

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
        """Создание платежа с использованием методов database.py"""
        
        try:
            # 1. Сохранение в БД через database.py (универсальные методы)
            success = self.db.save_payment(
                payment_id=payment_id,
                user_id=user_id,
                telegram_id=telegram_id,
                plan_id=plan_id,
                amount=amount,
                stcoins_amount=stcoins_amount,
                status='pending'
            )
            
            if not success:
                raise Exception("Не удалось сохранить платеж в базу данных")
            
            # 2. Подготовка данных для ЮKassa с обязательным чеком
            payment_data = {
                "amount": {
                    "value": f"{amount:.2f}",
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
                # 🔥 ОБЯЗАТЕЛЬНЫЙ ПАРАМЕТР RECEIPT для соблюдения 54-ФЗ
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
                            "vat_code": 1,  # Без НДС
                            "payment_mode": "full_payment",
                            "payment_subject": "service"
                        }
                    ]
                }
            }
            
            logger.info(f"📤 Отправка данных в ЮKassa: {json.dumps(payment_data, ensure_ascii=False, indent=2)}")
            
            # 3. Создание платежа в ЮKassa с обработкой ошибок
            try:
                payment = Payment.create(payment_data)
                
            except Exception as e:
                # Детальная информация об ошибке
                error_details = self._extract_error_details(e)
                logger.error(f"❌ ДЕТАЛЬНАЯ ОШИБКА ЮКАССЫ: {error_details}")
                
                # Обновляем статус в БД через database.py
                self.db.update_payment_status(payment_id, 'failed', str(e))
                
                # Поднимаем исключение с детальной информацией
                raise Exception(f"ЮKassa ошибка: {error_details}")
            
            logger.info(f"✅ Платеж создан в ЮKassa: {payment.id}")
            
            # 4. Обновление записи с ID от ЮKassa через database.py
            success = self.db.update_payment_yookassa_id(payment_id, payment.id)
            
            if not success:
                logger.warning(f"⚠️ Не удалось обновить YooKassa ID для платежа {payment_id}")
            
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
            
            # Обновляем статус в БД при любой ошибке
            try:
                self.db.update_payment_status(payment_id, 'failed', str(e))
            except:
                pass  # Игнорируем ошибки обновления статуса
                
            raise

    def process_successful_payment(self, yookassa_payment_id: str) -> bool:
        """Обработка успешного платежа через database.py"""
        try:
            # 1. Поиск платежа в БД через database.py
            payment_record = self.db.get_payment_by_yookassa_id(yookassa_payment_id)
            
            if not payment_record:
                logger.error(f"❌ Платеж {yookassa_payment_id} не найден в локальной БД")
                return False

            payment_id = payment_record['payment_id']
            telegram_id = payment_record['telegram_id']
            stcoins_amount = payment_record['stcoins_amount']
            current_status = payment_record['status']

            # 2. Проверяем, что платеж еще не обработан
            if current_status == "succeeded":
                logger.info(f"⚠️ Платеж {yookassa_payment_id} уже был обработан")
                return True

            logger.info(f"💰 Обработка успешного платежа: {yookassa_payment_id}, начисляем {stcoins_amount} STCoins")
            
            # 3. Начисление STCoins через database.py
            new_balance = self.db.update_user_balance(telegram_id, stcoins_amount, "payment")
            
            # 4. Обновление статуса платежа через database.py
            success = self.db.mark_payment_processed(payment_id)
            
            if success:
                logger.info(f"✅ Платеж {yookassa_payment_id} успешно обработан. Новый баланс: {new_balance}")
                return True
            else:
                logger.error(f"❌ Не удалось отметить платеж {yookassa_payment_id} как обработанный")
                return False
            
        except Exception as e:
            logger.error(f"❌ Ошибка обработки платежа {yookassa_payment_id}: {e}")
            return False

    def get_payment_status(self, payment_id: str, telegram_id: int) -> Optional[Dict[str, Any]]:
        """Получение статуса платежа через database.py"""
        try:
            return self.db.get_payment_status(payment_id, telegram_id)
        except Exception as e:
            logger.error(f"❌ Ошибка получения статуса платежа: {e}")
            return None

    def get_pending_payments_for_recovery(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Получение ожидающих платежей для восстановления"""
        try:
            return self.db.get_pending_payments(limit)
        except Exception as e:
            logger.error(f"❌ Ошибка получения ожидающих платежей: {e}")
            return []

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

    def test_connection(self) -> bool:
        """Тестирование соединения с ЮKassa"""
        try:
            # Создаем минимальный тестовый платеж
            test_payment_data = {
                'amount': {
                    'value': '1.00',
                    'currency': 'RUB'
                },
                'confirmation': {
                    'type': 'redirect',
                    'return_url': 'https://test.com'
                },
                'capture': False,  # Не подтверждаем тестовый платеж
                'description': 'Тестовый платеж для проверки API',
                'test': True,
                'receipt': {
                    'customer': {
                        'email': 'test@mishura.style'
                    },
                    'items': [
                        {
                            'description': 'Тестовая услуга',
                            'quantity': '1.00',
                            'amount': {
                                'value': '1.00',
                                'currency': 'RUB'
                            },
                            'vat_code': 1,
                            'payment_mode': 'full_payment',
                            'payment_subject': 'service'
                        }
                    ]
                }
            }
            
            payment = Payment.create(test_payment_data)
            
            # Сразу отменяем тестовый платеж
            Payment.cancel(payment.id)
            
            logger.info("✅ Соединение с ЮKassa работает корректно")
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка соединения с ЮKassa: {e}")
            return False