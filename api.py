# 🔄 ПОЛНАЯ ЗАМЕНА api.py - добавлены endpoints консультаций

import os
import uuid
import logging
import base64
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
import uvicorn
from pydantic import BaseModel

# Импорты проекта
from database import MishuraDB
from gemini_ai import MishuraGeminiAI
from payment_service import PaymentService

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s'
)
logger = logging.getLogger(__name__)

# Инициализация FastAPI
app = FastAPI(title="🎭 МИШУРА API", version="2.6.1")

# Глобальные переменные
db = None
gemini_ai = None
payment_service = None

# Конфигурация
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
TEST_MODE = os.getenv('TEST_MODE', 'false').lower() == 'true'
PORT = int(os.getenv('PORT', 8001))
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
YOOKASSA_SHOP_ID = os.getenv('YOOKASSA_SHOP_ID')
YOOKASSA_SECRET_KEY = os.getenv('YOOKASSA_SECRET_KEY')

logger.info("🔧 Конфигурация:")
logger.info(f"   ENVIRONMENT: {ENVIRONMENT}")
logger.info(f"   DEBUG: {DEBUG}")
logger.info(f"   TEST_MODE: {TEST_MODE}")
logger.info(f"   PORT: {PORT}")
logger.info(f"   TELEGRAM_TOKEN: {'установлен' if TELEGRAM_TOKEN else '❌ НЕ УСТАНОВЛЕН'}")
logger.info(f"   GEMINI_API_KEY: {'установлен' if GEMINI_API_KEY else '❌ НЕ УСТАНОВЛЕН'}")
logger.info(f"   YOOKASSA: {'настроена' if YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY else '❌ НЕ НАСТРОЕНА'}")

# Проверка критических настроек
if ENVIRONMENT == 'production':
    if not TELEGRAM_TOKEN:
        raise ValueError("❌ TELEGRAM_TOKEN обязателен в продакшн режиме")
    if not GEMINI_API_KEY:
        raise ValueError("❌ GEMINI_API_KEY обязателен в продакшн режиме")
    if not YOOKASSA_SHOP_ID or not YOOKASSA_SECRET_KEY:
        raise ValueError("❌ ЮKassa настройки обязательны в продакшн режиме")

if TEST_MODE:
    logger.warning("🧪 ТЕСТОВЫЙ режим, TEST_MODE: True")
else:
    logger.warning("🏭 ПРОДАКШН режим, TEST_MODE: False")

# Модели данных
class PaymentRequest(BaseModel):
    telegram_id: int
    plan_id: str

class PaymentWebhookData(BaseModel):
    event: str
    object: dict

# Инициализация компонентов
try:
    db = MishuraDB()
    logger.info("✅ Database инициализирована")
    
    gemini_ai = MishuraGeminiAI()
    logger.info("✅ Gemini AI инициализирован")
    
    if YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY:
        payment_service = PaymentService(
            shop_id=YOOKASSA_SHOP_ID,
            secret_key=YOOKASSA_SECRET_KEY,
            db=db,
            test_mode=TEST_MODE
        )
        logger.info("✅ Payment service инициализирован")
    else:
        logger.warning("⚠️ Payment service НЕ ИНИЦИАЛИЗИРОВАН - отсутствуют настройки ЮKassa")
        payment_service = None

except Exception as e:
    logger.error(f"❌ Ошибка инициализации: {e}")
    raise

if payment_service:
    logger.info("ЮKassa configured successfully")
else:
    logger.warning("ЮKassa not configured - payments disabled")

# Статические файлы
app.mount("/static", StaticFiles(directory="webapp"), name="static")

# Тарифные планы
PRICING_PLANS = {
    "basic": {
        "name": "🌟 Базовый",
        "description": "Отличный старт для регулярных консультаций",
        "consultations": 10,
        "stcoins": 100,
        "coins": 100,
        "price": 150.0,
        "price_rub": 150,
        "price_kop": 15000,
        "discount": 25,
        "popular": False,
        "temporary": False,
        "color": "🔵"
    },
    "premium": {
        "name": "💎 Премиум",
        "description": "Для настоящих ценителей стиля",
        "consultations": 25,
        "stcoins": 250,
        "coins": 250,
        "price": 300.0,
        "price_rub": 300,
        "price_kop": 30000,
        "discount": 40,
        "popular": True,
        "temporary": False,
        "color": "🟣"
    },
    "vip": {
        "name": "👑 VIP",
        "description": "Максимум возможностей для идеального стиля",
        "consultations": 50,
        "stcoins": 500,
        "coins": 500,
        "price": 500.0,
        "price_rub": 500,
        "price_kop": 50000,
        "discount": 50,
        "popular": False,
        "temporary": False,
        "color": "🟡"
    }
}

# === API ENDPOINTS ===

@app.get("/")
async def home():
    """Главная страница"""
    with open("webapp/index.html", "r", encoding="utf-8") as f:
        content = f.read()
    return HTMLResponse(content=content)

@app.get("/webapp")
async def webapp_redirect():
    """Редирект веб-приложения с поддержкой параметров"""
    return RedirectResponse(url="/", status_code=307)

@app.get("/api/v1/health")
async def health_check():
    """Проверка состояния API"""
    try:
        # Тест Gemini AI
        gemini_status = await gemini_ai.test_gemini_connection()
        
        health_data = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "database": "healthy",
                "gemini_ai": "healthy" if gemini_status else "unhealthy",
                "payments": "healthy" if payment_service else "disabled"
            },
            "version": "2.6.1",
            "environment": ENVIRONMENT
        }
        
        if not gemini_status:
            health_data["status"] = "degraded"
            
        return health_data
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
        )

@app.get("/api/v1/users/{telegram_id}/balance")
async def get_user_balance(telegram_id: int):
    """Получение баланса пользователя"""
    try:
        balance = db.get_user_balance(telegram_id)
        return {
            "telegram_id": telegram_id,
            "balance": balance,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Ошибка получения баланса для {telegram_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/users/{telegram_id}/balance/sync")
async def sync_user_balance(telegram_id: int):
    """Принудительная синхронизация баланса"""
    try:
        balance = db.get_user_balance(telegram_id)
        return {
            "telegram_id": telegram_id,
            "balance": balance,
            "synced_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Ошибка синхронизации баланса для {telegram_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/pricing/plans")
async def get_pricing_plans():
    """Получение тарифных планов"""
    return {
        "plans": PRICING_PLANS,
        "timestamp": datetime.now().isoformat()
    }

# === КОНСУЛЬТАЦИИ ENDPOINTS ===

@app.post("/api/v1/consultations/analyze")
async def analyze_consultation(request: Request):
    """Анализ одиночного образа"""
    try:
        data = await request.json()
        user_id = data.get('user_id')
        occasion = data.get('occasion', 'повседневный')
        preferences = data.get('preferences', '')
        image_data = data.get('image_data')
        
        logger.info(f"🎨 Запрос анализа от user_id: {user_id}, повод: {occasion}")
        
        if not image_data:
            raise HTTPException(status_code=400, detail="Отсутствуют данные изображения")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Отсутствует user_id")
        
        # Проверяем баланс ДО анализа
        current_balance = db.get_user_balance(user_id)
        if current_balance < 10:
            raise HTTPException(status_code=400, detail="Недостаточно STcoins для консультации")
        
        # Декодируем base64
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail="Некорректные данные изображения")
        
        # Анализируем через Gemini AI
        analysis = await gemini_ai.analyze_clothing_image(
            image_data=image_bytes,
            occasion=occasion,
            preferences=preferences
        )
        
        # Списываем баланс (10 STcoins)
        new_balance = db.update_user_balance(user_id, -10, "consultation")
        
        # Сохраняем консультацию
        consultation_id = db.save_consultation(
            user_id=user_id,
            occasion=occasion,
            preferences=preferences,
            image_path=None,
            advice=analysis
        )
        
        logger.info(f"✅ Анализ завершен для user_id: {user_id}. Стоимость: 10. Новый баланс: {new_balance}")
        
        return {
            "consultation_id": consultation_id,
            "advice": analysis,
            "balance": new_balance,
            "cost": 10,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка в /analyze: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ошибка анализа: {str(e)}")

@app.post("/api/v1/consultations/compare")
async def compare_consultation(request: Request):
    """Сравнение нескольких образов"""
    try:
        data = await request.json()
        user_id = data.get('user_id')
        occasion = data.get('occasion', 'повседневный')
        preferences = data.get('preferences', '')
        images_data = data.get('images_data', [])
        
        logger.info(f"⚖️ Запрос сравнения от user_id: {user_id}, изображений: {len(images_data)}")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Отсутствует user_id")
        
        if len(images_data) < 2:
            raise HTTPException(status_code=400, detail="Нужно минимум 2 изображения для сравнения")
        
        if len(images_data) > 4:
            raise HTTPException(status_code=400, detail="Максимум 4 изображения для сравнения")
        
        # Проверяем баланс ДО сравнения
        current_balance = db.get_user_balance(user_id)
        if current_balance < 15:
            raise HTTPException(status_code=400, detail="Недостаточно STcoins для сравнения")
        
        # Декодируем base64
        decoded_images = []
        try:
            for i, img_data in enumerate(images_data):
                image_bytes = base64.b64decode(img_data)
                decoded_images.append(image_bytes)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Некорректные данные изображения #{i+1}")
        
        # Сравниваем через Gemini AI
        comparison = await gemini_ai.compare_clothing_images(
            image_data_list=decoded_images,
            occasion=occasion,
            preferences=preferences
        )
        
        # Списываем баланс (15 STcoins за сравнение)
        new_balance = db.update_user_balance(user_id, -15, "comparison")
        
        # Сохраняем консультацию
        consultation_id = db.save_consultation(
            user_id=user_id,
            occasion=occasion,
            preferences=preferences,
            image_path=None,
            advice=comparison
        )
        
        logger.info(f"✅ Сравнение завершено для user_id: {user_id}. Стоимость: 15. Новый баланс: {new_balance}")
        
        return {
            "consultation_id": consultation_id,
            "advice": comparison,
            "balance": new_balance,
            "cost": 15,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка сравнения: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ошибка сравнения: {str(e)}")

# === ПЛАТЕЖИ ENDPOINTS ===

@app.post("/api/v1/payments/create")
async def create_payment_endpoint(request: PaymentRequest):
    """Создание платежа"""
    
    if not payment_service:
        raise HTTPException(
            status_code=503, 
            detail="Платежи недоступны - не настроена ЮKassa"
        )
    
    logger.info("🔍 НАЧАЛО создания платежа:")
    logger.info(f"   telegram_id: {request.telegram_id}")
    logger.info(f"   plan_id: {request.plan_id}")
    logger.info(f"   TEST_MODE: {TEST_MODE}")
    logger.info(f"   payment_service: {'инициализирован' if payment_service else '❌ НЕ ИНИЦИАЛИЗИРОВАН'}")
    
    try:
        # Проверка тарифного плана
        if request.plan_id not in PRICING_PLANS:
            raise HTTPException(status_code=400, detail=f"Неизвестный план: {request.plan_id}")
        
        plan = PRICING_PLANS[request.plan_id]
        
        # Проверка/создание пользователя
        user = db.get_user_by_telegram_id(request.telegram_id)
        logger.info(f"🔍 Проверка пользователя: {user}")
        
        if not user:
            # Создаем нового пользователя
            user_id = db.save_user(
                telegram_id=request.telegram_id,
                username="webapp_user",
                first_name="WebApp",
                last_name="User"
            )
            logger.info(f"✅ Создан новый пользователь: user_id={user_id}, telegram_id={request.telegram_id}")
            
            # Получаем созданного пользователя
            user = db.get_user_by_telegram_id(request.telegram_id)
        
        logger.info(f"🔍 Верификация пользователя: {user}")
        
        if not user:
            logger.error(f"❌ Не удалось создать/найти пользователя для telegram_id: {request.telegram_id}")
            raise HTTPException(status_code=500, detail="Ошибка создания пользователя")
        
        user_id = user['id']
        
        # Генерируем уникальный ID платежа
        payment_id = str(uuid.uuid4())
        
        logger.info(f"💎 Тарифный план: {plan}")
        
        # 🚨 КРИТИЧЕСКИ ВАЖНО: Правильный return_url для секции баланса
        payment_result = payment_service.create_payment(
            payment_id=payment_id,
            amount=plan['price'],
            description=f"МИШУРА - {plan['name']} ({plan['stcoins']} STCoins)",
            return_url="https://style-ai-bot.onrender.com/?payment_success=true&section=balance",
            user_id=user_id,
            telegram_id=request.telegram_id,
            plan_id=request.plan_id,
            stcoins_amount=plan['stcoins']
        )
        
        logger.info(f"💳 Платеж создан: {payment_result}")
        
        if not payment_result or 'payment_url' not in payment_result:
            logger.error(f"❌ Ошибка создания платежа ЮKassa: {payment_result}")
            raise HTTPException(status_code=500, detail="Ошибка создания платежа")
        
        # Формируем ответ
        response_data = {
            "payment_id": payment_id,
            "yookassa_payment_id": payment_result.get('yookassa_payment_id'),
            "payment_url": payment_result['payment_url'],
            "amount": plan['price'],
            "currency": "RUB",
            "plan": {
                "id": request.plan_id,
                "name": plan['name'],
                "stcoins": plan['stcoins']
            },
            "status": "pending",
            "stcoins_amount": plan['stcoins']
        }
        
        logger.info(f"✅ Платеж создан: {payment_id} для пользователя {request.telegram_id}, план {request.plan_id} ({plan['name']})")
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка создания платежа: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ошибка создания платежа: {str(e)}")

@app.post("/api/v1/payments/webhook")
async def payment_webhook_endpoint(request: Request):
    """Webhook для обработки уведомлений от ЮKassa"""
    
    if not payment_service:
        logger.warning("⚠️ Webhook получен, но payment_service не инициализирован")
        return {"status": "ignored"}
    
    try:
        # Получаем сырые данные webhook
        webhook_data = await request.json()
        logger.info(f"📥 Получен webhook: {webhook_data}")
        
        # Обрабатываем успешный платеж
        if webhook_data.get('event') == 'payment.succeeded' and 'object' in webhook_data:
            payment_object = webhook_data['object']
            yookassa_payment_id = payment_object.get('id')
            
            if not yookassa_payment_id:
                logger.error("❌ Отсутствует ID платежа в webhook")
                return {"status": "error", "message": "Missing payment ID"}
            
            logger.info(f"💰 Обработка успешного платежа: {yookassa_payment_id}")
            
            # 🚨 КРИТИЧЕСКИ ВАЖНО: Обрабатываем платеж
            success = payment_service.process_successful_payment(yookassa_payment_id)
            
            if success:
                logger.info(f"✅ Платеж {yookassa_payment_id} успешно обработан")
                return {"status": "success"}
            else:
                logger.error(f"❌ Не удалось обработать платеж {yookassa_payment_id}")
                return {"status": "error", "message": "Payment processing failed"}
        
        # Обработка других типов событий
        elif webhook_data.get('event') == 'payment.canceled':
            payment_object = webhook_data['object']
            yookassa_payment_id = payment_object.get('id')
            logger.info(f"❌ Платеж отменен: {yookassa_payment_id}")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"❌ Ошибка обработки webhook: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}

@app.get("/api/v1/payments/{payment_id}/status")
async def get_payment_status(payment_id: str, telegram_id: int):
    """Получение статуса платежа"""
    
    if not payment_service:
        raise HTTPException(status_code=503, detail="Платежи недоступны")
    
    try:
        payment_info = payment_service.get_payment_status(payment_id, telegram_id)
        
        if not payment_info:
            raise HTTPException(status_code=404, detail="Платеж не найден")
        
        return payment_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка получения статуса платежа {payment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === STARTUP EVENT ===

@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске"""
    logger.info("🚀 Запуск МИШУРА API Server...")
    
    # Инициализация базы данных
    if db:
        db.init_db()
        logger.info("✅ База данных инициализирована")

if __name__ == "__main__":
    logger.info(f"🎭 МИШУРА API Server starting on port {PORT}")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=PORT,
        reload=DEBUG and ENVIRONMENT != 'production',
        log_level="info" if not DEBUG else "debug"
    )