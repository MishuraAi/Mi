import os
import logging
from dotenv import load_dotenv

# Сбрасываем системную переменную если она существует
if "TELEGRAM_TOKEN" in os.environ:
    del os.environ["TELEGRAM_TOKEN"]

# Загружаем переменные из .env с принудительной перезаписью
load_dotenv(override=True)

# Путь к файлу .env
env_path = os.path.join(os.getcwd(), '.env')

# Явно читаем значение из файла
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('TELEGRAM_TOKEN='):
            TOKEN = line.strip().split('=', 1)[1]
            break

print(f"Используемый токен: {TOKEN}")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-webapp-url.com")

# Настройка логирования
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

from telegram import Update, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
import database as db
from datetime import datetime

# Инициализация базы данных
db.init_db()

# Обработчик команды /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    
    # Сохраняем пользователя в базу данных
    db.save_user(
        user.id, 
        user.username, 
        user.first_name, 
        user.last_name
    )
    
    # Получаем баланс пользователя
    balance = db.get_user_balance(user.id)
    
    await update.message.reply_html(
        f"Привет, {user.mention_html()}! Я ИИ-стилист <b>Стиль AI</b>.\n\n"
        f"Загрузите фото одежды, и я дам профессиональные рекомендации по стилю.\n\n"
        f"Ваш баланс: {balance} консультаций",
        reply_markup=get_main_keyboard()
    )

# Клавиатура с кнопками
def get_main_keyboard():
    keyboard = [
        [KeyboardButton("Получить консультацию", web_app=WebAppInfo(url=WEBAPP_URL))],
        [KeyboardButton("Мои консультации"), KeyboardButton("Пополнить баланс")],
        [KeyboardButton("О сервисе"), KeyboardButton("Поддержка")]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

# Обработчик текстовых сообщений
async def text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = update.message.text
    user_id = update.effective_user.id
    
    if text == "О сервисе":
        stats = db.get_stats()
        await update.message.reply_html(
            "🌟 <b>Стиль AI</b> - ваш персональный стилист на базе искусственного интеллекта.\n\n"
            "Что я умею:\n"
            "• Анализировать предметы одежды по фотографии\n"
            "• Давать рекомендации по сочетанию с другими вещами\n"
            "• Подбирать аксессуары и дополнения к образу\n"
            "• Советовать, подходит ли вещь для конкретного случая\n\n"
            f"📊 <b>Статистика:</b>\n"
            f"• Пользователей: {stats['total_users']}\n"
            f"• Консультаций: {stats['total_consultations']}\n"
            f"• За сегодня: {stats['daily_consultations']}"
        )
    elif text == "Поддержка":
        await update.message.reply_text(
            "Если у вас возникли вопросы или проблемы, напишите нам на почту:\n"
            "support@example.com\n\n"
            "Мы постараемся ответить в течение 24 часов."
        )
    elif text == "Мои консультации":
        consultations = db.get_user_consultations(user_id)
        
        if not consultations:
            await update.message.reply_text("У вас пока нет консультаций.")
            return
        
        message = "Ваши последние консультации:\n\n"
        for c in consultations:
            date = datetime.fromisoformat(c['created_at']).strftime("%d.%m.%Y %H:%M")
            message += f"🔹 {date} - {c['occasion']} (ID: {c['id']})\n"
        
        message += "\nДля просмотра полной консультации отправьте команду /consultation ID"
        
        await update.message.reply_text(message)
    elif text == "Пополнить баланс":
        # Создаем инлайн-клавиатуру для выбора пакета консультаций
        keyboard = [
            [
                InlineKeyboardButton("1 консультация - 299₽", callback_data="buy_1"),
                InlineKeyboardButton("3 консультации - 799₽", callback_data="buy_3")
            ],
            [
                InlineKeyboardButton("5 консультаций - 1299₽", callback_data="buy_5"),
                InlineKeyboardButton("10 консультаций - 2499₽", callback_data="buy_10")
            ]
        ]
        
        await update.message.reply_text(
            "Выберите пакет консультаций:",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    else:
        await update.message.reply_text(
            "Для получения консультации, пожалуйста, загрузите фотографию одежды или нажмите кнопку «Получить консультацию»."
        )

# Обработчик фотографий
async def photo_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    balance = db.get_user_balance(user_id)
    
    # Проверяем баланс пользователя
    if balance <= 0:
        keyboard = [
            [InlineKeyboardButton("Пополнить баланс", callback_data="add_balance")]
        ]
        
        await update.message.reply_text(
            "У вас недостаточно средств на балансе для получения консультации.\n"
            "Пожалуйста, пополните баланс.",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        return
    
    # Получаем файл с наилучшим качеством
    photo_file = await update.message.photo[-1].get_file()
    
    # Создаем директорию для хранения фотографий, если она не существует
    os.makedirs("user_photos", exist_ok=True)
    
    # Формируем путь к файлу
    file_path = f"user_photos/{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.jpg"
    
    # Скачиваем фото
    await photo_file.download_to_drive(file_path)
    
    # Уменьшаем баланс пользователя
    db.update_user_balance(user_id, -1)
    
    # Временная заглушка для демонстрации
    advice = """
    # Анализ вашей одежды

    ## Описание
    На изображении представлена классическая белая блуза с V-образным вырезом и длинными рукавами. Материал выглядит как легкий хлопок или шелковая смесь.

    ## Рекомендации по сочетанию
    - **Для работы/офиса**: Сочетайте с классическими брюками или юбкой-карандаш темно-синего или черного цвета.
    - **Для повседневного образа**: Подойдут джинсы или цветные брюки, можно заправить блузу или оставить навыпуск.
    - **Для вечернего выхода**: Комбинируйте с элегантной юбкой миди или узкими брюками и добавьте яркие аксессуары.

    ## Советы по аксессуарам
    - Добавьте ожерелье средней длины, которое будет хорошо смотреться с V-образным вырезом
    - Элегантные серьги подчеркнут образ
    - Для придания образу цвета можно использовать яркий шарф или платок
    """
    
    # Сохраняем консультацию в базу данных
    consultation_id = db.save_consultation(
        user_id, 
        "Не указан", 
        "Не указаны", 
        file_path, 
        advice
    )
    
    # Отправляем ответ пользователю
    await update.message.reply_text(
        f"Анализ вашей одежды (ID: {consultation_id}):\n\n"
        f"Это белая блуза с V-образным вырезом. Отличный базовый элемент гардероба!\n\n"
        f"Рекомендации:\n"
        f"- Для работы: сочетайте с классическими брюками\n"
        f"- Для отдыха: подойдут джинсы или цветные брюки\n"
        f"- Аксессуары: добавьте ожерелье средней длины\n\n"
        f"Для полной консультации отправьте /consultation {consultation_id}\n\n"
        f"Ваш баланс: {db.get_user_balance(user_id)} консультаций"
    )

# Обработчик callback_query для оплаты
async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    user_id = query.from_user.id
    
    # Отправляем сообщение о загрузке
    await query.answer("Обрабатываем запрос...")
    
    # Обрабатываем разные типы callback_data
    if query.data.startswith("buy_"):
        amount = int(query.data.split("_")[1])
        prices = {1: 299, 3: 799, 5: 1299, 10: 2499}
        price = prices.get(amount, 299)
        
        # В реальном приложении здесь должна быть интеграция с платежным API Telegram
        # Сейчас просто добавляем консультации пользователю для демонстрации
        db.update_user_balance(user_id, amount)
        db.record_payment(user_id, price, "completed")
        
        await query.edit_message_text(
            f"✅ Спасибо за покупку!\n\n"
            f"Вы приобрели {amount} консультаций за {price}₽\n"
            f"Ваш текущий баланс: {db.get_user_balance(user_id)} консультаций"
        )
    elif query.data == "add_balance":
        # Перенаправляем на экран пополнения баланса
        keyboard = [
            [
                InlineKeyboardButton("1 консультация - 299₽", callback_data="buy_1"),
                InlineKeyboardButton("3 консультации - 799₽", callback_data="buy_3")
            ],
            [
                InlineKeyboardButton("5 консультаций - 1299₽", callback_data="buy_5"),
                InlineKeyboardButton("10 консультаций - 2499₽", callback_data="buy_10")
            ]
        ]
        
        await query.edit_message_text(
            "Выберите пакет консультаций:",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

# Обработчик команды /consultation
async def get_consultation(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text(
            "Пожалуйста, укажите ID консультации:\n/consultation ID"
        )
        return
    
    try:
        consultation_id = int(context.args[0])
        user_id = update.effective_user.id
        
        # Получаем данные консультации
        consultation = db.get_consultation(consultation_id, user_id)
        
        if not consultation:
            await update.message.reply_text("Консультация не найдена или у вас нет доступа к ней.")
            return
        
        advice = consultation['advice']
        await update.message.reply_text(f"Консультация #{consultation_id}:\n\n{advice}")
        
    except ValueError:
        await update.message.reply_text("Неверный формат ID. Пожалуйста, укажите числовой ID.")
    except Exception as e:
        logger.error(f"Error: {e}")
        await update.message.reply_text("Произошла ошибка при получении консультации.")

# Обработчик команды /help
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    balance = db.get_user_balance(user_id)
    
    await update.message.reply_html(
        "📱 <b>Как пользоваться ботом:</b>\n\n"
        "1. Для получения консультации загрузите фотографию одежды или нажмите кнопку «Получить консультацию»\n"
        "2. Выберите повод, для которого вы подбираете одежду\n"
        "3. Дождитесь результата анализа\n\n"
        "📋 <b>Доступные команды:</b>\n"
        "/start - начать работу с ботом\n"
        "/help - получить справку по использованию бота\n"
        "/consultation ID - получить полный текст консультации\n\n"
        f"💰 Ваш текущий баланс: {balance} консультаций"
    )

# Основная функция
def main() -> None:
    # Создаем приложение
    application = Application.builder().token(TOKEN).build()

    # Добавляем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("consultation", get_consultation))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_handler))
    application.add_handler(MessageHandler(filters.PHOTO, photo_handler))
    application.add_handler(CallbackQueryHandler(button_handler))

    # Запускаем бота
    application.run_polling()

if __name__ == "__main__":
    main()