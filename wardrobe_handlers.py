"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Обработчики Гардероба (wardrobe_handlers.py)
ВЕРСИЯ: 1.0.0
ДАТА СОЗДАНИЯ: 2025-05-23

Дополнительные обработчики команд для функции Гардероб
==========================================================================================
"""
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from database import get_wardrobe_item, update_wardrobe_item, get_user_wardrobe

# Настройка логирования
logger = logging.getLogger("MishuraWardrobe")

async def handle_name_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /name_ID новое_название для изменения названия предмета гардероба."""
    user_id = update.effective_user.id
    
    if not context.args or len(context.args) < 2:
        await update.message.reply_text(
            "Неверный формат команды. Используйте:\n"
            "/name_ID новое название предмета"
        )
        return
    
    try:
        # Извлекаем item_id из команды (например, /name_123 -> 123)
        command_text = update.message.text
        if not command_text.startswith('/name_'):
            return
            
        parts = command_text.split(' ', 1)
        if len(parts) < 2:
            await update.message.reply_text("Пожалуйста, укажите новое название предмета.")
            return
            
        item_id_str = parts[0][6:]  # Убираем '/name_'
        item_id = int(item_id_str)
        new_name = parts[1].strip()
        
        if len(new_name) > 100:
            await update.message.reply_text("Название слишком длинное (максимум 100 символов).")
            return
        
        # Проверяем, что предмет принадлежит пользователю
        item = get_wardrobe_item(item_id, user_id)
        if not item:
            await update.message.reply_text("Предмет не найден в вашем гардеробе.")
            return
        
        # Обновляем название
        if update_wardrobe_item(item_id, user_id, item_name=new_name):
            keyboard = [
                [InlineKeyboardButton("👁️ Посмотреть предмет", callback_data=f"view_item_{item_id}")],
                [InlineKeyboardButton("💎 К гардеробу", callback_data="refresh_wardrobe")]
            ]
            await update.message.reply_text(
                f"✅ Название предмета обновлено на: «{new_name}»",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
        else:
            await update.message.reply_text("Не удалось обновить название предмета.")
            
    except (ValueError, IndexError):
        await update.message.reply_text("Неверный формат команды.")
    except Exception as e:
        logger.error(f"Ошибка при обновлении названия предмета: {e}", exc_info=True)
        await update.message.reply_text("Произошла ошибка при обновлении названия.")

async def handle_tag_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /tag_ID новый_тег для изменения тега предмета гардероба."""
    user_id = update.effective_user.id
    
    try:
        command_text = update.message.text
        if not command_text.startswith('/tag_'):
            return
            
        parts = command_text.split(' ', 1)
        if len(parts) < 2:
            await update.message.reply_text("Пожалуйста, укажите новый тег предмета.")
            return
            
        item_id_str = parts[0][5:]  # Убираем '/tag_'
        item_id = int(item_id_str)
        new_tag = parts[1].strip().lower()
        
        if len(new_tag) > 50:
            await update.message.reply_text("Тег слишком длинный (максимум 50 символов).")
            return
        
        # Убираем # если пользователь его указал
        if new_tag.startswith('#'):
            new_tag = new_tag[1:]
        
        # Проверяем, что предмет принадлежит пользователю
        item = get_wardrobe_item(item_id, user_id)
        if not item:
            await update.message.reply_text("Предмет не найден в вашем гардеробе.")
            return
        
        # Обновляем тег
        if update_wardrobe_item(item_id, user_id, item_tag=new_tag):
            keyboard = [
                [InlineKeyboardButton("👁️ Посмотреть предмет", callback_data=f"view_item_{item_id}")],
                [InlineKeyboardButton("💎 К гардеробу", callback_data="refresh_wardrobe")]
            ]
            await update.message.reply_text(
                f"✅ Тег предмета обновлен на: #{new_tag}",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
        else:
            await update.message.reply_text("Не удалось обновить тег предмета.")
            
    except (ValueError, IndexError):
        await update.message.reply_text("Неверный формат команды.")
    except Exception as e:
        logger.error(f"Ошибка при обновлении тега предмета: {e}", exc_info=True)
        await update.message.reply_text("Произошла ошибка при обновлении тега.")

async def handle_wardrobe_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /wardrobe для быстрого доступа к гардеробу."""
    user_id = update.effective_user.id
    
    try:
        wardrobe_items = get_user_wardrobe(user_id, limit=10)
        if not wardrobe_items:
            await update.message.reply_html(
                "💎 <b>Ваш Гардероб пуст</b>\n\n"
                "Сохраните предметы одежды в Гардероб после получения консультации!"
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
        await update.message.reply_html(message, reply_markup=InlineKeyboardMarkup(keyboard))
        
    except Exception as e:
        logger.error(f"Ошибка при получении гардероба через команду: {e}", exc_info=True)
        await update.message.reply_text("Не удалось загрузить ваш гардероб. Попробуйте позже.") 