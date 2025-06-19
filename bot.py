#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🎭 МИШУРА - Персональный ИИ-Стилист
Telegram Bot для анализа стиля с использованием Gemini AI
"""

import os
import logging
import json
import asyncio
import aiohttp
from datetime import datetime
from typing import Optional

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler, 
    CallbackQueryHandler, ContextTypes, filters
)
from telegram.constants import ParseMode

# Локальные импорты
import database
import gemini_ai
from pricing_config import (
    PRICING_PLANS, 
    create_pricing_keyboard, 
    format_plan_description, 
    format_pricing_summary,
    PRICING_TEXTS,
    get_plan_by_id
)

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Переменные окружения
TOKEN = os.getenv('TELEGRAM_TOKEN')
WEBAPP_URL = os.getenv('WEBAPP_URL', 'http://localhost:8001')

if not TOKEN:
    raise ValueError("TELEGRAM_TOKEN не найден в переменных окружения")

# Глобальные состояния
user_states = {}
comparison_sessions = {}

class UserState:
    NORMAL = "normal"
    WAITING_FOR_PHOTO = "waiting_for_photo"
    WAITING_FOR_COMPARISON = "waiting_for_comparison"
    SELECTING_OCCASION = "selecting_occasion"

# ================================
# ОСНОВНЫЕ КОМАНДЫ
# ================================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start с новой информацией о тарифах"""
    user = update.effective_user
    
    # Сохраняем пользователя в базу
    database.save_user(
        telegram_id=user.id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name
    )
    
    # Получаем баланс пользователя
    balance = database.get_user_balance(user.id) or 0
    
    welcome_text = f"""
🎭 Добро пожаловать в **МИШУРА** - ваш персональный ИИ-стилист!

👋 Привет, {user.first_name}!

💰 Ваш баланс: **{balance} STcoin**

🎯 **Что я умею:**
• 🔍 Анализировать ваши образы и одежду
• 💡 Давать профессиональные советы по стилю
• ⚖️ Сравнивать несколько вариантов образов
• 💎 Сохранять предметы в персональный гардероб

💵 **Новые выгодные тарифы:**
🧪 Тестовый: 1 консультация = 20₽ (20₽/консультация)
🌟 Базовый: 10 консультаций = 150₽ (15₽/консультация) 
⭐ Стандарт: 30 консультаций = 300₽ (10₽/консультация) 🔥
💎 Премиум: 100 консультаций = 800₽ (8₽/консультация)

🚀 Выберите действие в меню ниже:
"""
    
    keyboard = get_main_menu_keyboard()
    
    await update.message.reply_text(
        welcome_text,
        reply_markup=keyboard,
        parse_mode=ParseMode.MARKDOWN
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда помощи"""
    help_text = """
🎭 **МИШУРА - Справка**

**Основные команды:**
• `/start` - Главное меню
• `/help` - Эта справка
• `/webapp` - Открыть веб-приложение
• `/wardrobe` - Мой гардероб

**Как пользоваться:**
1️⃣ Купите STcoin через меню "💰 Купить STcoin"
2️⃣ Нажмите "🚀 Получить консультацию"
3️⃣ Загрузите фото через веб-приложение
4️⃣ Получите профессиональный анализ от ИИ

**Команды гардероба:**
• `/name_ID новое_название` - Изменить название предмета
• `/tag_ID новый_тег` - Изменить тег предмета

**Стоимость:**
• 1 консультация = 10 STcoin

**Поддержка:** @mishura_support_bot
"""
    
    await update.message.reply_text(
        help_text,
        parse_mode=ParseMode.MARKDOWN
    )

async def webapp_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда для открытия веб-приложения"""
    webapp_url = f"{WEBAPP_URL}/webapp/"
    
    keyboard = [
        [InlineKeyboardButton("🌐 Открыть веб-приложение", url=webapp_url)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🌐 Откройте веб-приложение для удобной загрузки фото:",
        reply_markup=reply_markup
    )

async def consultation_by_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Просмотр консультации по ID"""
    if not context.args:
        await update.message.reply_text("Укажите ID консультации: /consultation 123")
        return
    
    try:
        consultation_id = int(context.args[0])
        user_id = update.effective_user.id
        
        consultation = database.get_consultation(consultation_id, user_id)
        if not consultation:
            await update.message.reply_text("❌ Консультация не найдена")
            return
        
        # Форматируем ответ
        response_text = f"""
📋 **Консультация #{consultation_id}**

📅 Дата: {consultation['created_at']}
🎯 Повод: {consultation['occasion']}

**Совет стилиста:**
{consultation['advice']}
"""
        
        await update.message.reply_text(
            response_text,
            parse_mode=ParseMode.MARKDOWN
        )
        
    except ValueError:
        await update.message.reply_text("❌ Неверный формат ID")
    except Exception as e:
        logger.error(f"Ошибка получения консультации: {e}")
        await update.message.reply_text("❌ Ошибка при получении консультации")

# ================================
# КЛАВИАТУРЫ
# ================================

def get_main_menu_keyboard():
    """Главное меню бота с обновленными ценами"""
    keyboard = [
        [
            InlineKeyboardButton("🚀 Получить консультацию (10 STcoin)", callback_data="get_consultation"),
        ],
        [
            InlineKeyboardButton("💰 Купить STcoin", callback_data="show_pricing"),
            InlineKeyboardButton("💎 Мой гардероб", callback_data="my_wardrobe")
        ],
        [
            InlineKeyboardButton("📚 Мои консультации", callback_data="my_consultations"),
            InlineKeyboardButton("ℹ️ Помощь", callback_data="help")
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_occasion_keyboard():
    """Клавиатура выбора повода"""
    occasions = [
        ("👔 Деловая встреча", "business"),
        ("🎉 Вечеринка", "party"), 
        ("🚶 Прогулка", "casual"),
        ("💕 Свидание", "date"),
        ("🏠 Дома", "home"),
        ("🎨 Творческое мероприятие", "creative")
    ]
    
    keyboard = []
    for text, callback in occasions:
        keyboard.append([InlineKeyboardButton(text, callback_data=f"occasion_{callback}")])
    
    keyboard.append([InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")])
    return InlineKeyboardMarkup(keyboard)

# ================================
# ТАРИФНЫЕ ПЛАНЫ
# ================================

async def show_pricing_plans(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать обновленные тарифные планы"""
    user_id = update.effective_user.id
    
    # Получаем текущий баланс пользователя
    current_balance = database.get_user_balance(user_id) or 0
    
    message_text = f"""
{PRICING_TEXTS['title']}

💰 Ваш текущий баланс: **{current_balance} STcoin**

{PRICING_TEXTS['subtitle']}

{format_pricing_summary()}

{PRICING_TEXTS['currency_info']}
{PRICING_TEXTS['features_info']}
"""
    
    keyboard = create_pricing_keyboard()
    
    if update.callback_query:
        await update.callback_query.edit_message_text(
            message_text,
            reply_markup=keyboard,
            parse_mode=ParseMode.MARKDOWN
        )
    else:
        await update.message.reply_text(
            message_text,
            reply_markup=keyboard,
            parse_mode=ParseMode.MARKDOWN
        )

async def handle_plan_purchase(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик выбора тарифного плана"""
    query = update.callback_query
    await query.answer()
    
    # Извлекаем ID плана из callback_data
    plan_id = query.data.replace("buy_plan_", "")
    plan = get_plan_by_id(plan_id)
    
    if not plan:
        await query.edit_message_text("❌ Тарифный план не найден")
        return
    
    # Показываем детальную информацию о плане
    plan_description = format_plan_description(plan_id)
    
    # Создаем кнопки для подтверждения покупки
    keyboard = [
        [
            InlineKeyboardButton(
                f"💳 Купить за {plan['price_rub']} руб.",
                callback_data=f"confirm_purchase_{plan_id}"
            )
        ],
        [
            InlineKeyboardButton("⬅️ Назад к тарифам", callback_data="show_pricing")
        ]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        plan_description,
        reply_markup=reply_markup,
        parse_mode=ParseMode.MARKDOWN
    )

async def handle_purchase_confirmation(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик подтверждения покупки через ЮKassa"""
    query = update.callback_query
    await query.answer()
    
    plan_id = query.data.replace("confirm_purchase_", "")
    plan = get_plan_by_id(plan_id)
    
    if not plan:
        await query.edit_message_text("❌ Тарифный план не найден")
        return
    
    user_id = update.effective_user.id
    
    try:
        # Создаем платеж через API
        payment_url = await create_yookassa_payment(user_id, plan_id, context)
        
        keyboard = [
            [InlineKeyboardButton("💳 Оплатить", url=payment_url)],
            [InlineKeyboardButton("⬅️ Назад", callback_data="show_pricing")]
        ]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message_text = f"""
💳 **Оплата тарифного плана**

{plan['color']} **{plan['name']}**
💰 Сумма: **{plan['price_rub']} руб.**
💎 STcoin: **+{plan['stcoins']}**
📊 Консультации: **{plan['consultations']} шт.**

{PRICING_TEXTS['payment_processing']}
"""
        
        await query.edit_message_text(
            message_text,
            reply_markup=reply_markup,
            parse_mode=ParseMode.MARKDOWN
        )
        
    except Exception as e:
        logger.error(f"Ошибка создания платежа: {e}")
        await query.edit_message_text(
            "❌ Ошибка при создании платежа. Попробуйте позже.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("⬅️ Назад", callback_data="show_pricing")
            ]])
        )

async def create_yookassa_payment(user_id: int, plan_id: str, context: ContextTypes.DEFAULT_TYPE):
    """Создать платеж через API сервер"""
    async with aiohttp.ClientSession() as session:
        payload = {
            "user_id": user_id,
            "plan_id": plan_id,
            "return_url": f"https://t.me/{context.bot.username}"
        }
        
        async with session.post(
            f"{WEBAPP_URL}/api/v1/payments/create",
            json=payload
        ) as response:
            if response.status == 200:
                data = await response.json()
                return data["payment_url"]
            else:
                error_text = await response.text()
                raise Exception(f"API error {response.status}: {error_text}")

# ================================
# КОНСУЛЬТАЦИИ
# ================================

async def handle_consultation_request(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка запроса на консультацию"""
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    balance = database.get_user_balance(user_id) or 0
    
    if balance < 10:
        keyboard = [
            [InlineKeyboardButton("💰 Купить STcoin", callback_data="show_pricing")],
            [InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")]
        ]
        
        await query.edit_message_text(
            "❌ Недостаточно STcoin для консультации!\n\n"
            f"💰 Ваш баланс: {balance} STcoin\n"
            f"💎 Нужно: 10 STcoin\n\n"
            "Купите STcoin для продолжения:",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        return
    
    # Показываем выбор повода
    user_states[user_id] = UserState.SELECTING_OCCASION
    
    await query.edit_message_text(
        "🎯 Выберите повод для консультации:",
        reply_markup=get_occasion_keyboard()
    )

async def handle_occasion_selection(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка выбора повода"""
    query = update.callback_query
    await query.answer()
    
    occasion_map = {
        "business": "Деловая встреча",
        "party": "Вечеринка",
        "casual": "Прогулка", 
        "date": "Свидание",
        "home": "Дома",
        "creative": "Творческое мероприятие"
    }
    
    occasion_code = query.data.replace("occasion_", "")
    occasion = occasion_map.get(occasion_code, "Общий стиль")
    
    user_id = update.effective_user.id
    context.user_data['selected_occasion'] = occasion
    user_states[user_id] = UserState.WAITING_FOR_PHOTO
    
    webapp_url = f"{WEBAPP_URL}/webapp/"
    keyboard = [
        [InlineKeyboardButton("📱 Открыть веб-приложение", url=webapp_url)],
        [InlineKeyboardButton("⬅️ Выбрать другой повод", callback_data="get_consultation")]
    ]
    
    await query.edit_message_text(
        f"🎯 Повод: **{occasion}**\n\n"
        "📷 Теперь загрузите фото вашего образа через веб-приложение или отправьте прямо в чат:",
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode=ParseMode.MARKDOWN
    )

async def photo_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик фотографий"""
    user_id = update.effective_user.id
    
    if user_states.get(user_id) != UserState.WAITING_FOR_PHOTO:
        await update.message.reply_text(
            "Сначала выберите повод для консультации через меню!",
            reply_markup=get_main_menu_keyboard()
        )
        return
    
    # Проверяем баланс
    balance = database.get_user_balance(user_id) or 0
    if balance < 10:
        await update.message.reply_text(
            "❌ Недостаточно STcoin для консультации!",
            reply_markup=get_main_menu_keyboard()
        )
        return
    
    try:
        # Показываем сообщение об обработке
        processing_msg = await update.message.reply_text("🔄 Анализирую ваш образ...")
        
        # Получаем фото
        photo = update.message.photo[-1]
        file = await context.bot.get_file(photo.file_id)
        file_bytes = await file.download_as_bytearray()
        
        # Получаем выбранный повод
        occasion = context.user_data.get('selected_occasion', 'Общий стиль')
        
        # Анализируем через Gemini AI
        advice = await gemini_ai.analyze_clothing_image(
            image_data=file_bytes,
            occasion=occasion,
            preferences=""
        )
        
        # Списываем STcoin
        database.update_user_balance(user_id, -10)
        new_balance = database.get_user_balance(user_id)
        
        # Сохраняем консультацию
        consultation_id = database.save_consultation(
            user_id=user_id,
            occasion=occasion,
            preferences="",
            image_path=photo.file_id,
            advice=advice
        )
        
        # Удаляем сообщение об обработке
        await processing_msg.delete()
        
        # Отправляем результат
        result_text = f"""
✨ **Консультация #{consultation_id}**

🎯 **Повод:** {occasion}
💰 **Списано:** 10 STcoin (осталось: {new_balance})

**🎨 Совет стилиста:**
{advice}
"""
        
        # Клавиатура с действиями
        keyboard = [
            [
                InlineKeyboardButton("💎 Сохранить в гардероб", 
                                   callback_data=f"save_to_wardrobe_{photo.file_id}"),
                InlineKeyboardButton("🚀 Новая консультация", callback_data="get_consultation")
            ],
            [InlineKeyboardButton("⬅️ Главное меню", callback_data="back_to_main")]
        ]
        
        await update.message.reply_text(
            result_text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode=ParseMode.MARKDOWN
        )
        
        # Сбрасываем состояние
        user_states[user_id] = UserState.NORMAL
        
    except Exception as e:
        logger.error(f"Ошибка анализа фото: {e}")
        await processing_msg.edit_text(
            "❌ Ошибка при анализе фото. Попробуйте позже.",
            reply_markup=get_main_menu_keyboard()
        )

# ================================
# КОНСУЛЬТАЦИИ И ГАРДЕРОБ
# ================================

async def show_consultations(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать историю консультаций"""
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    consultations = database.get_user_consultations(user_id, limit=10)
    
    if not consultations:
        await query.edit_message_text(
            "📚 У вас пока нет консультаций.\n\n"
            "Получите первую консультацию!",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🚀 Получить консультацию", callback_data="get_consultation"),
                InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")
            ]])
        )
        return
    
    text = "📚 **Ваши последние консультации:**\n\n"
    keyboard = []
    
    for consultation in consultations:
        date = consultation['created_at'][:10]  # YYYY-MM-DD
        text += f"#{consultation['id']} - {consultation['occasion']} ({date})\n"
        
        keyboard.append([InlineKeyboardButton(
            f"📋 Консультация #{consultation['id']}",
            callback_data=f"view_consultation_{consultation['id']}"
        )])
    
    keyboard.append([InlineKeyboardButton("⬅️ Главное меню", callback_data="back_to_main")])
    
    await query.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode=ParseMode.MARKDOWN
    )

async def view_consultation(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Просмотр отдельной консультации"""
    query = update.callback_query
    await query.answer()
    
    consultation_id = int(query.data.split("_")[-1])
    user_id = update.effective_user.id
    
    consultation = database.get_consultation(consultation_id, user_id)
    if not consultation:
        await query.answer("❌ Консультация не найдена", show_alert=True)
        return
    
    response_text = f"""
📋 **Консультация #{consultation_id}**

📅 **Дата:** {consultation['created_at']}
🎯 **Повод:** {consultation['occasion']}

**🎨 Совет стилиста:**
{consultation['advice']}
"""
    
    keyboard = [
        [InlineKeyboardButton("📚 Все консультации", callback_data="my_consultations")],
        [InlineKeyboardButton("⬅️ Главное меню", callback_data="back_to_main")]
    ]
    
    await query.edit_message_text(
        response_text,
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode=ParseMode.MARKDOWN
    )

async def save_to_wardrobe(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Сохранение предмета в гардероб"""
    query = update.callback_query
    await query.answer()
    
    file_id = query.data.replace("save_to_wardrobe_", "")
    user_id = update.effective_user.id
    
    # Сохраняем с базовым названием
    wardrobe_id = database.save_wardrobe_item(
        user_id=user_id,
        telegram_file_id=file_id,
        item_name="Предмет одежды",
        item_tag="новый"
    )
    
    keyboard = [
        [InlineKeyboardButton("💎 Открыть гардероб", callback_data="my_wardrobe")],
        [InlineKeyboardButton("✏️ Изменить название", callback_data=f"edit_name_{wardrobe_id}")],
        [InlineKeyboardButton("⬅️ Главное меню", callback_data="back_to_main")]
    ]
    
    await query.edit_message_text(
        f"✅ Предмет сохранен в гардероб!\n\n"
        f"🆔 ID: {wardrobe_id}\n"
        f"Используйте команду /name_{wardrobe_id} новое_название для изменения названия",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

# ================================
# ОБРАБОТЧИКИ CALLBACK'ОВ
# ================================

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Основной обработчик inline кнопок"""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    
    # Главное меню
    if data == "back_to_main":
        balance = database.get_user_balance(update.effective_user.id) or 0
        await query.edit_message_text(
            f"🎭 **МИШУРА** - Главное меню\n\n💰 Ваш баланс: {balance} STcoin",
            reply_markup=get_main_menu_keyboard(),
            parse_mode=ParseMode.MARKDOWN
        )
    
    # Консультации
    elif data == "get_consultation":
        await handle_consultation_request(update, context)
    elif data.startswith("occasion_"):
        await handle_occasion_selection(update, context)
    elif data == "my_consultations":
        await show_consultations(update, context)
    elif data.startswith("view_consultation_"):
        await view_consultation(update, context)
    
    # Тарифные планы
    elif data == "show_pricing":
        await show_pricing_plans(update, context)
    elif data.startswith("buy_plan_"):
        await handle_plan_purchase(update, context)
    elif data.startswith("confirm_purchase_"):
        await handle_purchase_confirmation(update, context)
    
    # Гардероб - временно отключен
    elif data == "my_wardrobe":
        await query.edit_message_text(
            "💎 Гардероб временно недоступен.\n\nФункция находится в разработке.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("⬅️ Главное меню", callback_data="back_to_main")
            ]])
        )
    elif data.startswith("save_to_wardrobe_"):
        await query.edit_message_text(
            "💎 Сохранение в гардероб временно недоступно.\n\nФункция находится в разработке.",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("⬅️ Главное меню", callback_data="back_to_main")
            ]])
        )
    
    # Помощь
    elif data == "help":
        await help_command(update, context)

async def text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик текстовых сообщений"""
    text = update.message.text
    user_id = update.effective_user.id
    
    # Проверяем состояние пользователя
    if user_states.get(user_id) == UserState.WAITING_FOR_PHOTO:
        await update.message.reply_text(
            "📷 Пожалуйста, отправьте фото, а не текст.",
            reply_markup=get_main_menu_keyboard()
        )
        return
    
    # Обработка остальных текстовых команд
    await update.message.reply_text(
        "Используйте меню для навигации:",
        reply_markup=get_main_menu_keyboard()
    )

# ================================
# ОСНОВНАЯ ФУНКЦИЯ
# ================================

def main():
    """Запуск бота"""
    # Инициализация базы данных
    database.init_db()
    
    # Создаем приложение
    application = Application.builder().token(TOKEN).build()
    
    # Команды
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("webapp", webapp_command))
    application.add_handler(CommandHandler("consultation", consultation_by_id))
    
    # Обработчики callback'ов для тарифных планов
    application.add_handler(CallbackQueryHandler(
        show_pricing_plans, pattern="^show_pricing$"
    ))
    application.add_handler(CallbackQueryHandler(
        handle_plan_purchase, pattern="^buy_plan_"
    ))
    application.add_handler(CallbackQueryHandler(
        handle_purchase_confirmation, pattern="^confirm_purchase_"
    ))
    
    # Основные обработчики
    application.add_handler(CallbackQueryHandler(button_handler))
    application.add_handler(MessageHandler(filters.PHOTO, photo_handler))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_handler))
    
    # Запуск бота
    logger.info("🎭 МИШУРА запущена!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()