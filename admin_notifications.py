# 🔔 СИСТЕМА УВЕДОМЛЕНИЙ АДМИНУ - admin_notifications.py

import os
import logging
import asyncio
import aiohttp
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger("AdminNotifications")

class AdminNotificationService:
    """
    🔔 Сервис уведомлений администратора
    Отправляет красивые Telegram сообщения о новых отзывах
    """
    
    def __init__(self):
        self.bot_token = os.getenv('TELEGRAM_TOKEN')
        self.admin_chat_id = os.getenv('ADMIN_TELEGRAM_ID')  # ID админа для уведомлений
        self.enabled = bool(self.bot_token and self.admin_chat_id)
        
        if not self.enabled:
            logger.warning("⚠️ Уведомления админу отключены - отсутствуют TELEGRAM_TOKEN или ADMIN_TELEGRAM_ID")
        else:
            logger.info(f"✅ Уведомления админу включены для chat_id: {self.admin_chat_id}")
    
    async def send_feedback_notification(self, feedback_data: Dict[str, Any], user_data: Dict[str, Any] = None):
        """Отправить уведомление о новом отзыве"""
        
        if not self.enabled:
            logger.debug("🔕 Уведомления отключены, пропускаем")
            return False
        
        try:
            # Форматируем сообщение
            message = self._format_feedback_message(feedback_data, user_data)
            
            # Отправляем через Telegram Bot API
            success = await self._send_telegram_message(message)
            
            if success:
                logger.info(f"✅ Уведомление о отзыве ID={feedback_data.get('id')} отправлено админу")
                return True
            else:
                logger.error(f"❌ Не удалось отправить уведомление о отзыве ID={feedback_data.get('id')}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка отправки уведомления: {e}")
            return False
    
    def _format_feedback_message(self, feedback_data: Dict[str, Any], user_data: Dict[str, Any] = None) -> str:
        """Форматирование красивого сообщения об отзыве"""
        
        # Базовые данные отзыва
        feedback_id = feedback_data.get('id', 'N/A')
        telegram_id = feedback_data.get('telegram_id', 'N/A')
        feedback_text = feedback_data.get('feedback_text', '')
        feedback_rating = feedback_data.get('feedback_rating', 'unknown')
        character_count = feedback_data.get('character_count', 0)
        consultation_id = feedback_data.get('consultation_id', 'N/A')
        bonus_awarded = feedback_data.get('bonus_awarded', False)
        created_at = feedback_data.get('created_at', datetime.now().isoformat())
        
        # Данные пользователя (если есть)
        user_name = "Неизвестный"
        user_balance = "N/A"
        
        if user_data:
            first_name = user_data.get('first_name', '')
            last_name = user_data.get('last_name', '')
            username = user_data.get('username', '')
            user_balance = user_data.get('balance', 'N/A')
            
            if first_name or last_name:
                user_name = f"{first_name} {last_name}".strip()
            elif username:
                user_name = f"@{username}"
        
        # Эмодзи для рейтинга
        rating_emoji = "👍" if feedback_rating == "positive" else "👎"
        rating_text = "Понравилось" if feedback_rating == "positive" else "Не очень"
        
        # Эмодзи для бонуса
        bonus_emoji = "💰" if bonus_awarded else "⏳"
        bonus_text = "Начислен" if bonus_awarded else "Не начислен"
        
        # Определяем цвет (для будущего HTML форматирования)
        urgency_emoji = "🔥" if feedback_rating == "negative" else "✨"
        
        # Обрезаем длинный текст отзыва
        preview_text = feedback_text
        if len(preview_text) > 200:
            preview_text = preview_text[:200] + "..."
        
        # Форматируем дату
        try:
            if isinstance(created_at, str):
                dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                formatted_date = dt.strftime("%d.%m.%Y %H:%M")
            else:
                formatted_date = created_at.strftime("%d.%m.%Y %H:%M")
        except:
            formatted_date = str(created_at)
        
        # Собираем сообщение
        message = f"""🎭 <b>НОВЫЙ ОТЗЫВ МИШУРА</b> {urgency_emoji}

👤 <b>Пользователь:</b> {user_name}
🆔 <b>Telegram ID:</b> <code>{telegram_id}</code>
💰 <b>Баланс:</b> {user_balance} STcoin

{rating_emoji} <b>Оценка:</b> {rating_text}
📏 <b>Длина:</b> {character_count} символов
🎯 <b>Консультация:</b> #{consultation_id}
{bonus_emoji} <b>Бонус:</b> {bonus_text}
📅 <b>Время:</b> {formatted_date}

📝 <b>Текст отзыва:</b>
<blockquote>{preview_text}</blockquote>

📊 <b>ID отзыва:</b> #{feedback_id}

<i>🔗 Просмотр: /admin/feedback</i>"""

        return message
    
    async def _send_telegram_message(self, message: str) -> bool:
        """Отправка сообщения через Telegram Bot API"""
        
        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        
        payload = {
            "chat_id": self.admin_chat_id,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=10) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result.get('ok'):
                            return True
                        else:
                            logger.error(f"❌ Telegram API ошибка: {result}")
                            return False
                    else:
                        logger.error(f"❌ HTTP ошибка {response.status}: {await response.text()}")
                        return False
                        
        except asyncio.TimeoutError:
            logger.error("❌ Таймаут при отправке уведомления")
            return False
        except Exception as e:
            logger.error(f"❌ Ошибка отправки в Telegram: {e}")
            return False
    
    async def send_daily_summary(self):
        """Отправить ежедневную сводку по отзывам"""
        
        if not self.enabled:
            return False
        
        try:
            # Здесь можно добавить логику для ежедневных сводок
            # Пока что простое сообщение
            
            from database import MishuraDB
            db = MishuraDB()
            stats = db.get_feedback_stats()
            
            message = f"""📊 <b>ЕЖЕДНЕВНАЯ СВОДКА МИШУРА</b>

📝 <b>Отзывы сегодня:</b> {stats.get('feedback_today', 0)}
📈 <b>Всего отзывов:</b> {stats.get('total_feedback', 0)}
📏 <b>Средняя длина:</b> {stats.get('avg_feedback_length', 0)} символов
👍 <b>Положительных:</b> {stats.get('positive_feedback_percent', 0)}%
💰 <b>Бонусов начислено:</b> {stats.get('bonuses_awarded', 0)}

📅 <b>Дата:</b> {datetime.now().strftime('%d.%m.%Y')}

<i>Хорошего дня! 🎭</i>"""

            return await self._send_telegram_message(message)
            
        except Exception as e:
            logger.error(f"❌ Ошибка отправки ежедневной сводки: {e}")
            return False
    
    async def test_notification(self):
        """Тестовое уведомление для проверки работы"""
        
        if not self.enabled:
            logger.warning("⚠️ Уведомления отключены, невозможно протестировать")
            return False
        
        test_message = f"""🧪 <b>ТЕСТ УВЕДОМЛЕНИЙ МИШУРА</b>

✅ Система уведомлений работает корректно!

🤖 <b>Bot Token:</b> Настроен
👤 <b>Admin ID:</b> {self.admin_chat_id}
📅 <b>Время теста:</b> {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}

<i>Готов принимать уведомления о новых отзывах! 🎭</i>"""

        success = await self._send_telegram_message(test_message)
        
        if success:
            logger.info("✅ Тестовое уведомление отправлено успешно")
        else:
            logger.error("❌ Не удалось отправить тестовое уведомление")
            
        return success

# Глобальный экземпляр сервиса
notification_service = AdminNotificationService()

# Функции для удобства использования
async def notify_new_feedback(feedback_data: Dict[str, Any], user_data: Dict[str, Any] = None):
    """Уведомить о новом отзыве"""
    return await notification_service.send_feedback_notification(feedback_data, user_data)

async def test_admin_notifications():
    """Протестировать уведомления"""
    return await notification_service.test_notification()

async def send_daily_summary():
    """Отправить ежедневную сводку"""
    return await notification_service.send_daily_summary()