import logging
import asyncio
from typing import Dict, Any, Optional

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self):
        self.payments = {}  # Временное хранилище для демонстрации
        self.test_mode = True  # Режим тестирования для автоматической обработки платежей
    
    async def create_payment(self, user_id: str, plan_id: str, return_url: str) -> Dict[str, Any]:
        """
        Создание нового платежа
        """
        try:
            # Генерируем уникальный ID платежа
            payment_id = f"payment_{user_id}_{plan_id}_{int(asyncio.get_event_loop().time())}"
            
            # Создаем запись о платеже
            payment = {
                "id": payment_id,
                "user_id": user_id,
                "plan_id": plan_id,
                "status": "pending",
                "return_url": return_url,
                "created_at": asyncio.get_event_loop().time()
            }
            
            # Сохраняем платеж
            self.payments[payment_id] = payment
            
            logger.info(f"📝 Создан платеж {payment_id} для пользователя {user_id}")
            
            return payment
            
        except Exception as e:
            logger.error(f"❌ Ошибка создания платежа: {e}")
            raise
    
    async def process_successful_payment(self, payment_id: str, user_id: str, plan_id: str) -> Dict[str, Any]:
        """
        Обработка успешного платежа
        """
        try:
            if payment_id not in self.payments:
                raise ValueError(f"Платеж {payment_id} не найден")
            
            payment = self.payments[payment_id]
            payment["status"] = "completed"
            payment["completed_at"] = asyncio.get_event_loop().time()
            
            logger.info(f"✅ Платеж {payment_id} успешно обработан")
            
            return payment
            
        except Exception as e:
            logger.error(f"❌ Ошибка обработки платежа: {e}")
            raise
    
    async def create_payment_and_process(self, user_id: str, plan_id: str, return_url: str):
        """
        Создание платежа с автоматической обработкой в тестовом режиме
        """
        # Создаем платеж
        payment = await self.create_payment(user_id, plan_id, return_url)
        
        # В тестовом режиме - сразу обрабатываем как успешный
        if self.test_mode:
            await asyncio.sleep(2)  # Имитация задержки
            await self.process_successful_payment(payment["id"], user_id, plan_id)
        
        return payment
    
    async def get_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """
        Получение статуса платежа
        В реальном приложении здесь будет интеграция с платежной системой
        """
        try:
            # В демо-версии просто возвращаем случайный статус
            import random
            statuses = ["pending", "completed", "failed"]
            status = random.choice(statuses)
            
            logger.info(f"📊 Получен статус платежа {payment_id}: {status}")
            
            return {
                "payment_id": payment_id,
                "status": status,
                "amount": 100,  # Демо-сумма
                "currency": "STcoin"
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка получения статуса платежа: {e}")
            return {
                "payment_id": payment_id,
                "status": "error",
                "error": str(e)
            }

def get_user_payments(user_id: int, limit: int = 10):
    """Получить платежи пользователя"""
    try:
        import database
        conn = database.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT payment_id, user_id, amount, currency, status, 
                   plan_id, stcoins_amount, created_at, updated_at
            FROM payments 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (user_id, limit))
        
        rows = cursor.fetchall()
        conn.close()
        
        payments = []
        for row in rows:
            payments.append({
                'payment_id': row[0],
                'user_id': row[1],
                'amount': row[2],
                'currency': row[3],
                'status': row[4],
                'plan_id': row[5],
                'stcoins_amount': row[6],
                'created_at': row[7],
                'updated_at': row[8]
            })
        
        return payments
        
    except Exception as e:
        print(f"Ошибка получения платежей: {e}")
        return []

# Создаем экземпляр сервиса
payment_service = PaymentService() 