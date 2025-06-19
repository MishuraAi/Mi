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

# ЮKassa
from yookassa import Configuration, Payment
import yookassa

# Локальные импорты
import database
import gemini_ai
import payment_service
from pricing_config import PRICING_PLANS, YOOKASSA_PLANS_CONFIG, get_plan_by_id, get_yookassa_config

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Конфигурация ЮKassa
YOOKASSA_SHOP_ID = os.getenv('YOOKASSA_SHOP_ID')
YOOKASSA_SECRET_KEY = os.getenv('YOOKASSA_SECRET_KEY')

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
    """Создание платежа с новыми тарифными планами"""
    try:
        data = await request.json()
        user_id = data.get("user_id")
        plan_id = data.get("plan_id")
        return_url = data.get("return_url", "https://t.me/your_bot_name")
        
        if not user_id or not plan_id:
            raise HTTPException(status_code=400, detail="Missing user_id or plan_id")
        
        # Проверяем существование плана
        plan = get_plan_by_id(plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="Invalid plan_id")
        
        yookassa_config = get_yookassa_config(plan_id)
        if not yookassa_config:
            raise HTTPException(status_code=400, detail="YooKassa config not found")
        
        # Создаем платеж в ЮKassa
        payment = Payment.create({
            "amount": yookassa_config["amount"],
            "currency": "RUB",
            "description": yookassa_config["description"],
            "confirmation": {
                "type": "redirect",
                "return_url": return_url
            },
            "capture": True,
            "metadata": {
                "user_id": str(user_id),
                "plan_id": plan_id,
                "stcoins_reward": str(yookassa_config["stcoins_reward"]),
                "consultations_count": str(plan["consultations"])
            }
        })
        
        # Сохраняем платеж в базу
        payment_service.save_payment(
            payment_id=payment.id,
            user_id=user_id,
            amount=float(yookassa_config["amount"]["value"]),
            currency="RUB",
            status="pending",
            plan_id=plan_id,
            stcoins_amount=yookassa_config["stcoins_reward"]
        )
        
        # ДЛЯ ТЕСТОВОГО РЕЖИМА: автоматически завершаем платеж
        if YOOKASSA_SECRET_KEY and YOOKASSA_SECRET_KEY.startswith('test_'):
            # Это тестовый режим - сразу зачисляем STcoin
            database.update_user_balance(user_id, yookassa_config["stcoins_reward"])
            payment_service.update_payment_status(payment.id, 'completed')
            logger.info(f"🧪 TEST MODE: Auto-completed payment {payment.id}, added {yookassa_config['stcoins_reward']} STcoin")
        
        logger.info(f"Created payment {payment.id} for user {user_id}, plan {plan_id} ({plan['name']})")
        
        return {
            "payment_id": payment.id,
            "payment_url": payment.confirmation.confirmation_url,
            "amount": yookassa_config["amount"]["value"],
            "plan": {
                "id": plan_id,
                "name": plan["name"],
                "consultations": plan["consultations"],
                "stcoins": plan["stcoins"],
                "price": plan["price_rub"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment creation failed")

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