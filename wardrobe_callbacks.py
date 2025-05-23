"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Callback обработчики Гардероба (wardrobe_callbacks.py)
ВЕРСИЯ: 1.0.0
ДАТА СОЗДАНИЯ: 2025-05-23

Дополнительные callback обработчики для функции Гардероб
==========================================================================================
"""
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from database import get_wardrobe_item, update_wardrobe_item, delete_wardrobe_item, get_user_wardrobe, get_wardrobe_stats

# Настройка логирования
logger = logging.getLogger("MishuraWardrobeCallbacks")

async def handle_view_item(query, user_id, item_id, context):
    """Обработка просмотра предмета гардероба."""
    item = get_wardrobe_item(item_id, user_id)
    
    if not item:
        await query.edit_message_text("Предмет не найден в вашем гардеробе.")
        return
        
    item_name = item.get('item_name') or "Без названия"
    item_tag = item.get('item_tag') or ""
    category = item.get('category') or ""
    created_date = item.get('created_at', '')
    
    caption = f"💎 <b>{item_name}</b>\n\n"
    if item_tag:
        caption += f"🏷️ Тег: {item_tag}\n"
    if category:
        caption += f"📂 Категория: {category}\n"
    caption += f"📅 Добавлено: {created_date}\n"
    
    keyboard = [
        [
            InlineKeyboardButton("📝 Редактировать", callback_data=f"edit_item_{item_id}"),
            InlineKeyboardButton("🗑️ Удалить", callback_data=f"delete_item_{item_id}")
        ],
        [InlineKeyboardButton("◀️ Назад к гардеробу", callback_data="refresh_wardrobe")]
    ]
    
    try:
        await context.bot.send_photo(
            chat_id=query.message.chat_id,
            photo=item['telegram_file_id'],
            caption=caption,
            parse_mode='HTML',
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        await query.delete_message()
    except Exception as e_view:
        logger.error(f"Ошибка при просмотре предмета {item_id}: {e_view}")
        await query.edit_message_text(f"Предмет найден, но изображение недоступно.\n\n{caption}", parse_mode='HTML')

async def handle_edit_item(query, user_id, item_id):
    """Обработка редактирования предмета."""
    item = get_wardrobe_item(item_id, user_id)
    
    if not item:
        await query.edit_message_text("Предмет не найден в вашем гардеробе.")
        return
        
    current_name = item.get('item_name') or ""
    current_tag = item.get('item_tag') or ""
    
    await query.edit_message_text(
        f"📝 <b>Редактирование предмета</b>\n\n"
        f"Текущее название: {current_name or 'не задано'}\n"
        f"Текущий тег: {current_tag or 'не задан'}\n\n"
        f"Для изменения названия отправьте сообщение в формате:\n"
        f"<code>/name_{item_id} Новое название</code>\n\n"
        f"Для изменения тега отправьте:\n"
        f"<code>/tag_{item_id} новый_тег</code>",
        parse_mode='HTML',
        reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад", callback_data=f"view_item_{item_id}")]])
    )

async def handle_delete_item(query, user_id, item_id):
    """Обработка запроса на удаление предмета."""
    item = get_wardrobe_item(item_id, user_id)
    
    if not item:
        await query.edit_message_text("Предмет не найден в вашем гардеробе.")
        return
        
    item_name = item.get('item_name') or "предмет"
    keyboard = [
        [
            InlineKeyboardButton("✅ Да, удалить", callback_data=f"confirm_delete_{item_id}"),
            InlineKeyboardButton("❌ Отмена", callback_data=f"view_item_{item_id}")
        ]
    ]
    
    await query.edit_message_text(
        f"🗑️ <b>Подтверждение удаления</b>\n\n"
        f"Вы действительно хотите удалить «{item_name}» из гардероба?\n\n"
        f"Это действие нельзя отменить.",
        parse_mode='HTML',
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def handle_confirm_delete(query, user_id, item_id):
    """Подтверждение удаления предмета."""
    if delete_wardrobe_item(item_id, user_id):
        await query.edit_message_text(
            "✅ Предмет удален из вашего гардероба.",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("💎 К гардеробу", callback_data="refresh_wardrobe")]])
        )
    else:
        await query.edit_message_text("Не удалось удалить предмет. Попробуйте позже.")

async def handle_refresh_wardrobe(query, user_id):
    """Обновление списка гардероба."""
    wardrobe_items = get_user_wardrobe(user_id, limit=10)
    if not wardrobe_items:
        await query.edit_message_text(
            "💎 <b>Ваш Гардероб пуст</b>\n\n"
            "Сохраните предметы одежды в Гардероб после получения консультации!",
            parse_mode='HTML'
        )
        return
    
    message = "💎 <b>Ваш Гардероб:</b>\n\n"
    keyboard = []
    for item in wardrobe_items:
        item_name = item.get('item_name') or "Без названия"
        item_tag = item.get('item_tag') or ""
        created_date = item.get('created_at', '')[:10]
        
        display_name = f"{item_name}"
        if item_tag:
            display_name += f" #{item_tag}"
            
        message += f"🔸 {display_name} (добавлено: {created_date})\n"
        
        keyboard.append([
            InlineKeyboardButton(f"👁️ {item_name[:15]}...", callback_data=f"view_item_{item['id']}"),
            InlineKeyboardButton("📝", callback_data=f"edit_item_{item['id']}"),
            InlineKeyboardButton("🗑️", callback_data=f"delete_item_{item['id']}")
        ])
    
    keyboard.append([
        InlineKeyboardButton("📊 Статистика", callback_data="wardrobe_stats"),
        InlineKeyboardButton("🔄 Обновить", callback_data="refresh_wardrobe")
    ])
    
    message += f"\n<i>Показано последних {len(wardrobe_items)} предметов</i>"
    await query.edit_message_text(message, parse_mode='HTML', reply_markup=InlineKeyboardMarkup(keyboard))

async def handle_wardrobe_stats(query, user_id):
    """Статистика гардероба."""
    stats = get_wardrobe_stats(user_id)
    await query.edit_message_text(
        f"📊 <b>Статистика вашего гардероба:</b>\n\n"
        f"👗 Всего предметов: {stats['total_items']}\n"
        f"📅 Добавлено за месяц: {stats['items_this_month']}\n",
        parse_mode='HTML',
        reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад к гардеробу", callback_data="refresh_wardrobe")]])
    ) 