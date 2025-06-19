#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🎭 МИШУРА - API Сервер
FastAPI сервер для веб-приложения и интеграции с ЮKassa
"""

import os
import json
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Загружаем .env файл для локальной разработки
load_dotenv()

# ЮKassa
from yookassa import Configuration, Payment
import yookassa

# Локальные импорты
import database
import gemini_ai
from pricing_config import PRICING_PLANS, YOOKASSA_PLANS_CONFIG, get_plan_by_id, get_yookassa_config

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация с поддержкой разных названий переменных
TELEGRAM_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN') or os.getenv('TELEGRAM_TOKEN')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
WEBAPP_URL = os.getenv('WEBAPP_URL', 'http://localhost:8001')
PORT = int(os.getenv('PORT', os.getenv('BACKEND_PORT', 10000)))
HOST = os.getenv('HOST', '0.0.0.0')

# Режимы работы
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
TEST_MODE = os.getenv('TEST_MODE', 'True').lower() == 'true'  # По умолчанию включен

# ЮKassa конфигурация  
YOOKASSA_SHOP_ID = os.getenv('YOOKASSA_SHOP_ID')
YOOKASSA_SECRET_KEY = os.getenv('YOOKASSA_SECRET_KEY')

# Логирование конфигурации
logger.info(f"🔧 Конфигурация:")
logger.info(f"   ENVIRONMENT: {ENVIRONMENT}")
logger.info(f"   DEBUG: {DEBUG}")
logger.info(f"   TEST_MODE: {TEST_MODE}")
logger.info(f"   PORT: {PORT}")
logger.info(f"   TELEGRAM_TOKEN: {'установлен' if TELEGRAM_TOKEN else 'НЕ УСТАНОВЛЕН'}")
logger.info(f"   GEMINI_API_KEY: {'установлен' if GEMINI_API_KEY else 'НЕ УСТАНОВЛЕН'}")
logger.info(f"   YOOKASSA: {'настроена' if YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY else 'НЕ НАСТРОЕНА'}")

# Проверяем критически важные переменные
if not TELEGRAM_TOKEN:
    logger.error("❌ TELEGRAM_BOT_TOKEN не установлен!")
    
if not GEMINI_API_KEY:
    logger.error("❌ GEMINI_API_KEY не установлен!")
    
if not YOOKASSA_SHOP_ID or not YOOKASSA_SECRET_KEY:
    logger.error("❌ ЮKassa переменные не установлены!")

# В продакшн режиме TEST_MODE должен быть False для реальных платежей
# Но пока оставляем True для тестирования
if ENVIRONMENT == 'production':
    logger.warning(f"🏭 ПРОДАКШН режим, TEST_MODE: {TEST_MODE}")

# Создание FastAPI приложения
app = FastAPI(
    title="МИШУРА API",
    description="API для персонального ИИ-стилиста",
    version="2.5.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация сервисов
try:
    if YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY:
        from payment_service import PaymentService
        payment_service = PaymentService()
        logger.info("✅ Payment service инициализирован")
    else:
        logger.error("❌ ЮKassa не настроена - отсутствуют SHOP_ID или SECRET_KEY")
        payment_service = None
except Exception as e:
    logger.error(f"❌ Ошибка инициализации payment_service: {str(e)}")
    payment_service = None

if YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY:
    Configuration.account_id = YOOKASSA_SHOP_ID
    Configuration.secret_key = YOOKASSA_SECRET_KEY
    logger.info("ЮKassa configured successfully")
else:
    logger.warning("ЮKassa credentials not found")

# Статические файлы
app.mount("/webapp", StaticFiles(directory="webapp", html=True), name="webapp")

# ================================
# МОДЕЛИ ДАННЫХ
# ================================

class UserSyncRequest(BaseModel):
    user_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class ConsultationRequest(BaseModel):
    user_id: int
    occasion: str = "general"
    preferences: str = ""
    image_url: Optional[str] = None

class PaymentRequest(BaseModel):
    user_id: int
    plan_id: str
    return_url: Optional[str] = None

class BalanceUpdateRequest(BaseModel):
    user_id: int
    amount: int

# ================================
# ОСНОВНЫЕ ЭНДПОИНТЫ
# ================================

@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "service": "МИШУРА API",
        "version": "2.5.0",
        "status": "running",
        "features": ["styling_ai", "wardrobe", "payments", "pricing_plans"]
    }

@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    try:
        # Проверяем базу данных
        db_status = True  # Заглушка, database.check_connection() пока нет
        
        # Проверяем Gemini AI
        ai_status = await gemini_ai.test_gemini_connection()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "database": "ok" if db_status else "error",
                "gemini_ai": "ok" if ai_status else "error",
                "yookassa": "ok" if YOOKASSA_SHOP_ID else "not_configured"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.get("/api/v1/health")
async def health_check_v1():
    return await health_check()

# ================================
# ПОЛЬЗОВАТЕЛИ
# ================================

@app.post("/api/v1/users/sync")
async def sync_user_endpoint(request: Request):
    """Синхронизация пользователя"""
    try:
        data = await request.json()
        user_id = data.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Получаем или создаем пользователя
        user = database.get_user(user_id)
        is_new_user = user is None
        
        if is_new_user:
            # Создаем нового пользователя
            database.save_user(
                telegram_id=user_id,
                username=data.get("username"),
                first_name=data.get("first_name"),
                last_name=data.get("last_name")
            )
            # Начальный баланс для новых пользователей
            database.update_user_balance(user_id, 0)
        
        # Получаем актуальные данные
        balance = database.get_user_balance(user_id) or 0
        consultations_count = len(database.get_user_consultations(user_id, 1000))  # Получаем все консультации
        
        return {
            "user_id": user_id,
            "balance": balance,
            "is_new_user": is_new_user,
            "consultations_count": consultations_count,
            "status": "success",
            "telegram_synced": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing user: {str(e)}")
        raise HTTPException(status_code=500, detail="User sync failed")

@app.get("/api/v1/users/{user_id}/balance")
async def get_user_balance(user_id: int):
    """Получить баланс пользователя"""
    try:
        balance = database.get_user_balance(user_id) or 0
        return {
            "user_id": user_id,
            "balance": balance,
            "currency": "STcoin"
        }
    except Exception as e:
        logger.error(f"Error getting balance: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get balance")

@app.get("/api/v1/users/{telegram_id}/balance")
async def get_user_balance_endpoint(telegram_id: int):
    try:
        from database import get_user_balance, get_user_by_telegram_id
        
        # Проверяем существует ли пользователь
        user = get_user_by_telegram_id(telegram_id)
        if not user:
            logger.warning(f"🔍 Пользователь telegram_id={telegram_id} не найден, создаем...")
            
            # Создаем пользователя с базовыми данными
            from database import save_user
            user_id = save_user(
                telegram_id=telegram_id,
                username=f'user_{telegram_id}',
                first_name='User',
                last_name=''
            )
            logger.info(f"✅ Пользователь создан: user_id={user_id}")
        
        balance = get_user_balance(telegram_id)
        logger.info(f"💰 Баланс для telegram_id={telegram_id}: {balance}")
        
        return {
            "telegram_id": telegram_id,
            "balance": balance,
            "currency": "STcoin"
        }
        
    except Exception as e:
        logger.error(f"❌ Ошибка получения баланса для {telegram_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/users/{user_id}/balance")
async def update_user_balance(user_id: int, request: BalanceUpdateRequest):
    """Обновить баланс пользователя (админ)"""
    try:
        database.update_user_balance(user_id, request.amount)
        new_balance = database.get_user_balance(user_id)
        
        return {
            "user_id": user_id,
            "amount_changed": request.amount,
            "new_balance": new_balance,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error updating balance: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update balance")

# ================================
# ТАРИФНЫЕ ПЛАНЫ
# ================================

@app.get("/api/v1/pricing/plans")
async def get_pricing_plans():
    """Получить список всех тарифных планов"""
    try:
        plans_list = []
        
        for plan_id, plan in PRICING_PLANS.items():
            price_per_consultation = plan["price_rub"] / plan["consultations"]
            
            plans_list.append({
                "id": plan_id,
                "name": plan["name"],
                "description": plan["description"],
                "consultations": plan["consultations"],
                "stcoins": plan["stcoins"],
                "price_rub": plan["price_rub"],
                "price_per_consultation": round(price_per_consultation, 1),
                "discount": plan["discount"],
                "popular": plan["popular"],
                "temporary": plan["temporary"],
                "color": plan["color"]
            })
        
        return {
            "status": "success",
            "plans": plans_list,
            "currency": "RUB",
            "consultation_cost": 10  # STcoin за консультацию
        }
        
    except Exception as e:
        logger.error(f"Error getting pricing plans: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get pricing plans")

# ================================
# ПЛАТЕЖИ
# ================================

@app.post("/api/v1/payments/create")
async def create_payment_endpoint(request: Request):
    try:
        data = await request.json()
        telegram_id = data.get('telegram_id')
        plan_id = data.get('plan_id')
        
        logger.info(f"🔍 НАЧАЛО создания платежа:")
        logger.info(f"   telegram_id: {telegram_id}")
        logger.info(f"   plan_id: {plan_id}")
        logger.info(f"   TEST_MODE: {TEST_MODE}")
        logger.info(f"   payment_service: {'инициализирован' if payment_service else 'НЕ ИНИЦИАЛИЗИРОВАН'}")
        
        if not telegram_id or not plan_id:
            raise HTTPException(status_code=400, detail="Отсутствуют обязательные поля")
        
        if not payment_service:
            logger.error("❌ Payment service не инициализирован")
            raise HTTPException(status_code=500, detail="Платежная система недоступна")
        
        # КРИТИЧЕСКИ ВАЖНО: Создаем пользователя если его нет
        from database import save_user, get_user_by_telegram_id
        
        # Проверяем существует ли пользователь
        existing_user = get_user_by_telegram_id(telegram_id)
        logger.info(f"🔍 Проверка пользователя: {existing_user}")
        
        if not existing_user:
            # Создаем нового пользователя с базовыми данными
            try:
                user_id = save_user(
                    telegram_id=telegram_id,
                    username=data.get('username', f'user_{telegram_id}'),
                    first_name=data.get('first_name', 'User'),
                    last_name=data.get('last_name', '')
                )
                logger.info(f"✅ Создан новый пользователь: user_id={user_id}, telegram_id={telegram_id}")
                
                # Проверяем что пользователь действительно создался
                verify_user = get_user_by_telegram_id(telegram_id)
                logger.info(f"🔍 Верификация пользователя: {verify_user}")
                
            except Exception as user_error:
                logger.error(f"❌ Ошибка создания пользователя: {str(user_error)}")
                raise HTTPException(status_code=500, detail=f"Ошибка создания пользователя: {str(user_error)}")
        else:
            logger.info(f"✅ Пользователь уже существует: {existing_user}")
        
        # Получаем конфигурацию тарифа
        from pricing_config import PRICING_PLANS
        plan_config = PRICING_PLANS.get(plan_id)
        if not plan_config:
            logger.error(f"❌ Недопустимый план: {plan_id}")
            raise HTTPException(status_code=400, detail="Недопустимый план")
        
        logger.info(f"💎 Тарифный план: {plan_config}")
        
        # Создаем платеж
        try:
            payment_data = await payment_service.create_payment(
                amount=plan_config["price"],
                description=f"МИШУРА - {plan_config['name']}",
                telegram_id=telegram_id,
                plan_id=plan_id
            )
            logger.info(f"💳 Платеж создан: {payment_data}")
        except Exception as payment_error:
            logger.error(f"❌ Ошибка создания платежа: {str(payment_error)}")
            raise HTTPException(status_code=500, detail=f"Ошибка создания платежа: {str(payment_error)}")
        
        # В тестовом режиме автоматически завершаем платеж
        if TEST_MODE:
            payment_id = payment_data["payment_id"]
            logger.info(f"🧪 TEST MODE: автоматическое завершение платежа {payment_id}")
            
            try:
                # Обновляем статус платежа
                payment_service.update_payment_status(payment_id, "succeeded")
                logger.info(f"✅ Статус платежа обновлен на 'succeeded'")
                
                # Начисляем средства пользователю
                from database import update_user_balance, get_user_balance
                coins_to_add = plan_config["coins"]
                
                # Проверяем баланс ДО начисления
                balance_before = get_user_balance(telegram_id)
                logger.info(f"💰 Баланс ДО начисления: {balance_before}")
                
                update_user_balance(telegram_id, coins_to_add)
                
                # Проверяем баланс ПОСЛЕ начисления
                balance_after = get_user_balance(telegram_id)
                logger.info(f"💰 Баланс ПОСЛЕ начисления: {balance_after}")
                
                if balance_after > balance_before:
                    logger.info(f"✅ Баланс успешно обновлен: +{coins_to_add} STcoin для telegram_id={telegram_id}")
                else:
                    logger.error(f"❌ Баланс НЕ обновился! До: {balance_before}, После: {balance_after}")
                
            except Exception as balance_error:
                logger.error(f"❌ Ошибка в тестовом режиме: {str(balance_error)}")
                # Не прерываем выполнение, так как платеж уже создан
            
            logger.info(f"🧪 TEST MODE: платеж {payment_id} автоматически завершен, добавлено {coins_to_add} STcoin")
        
        plan_name = plan_config["name"]
        result_message = f"✅ Платеж создан: {payment_data['payment_id']} для пользователя {telegram_id}, план {plan_id} ({plan_name})"
        logger.info(result_message)
        
        return {
            **payment_data,
            "debug_info": {
                "test_mode": TEST_MODE,
                "user_created": not bool(existing_user),
                "plan_config": plan_config
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"❌ Общая ошибка создания платежа: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/api/v1/payments/webhook")
async def payment_webhook_endpoint(request: Request):
    """Webhook для обработки уведомлений от ЮKassa с новыми тарифами"""
    try:
        raw_body = await request.body()
        webhook_data = json.loads(raw_body.decode('utf-8'))
        
        payment_data = webhook_data.get('object', {})
        payment_id = payment_data.get('id')
        status = payment_data.get('status')
        
        if not payment_id:
            logger.error("No payment_id in webhook")
            return {"status": "error", "message": "No payment_id"}
        
        # Получаем платеж из базы
        payment_record = payment_service.get_payment(payment_id)
        if not payment_record:
            logger.error(f"Payment {payment_id} not found in database")
            return {"status": "error", "message": "Payment not found"}
        
        user_id = payment_record['user_id']
        plan_id = payment_record.get('plan_id')
        
        if status == 'succeeded':
            # Проверяем, не был ли платеж уже обработан
            if payment_record.get('status') == 'completed':
                logger.info(f"Payment {payment_id} already processed")
                return {"status": "ok", "message": "Already processed"}
            
            # Получаем конфигурацию плана
            if plan_id and plan_id in PRICING_PLANS:
                plan = PRICING_PLANS[plan_id]
                stcoins_to_add = plan["stcoins"]
                plan_name = plan["name"]
            else:
                # Fallback для совместимости
                stcoins_to_add = payment_record.get('stcoins_amount', 10)
                plan_name = "Пакет консультаций"
            
            # Начисляем STcoin
            database.update_user_balance(user_id, stcoins_to_add)
            
            # Обновляем статус платежа
            payment_service.update_payment_status(payment_id, 'completed')
            
            # Получаем обновленный баланс
            new_balance = database.get_user_balance(user_id)
            
            logger.info(f"Payment {payment_id} processed: +{stcoins_to_add} STcoin for user {user_id} (plan: {plan_name})")
            logger.info(f"User {user_id} new balance: {new_balance} STcoin")
            
            return {
                "status": "success",
                "message": "Payment processed",
                "plan_id": plan_id,
                "plan_name": plan_name,
                "stcoins_added": stcoins_to_add,
                "new_balance": new_balance
            }
            
        elif status == 'canceled':
            payment_service.update_payment_status(payment_id, 'canceled')
            logger.info(f"Payment {payment_id} canceled")
            return {"status": "ok", "message": "Payment canceled"}
        
        else:
            logger.info(f"Payment {payment_id} status: {status}")
            return {"status": "ok", "message": f"Status {status} received"}
            
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@app.get("/api/v1/payments/history")
async def get_payments_history(user_id: int):
    """Получает историю платежей пользователя"""
    try:
        logger.info(f"📋 Получение истории платежей для пользователя {user_id}")
        
        # Подключаемся к БД
        import database
        conn = database.get_connection()
        
        # Получаем все платежи пользователя
        payments = conn.execute("""
            SELECT 
                payment_id,
                amount,
                stcoins_amount,
                status,
                plan_id,
                created_at,
                updated_at
            FROM payments 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        """, (user_id,)).fetchall()
        
        conn.close()
        
        # Преобразуем в список словарей
        payments_list = []
        for payment in payments:
            payments_list.append({
                "payment_id": payment[0],
                "amount": payment[1],
                "stcoins_amount": payment[2],
                "status": payment[3],
                "plan_id": payment[4],
                "created_at": payment[5],
                "updated_at": payment[6]
            })
        
        logger.info(f"📊 Найдено {len(payments_list)} платежей для пользователя {user_id}")
        
        return payments_list
        
    except Exception as e:
        logger.error(f"❌ Ошибка получения истории платежей: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения истории: {str(e)}")

@app.post("/api/v1/payments/sync_all")
async def sync_all_payments(request: dict):
    """Синхронизирует все платежи пользователя с ЮKassa"""
    try:
        user_id = request.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id обязателен")
        
        logger.info(f"🔄 Синхронизация всех платежей для пользователя {user_id}")
        
        # ИСПРАВЛЕНИЕ: используем правильную функцию подключения к БД
        import database
        
        # Получаем все pending платежи пользователя
        conn = database.get_connection()
        pending_payments = conn.execute("""
            SELECT payment_id, amount, stcoins_amount, plan_id 
            FROM payments 
            WHERE user_id = ? AND status = 'pending'
            ORDER BY created_at DESC
        """, (user_id,)).fetchall()
        
        if not pending_payments:
            conn.close()
            logger.info(f"💰 Нет pending платежей для пользователя {user_id}")
            return {
                "success": True,
                "message": "Нет платежей для синхронизации",
                "synchronized": 0,
                "checked_payments": 0,
                "total_stcoins": 0
            }
        
        synchronized_count = 0
        total_stcoins = 0
        
        # Проверяем каждый pending платеж в ЮKassa
        for payment in pending_payments:
            payment_id = payment[0]
            stcoins_amount = payment[2]
            
            try:
                # ИСПРАВЛЕНИЕ: Правильная проверка ЮKassa
                from yookassa import Payment as YooPayment
                
                # Получаем информацию о платеже из ЮKassa
                yoo_payment = YooPayment.find_one(payment_id)
                
                logger.info(f"🔍 Проверка платежа {payment_id}: статус {yoo_payment.status}")
                
                if yoo_payment.status == 'succeeded':
                    # Платеж успешно завершен - обновляем статус
                    conn.execute("""
                        UPDATE payments 
                        SET status = 'completed', updated_at = datetime('now') 
                        WHERE payment_id = ?
                    """, (payment_id,))
                    
                    # Зачисляем STcoin пользователю
                    conn.execute("""
                        UPDATE users 
                        SET balance = balance + ?, updated_at = datetime('now')
                        WHERE telegram_id = ?
                    """, (stcoins_amount, user_id))
                    
                    synchronized_count += 1
                    total_stcoins += stcoins_amount
                    
                    logger.info(f"✅ Синхронизирован платеж {payment_id}: +{stcoins_amount} STcoin")
                    
                elif yoo_payment.status == 'waiting_for_capture':
                    # Платеж нужно подтвердить
                    try:
                        captured_payment = YooPayment.capture(payment_id)
                        if captured_payment.status == 'succeeded':
                            # Обновляем после подтверждения
                            conn.execute("""
                                UPDATE payments 
                                SET status = 'completed', updated_at = datetime('now') 
                                WHERE payment_id = ?
                            """, (payment_id,))
                            
                            conn.execute("""
                                UPDATE users 
                                SET balance = balance + ?, updated_at = datetime('now')
                                WHERE telegram_id = ?
                            """, (stcoins_amount, user_id))
                            
                            synchronized_count += 1
                            total_stcoins += stcoins_amount
                            
                            logger.info(f"✅ Подтвержден и синхронизирован платеж {payment_id}: +{stcoins_amount} STcoin")
                            
                    except Exception as capture_error:
                        logger.error(f"❌ Ошибка подтверждения платежа {payment_id}: {capture_error}")
                        
                else:
                    logger.info(f"ℹ️ Платеж {payment_id} в статусе {yoo_payment.status}, пропускаем")
                    
            except Exception as payment_error:
                logger.error(f"❌ Ошибка проверки платежа {payment_id}: {payment_error}")
                
                # ВРЕМЕННОЕ РЕШЕНИЕ: Если не можем проверить в ЮKassa, завершаем принудительно
                # (ТОЛЬКО для тестирования, в продакшне убрать!)
                if "test_" in payment_id:  # Только для тестовых платежей
                    logger.info(f"🧪 Тестовый платеж {payment_id}, завершаем принудительно")
                    
                    conn.execute("""
                        UPDATE payments 
                        SET status = 'completed', updated_at = datetime('now') 
                        WHERE payment_id = ?
                    """, (payment_id,))
                    
                    conn.execute("""
                        UPDATE users 
                        SET balance = balance + ?, updated_at = datetime('now')
                        WHERE telegram_id = ?
                    """, (stcoins_amount, user_id))
                    
                    synchronized_count += 1
                    total_stcoins += stcoins_amount
                    
                    logger.info(f"✅ Тестовый платеж завершен: +{stcoins_amount} STcoin")
                
                continue
        
        conn.commit()
        conn.close()
        
        # Возвращаем результат синхронизации
        result = {
            "success": True,
            "message": f"Синхронизировано {synchronized_count} платежей",
            "synchronized": synchronized_count,
            "total_stcoins": total_stcoins,
            "checked_payments": len(pending_payments)
        }
        
        logger.info(f"🎉 Синхронизация завершена: {result}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Ошибка синхронизации платежей: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка синхронизации: {str(e)}")

@app.get("/api/v1/payments/status/{payment_id}")
async def get_payment_status(payment_id: str):
    """Получить статус платежа"""
    try:
        payment_record = payment_service.get_payment(payment_id)
        if not payment_record:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Получаем информацию о плане
        plan_id = payment_record.get('plan_id')
        plan_info = {}
        if plan_id:
            plan = get_plan_by_id(plan_id)
            if plan:
                plan_info = {
                    "id": plan_id,
                    "name": plan["name"],
                    "consultations": plan["consultations"],
                    "stcoins": plan["stcoins"]
                }
        
        return {
            "payment_id": payment_id,
            "status": payment_record.get('status', 'unknown'),
            "amount": payment_record.get('amount'),
            "currency": payment_record.get('currency', 'RUB'),
            "user_id": payment_record.get('user_id'),
            "plan": plan_info,
            "created_at": payment_record.get('created_at')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting payment status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get payment status")

@app.get("/api/v1/users/{user_id}/payments")
async def get_user_payments(user_id: int, limit: int = 10):
    """Получить историю платежей пользователя"""
    try:
        # Получаем платежи из базы данных
        payments = payment_service.get_user_payments(user_id, limit)
        
        # Обогащаем данными о планах
        enriched_payments = []
        for payment in payments:
            plan_id = payment.get('plan_id')
            plan_info = {}
            
            if plan_id and plan_id in PRICING_PLANS:
                plan = PRICING_PLANS[plan_id]
                plan_info = {
                    "name": plan["name"],
                    "consultations": plan["consultations"]
                }
            
            enriched_payments.append({
                "payment_id": payment.get('payment_id'),
                "amount": payment.get('amount'),
                "currency": payment.get('currency', 'RUB'),
                "status": payment.get('status'),
                "plan_id": plan_id,
                "plan_name": plan_info.get('name', 'Неизвестный план'),
                "stcoins_reward": payment.get('stcoins_amount', 0),
                "created_at": payment.get('created_at'),
                "updated_at": payment.get('updated_at')
            })
        
        return {
            "user_id": user_id,
            "payments": enriched_payments,
            "total": len(enriched_payments)
        }
        
    except Exception as e:
        logger.error(f"Error getting user payments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get payments")

# ================================
# КОНСУЛЬТАЦИИ
# ================================

@app.post("/api/v1/consultations/analyze")
async def analyze_image_endpoint(request: Request):
    """Анализ изображения через Gemini AI"""
    try:
        data = await request.json()
        user_id = data.get("user_id")
        occasion = data.get("occasion", "general")
        preferences = data.get("preferences", "")
        image_data = data.get("image_data")  # base64
        
        if not user_id or not image_data:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Проверяем баланс
        balance = database.get_user_balance(user_id) or 0
        if balance < 10:
            raise HTTPException(status_code=402, detail="Insufficient balance")
        
        # Анализируем изображение
        import base64
        image_bytes = base64.b64decode(image_data)
        
        advice = await gemini_ai.analyze_clothing_image(
            image_data=image_bytes,
            occasion=occasion,
            preferences=preferences
        )
        
        # Списываем STcoin
        database.update_user_balance(user_id, -10)
        new_balance = database.get_user_balance(user_id)
        
        # Сохраняем консультацию
        consultation_id = database.save_consultation(
            user_id=user_id,
            occasion=occasion,
            preferences=preferences,
            image_path="webapp_upload",
            advice=advice
        )
        
        return {
            "consultation_id": consultation_id,
            "advice": advice,
            "cost": 10,
            "new_balance": new_balance,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.post("/api/v1/consultations/compare")
async def compare_images_endpoint(request: Request):
    """Сравнение нескольких изображений через Gemini AI"""
    try:
        data = await request.json()
        user_id = data.get("user_id")
        occasion = data.get("occasion", "general")
        preferences = data.get("preferences", "")
        images_data = data.get("images_data")  # list of base64 strings
        
        if not user_id or not images_data:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        if not isinstance(images_data, list) or len(images_data) < 2:
            raise HTTPException(status_code=400, detail="At least 2 images required for comparison")
        
        if len(images_data) > 4:
            raise HTTPException(status_code=400, detail="Maximum 4 images allowed")
        
        # Проверяем баланс
        balance = database.get_user_balance(user_id) or 0
        if balance < 10:
            raise HTTPException(status_code=402, detail="Insufficient balance")
        
        # Конвертируем base64 в bytes
        import base64
        image_bytes_list = []
        for image_data in images_data:
            try:
                image_bytes = base64.b64decode(image_data)
                image_bytes_list.append(image_bytes)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
        
        # Сравниваем изображения через Gemini AI
        advice = await gemini_ai.compare_clothing_images(
            image_data_list=image_bytes_list,
            occasion=occasion,
            preferences=preferences
        )
        
        # Списываем STcoin
        database.update_user_balance(user_id, -10)
        new_balance = database.get_user_balance(user_id)
        
        # Сохраняем консультацию
        consultation_id = database.save_consultation(
            user_id=user_id,
            occasion=occasion,
            preferences=preferences,
            image_path="webapp_compare_upload",
            advice=advice
        )
        
        return {
            "consultation_id": consultation_id,
            "advice": advice,
            "images_count": len(images_data),
            "cost": 10,
            "new_balance": new_balance,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing images: {str(e)}")
        raise HTTPException(status_code=500, detail="Comparison failed")

@app.get("/api/v1/consultations/{user_id}")
async def get_user_consultations(user_id: int, limit: int = 10):
    """Получить консультации пользователя"""
    try:
        consultations = database.get_user_consultations(user_id, limit)
        return {
            "user_id": user_id,
            "consultations": consultations,
            "total": len(consultations)
        }
    except Exception as e:
        logger.error(f"Error getting consultations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get consultations")

@app.get("/api/v1/consultations/{user_id}/{consultation_id}")
async def get_consultation(user_id: int, consultation_id: int):
    """Получить конкретную консультацию"""
    try:
        consultation = database.get_consultation(consultation_id, user_id)
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        return consultation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting consultation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get consultation")

# ================================
# ГАРДЕРОБ
# ================================

@app.get("/api/v1/wardrobe/{user_id}")
async def get_user_wardrobe(user_id: int, limit: int = 20):
    """Получить гардероб пользователя"""
    try:
        wardrobe = database.get_user_wardrobe(user_id, limit)
        return {
            "user_id": user_id,
            "wardrobe": wardrobe,
            "total": len(wardrobe)
        }
    except Exception as e:
        logger.error(f"Error getting wardrobe: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get wardrobe")

@app.post("/api/v1/wardrobe/{user_id}/add")
async def add_wardrobe_item(user_id: int, request: Request):
    """Добавить предмет в гардероб"""
    try:
        data = await request.json()
        file_id = data.get("file_id")
        item_name = data.get("item_name", "Предмет одежды")
        item_tag = data.get("item_tag", "новый")
        
        if not file_id:
            raise HTTPException(status_code=400, detail="file_id is required")
        
        wardrobe_id = database.save_wardrobe_item(
            user_id=user_id,
            telegram_file_id=file_id,
            item_name=item_name,
            item_tag=item_tag
        )
        
        return {
            "wardrobe_id": wardrobe_id,
            "item_name": item_name,
            "item_tag": item_tag,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding wardrobe item: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add item")

# ================================
# АДМИНКА
# ================================

@app.get("/api/v1/admin/stats")
async def get_admin_stats():
    """Получить статистику системы"""
    try:
        stats = database.get_stats()
        
        # Добавляем статистику по тарифам
        pricing_stats = []
        for plan_id, plan in PRICING_PLANS.items():
            pricing_stats.append({
                "plan_id": plan_id,
                "name": plan["name"],
                "price": plan["price_rub"],
                "consultations": plan["consultations"],
                "popular": plan["popular"],
                "temporary": plan["temporary"],
                # Здесь можно добавить реальную статистику продаж
                "sales_count": 0,
                "revenue": 0
            })
        
        return {
            "system_stats": stats,
            "pricing_stats": pricing_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting admin stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get stats")

# ================================
# ОТЛАДОЧНЫЕ ЭНДПОИНТЫ
# ================================

@app.post("/api/v1/debug/fix-database")
async def fix_database():
    """Пересоздать базу данных с правильной схемой"""
    try:
        import os
        from database import get_connection
        
        # Удаляем старую базу
        if os.path.exists("styleai.db"):
            os.remove("styleai.db")
            logger.info("Старая база данных удалена")
            
        # Создаем новую с правильной схемой
        conn = get_connection()
        cursor = conn.cursor()
        
        # Правильная схема без ошибок
        schema = """
        -- Таблица пользователей
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE NOT NULL,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            balance INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Таблица консультаций
        CREATE TABLE IF NOT EXISTS consultations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            occasion TEXT,
            preferences TEXT,
            image_path TEXT,
            advice TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(telegram_id)
        );

        -- Таблица гардероба
        CREATE TABLE IF NOT EXISTS wardrobe (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            telegram_file_id TEXT NOT NULL,
            item_name TEXT,
            item_tag TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(telegram_id)
        );

        -- Таблица платежей (БЕЗ ОШИБОК)
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_id TEXT UNIQUE NOT NULL,
            telegram_id INTEGER NOT NULL,
            plan_id TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            status TEXT DEFAULT 'pending',
            yookassa_payment_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
        );

        -- Индексы
        CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
        CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
        CREATE INDEX IF NOT EXISTS idx_wardrobe_user_id ON wardrobe(user_id);
        CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
        CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
        """
        
        cursor.executescript(schema)
        conn.commit()
        conn.close()
        
        logger.info("База данных пересоздана с правильной схемой")
        
        return {
            "success": True,
            "message": "База данных пересоздана с правильной схемой",
            "tables_created": ["users", "consultations", "wardrobe", "payments"]
        }
        
    except Exception as e:
        logger.error(f"Ошибка пересоздания базы данных: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/api/v1/debug/create-test-user-with-balance")
async def create_test_user_with_balance():
    """Создать тестового пользователя с балансом"""
    try:
        from database import save_user, update_user_balance, get_user_by_telegram_id
        
        test_telegram_id = 5930269100
        
        # Проверяем не существует ли уже
        existing_user = get_user_by_telegram_id(test_telegram_id)
        if existing_user:
            # Просто добавляем баланс
            update_user_balance(test_telegram_id, 1000)
            return {
                "success": True,
                "user_id": existing_user['id'],
                "telegram_id": test_telegram_id,
                "balance_added": 1000,
                "message": "Баланс тестового пользователя пополнен на 1000 STcoin",
                "existing_user": True
            }
        
        # Создаем нового пользователя
        user_id = save_user(
            telegram_id=test_telegram_id,
            username="test_webapp_user",
            first_name="Test",
            last_name="User"
        )
        
        # Добавляем баланс
        update_user_balance(test_telegram_id, 1000)
        
        return {
            "success": True,
            "user_id": user_id,
            "telegram_id": test_telegram_id,
            "balance": 1000,
            "message": "Тестовый пользователь создан с балансом 1000 STcoin",
            "existing_user": False
        }
        
    except Exception as e:
        logger.error(f"Ошибка создания тестового пользователя: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/debug", response_class=HTMLResponse)
async def debug_page():
    """Простая HTML страница для диагностики"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>МИШУРА - Отладка</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a1a; color: #fff; }
            .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 5px; cursor: pointer; }
            .btn:hover { background: #0056b3; }
            .result { background: #2d2d2d; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
            .success { border-left-color: #28a745; }
            .error { border-left-color: #dc3545; }
            h1 { color: #ffd700; }
            h2 { color: #17a2b8; margin-top: 30px; }
            pre { background: #000; padding: 10px; border-radius: 3px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <h1>🎭 МИШУРА - Панель отладки</h1>
        
        <h2>🔧 Быстрые исправления:</h2>
        <button class="btn" onclick="fixDatabase()">🔧 Исправить базу данных</button>
        <button class="btn" onclick="createTestUser()">👤 Создать тестового пользователя</button>
        <button class="btn" onclick="testPayment()">💳 Тест платежа</button>
        
        <h2>🔍 Диагностика:</h2>
        <button class="btn" onclick="checkHealth()">❤️ Проверить здоровье API</button>
        <button class="btn" onclick="checkBalance()">💰 Проверить баланс</button>
        
        <div id="result" class="result" style="display: none;"></div>
        
        <script>
            function showResult(data, isError = false) {
                const result = document.getElementById('result');
                result.style.display = 'block';
                result.className = 'result ' + (isError ? 'error' : 'success');
                result.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            }
            
            async function fixDatabase() {
                try {
                    const response = await fetch('/api/v1/debug/fix-database', { method: 'POST' });
                    const result = await response.json();
                    showResult(result, !result.success);
                } catch (error) {
                    showResult({error: error.message}, true);
                }
            }
            
            async function createTestUser() {
                try {
                    const response = await fetch('/api/v1/debug/create-test-user-with-balance', { method: 'POST' });
                    const result = await response.json();
                    showResult(result, !result.success);
                } catch (error) {
                    showResult({error: error.message}, true);
                }
            }
            
            async function testPayment() {
                try {
                    const testData = {
                        telegram_id: 5930269100,
                        plan_id: "basic",
                        username: "test_user",
                        first_name: "Test",
                        last_name: "User"
                    };
                    
                    const response = await fetch('/api/v1/payments/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(testData)
                    });
                    const result = await response.json();
                    showResult(result, !response.ok);
                } catch (error) {
                    showResult({error: error.message}, true);
                }
            }
            
            async function checkHealth() {
                try {
                    const response = await fetch('/api/v1/health');
                    const result = await response.json();
                    showResult(result, result.status !== 'healthy');
                } catch (error) {
                    showResult({error: error.message}, true);
                }
            }
            
            async function checkBalance() {
                try {
                    const response = await fetch('/api/v1/users/5930269100/balance');
                    const result = await response.json();
                    showResult(result);
                } catch (error) {
                    showResult({error: error.message}, true);
                }
            }
        </script>
    </body>
    </html>
    """

# ================================
# ЗАПУСК СЕРВЕРА
# ================================

if __name__ == "__main__":
    import uvicorn
    
    # Инициализация базы данных
    database.init_db()

# Запуск сервера
    port = int(os.getenv("PORT", 8000))
    
    logger.info(f"🎭 МИШУРА API Server starting on port {port}")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )