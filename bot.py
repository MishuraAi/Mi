#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🎭 МИШУРА - Минимальный Telegram Bot
Только кнопка для запуска веб-приложения
Версия: 1.0.0 - Минимальная рабочая версия
"""

import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters
from telegram.constants import ParseMode

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Переменные окружения
TOKEN = os.getenv('TELEGRAM_TOKEN')
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://style-ai-bot.onrender.com')

if not TOKEN:
    raise ValueError("TELEGRAM_TOKEN не найден в переменных окружения")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Единственная команда - запуск веб-приложения"""
    user = update.effective_user
    
    welcome_text = f"""
🎭 **МИШУРА** - Ваш персональный ИИ-стилист!

👋 Привет, {user.first_name}!

🚀 **Все функции доступны в веб-приложении:**
• 🔍 Анализ ваших образов и стиля
• 💡 Профессиональные советы от ИИ
• ⚖️ Сравнение вариантов образов
• 💰 Покупка STcoins
• 📊 История консультаций
• 💎 Персональный гардероб

✨ **Удобный интерфейс, быстрая загрузка фото!**

👇 Нажмите кнопку ниже для запуска:
"""
    
    keyboard = [
        [InlineKeyboardButton("🚀 Открыть МИШУРА", url=WEBAPP_URL)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        welcome_text,
        reply_markup=reply_markup,
        parse_mode=ParseMode.MARKDOWN
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда помощи"""
    help_text = f"""
🎭 **МИШУРА - Справка**

**Команды:**
• `/start` - Главное меню и ссылка на веб-приложение
• `/help` - Эта справка

**Как пользоваться:**
1️⃣ Нажмите "🚀 Открыть МИШУРА"
2️⃣ Используйте веб-интерфейс для всех функций:
   • Анализ стиля
   • Покупка STcoins
   • Просмотр истории
   • Управление гардеробом

**🌐 Веб-приложение:** {WEBAPP_URL}
**📧 Поддержка:** @mishura_support_bot

💡 **Все основные функции доступны только в веб-приложении!**
"""
    
    keyboard = [
        [InlineKeyboardButton("🚀 Открыть МИШУРА", url=WEBAPP_URL)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        help_text,
        reply_markup=reply_markup,
        parse_mode=ParseMode.MARKDOWN
    )

async def webapp_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда для прямого открытия веб-приложения"""
    keyboard = [
        [InlineKeyboardButton("🚀 Открыть МИШУРА", url=WEBAPP_URL)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🌐 Откройте веб-приложение для работы с МИШУРА:",
        reply_markup=reply_markup
    )

async def handle_any_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик всех остальных сообщений"""
    keyboard = [
        [InlineKeyboardButton("🚀 Открыть МИШУРА", url=WEBAPP_URL)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🎭 Все функции МИШУРА доступны в веб-приложении!\n\n"
        "Нажмите кнопку ниже для доступа ко всем возможностям:",
        reply_markup=reply_markup
    )

def main():
    """Запуск минимального бота"""
    # Создаем приложение
    application = Application.builder().token(TOKEN).build()
    
    # Основные команды
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("webapp", webapp_command))
    
    # Обработчик всех остальных сообщений (фото, текст, etc.)
    application.add_handler(MessageHandler(
        filters.ALL & ~filters.COMMAND, 
        handle_any_message
    ))
    
    # Запуск бота
    logger.info("🎭 МИШУРА минимальный бот запущен!")
    logger.info(f"🌐 Веб-приложение: {WEBAPP_URL}")
    
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()