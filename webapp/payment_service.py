import logging
from typing import Dict, Any

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self):
        self.payments = {}  # Временное хранилище для демонстрации
    
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

# Создаем экземпляр сервиса
payment_service = PaymentService() 