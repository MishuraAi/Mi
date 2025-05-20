"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Telegram Бот (bot.py)
ВЕРСИЯ: 0.3.2 (Улучшенное логирование, обработка URL, методологические комментарии)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

МЕТОДОЛОГИЯ РАБОТЫ И ОБНОВЛЕНИЯ КОДА:
1.  Целостность Обновлений: Любые изменения файлов предоставляются целиком.
    Частичные изменения кода не допускаются для обеспечения стабильности интеграции.
2.  Язык Коммуникации: Комментарии и документация ведутся на русском языке.
3.  Стандарт Качества: Данный код является частью проекта "МИШУРА", разработанного
    с применением высочайших стандартов программирования и дизайна, соответствуя
    уровню лучших мировых практик.

НАЗНАЧЕНИЕ ФАЙЛА:
Логика Telegram бота для взаимодействия с пользователями, управления командами,
предоставления доступа к веб-приложению (Mini App) и обработки базовых запросов.
==========================================================================================
"""
import os
import logging
from dotenv import load_dotenv
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
import random
from datetime import datetime

# Попытка импорта модулей проекта
try:
    import database as db
    from gemini_ai import analyze_clothing_file
except ImportError as e:
    logging.critical(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось импортировать модули database или gemini_ai для бота. {e}")
    # Для целей отладки, бот может попытаться запуститься, но функционал будет ограничен.
    # В production лучше завершить работу.
    db = None # type: ignore
    async def analyze_clothing_file(*args, **kwargs):
        logging.error("Функция analyze_clothing_file не доступна из-за ошибки импорта gemini_ai.")
        return "Ошибка сервера: ИИ-модуль не инициализирован."


# Настройка логирования для этого модуля
logger = logging.getLogger("MishuraBot") # Имя логгера для Бота
if not logger.handlers: # Предотвращение многократного добавления обработчиков
    logging.basicConfig( # Базовая конфигурация, если еще не установлена
        format="%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s",
        level=logging.INFO
    )
    # Можно добавить специфичный обработчик для логгера бота, если нужно
    # handler = logging.StreamHandler()
    # formatter = logging.Formatter('%(asctime)s - [%(levelname)s] - %(name)s - %(message)s')
    # handler.setFormatter(formatter)
    # logger.addHandler(handler)
    # logger.setLevel(logging.INFO)
    # logger.propagate = False # Чтобы не дублировать логи в root logger, если он тоже настроен

logger.info("Инициализация Telegram бота МИШУРА...")

# Загрузка переменных окружения
if load_dotenv():
    logger.info("Переменные окружения из .env файла успешно загружены для бота.")
else:
    logger.warning("Файл .env не найден или пуст для бота. Используются системные переменные окружения.")

TOKEN = os.getenv("TELEGRAM_TOKEN")
DEFAULT_WEBAPP_URL = "https://style-ai-bot.onrender.com/webapp" # URL по умолчанию, если не указан в .env
WEBAPP_URL_BASE = os.getenv("WEBAPP_URL", DEFAULT_WEBAPP_URL).rstrip('/')

if not TOKEN:
    logger.critical("КРИТИЧЕСКАЯ ОШИБКА: TELEGRAM_TOKEN не найден. Бот не сможет запуститься.")
    # В production здесь стоило бы завершить выполнение скрипта:
    # import sys
    # sys.exit("Ошибка: TELEGRAM_TOKEN не установлен.")

# Добавляем кэш-бастинг параметр к URL веб-приложения
WEBAPP_URL_WITH_CACHEBUST = f"{WEBAPP_URL_BASE}?v={random.randint(10000, 99999)}"
logger.info(f"Используемый URL веб-приложения (с cache-bust): {WEBAPP_URL_WITH_CACHEBUST}")

# Инициализация базы данных (если модуль db был успешно импортирован)
if db:
    try:
        if db.init_db(): # init_db должен возвращать True при успехе
            logger.info("База данных успешно инициализирована для бота.")
        else:
            logger.error("Ошибка при инициализации базы данных для бота (init_db вернул False).")
    except Exception as e_db_init:
        logger.critical(f"КРИТИЧЕСКАЯ ОШИБКА при вызове db.init_db(): {e_db_init}", exc_info=True)
else:
    logger.error("Модуль базы данных (db) не загружен. Функционал, связанный с БД, будет недоступен.")


# Обработчик команды /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    logger.info(f"Команда /start получена от пользователя ID: {user.id}, Username: {user.username}")
    
    if db:
        try:
            db.save_user(user.id, user.username, user.first_name, user.last_name)
            logger.info(f"Пользователь {user.id} сохранен/обновлен в БД.")
            balance = db.get_user_balance(user.id)
            balance_text = f"Ваш баланс: {balance} консультаций\n\n"
        except Exception as e_db_start:
            logger.error(f"Ошибка БД при обработке /start для пользователя {user.id}: {e_db_start}", exc_info=True)
            balance_text = "Не удалось получить информацию о балансе.\n\n"
    else:
        balance_text = "Функция баланса временно недоступна.\n\n"
        
    inline_keyboard = [
        [InlineKeyboardButton("🚀 Получить консультацию стилиста (МИШУРА)", web_app=WebAppInfo(url=WEBAPP_URL_WITH_CACHEBUST))]
    ]
    reply_markup_inline = InlineKeyboardMarkup(inline_keyboard)
    
    await update.message.reply_html(
        f"Привет, {user.mention_html()}! Я ваш персональный ИИ-стилист <b>МИШУРА</b>.\n\n"
        "Готова помочь вам создать неповторимый образ! "
        "Загрузите фото одежды через веб-приложение, и я дам профессиональные рекомендации по стилю.\n\n"
        f"{balance_text}"
        "Нажмите на кнопку ниже, чтобы открыть веб-приложение:",
        reply_markup=reply_markup_inline
    )
    
    await update.message.reply_text(
        "Также вы можете использовать команды или кнопки основного меню:",
        reply_markup=get_main_keyboard()
    )

def get_main_keyboard() -> ReplyKeyboardMarkup:
    keyboard = [
        [KeyboardButton("Мои консультации"), KeyboardButton("Пополнить баланс")],
        [KeyboardButton("О сервисе МИШУРА"), KeyboardButton("Поддержка")]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True, one_time_keyboard=False)

async def webapp_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.info(f"Команда /webapp получена от пользователя ID: {update.effective_user.id}")
    inline_keyboard = [
        [InlineKeyboardButton("🚀 Открыть веб-приложение МИШУРА", web_app=WebAppInfo(url=WEBAPP_URL_WITH_CACHEBUST))]
    ]
    await update.message.reply_text(
        "Нажмите на кнопку ниже, чтобы открыть веб-приложение стилиста МИШУРА:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard)
    )

async def text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = update.message.text
    user_id = update.effective_user.id
    logger.info(f"Текстовое сообщение '{text}' получено от пользователя ID: {user_id}")
    
    if text == "О сервисе МИШУРА":
        if db:
            try:
                stats = db.get_stats()
                stats_text = (
                    f"📊 <b>Статистика сервиса МИШУРА:</b>\n"
                    f"• Пользователей: {stats.get('total_users', 'N/A')}\n"
                    f"• Консультаций: {stats.get('total_consultations', 'N/A')}\n"
                    f"• За сегодня: {stats.get('daily_consultations', 'N/A')}"
                )
            except Exception as e_db_stats:
                logger.error(f"Ошибка БД при получении статистики: {e_db_stats}", exc_info=True)
                stats_text = "Не удалось загрузить статистику."
        else:
            stats_text = "Статистика временно недоступна."

        await update.message.reply_html(
            "🌟 <b>МИШУРА</b> - ваш персональный стилист на базе искусственного интеллекта.\n\n"
            "<b>Что я умею:</b>\n"
            "✓ Анализировать предметы одежды по фотографии\n"
            "✓ Давать рекомендации по сочетанию с другими вещами\n"
            "✓ Подбирать аксессуары и дополнения к образу\n"
            "✓ Советовать, подходит ли вещь для конкретного случая\n"
            "✓ Сравнивать несколько вещей и помогать с выбором\n\n"
            f"{stats_text}"
        )
    elif text == "Поддержка":
        await update.message.reply_text(
            "Возникли вопросы или предложения по работе ИИ-стилиста МИШУРА?\n"
            "Напишите нам: support@mishura-ai.style (вымышленный email)\n\n"
            "Мы всегда рады помочь и становиться лучше для вас!"
        )
    elif text == "Мои консультации":
        if not db:
            await update.message.reply_text("Сервис консультаций временно недоступен.")
            return
        try:
            consultations = db.get_user_consultations(user_id)
            if not consultations:
                await update.message.reply_text("У вас пока нет сохраненных консультаций от МИШУРЫ.")
                return
            
            message = "<b>Ваши последние консультации от МИШУРЫ:</b>\n\n"
            for c in consultations:
                try:
                    # Убедимся, что created_at это строка в формате ISO, если она из БД как строка
                    created_at_dt = datetime.fromisoformat(str(c['created_at']))
                    date_str = created_at_dt.strftime("%d.%m.%Y %H:%M")
                except ValueError:
                    date_str = str(c['created_at']) # Если формат неизвестен, выводим как есть
                message += f"🔹 {date_str} - {c.get('occasion', 'Не указан')} (ID: {c['id']})\n"
            
            message += "\nДля просмотра полной консультации отправьте команду `/consultation ID` (например, `/consultation 123`)."
            await update.message.reply_html(message)
        except Exception as e_db_consult:
            logger.error(f"Ошибка БД при получении консультаций для пользователя {user_id}: {e_db_consult}", exc_info=True)
            await update.message.reply_text("Не удалось загрузить ваши консультации. Попробуйте позже.")

    elif text == "Пополнить баланс":
        keyboard = [
            [InlineKeyboardButton("1 консультация - 299₽", callback_data="buy_1"), InlineKeyboardButton("3 консультации - 799₽ (выгода!)", callback_data="buy_3")],
            [InlineKeyboardButton("5 консультаций - 1299₽ (хит!)", callback_data="buy_5"), InlineKeyboardButton("10 консультаций - 2499₽ (максимум выгоды!)", callback_data="buy_10")]
        ]
        await update.message.reply_text(
            "Выберите пакет консультаций от МИШУРЫ:",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    else:
        # Если текст не распознан как команда из меню, предлагаем открыть WebApp
        inline_keyboard = [[InlineKeyboardButton("🚀 Получить консультацию от МИШУРЫ", web_app=WebAppInfo(url=WEBAPP_URL_WITH_CACHEBUST))]]
        await update.message.reply_text(
            "Для получения консультации от ИИ-стилиста МИШУРА, пожалуйста, загрузите фотографию одежды через наше веб-приложение "
            "или воспользуйтесь командами из меню.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard)
        )

async def photo_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    user_id = user.id
    logger.info(f"Получено фото от пользователя ID: {user_id}, Username: {user.username}")

    if not db:
        await update.message.reply_text("Обработка фото временно недоступна из-за проблем с базой данных.")
        return
        
    try:
        balance = db.get_user_balance(user_id)
        if balance <= 0:
            keyboard = [[InlineKeyboardButton("Пополнить баланс", callback_data="add_balance")]]
            await update.message.reply_text(
                "У вас недостаточно средств на балансе для получения консультации от МИШУРЫ.\n"
                "Пожалуйста, пополните баланс, чтобы продолжить.",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return
    except Exception as e_db_balance:
        logger.error(f"Ошибка БД при проверке баланса для пользователя {user_id} в photo_handler: {e_db_balance}", exc_info=True)
        await update.message.reply_text("Не удалось проверить ваш баланс. Попробуйте позже.")
        return

    try:
        photo_file = await update.message.photo[-1].get_file()
        
        # Создаем директорию для хранения фотографий, если она не существует
        # Важно: в production среде (например, Render) файловая система может быть эфемерной.
        # Рассмотрите использование облачного хранилища для фото.
        user_photos_dir = "user_photos"
        os.makedirs(user_photos_dir, exist_ok=True)
        
        file_name = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}.jpg" # Добавил микросекунды для большей уникальности
        file_path = os.path.join(user_photos_dir, file_name)
        
        await photo_file.download_to_drive(file_path)
        logger.info(f"Фото сохранено по пути: {file_path}")
        
        db.update_user_balance(user_id, -1) # Списываем одну консультацию
        
        processing_message = await update.message.reply_text("МИШУРА анализирует вашу одежду... Это займет несколько мгновений. ✨")
        
        # Анализ фото (повод по умолчанию, если не указан через WebApp)
        # Предпочтения здесь не передаются, т.к. это прямая загрузка фото боту
        advice = await analyze_clothing_file(file_path, "повседневный образ") # Используем await, т.к. analyze_clothing_file асинхронная
        
        if "Ошибка сервера" in advice: # Проверка, если AI модуль вернул ошибку
            logger.error(f"Ошибка от ИИ-модуля при анализе фото {file_path}: {advice}")
            await processing_message.edit_text(f"К сожалению, МИШУРА не смогла обработать ваше фото: {advice}")
            db.update_user_balance(user_id, 1) # Возвращаем консультацию при ошибке ИИ
            return
        
        consultation_id = db.save_consultation(user_id, "повседневный образ", "Не указаны (прямая загрузка)", file_path, advice)
        logger.info(f"Консультация #{consultation_id} сохранена для пользователя {user_id}.")
        
        await processing_message.delete()
        
        # Краткий ответ с первыми двумя абзацами для Telegram, полный - по команде
        summary_parts = advice.split("\n\n")
        short_summary = "\n\n".join(summary_parts[:2]) # Первые два "абзаца"
        
        new_balance = db.get_user_balance(user_id)
        await update.message.reply_html(
            f"<b>МИШУРА завершила анализ (ID: {consultation_id}):</b>\n\n"
            f"{short_summary}\n\n"
            f"Для полной консультации отправьте команду <code>/consultation {consultation_id}</code>\n\n"
            f"Ваш обновленный баланс: {new_balance} консультаций."
        )
    except Exception as e_photo:
        logger.error(f"Ошибка при обработке фото от пользователя {user_id}: {e_photo}", exc_info=True)
        await update.message.reply_text("Произошла неожиданная ошибка при обработке вашего фото. Попробуйте еще раз или обратитесь в поддержку.")
        # Опционально: вернуть списанную консультацию, если ошибка произошла до успешного анализа
        # if 'processing_message' in locals() and processing_message: # Если списание было, но анализ не завершился
        #     db.update_user_balance(user_id, 1)

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    user_id = query.from_user.id
    logger.info(f"Callback query '{query.data}' получен от пользователя ID: {user_id}")
    
    await query.answer("Обрабатываем ваш запрос...") # Ответ Telegram, что кнопка нажата
    
    if not db:
        await query.edit_message_text(text="Сервис оплаты временно недоступен из-за проблем с базой данных.")
        return

    try:
        if query.data.startswith("buy_"):
            num_consultations = int(query.data.split("_")[1])
            prices = {1: 299, 3: 799, 5: 1299, 10: 2499} # Цены в рублях
            amount_rub = prices.get(num_consultations)

            if amount_rub is None:
                logger.warning(f"Некорректный пакет консультаций: {query.data}")
                await query.edit_message_text("Выбран некорректный пакет. Пожалуйста, попробуйте еще раз.")
                return

            # Здесь должна быть логика интеграции с платежной системой Telegram (например, Telegram Payments)
            # Для демонстрации просто обновляем баланс и записываем "платеж"
            logger.info(f"Пользователь {user_id} 'покупает' {num_consultations} консультаций за {amount_rub}₽ (демо-режим).")
            db.update_user_balance(user_id, num_consultations)
            db.record_payment(user_id, amount_rub, "completed_demo") # Статус для демо
            
            new_balance = db.get_user_balance(user_id)
            await query.edit_message_text(
                f"✅ Спасибо за покупку!\n\n"
                f"Вы успешно приобрели {num_consultations} консультаций от МИШУРЫ за {amount_rub}₽.\n"
                f"Ваш текущий баланс: {new_balance} консультаций."
            )
        elif query.data == "add_balance":
            # Повторно показываем кнопки для пополнения, если пользователь нажал "Пополнить баланс" из сообщения о нехватке средств
            keyboard = [
                [InlineKeyboardButton("1 консультация - 299₽", callback_data="buy_1"), InlineKeyboardButton("3 консультации - 799₽", callback_data="buy_3")],
                [InlineKeyboardButton("5 консультаций - 1299₽", callback_data="buy_5"), InlineKeyboardButton("10 консультаций - 2499₽", callback_data="buy_10")]
            ]
            await query.edit_message_text(
                "Выберите пакет консультаций от МИШУРЫ:",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
        else:
            logger.warning(f"Неизвестный callback_data: {query.data}")
            await query.edit_message_text("Произошла ошибка при обработке вашего выбора.")

    except Exception as e_button:
        logger.error(f"Ошибка при обработке callback_query '{query.data}' от {user_id}: {e_button}", exc_info=True)
        try:
            await query.edit_message_text("К сожалению, произошла ошибка. Попробуйте позже.")
        except Exception as e_edit_fallback:
            logger.error(f"Не удалось даже отправить сообщение об ошибке в edit_message_text: {e_edit_fallback}")

async def get_consultation_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None: # Переименовал
    user_id = update.effective_user.id
    logger.info(f"Команда /consultation получена от пользователя ID: {user_id} с аргументами: {context.args}")

    if not db:
        await update.message.reply_text("Сервис консультаций временно недоступен.")
        return
        
    if not context.args:
        await update.message.reply_html(
            "Пожалуйста, укажите ID консультации после команды.\n"
            "Пример: <code>/consultation 123</code>"
        )
        return
    
    try:
        consultation_id = int(context.args[0])
    except ValueError:
        await update.message.reply_html("ID консультации должен быть числом. Пример: <code>/consultation 123</code>")
        return
    except Exception as e_args: # На случай других ошибок с context.args
        logger.warning(f"Ошибка при получении consultation_id из context.args: {e_args}", exc_info=True)
        await update.message.reply_text("Некорректный формат ID консультации.")
        return
        
    try:
        consultation = db.get_consultation(consultation_id, user_id) # Передаем user_id для проверки прав доступа
        
        if not consultation:
            await update.message.reply_text(f"Консультация с ID {consultation_id} не найдена или у вас нет к ней доступа.")
            return
        
        advice = consultation.get('advice', "Текст консультации отсутствует.")
        image_path = consultation.get('image_path')

        # Формируем сообщение
        response_message = f"<b>Консультация от МИШУРЫ #{consultation_id}:</b>\n\n{advice}"
        
        if image_path and os.path.exists(image_path):
            try:
                await update.message.reply_photo(photo=open(image_path, 'rb'), caption=response_message, parse_mode='HTML')
            except Exception as e_send_photo:
                logger.error(f"Не удалось отправить фото для консультации #{consultation_id}: {e_send_photo}")
                await update.message.reply_html(response_message + "\n\n(Не удалось загрузить изображение к этой консультации)")
        else:
            if image_path:
                 logger.warning(f"Файл изображения {image_path} для консультации #{consultation_id} не найден.")
            await update.message.reply_html(response_message)
            
    except Exception as e_get_consult:
        logger.error(f"Ошибка при получении консультации #{consultation_id} для пользователя {user_id}: {e_get_consult}", exc_info=True)
        await update.message.reply_text("Произошла ошибка при загрузке консультации. Пожалуйста, попробуйте позже.")

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    logger.info(f"Команда /help получена от пользователя ID: {user_id}")
    
    if db:
        try:
            balance = db.get_user_balance(user_id)
            balance_text = f"💰 Ваш текущий баланс: {balance} консультаций от МИШУРЫ."
        except Exception:
            balance_text = "Не удалось загрузить информацию о балансе."
    else:
        balance_text = "Информация о балансе временно недоступна."

    await update.message.reply_html(
        "🤖 <b>Справка по ИИ-Стилисту МИШУРА</b> 🤖\n\n"
        "Привет! Я МИШУРА, ваш личный ИИ-ассистент по стилю. Вот как со мной работать:\n\n"
        "1.  **Получить консультацию:**\n"
        "    * Нажмите кнопку «🚀 Получить консультацию стилиста» или отправьте команду /webapp, чтобы открыть веб-приложение.\n"
        "    * В веб-приложении вы можете загрузить фото одной вещи для детального анализа или несколько фото для сравнения.\n"
        "    * Также можно просто отправить мне фото в чат (в этом случае анализ будет по стандартным параметрам).\n\n"
        "2.  **Просмотр консультаций:**\n"
        "    * Используйте кнопку «Мои консультации» в меню или команду <code>/consultation ID</code> для просмотра полной версии ранее полученного совета.\n\n"
        "3.  **Баланс:**\n"
        "    * Каждая консультация списывает одну единицу с вашего баланса.\n"
        "    * Пополнить баланс можно через соответствующую кнопку в меню.\n\n"
        "📋 <b>Доступные команды:</b>\n"
        "•  /start - Начать работу с МИШУРОЙ / обновить меню\n"
        "•  /help - Эта справка\n"
        "•  /webapp - Открыть веб-приложение для консультации\n"
        "•  <code>/consultation &lt;ID&gt;</code> - Получить полный текст консультации по её номеру\n\n"
        f"{balance_text}\n\n"
        "Если возникнут вопросы, используйте кнопку «Поддержка» в меню."
    )

def main() -> None:
    """Основная функция запуска Telegram бота МИШУРА."""
    if not TOKEN:
        logger.critical("Запуск бота невозможен: TELEGRAM_TOKEN не установлен.")
        return

    logger.info("Создание экземпляра приложения Telegram бота...")
    try:
        application = Application.builder().token(TOKEN).build()
    except Exception as e_app_build:
        logger.critical(f"Не удалось создать приложение бота: {e_app_build}", exc_info=True)
        return

    logger.info("Добавление обработчиков команд и сообщений...")
    # Команды
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("webapp", webapp_command))
    application.add_handler(CommandHandler("consultation", get_consultation_command)) # Обновленное имя функции
    
    # Текстовые сообщения (должен идти после CommandHandlers, чтобы не перехватывать команды)
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_handler))
    
    # Фотографии
    application.add_handler(MessageHandler(filters.PHOTO, photo_handler))
    
    # Callback_query от инлайн-кнопок (например, для оплаты)
    application.add_handler(CallbackQueryHandler(button_handler))

    logger.info("Все обработчики добавлены. Запуск бота в режиме polling...")
    try:
        application.run_polling()
        logger.info("Бот МИШУРА успешно запущен и работает.")
    except Exception as e_run_polling:
        logger.critical(f"Ошибка при запуске бота в режиме polling: {e_run_polling}", exc_info=True)

if __name__ == "__main__":
    main()