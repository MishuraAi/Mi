# 🔄 ПОЛНАЯ ЗАМЕНА api.py - добавлены endpoints консультаций

import os
import uuid
import logging
import base64
from datetime import datetime
from typing import Optional, Any
from contextlib import asynccontextmanager
import time

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
import uvicorn
from pydantic import BaseModel
import asyncio
try:
    import builtins
    financial_service = getattr(builtins, 'GLOBAL_FINANCIAL_SERVICE', None)
except:
    financial_service = None

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

# Глобальные переменные
db: Optional[MishuraDB] = None
gemini_ai: Optional[MishuraGeminiAI] = None
payment_service: Optional[PaymentService] = None
financial_service: Optional[Any] = None

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db, gemini_ai, payment_service, financial_service
    # Startup
    logger.info("🚀 Запуск МИШУРА API Server...")
    try:
        db = MishuraDB()
        logger.info("✅ Database инициализирована")
        db.init_db()
        logger.info("✅ Таблицы базы данных проверены/созданы")
        
        # 🔐 НОВОЕ: АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ ФИНАНСОВОЙ БЕЗОПАСНОСТИ
        try:
            logger.info("🔐 Инициализация финансовой безопасности...")
            
            # Проверяем существование глобального financial_service
            financial_service = getattr(__builtins__, 'GLOBAL_FINANCIAL_SERVICE', None)
            if not financial_service:
                # Создаем новый FinancialService
                from financial_service import FinancialService
                financial_service = FinancialService(db)
                
                # Инициализируем balance_locks для существующих пользователей
                await _init_balance_locks_for_existing_users(db, financial_service)
                
                # Патчим database.py для backward compatibility
                original_update_balance = db.update_user_balance
                db.update_user_balance = financial_service.update_user_balance
                db._original_update_user_balance = original_update_balance
                
                # Сохраняем глобально для других компонентов
                try:
                    import builtins
                    builtins.GLOBAL_FINANCIAL_SERVICE = financial_service
                except:
                    __builtins__['GLOBAL_FINANCIAL_SERVICE'] = financial_service
                
                logger.info("✅ Финансовая безопасность инициализирована и установлена глобально")
            else:
                logger.info("✅ Финансовая безопасность уже загружена из глобальных")
                
            logger.info("✅ Financial service загружен")
            
        except Exception as e:
            logger.error(f"❌ Критическая ошибка инициализации финансовой безопасности: {e}")
            # НЕ останавливаем запуск - система может работать в fallback режиме
            financial_service = None
            logger.warning("⚠️ Система запущена БЕЗ финансовой безопасности (fallback режим)")
        
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
        logger.error(f"❌ Критическая ошибка при запуске: {e}", exc_info=True)
        # В случае ошибки при запуске, FastAPI не запустится корректно
        raise
    
    yield
    # Shutdown (если нужно)
    logger.info("🛑 Сервер МИШУРА API остановлен.")

# 🔐 НОВАЯ ФУНКЦИЯ: добавить ПОСЛЕ lifespan
async def _init_balance_locks_for_existing_users(db, financial_service):
    """Асинхронная инициализация balance_locks для существующих пользователей"""
    
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Получаем всех существующих пользователей
        cursor.execute("SELECT telegram_id FROM users")
        users = cursor.fetchall()
        
        initialized_count = 0
        
        for user in users:
            telegram_id = user[0]
            try:
                if db.DB_CONFIG['type'] == 'postgresql':
                    cursor.execute("""
                        INSERT INTO balance_locks (telegram_id, version_number, last_updated)
                        VALUES (%s, 1, CURRENT_TIMESTAMP)
                        ON CONFLICT (telegram_id) DO NOTHING
                    """, (telegram_id,))
                else:
                    cursor.execute("""
                        INSERT OR IGNORE INTO balance_locks (telegram_id, version_number)
                        VALUES (?, 1)
                    """, (telegram_id,))
                
                if cursor.rowcount > 0:
                    initialized_count += 1
                    
            except Exception as e:
                logger.warning(f"⚠️ Не удалось инициализировать balance_lock для {telegram_id}: {e}")
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Balance locks инициализированы для {initialized_count} новых пользователей из {len(users)}")
        
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации balance_locks: {e}")
        # НЕ бросаем исключение - это не критично для запуска

# Инициализация FastAPI
app = FastAPI(
    title="🎭 МИШУРА API", 
    version="2.7.0",
    lifespan=lifespan
)

# 🔧 КРИТИЧЕСКИ ВАЖНО: Настройка статических файлов
app.mount("/static", StaticFiles(directory="webapp"), name="static")

# Тарифные планы
PRICING_PLANS = {
    "mini": {
        "name": "🌱 Мини",
        "description": "Пробный тариф",
        "consultations": 1,
        "stcoins": 10,
        "coins": 10,
        "price": 20.0,
        "price_rub": 20,
        "price_kop": 2000,
        "discount": 0,
        "popular": False,
        "temporary": False,
        "color": "🟢"
    },
    "basic": {
        "name": "🌟 Базовый",
        "description": "Стартовый план",
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
    "standard": {
        "name": "⭐ Стандарт",
        "description": "Популярный (ПОПУЛЯРНЫЙ)",
        "consultations": 30,
        "stcoins": 300,
        "coins": 300,
        "price": 300.0,
        "price_rub": 300,
        "price_kop": 30000,
        "discount": 33,
        "popular": True,
        "temporary": False,
        "color": "🟣"
    },
    "premium": {
        "name": "💎 Премиум",
        "description": "Выгодный план",
        "consultations": 100,
        "stcoins": 1000,
        "coins": 1000,
        "price": 800.0,
        "price_rub": 800,
        "price_kop": 80000,
        "discount": 60,
        "popular": False,
        "temporary": False,
        "color": "🟡"
    }
}

# === API ENDPOINTS ===

@app.get("/")
async def home():
    """Главная страница"""
    html_path = os.path.join("webapp", "index.html")
    
    if not os.path.exists(html_path):
        return HTMLResponse(content="❌ index.html не найден", status_code=404)
    
    try:
        with open(html_path, "r", encoding="utf-8") as f:
            content = f.read()
        return HTMLResponse(content=content)
    except Exception as e:
        return HTMLResponse(content=f"❌ Ошибка чтения файла: {e}", status_code=500)

@app.head("/")
async def head_root():
    return Response(status_code=200)

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
    """Получение баланса пользователя с дополнительной информацией"""
    try:
        balance = db.get_user_balance(telegram_id)
        
        # Дополнительная информация если доступен financial_service
        additional_info = {}
        if financial_service:
            try:
                recent_transactions = financial_service.get_transaction_history(telegram_id, 5)
                additional_info['recent_transactions_count'] = len(recent_transactions)
                
                if recent_transactions:
                    additional_info['last_transaction'] = {
                        'type': recent_transactions[0]['transaction_type'],
                        'amount': recent_transactions[0]['amount'],
                        'date': recent_transactions[0]['created_at']
                    }
            except Exception as e:
                logger.warning(f"Could not get additional balance info: {e}")
        
        return {
            "telegram_id": telegram_id,
            "balance": balance,
            "timestamp": datetime.now().isoformat(),
            **additional_info
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
    """🔐 ЗАЩИЩЕННЫЙ анализ с финансовой безопасностью"""
    
    correlation_id = str(uuid.uuid4())
    start_time = time.time()
    
    try:
        data = await request.json()
        user_id = data.get('user_id')
        occasion = data.get('occasion', 'повседневный')
        preferences = data.get('preferences', '')
        image_data = data.get('image_data')
        
        logger.info(f"🎨 [{correlation_id}] Запрос анализа от user_id: {user_id}")
        
        if not image_data or not user_id:
            raise HTTPException(status_code=400, detail="Отсутствуют обязательные данные")
        
        # 🔐 БЕЗОПАСНОЕ СПИСАНИЕ через financial_service
        if financial_service:
            operation_result = financial_service.safe_balance_operation(
                telegram_id=user_id,
                amount_change=-10,
                operation_type="consultation_analysis",
                correlation_id=correlation_id,
                metadata={
                    "occasion": occasion,
                    "service": "single_analysis",
                    "endpoint": "/consultations/analyze"
                }
            )
            
            if not operation_result['success']:
                error_detail = operation_result.get('error', 'unknown_error')
                
                if error_detail == 'insufficient_balance':
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Недостаточно STcoins. Требуется: {operation_result.get('required', 10)}, доступно: {operation_result.get('available', 0)}"
                    )
                else:
                    logger.error(f"[{correlation_id}] Financial operation failed: {operation_result}")
                    raise HTTPException(status_code=500, detail="Ошибка обработки платежа")
        else:
            # Fallback на старую систему
            current_balance = db.get_user_balance(user_id)
            if current_balance < 10:
                raise HTTPException(status_code=400, detail="Недостаточно STcoins для консультации")
        
        # Декодируем base64 изображение
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            # 🚨 КОМПЕНСАЦИЯ: возвращаем средства если изображение некорректно
            if financial_service:
                financial_service.safe_balance_operation(
                    telegram_id=user_id,
                    amount_change=10,
                    operation_type="consultation_refund",
                    correlation_id=correlation_id,
                    metadata={"reason": "invalid_image"}
                )
            raise HTTPException(status_code=400, detail="Некорректные данные изображения")
        
        # 🤖 АНАЛИЗ ЧЕРЕЗ GEMINI AI (с timeout и retry)
        try:
            analysis = await asyncio.wait_for(
                gemini_ai.analyze_clothing_image(
                    image_data=image_bytes,
                    occasion=occasion,
                    preferences=preferences
                ),
                timeout=60.0  # 60 секунд timeout
            )
        except asyncio.TimeoutError:
            # 🚨 КОМПЕНСАЦИЯ: возвращаем средства при timeout
            if financial_service:
                financial_service.safe_balance_operation(
                    telegram_id=user_id,
                    amount_change=10,
                    operation_type="consultation_refund",
                    correlation_id=correlation_id,
                    metadata={"reason": "gemini_timeout"}
                )
            raise HTTPException(status_code=504, detail="Анализ изображения занял слишком много времени")
        
        except Exception as e:
            # 🚨 КОМПЕНСАЦИЯ: возвращаем средства при ошибке Gemini
            if financial_service:
                financial_service.safe_balance_operation(
                    telegram_id=user_id,
                    amount_change=10,
                    operation_type="consultation_refund",
                    correlation_id=correlation_id,
                    metadata={"reason": "gemini_error", "error": str(e)}
                )
            logger.error(f"[{correlation_id}] Gemini analysis failed: {e}")
            raise HTTPException(status_code=500, detail="Сервис анализа временно недоступен")
        
        # Списываем средства ТОЛЬКО если анализ успешен (в случае fallback)
        if not financial_service:
            new_balance = db.update_user_balance(user_id, -10, "consultation")
        else:
            new_balance = operation_result['new_balance']
        
        # 📝 СОХРАНЯЕМ КОНСУЛЬТАЦИЮ
        try:
            consultation_id = db.save_consultation(
                user_id=user_id,
                occasion=occasion,
                preferences=preferences,
                image_path=None,
                advice=analysis
            )
        except Exception as e:
            logger.warning(f"[{correlation_id}] Failed to save consultation: {e}")
            consultation_id = None
        
        processing_time = time.time() - start_time
        
        logger.info(f"✅ [{correlation_id}] Анализ завершен: user_id={user_id}, time={processing_time:.2f}s, balance={new_balance}")
        
        return {
            "consultation_id": consultation_id,
            "advice": analysis,
            "balance": new_balance,
            "cost": 10,
            "correlation_id": correlation_id,
            "processing_time": round(processing_time, 2),
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [{correlation_id}] Критическая ошибка анализа: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")

@app.post("/api/v1/consultations/compare")
async def compare_consultation(request: Request):
    """🔐 ЗАЩИЩЕННОЕ сравнение с финансовой безопасностью"""
    
    correlation_id = str(uuid.uuid4())
    start_time = time.time()
    
    try:
        data = await request.json()
        user_id = data.get('user_id')
        occasion = data.get('occasion', 'повседневный')
        preferences = data.get('preferences', '')
        images_data = data.get('images_data', [])
        
        logger.info(f"⚖️ [{correlation_id}] Запрос сравнения от user_id: {user_id}, изображений: {len(images_data)}")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Отсутствует user_id")
        
        if len(images_data) < 2:
            raise HTTPException(status_code=400, detail="Нужно минимум 2 изображения для сравнения")
        
        if len(images_data) > 4:
            raise HTTPException(status_code=400, detail="Максимум 4 изображения для сравнения")
        
        # 🔐 БЕЗОПАСНОЕ СПИСАНИЕ (15 STcoins за сравнение)
        if financial_service:
            operation_result = financial_service.safe_balance_operation(
                telegram_id=user_id,
                amount_change=-15,
                operation_type="consultation_compare",
                correlation_id=correlation_id,
                metadata={
                    "occasion": occasion,
                    "service": "comparison",
                    "images_count": len(images_data),
                    "endpoint": "/consultations/compare"
                }
            )
            
            if not operation_result['success']:
                error_detail = operation_result.get('error', 'unknown_error')
                
                if error_detail == 'insufficient_balance':
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Недостаточно STcoins для сравнения. Требуется: {operation_result.get('required', 15)}, доступно: {operation_result.get('available', 0)}"
                    )
                else:
                    logger.error(f"[{correlation_id}] Financial operation failed: {operation_result}")
                    raise HTTPException(status_code=500, detail="Ошибка обработки платежа")
        else:
            # Fallback на старую систему
            current_balance = db.get_user_balance(user_id)
            if current_balance < 15:
                raise HTTPException(status_code=400, detail="Недостаточно STcoins для сравнения")
        
        # Декодируем base64 изображения
        decoded_images = []
        try:
            for i, img_data in enumerate(images_data):
                image_bytes = base64.b64decode(img_data)
                decoded_images.append(image_bytes)
        except Exception as e:
            # 🚨 КОМПЕНСАЦИЯ: возвращаем средства если изображения некорректны
            if financial_service:
                financial_service.safe_balance_operation(
                    telegram_id=user_id,
                    amount_change=15,
                    operation_type="consultation_refund",
                    correlation_id=correlation_id,
                    metadata={"reason": "invalid_images"}
                )
            raise HTTPException(status_code=400, detail=f"Некорректные данные изображения #{i+1}")
        
        # 🤖 СРАВНЕНИЕ ЧЕРЕЗ GEMINI AI (с timeout)
        try:
            comparison = await asyncio.wait_for(
                gemini_ai.compare_clothing_images(
                    image_data_list=decoded_images,
                    occasion=occasion,
                    preferences=preferences
                ),
                timeout=90.0  # 90 секунд для сравнения
            )
        except asyncio.TimeoutError:
            # 🚨 КОМПЕНСАЦИЯ: возвращаем средства при timeout
            if financial_service:
                financial_service.safe_balance_operation(
                    telegram_id=user_id,
                    amount_change=15,
                    operation_type="consultation_refund",
                    correlation_id=correlation_id,
                    metadata={"reason": "gemini_timeout"}
                )
            raise HTTPException(status_code=504, detail="Сравнение изображений заняло слишком много времени")
        
        except Exception as e:
            # 🚨 КОМПЕНСАЦИЯ: возвращаем средства при ошибке Gemini
            if financial_service:
                financial_service.safe_balance_operation(
                    telegram_id=user_id,
                    amount_change=15,
                    operation_type="consultation_refund",
                    correlation_id=correlation_id,
                    metadata={"reason": "gemini_error", "error": str(e)}
                )
            logger.error(f"[{correlation_id}] Gemini comparison failed: {e}")
            raise HTTPException(status_code=500, detail="Сервис сравнения временно недоступен")
        
        # Списываем средства ТОЛЬКО если сравнение успешно (в случае fallback)
        if not financial_service:
            new_balance = db.update_user_balance(user_id, -15, "comparison")
        else:
            new_balance = operation_result['new_balance']
        
        # 📝 СОХРАНЯЕМ КОНСУЛЬТАЦИЮ
        try:
            consultation_id = db.save_consultation(
                user_id=user_id,
                occasion=occasion,
                preferences=preferences,
                image_path=None,
                advice=comparison
            )
        except Exception as e:
            logger.warning(f"[{correlation_id}] Failed to save consultation: {e}")
            consultation_id = None
        
        processing_time = time.time() - start_time
        
        logger.info(f"✅ [{correlation_id}] Сравнение завершено: user_id={user_id}, time={processing_time:.2f}s, balance={new_balance}")
        
        return {
            "consultation_id": consultation_id,
            "advice": comparison,
            "balance": new_balance,
            "cost": 15,
            "correlation_id": correlation_id,
            "processing_time": round(processing_time, 2),
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [{correlation_id}] Критическая ошибка сравнения: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")

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
            
            # 🚨 Устанавливаем начальный баланс 0 для нового пользователя
            db.update_user_balance(request.telegram_id, 0, "initialization")
            
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

@app.get("/api/v1/health/financial")
async def financial_health_check():
    """🔐 Real-time финансовый мониторинг"""
    
    try:
        health = {
            'timestamp': datetime.now().isoformat(),
            'status': 'healthy',
            'financial_service': 'available' if financial_service else 'unavailable',
            'metrics': {},
            'alerts': []
        }
        
        if not financial_service:
            health['status'] = 'degraded'
            health['alerts'].append({
                'level': 'warning',
                'message': 'Financial service not available - using fallback'
            })
        else:
            try:
                stats = financial_service.get_financial_stats()
                health['metrics'] = stats
                
                # Алерты на основе метрик
                if stats.get('zero_balance_users', 0) > stats.get('total_users', 1) * 0.5:
                    health['alerts'].append({
                        'level': 'warning',
                        'message': f"High number of zero balance users: {stats['zero_balance_users']}"
                    })
                
            except Exception as e:
                health['status'] = 'degraded'
                health['alerts'].append({
                    'level': 'error',
                    'message': f'Error getting financial stats: {str(e)}'
                })
        
        return health
        
    except Exception as e:
        return {
            'timestamp': datetime.now().isoformat(),
            'status': 'unhealthy',
            'error': str(e)
        }

@app.get("/api/v1/users/{telegram_id}/transactions")
async def get_user_transactions(telegram_id: int, limit: int = 20):
    """Получение истории транзакций пользователя"""
    
    try:
        if not financial_service:
            raise HTTPException(status_code=503, detail="Financial service unavailable")
        
        transactions = financial_service.get_transaction_history(telegram_id, limit)
        
        return {
            "telegram_id": telegram_id,
            "transactions": transactions,
            "count": len(transactions),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting transactions for {telegram_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    logger.info(f"🎭 МИШУРА API Server starting on port {PORT}")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=PORT,
        reload=DEBUG and ENVIRONMENT != 'production',
        log_level="info" if not DEBUG else "debug"
    )