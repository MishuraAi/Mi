import os
import logging
from dotenv import load_dotenv
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Загрузка переменных окружения
load_dotenv()
TOKEN = os.getenv("TELEGRAM_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-webapp-url.com")

# Настройка логирования
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Обработчик команды /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    await update.message.reply_html(
        f"Привет, {user.mention_html()}! Я ИИ-стилист <b>Стиль AI</b>.\n\n"
        f"Загрузите фото одежды, и я дам профессиональные рекомендации по стилю.",
        reply_markup=get_main_keyboard()
    )

# Клавиатура с кнопками
def get_main_keyboard():
    keyboard = [
        [KeyboardButton("Получить консультацию", web_app=WebAppInfo(url=WEBAPP_URL))],
        [KeyboardButton("О сервисе"), KeyboardButton("Поддержка")]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

# Обработчик текстовых сообщений
async def text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = update.message.text
    
    if text == "О сервисе":
        await update.message.reply_text(
            "🌟 <b>Стиль AI</b> - ваш персональный стилист на базе искусственного интеллекта.\n\n"
            "Что я умею:\n"
            "• Анализировать предметы одежды по фотографии\n"
            "• Давать рекомендации по сочетанию с другими вещами\n"
            "• Подбирать аксессуары и дополнения к образу\n"
            "• Советовать, подходит ли вещь для конкретного случая\n\n"
            "Для получения консультации, загрузите фотографию или воспользуйтесь кнопкой «Получить консультацию»",
            parse_mode="HTML"
        )
    elif text == "Поддержка":
        await update.message.reply_text(
            "Если у вас возникли вопросы или проблемы, напишите нам на почту:\n"
            "support@example.com\n\n"
            "Мы постараемся ответить в течение 24 часов."
        )
    else:
        await update.message.reply_text(
            "Для получения консультации, пожалуйста, загрузите фотографию одежды или нажмите кнопку «Получить консультацию»."
        )

# Обработчик фотографий
async def photo_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Получаем файл с наилучшим качеством
    photo_file = await update.message.photo[-1].get_file()
    
    # Временно просто сообщаем о получении фото
    await update.message.reply_text(
        "Я получил вашу фотографию! На данный момент я нахожусь в режиме разработки. "
        "Скоро я смогу анализировать одежду и давать профессиональные рекомендации по стилю."
    )

# Обработчик команды /help
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "📱 <b>Как пользоваться ботом:</b>\n\n"
        "1. Для получения консультации загрузите фотографию одежды или нажмите кнопку «Получить консультацию»\n"
        "2. Выберите повод, для которого вы подбираете одежду\n"
        "3. Дождитесь результата анализа\n\n"
        "📋 <b>Доступные команды:</b>\n"
        "/start - начать работу с ботом\n"
        "/help - получить справку по использованию бота",
        parse_mode="HTML"
    )

# Основная функция
def main() -> None:
    # Создаем приложение
    application = Application.builder().token(TOKEN).build()

    # Добавляем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_handler))
    application.add_handler(MessageHandler(filters.PHOTO, photo_handler))

    # Запускаем бота
    application.run_polling()

if __name__ == "__main__":
    main()