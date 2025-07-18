# 🔄 ПОЛНАЯ ЗАМЕНА api.py - добавлены endpoints консультаций

import os
import uuid
import logging
import base64
from datetime import datetime
from typing import Optional, Any, Dict
from contextlib import asynccontextmanager
import time
import psutil
import gc

from fastapi import FastAPI, HTTPException, Request, Response, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
import uvicorn
from pydantic import BaseModel
import asyncio
import aiohttp
try:
    import builtins
    financial_service = getattr(builtins, 'GLOBAL_FINANCIAL_SERVICE', None)
except:
    financial_service = None

# Импорты проекта
from database import MishuraDB
from gemini_ai import MishuraGeminiAI
from payment_service import PaymentService

# 🌐 НОВЫЕ ИМПОРТЫ ДЛЯ СИСТЕМЫ ОТЗЫВОВ (уже импортированы выше)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s'
)
logger = logging.getLogger(__name__)

# Переменные окружения
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
YOOKASSA_SHOP_ID = os.getenv('YOOKASSA_SHOP_ID')
YOOKASSA_SECRET_KEY = os.getenv('YOOKASSA_SECRET_KEY')
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://style-ai-bot.onrender.com')
PORT = int(os.getenv('PORT', 8001))
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
TEST_MODE = os.getenv('TEST_MODE', 'false').lower() == 'true'
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
ADMIN_TELEGRAM_ID = os.getenv('ADMIN_TELEGRAM_ID')  # ID админа для уведомлений

# Логирование конфигурации
logger.info("🔧 Конфигурация МИШУРА API:")
logger.info(f"   ENVIRONMENT: {ENVIRONMENT}")
logger.info(f"   DEBUG: {DEBUG}")
logger.info(f"   TEST_MODE: {TEST_MODE}")
logger.info(f"   PORT: {PORT}")
logger.info(f"   WEBAPP_URL: {WEBAPP_URL}")
logger.info(f"   TELEGRAM_TOKEN: {'установлен' if TELEGRAM_TOKEN else '❌ НЕ УСТАНОВЛЕН'}")
logger.info(f"   GEMINI_API_KEY: {'установлен' if GEMINI_API_KEY else '❌ НЕ УСТАНОВЛЕН'}")
logger.info(f"   YOOKASSA: {'настроена' if YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY else '❌ НЕ НАСТРОЕНА'}")
logger.info(f"   ADMIN_TELEGRAM_ID: {'установлен' if ADMIN_TELEGRAM_ID else '❌ НЕ УСТАНОВЛЕН'}")

# Проверка обязательных переменных в продакшн
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

# === НОВЫЕ МОДЕЛИ ДАННЫХ ДЛЯ ОТЗЫВОВ ===

class FeedbackSubmission(BaseModel):
    telegram_id: int
    feedback_text: str
    feedback_rating: str = 'positive'  # positive/negative
    consultation_id: Optional[int] = None

class FeedbackPromptAction(BaseModel):
    telegram_id: int
    consultation_id: int
    action: str  # shown/dismissed/completed
    dismissal_reason: Optional[str] = None

# =================== PYDANTIC MODELS ДЛЯ СИНХРОНИЗАЦИИ ===================

class DeviceInfo(BaseModel):
    user_agent: str
    screen_resolution: str
    timezone: str
    language: str
    platform: str
    viewport: str

class AnonymousUserRequest(BaseModel):
    device_fingerprint: str
    device_info: DeviceInfo

class TelegramLinkRequest(BaseModel):
    anonymous_id: str
    telegram_id: int
    telegram_username: Optional[str] = None
    telegram_first_name: Optional[str] = None

class SyncRequest(BaseModel):
    source_telegram_id: int
    target_anonymous_id: str

# =================== SYNC API ENDPOINTS ===================

@app.post("/api/v1/users/anonymous")
async def create_anonymous_user(request: AnonymousUserRequest, http_request: Request):
    """
    Создать анонимного пользователя с device fingerprinting
    """
    try:
        db = MishuraDB()
        existing_device = db.get_device_user(device_fingerprint=request.device_fingerprint)
        if existing_device:
            db.update_device_activity(request.device_fingerprint)
            return {
                "status": "success",
                "message": "Устройство найдено",
                "data": {
                    "anonymous_id": existing_device['anonymous_id'],
                    "device_fingerprint": existing_device['device_fingerprint'],
                    "is_linked": existing_device['is_linked'],
                    "telegram_id": existing_device.get('telegram_id'),
                    "created_at": existing_device['created_at']
                }
            }
        device_info_dict = {
            "user_agent": request.device_info.user_agent,
            "screen_resolution": request.device_info.screen_resolution,
            "timezone": request.device_info.timezone,
            "language": request.device_info.language,
            "platform": request.device_info.platform,
            "viewport": request.device_info.viewport,
            "ip_address": str(http_request.client.host),
            "created_from": "webapp"
        }
        new_device = db.create_anonymous_user(
            device_fingerprint=request.device_fingerprint,
            device_info=device_info_dict
        )
        if not new_device:
            raise HTTPException(status_code=500, detail="Не удалось создать анонимного пользователя")
        logger.info(f"✅ Создан анонимный пользователь: {new_device['anonymous_id']}")
        return {
            "status": "success",
            "message": "Анонимный пользователь создан",
            "data": {
                "anonymous_id": new_device['anonymous_id'],
                "device_fingerprint": new_device['device_fingerprint'],
                "is_linked": new_device['is_linked'],
                "telegram_id": None,
                "created_at": new_device['created_at']
            }
        }
    except Exception as e:
        logger.error(f"❌ Ошибка создания анонимного пользователя: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сервера: {str(e)}")

@app.post("/api/v1/users/link-telegram")
async def link_telegram_to_anonymous(request: TelegramLinkRequest):
    """
    Привязать Telegram аккаунт к анонимному пользователю
    """
    try:
        db = MishuraDB()
        device_user = db.get_device_user(anonymous_id=request.anonymous_id)
        if not device_user:
            raise HTTPException(status_code=404, detail="Анонимный пользователь не найден")
        existing_telegram = db.get_device_user_by_telegram(request.telegram_id)
        if existing_telegram and existing_telegram['anonymous_id'] != request.anonymous_id:
            sync_success = db.sync_user_data(request.telegram_id, request.anonymous_id)
            if not sync_success:
                logger.warning(f"⚠️ Не удалось синхронизировать данные при привязке")
        link_success = db.link_telegram_to_anonymous(
            anonymous_id=request.anonymous_id,
            telegram_id=request.telegram_id,
            telegram_username=request.telegram_username,
            telegram_first_name=request.telegram_first_name
        )
        if not link_success:
            raise HTTPException(status_code=500, detail="Не удалось привязать Telegram аккаунт")
        existing_user = db.get_user(request.telegram_id)
        if not existing_user:
            user_id = db.save_user(
                telegram_id=request.telegram_id,
                username=request.telegram_username,
                first_name=request.telegram_first_name
            )
            if user_id:
                logger.info(f"✅ Создан новый пользователь {request.telegram_id} с начальным балансом 50 STcoin")
        updated_device = db.get_device_user(anonymous_id=request.anonymous_id)
        logger.info(f"✅ Telegram {request.telegram_id} привязан к {request.anonymous_id}")
        return {
            "status": "success",
            "message": "Telegram аккаунт успешно привязан",
            "data": {
                "anonymous_id": updated_device['anonymous_id'],
                "telegram_id": updated_device['telegram_id'],
                "telegram_username": updated_device.get('telegram_username'),
                "is_linked": updated_device['is_linked'],
                "sync_completed": True
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка привязки Telegram: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сервера: {str(e)}")

@app.get("/api/v1/users/sync/{device_fingerprint}")
async def get_user_by_device(device_fingerprint: str):
    """
    Получить информацию о пользователе по device fingerprint
    """
    try:
        db = MishuraDB()
        device_user = db.get_device_user(device_fingerprint=device_fingerprint)
        if not device_user:
            return {
                "status": "not_found",
                "message": "Устройство не найдено",
                "data": None
            }
        db.update_device_activity(device_fingerprint)
        user_data = None
        if device_user.get('telegram_id'):
            user_data = db.get_user(device_user['telegram_id'])
        return {
            "status": "success",
            "message": "Устройство найдено",
            "data": {
                "anonymous_id": device_user['anonymous_id'],
                "device_fingerprint": device_user['device_fingerprint'],
                "telegram_id": device_user.get('telegram_id'),
                "telegram_username": device_user.get('telegram_username'),
                "telegram_first_name": device_user.get('telegram_first_name'),
                "is_linked": device_user['is_linked'],
                "last_active": device_user['last_active'],
                "user_balance": user_data.get('balance') if user_data else None,
                "user_created": user_data.get('created_at') if user_data else None
            }
        }
    except Exception as e:
        logger.error(f"❌ Ошибка получения пользователя по устройству: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сервера: {str(e)}")

@app.post("/api/v1/users/sync")
async def sync_user_data_endpoint(request: SyncRequest):
    """
    Синхронизировать данные пользователя между устройствами
    """
    try:
        db = MishuraDB()
        sync_success = db.sync_user_data(
            source_telegram_id=request.source_telegram_id,
            target_anonymous_id=request.target_anonymous_id
        )
        if not sync_success:
            raise HTTPException(status_code=500, detail="Не удалось синхронизировать данные")
        target_device = db.get_device_user(anonymous_id=request.target_anonymous_id)
        return {
            "status": "success",
            "message": "Данные успешно синхронизированы",
            "data": {
                "target_anonymous_id": request.target_anonymous_id,
                "source_telegram_id": request.source_telegram_id,
                "sync_completed": True,
                "synced_at": datetime.now().isoformat(),
                "target_device": target_device
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка синхронизации данных: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сервера: {str(e)}")

@app.get("/api/v1/users/{telegram_id}/devices")
async def get_user_devices_endpoint(telegram_id: int):
    """
    Получить все устройства пользователя
    """
    try:
        db = MishuraDB()
        devices = db.get_user_devices(telegram_id)
        return {
            "status": "success",
            "message": f"Найдено {len(devices)} устройств",
            "data": {
                "telegram_id": telegram_id,
                "devices": devices,
                "total_devices": len(devices)
            }
        }
    except Exception as e:
        logger.error(f"❌ Ошибка получения устройств пользователя: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сервера: {str(e)}")

@app.get("/api/v1/users/detect-user")
async def detect_user_auto(request: Request):
    """
    Автоматическое определение пользователя (универсальный endpoint)
    """
    try:
        telegram_init_data = request.headers.get('X-Telegram-Init-Data')
        telegram_user_id = request.headers.get('X-Telegram-User-ID')
        user_id_param = request.query_params.get('user_id')
        device_fingerprint = request.query_params.get('device_fingerprint')
        db = MishuraDB()
        result = {
            "status": "success",
            "detection_method": "unknown",
            "user_id": None,
            "anonymous_id": None,
            "is_linked": False,
            "needs_linking": False,
            "telegram_detected": False
        }
        if telegram_user_id:
            try:
                telegram_id = int(telegram_user_id)
                device_user = db.get_device_user_by_telegram(telegram_id)
                result.update({
                    "detection_method": "telegram_webapp",
                    "user_id": telegram_id,
                    "anonymous_id": device_user['anonymous_id'] if device_user else None,
                    "is_linked": True,
                    "telegram_detected": True
                })
                return result
            except ValueError:
                pass
        if user_id_param:
            try:
                telegram_id = int(user_id_param)
                if telegram_id != 5930269100:
                    device_user = db.get_device_user_by_telegram(telegram_id)
                    result.update({
                        "detection_method": "url_parameter",
                        "user_id": telegram_id,
                        "anonymous_id": device_user['anonymous_id'] if device_user else None,
                        "is_linked": bool(device_user),
                        "telegram_detected": True
                    })
                    return result
            except ValueError:
                pass
        if device_fingerprint:
            device_user = db.get_device_user(device_fingerprint=device_fingerprint)
            if device_user:
                result.update({
                    "detection_method": "device_fingerprint",
                    "user_id": device_user.get('telegram_id'),
                    "anonymous_id": device_user['anonymous_id'],
                    "is_linked": device_user['is_linked'],
                    "needs_linking": not device_user['is_linked']
                })
                return result
        result.update({
            "detection_method": "create_anonymous",
            "needs_creation": True,
            "anonymous_id": None,
            "user_id": None
        })
        return result
    except Exception as e:
        logger.error(f"❌ Ошибка автоматического определения пользователя: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сервера: {str(e)}")

# Импорт системы уведомлений
try:
    from admin_notifications import notify_new_feedback, test_admin_notifications
    NOTIFICATIONS_AVAILABLE = True
    logger.info("✅ Система уведомлений админу загружена")
except ImportError as e:
    NOTIFICATIONS_AVAILABLE = False
    logger.warning(f"⚠️ Система уведомлений недоступна: {e}")

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
            financial_service = getattr(__builtins__, 'GLOBAL_FINANCIAL_SERVICE', None)
            if not financial_service:
                from financial_service import FinancialService
                financial_service = FinancialService(db)
                await _init_balance_locks_for_existing_users(db, financial_service)
                original_update_balance = db.update_user_balance
                db.update_user_balance = financial_service.update_user_balance
                db._original_update_user_balance = original_update_balance
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
        raise
    yield
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

# 🔧 ИСПРАВЛЕНО: Тарифные планы с правильным синтаксисом
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

@app.get("/api/status")
async def api_status():
    """API статус (JSON)"""
    return {"status": "ok", "service": "mishura"}

@app.get("/ping")
async def ping():
    """Простой ping для keep-alive"""
    return {"status": "pong", "timestamp": datetime.now().isoformat()}

@app.get("/")
async def home():
    """Главная страница - веб-приложение МИШУРА"""
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

@app.get("/health")
async def simple_health():
    """Простой health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

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
                        detail=f"Недостаточно STcoins. Требуется: {operation_result.get('required', 10)} доступно: {operation_result.get('available', 0)}"
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
        
        logger.info(f"✅ [{correlation_id}] Анализ завершен: user_id={user_id} time={processing_time:.2f}s, balance={new_balance}")
        
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
        
        logger.info(f"⚖️ [{correlation_id}] Запрос сравнения от user_id: {user_id} изображений: {len(images_data)}")
        
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
                        detail=f"Недостаточно STcoins для сравнения. Требуется: {operation_result.get('required', 15)} доступно: {operation_result.get('available', 0)}"
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
        
        logger.info(f"✅ [{correlation_id}] Сравнение завершено: user_id={user_id} time={processing_time:.2f}s, balance={new_balance}")
        
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
    """Создание платежа с правильным return_url"""
    
    if not payment_service:
        raise HTTPException(
            status_code=503, 
            detail="Платежи недоступны - не настроена ЮKassa"
        )
    
    logger.info("🔍 НАЧАЛО создания платежа:")
    logger.info(f"   telegram_id: {request.telegram_id}")
    logger.info(f"   plan_id: {request.plan_id}")
    logger.info(f"   WEBAPP_URL: {WEBAPP_URL}")
    logger.info(f"   TEST_MODE: {TEST_MODE}")
    
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
            logger.info(f"✅ Создан новый пользователь: user_id={user_id} telegram_id={request.telegram_id}")
            
            # Устанавливаем начальный баланс 0
            db.update_user_balance(request.telegram_id, 0, "initialization")
            
            # Получаем созданного пользователя
            user = db.get_user_by_telegram_id(request.telegram_id)
        
        if not user:
            logger.error(f"❌ Не удалось создать/найти пользователя для telegram_id: {request.telegram_id}")
            raise HTTPException(status_code=500, detail="Ошибка создания пользователя")
        
        user_id = user['id']
        
        # Генерируем уникальный ID платежа
        payment_id = str(uuid.uuid4())
        
        # 🔧 ИСПРАВЛЕНО: Динамический return_url на основе WEBAPP_URL
        correct_return_url = f"{WEBAPP_URL}?payment_success=true&section=balance"
        
        logger.info(f"💎 Тарифный план: {plan}")
        logger.info(f"🔗 Return URL: {correct_return_url}")
        
        # Создание платежа с правильным return_url
        payment_result = payment_service.create_payment(
            payment_id=payment_id,
            amount=plan['price'],
            description=f"МИШУРА - {plan['name']} ({plan['stcoins']} STCoins)",
            return_url=correct_return_url,
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
            "return_url": correct_return_url,
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
        
        logger.info(f"✅ Платеж создан: {payment_id} для пользователя {request.telegram_id} план {request.plan_id} ({plan['name']})")
        logger.info(f"🎯 Return URL установлен: {correct_return_url}")
        
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

@app.post("/api/v1/payments/recovery/process")
async def recover_failed_payments():
    """🔧 Восстановление платежей которые не были обработаны из-за ошибок"""
    
    if not payment_service:
        raise HTTPException(status_code=503, detail="Payment service unavailable")
    
    try:
        logger.info("🔧 Запуск восстановления неудачных платежей...")
        
        # 🔧 ИСПРАВЛЕНО: Используем правильный API database.py
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # Получаем платежи со статусом pending за последние 24 часа
        if db.DB_CONFIG['type'] == 'postgresql':
            recovery_query = """
                SELECT yookassa_payment_id, telegram_id, stcoins_amount, created_at
                FROM payments 
                WHERE status = 'pending' 
                AND created_at >= NOW() - INTERVAL '24 hours'
                ORDER BY created_at DESC
            """
            cursor.execute(recovery_query)
        else:
            recovery_query = """
                SELECT yookassa_payment_id, telegram_id, stcoins_amount, created_at
                FROM payments 
                WHERE status = 'pending' 
                AND datetime(created_at) >= datetime('now', '-24 hours')
                ORDER BY created_at DESC
            """
            cursor.execute(recovery_query)
        
        pending_payments = cursor.fetchall()
        conn.close()
        
        recovered_count = 0
        recovery_details = []
        
        for payment in pending_payments:
            yookassa_payment_id = payment[0]
            telegram_id = payment[1] 
            stcoins_amount = payment[2]
            created_at = payment[3]
            
            try:
                # Проверяем статус в ЮKassa
                from yookassa import Payment
                yookassa_payment = Payment.find_one(yookassa_payment_id)
                
                if yookassa_payment and yookassa_payment.status == 'succeeded':
                    logger.info(f"🔧 Восстанавливаем платеж: {yookassa_payment_id} для user {telegram_id}")
                    
                    # Обрабатываем платеж
                    success = payment_service.process_successful_payment(yookassa_payment_id)
                    
                    if success:
                        recovered_count += 1
                        recovery_details.append({
                            "yookassa_payment_id": yookassa_payment_id,
                            "telegram_id": telegram_id,
                            "stcoins_amount": stcoins_amount,
                            "status": "recovered",
                            "created_at": str(created_at)
                        })
                        logger.info(f"✅ Платеж {yookassa_payment_id} восстановлен")
                    else:
                        recovery_details.append({
                            "yookassa_payment_id": yookassa_payment_id,
                            "telegram_id": telegram_id,
                            "stcoins_amount": stcoins_amount,
                            "status": "failed_to_recover",
                            "created_at": str(created_at)
                        })
                        
            except Exception as e:
                logger.error(f"❌ Ошибка восстановления платежа {yookassa_payment_id}: {e}")
                recovery_details.append({
                    "yookassa_payment_id": yookassa_payment_id,
                    "telegram_id": telegram_id,
                    "stcoins_amount": stcoins_amount,
                    "status": "error",
                    "error": str(e),
                    "created_at": str(created_at)
                })
        
        logger.info(f"🎉 Восстановление завершено: {recovered_count} платежей из {len(pending_payments)}")
        
        return {
            "recovered_count": recovered_count,
            "total_checked": len(pending_payments),
            "recovery_details": recovery_details,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Ошибка восстановления платежей: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === НОВЫЕ ЭНДПОИНТЫ ДЛЯ СИСТЕМЫ ОТЗЫВОВ ===

@app.post("/api/v1/feedback/submit")
async def submit_feedback(request: Request):
    """🏆 Отправка отзыва с автоматическим начислением бонуса"""
    
    correlation_id = str(uuid.uuid4())
    start_time = time.time()
    
    try:
        data = await request.json()
        
        # Валидация данных
        telegram_id = data.get('telegram_id')
        feedback_text = data.get('feedback_text', '').strip()
        feedback_rating = data.get('feedback_rating', 'positive')
        consultation_id = data.get('consultation_id')
        
        # Получаем IP и User-Agent для анализа
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent', '')
        
        logger.info(f"📝 [{correlation_id}] Получен отзыв от user_id: {telegram_id} rating: {feedback_rating}")
        
        if not telegram_id or not feedback_text:
            raise HTTPException(status_code=400, detail="Отсутствуют обязательные данные")
        
        # Валидация рейтинга
        if feedback_rating not in ['positive', 'negative']:
            raise HTTPException(status_code=400, detail="Некорректный рейтинг. Должен быть 'positive' или 'negative'")
        
        # Валидация длины отзыва
        if len(feedback_text) < 150:
            raise HTTPException(
                status_code=400, 
                detail=f"Отзыв слишком короткий. Минимум 150 символов, получено: {len(feedback_text)}"
            )
        
        if len(feedback_text) > 1000:
            raise HTTPException(
                status_code=400, 
                detail="Отзыв слишком длинный. Максимум 1000 символов"
            )
        
        # Простая проверка на спам (повторяющиеся символы)
        if is_spam_text(feedback_text):
            raise HTTPException(status_code=400, detail="Обнаружен спам в тексте отзыва")
        
        # Сохраняем отзыв в БД
        feedback_id = db.save_feedback_submission(
            telegram_id=telegram_id,
            feedback_text=feedback_text,
            feedback_rating=feedback_rating,
            consultation_id=consultation_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        if not feedback_id:
            raise HTTPException(status_code=500, detail="Ошибка сохранения отзыва")
        
        # 🔔 НОВОЕ: ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ АДМИНУ
        try:
            user_data = db.get_user(telegram_id)
            feedback_notification_data = {
                'id': feedback_id,
                'telegram_id': telegram_id,
                'feedback_text': feedback_text,
                'feedback_rating': feedback_rating,
                'character_count': len(feedback_text),
                'consultation_id': consultation_id,
                'bonus_awarded': len(feedback_text) >= 150,
                'created_at': datetime.now().isoformat()
            }
            asyncio.create_task(notify_new_feedback(feedback_notification_data, user_data))
            logger.info(f"📬 Уведомление о отзыве ID={feedback_id} поставлено в очередь отправки")
        except Exception as e:
            logger.error(f"⚠️ Ошибка отправки уведомления админу: {e}")
        
        # 🎁 НАЧИСЛЯЕМ БОНУС ЗА ОТЗЫВ (только если >= 150 символов)
        bonus_awarded = False
        new_balance = None
        
        if len(feedback_text) >= 150:
            if financial_service:
                bonus_result = financial_service.safe_balance_operation(
                    telegram_id=telegram_id,
                    amount_change=10,  # +1 консультация = 10 STcoins
                    operation_type="feedback_bonus",
                    correlation_id=correlation_id,
                    metadata={
                        "feedback_id": feedback_id,
                        "character_count": len(feedback_text),
                        "feedback_rating": feedback_rating,
                        "service": "feedback_system"
                    }
                )
                
                if bonus_result['success']:
                    bonus_awarded = True
                    new_balance = bonus_result['new_balance']
                    
                    # Отмечаем что бонус начислен
                    db.mark_feedback_bonus_awarded(feedback_id)
                    
                    logger.info(f"💰 [{correlation_id}] Бонус начислен: user_id={telegram_id} new_balance={new_balance}")
                else:
                    logger.error(f"❌ [{correlation_id}] Ошибка начисления бонуса: {bonus_result}")
            else:
                # Fallback на старую систему
                try:
                    new_balance = db.update_user_balance(telegram_id, 10, "feedback_bonus")
                    bonus_awarded = True
                    db.mark_feedback_bonus_awarded(feedback_id)
                    logger.info(f"💰 [{correlation_id}] Бонус начислен (fallback): user_id={telegram_id} new_balance={new_balance}")
                except Exception as e:
                    logger.error(f"❌ [{correlation_id}] Ошибка начисления бонуса (fallback): {e}")
        
        # Логируем успешное завершение
        db.log_feedback_prompt(telegram_id, consultation_id or 0, 'completed')
        
        processing_time = time.time() - start_time
        
        logger.info(f"✅ [{correlation_id}] Отзыв обработан: feedback_id={feedback_id} rating={feedback_rating} bonus={bonus_awarded} time={processing_time:.2f}s")
        
        return {
            "feedback_id": feedback_id,
            "bonus_awarded": bonus_awarded,
            "balance": new_balance,
            "character_count": len(feedback_text),
            "feedback_rating": feedback_rating,
            "correlation_id": correlation_id,
            "processing_time": round(processing_time, 2),
            "status": "success",
            "message": "🎉 Спасибо за отзыв! Вы получили +1 консультацию." if bonus_awarded else "Спасибо за отзыв!"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [{correlation_id}] Критическая ошибка обработки отзыва: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")

@app.get("/api/v1/feedback/can-prompt/{telegram_id}")
async def can_show_feedback_prompt(telegram_id: int):
    """Проверка возможности показа формы отзыва"""
    try:
        can_show = db.can_show_feedback_prompt(telegram_id)
        
        return {
            "telegram_id": telegram_id,
            "can_show_prompt": can_show,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Ошибка проверки возможности показа отзыва для {telegram_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/feedback/prompt-action")
async def log_feedback_prompt_action(request: Request):
    """Логирование действий пользователя с формой отзыва"""
    try:
        data = await request.json()
        
        telegram_id = data.get('telegram_id')
        consultation_id = data.get('consultation_id', 0)
        action = data.get('action', 'shown')  # shown/dismissed/completed
        dismissal_reason = data.get('dismissal_reason')
        
        if not telegram_id:
            raise HTTPException(status_code=400, detail="Отсутствует telegram_id")
        
        success = db.log_feedback_prompt(
            telegram_id=telegram_id,
            consultation_id=consultation_id,
            action=action,
            dismissal_reason=dismissal_reason
        )
        
        if success:
            return {
                "telegram_id": telegram_id,
                "action": action,
                "logged_at": datetime.now().isoformat(),
                "status": "success"
            }
        else:
            raise HTTPException(status_code=500, detail="Ошибка логирования действия")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка логирования действия с формой отзыва: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/feedback/stats")
async def get_feedback_stats():
    """📊 Статистика системы отзывов"""
    try:
        stats = db.get_feedback_stats()
        
        return {
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения статистики отзывов: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/admin/test-notifications")
async def test_notifications():
    """🧪 ТЕСТ: Проверка работы уведомлений админу"""
    if not NOTIFICATIONS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Система уведомлений недоступна")
    try:
        success = await test_admin_notifications()
        if success:
            return {
                "status": "success",
                "message": "Тестовое уведомление отправлено успешно",
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "status": "failed", 
                "message": "Не удалось отправить тестовое уведомление",
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"Ошибка тестирования уведомлений: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

def is_spam_text(text: str) -> bool:
    """Простая проверка на спам"""
    try:
        # Проверка на повторяющиеся символы
        char_counts = {}
        for char in text:
            char_counts[char] = char_counts.get(char, 0) + 1
        
        total_chars = len(text)
        for char, count in char_counts.items():
            if count / total_chars > 0.3:  # Если один символ составляет >30%
                return True
        
        # Проверка на повторяющиеся слова
        words = text.lower().split()
        if len(words) < 5:
            return False
            
        word_counts = {}
        for word in words:
            if len(word) > 2:  # Игнорируем короткие слова
                word_counts[word] = word_counts.get(word, 0) + 1
        
        total_words = len([w for w in words if len(w) > 2])
        for word, count in word_counts.items():
            if total_words > 0 and count / total_words > 0.4:  # Если одно слово >40%
                return True
        
        return False
        
    except Exception:
        return False  # В случае ошибки не блокируем

# 🆕 НОВЫЕ ЭНДПОИНТЫ для keep-alive
@app.get("/health")
async def health():
    """Быстрый health check без DB операций"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health/deep")
async def deep_health_check():
    """Полная диагностика (только для внутреннего использования)"""
    try:
        # Здесь выполняем проверку БД
        pass
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.get("/ping")
async def ping():
    """Простой ping для keep-alive"""
    return {"status": "pong", "timestamp": datetime.now().isoformat()}

@app.get("/status")
async def service_status():
    """Детальный статус сервиса"""
    try:
        # Проверяем компоненты
        db = MishuraDB()
        stats = db.get_stats()
        
        # Проверяем Gemini AI
        gemini_status = "unknown"
        try:
            from gemini_ai import test_gemini_connection
            gemini_test = await test_gemini_connection()
            gemini_status = "connected" if gemini_test else "disconnected"
        except:
            gemini_status = "error"
        
        return {
            "service": "МИШУРА AI Stylist",
            "status": "operational",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "database": "connected",
                "gemini_ai": gemini_status,
                "webapp": "running",
                "api": "running"
            },
            "statistics": stats,
            "environment": os.getenv("RENDER", "local")
        }
        
    except Exception as e:
        logger.error(f"❌ Status check failed: {e}")
        return {
            "service": "МИШУРА AI Stylist",
            "status": "degraded",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# 🆕 KEEP-ALIVE механизм для предотвращения засыпания
class RenderKeepAlive:
    """Класс для поддержания активности Render сервиса"""
    
    def __init__(self):
        self.app_url = os.getenv('RENDER_EXTERNAL_URL', 'https://mi-q7ae.onrender.com')
        self.is_running = False
        
    async def ping_self(self):
        """Ping собственного сервиса"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.get(f"{self.app_url}/ping") as response:
                    if response.status == 200:
                        logger.info("🏓 Keep-alive ping successful")
                        return True
                    else:
                        logger.warning(f"⚠️ Keep-alive ping failed: {response.status}")
                        return False
        except Exception as e:
            logger.warning(f"⚠️ Keep-alive ping error: {e}")
            return False
    
    async def start_keepalive(self):
        """Запуск keep-alive процесса"""
        if self.is_running:
            return
            
        self.is_running = True
        logger.info("🚀 Запуск Render Keep-Alive сервиса")
        
        while self.is_running:
            try:
                # Пингуем себя каждые 10 минут
                await asyncio.sleep(600)  # 10 minutes
                await self.ping_self()
                
            except Exception as e:
                logger.error(f"❌ Keep-alive error: {e}")
                await asyncio.sleep(60)  # Retry in 1 minute
    
    def stop_keepalive(self):
        """Остановка keep-alive"""
        self.is_running = False
        logger.info("🛑 Render Keep-Alive остановлен")

# Глобальный экземпляр keep-alive
keep_alive = RenderKeepAlive()

@app.on_event("startup")
async def startup_event():
    """Запуск приложения"""
    logger.info("🚀 Запуск МИШУРА API сервера")
    
    # Запускаем keep-alive только на Render
    if os.getenv('RENDER'):
        asyncio.create_task(keep_alive.start_keepalive())
        logger.info("🏓 Render Keep-Alive активирован")

@app.on_event("shutdown")
async def shutdown_event():
    """Остановка приложения"""
    logger.info("🛑 Остановка МИШУРА API сервера")
    keep_alive.stop_keepalive()

# === ДИАГНОСТИЧЕСКИЕ ENDPOINTS ===

@app.get("/api/v1/diagnostics/health")
async def comprehensive_health_check():
    """🔍 Комплексная диагностика состояния сервиса"""
    start_time = time.time()
    try:
        memory_info = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=1)
        db_status = "unknown"
        db_response_time = None
        try:
            db_start = time.time()
            stats = db.get_stats()
            db_response_time = time.time() - db_start
            db_status = "healthy"
        except Exception as e:
            db_status = f"error: {str(e)}"
        gemini_status = "unknown"
        gemini_response_time = None
        try:
            gemini_start = time.time()
            gemini_test = await gemini_ai.test_gemini_connection()
            gemini_response_time = time.time() - gemini_start
            gemini_status = "healthy" if gemini_test else "quota_exceeded"
        except Exception as e:
            gemini_status = f"error: {str(e)}"
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time
        gc_stats = gc.get_stats()
        total_time = time.time() - start_time
        health_report = {
            "timestamp": datetime.now().isoformat(),
            "service_status": "healthy",
            "render_plan": "starter",
            "diagnostics": {
                "response_time_ms": round(total_time * 1000, 2),
                "system": {
                    "cpu_percent": cpu_percent,
                    "memory_used_mb": round(memory_info.used / 1024 / 1024, 2),
                    "memory_available_mb": round(memory_info.available / 1024 / 1024, 2),
                    "memory_percent": memory_info.percent,
                    "uptime_hours": round(uptime.total_seconds() / 3600, 2)
                },
                "database": {
                    "status": db_status,
                    "response_time_ms": round(db_response_time * 1000, 2) if db_response_time else None
                },
                "gemini_ai": {
                    "status": gemini_status,
                    "response_time_ms": round(gemini_response_time * 1000, 2) if gemini_response_time else None
                },
                "python": {
                    "gc_collections": len(gc_stats),
                    "gc_objects": sum(stat['collected'] for stat in gc_stats)
                }
            },
            "alerts": []
        }
        if memory_info.percent > 80:
            health_report["alerts"].append("⚠️ High memory usage")
        if cpu_percent > 80:
            health_report["alerts"].append("⚠️ High CPU usage")
        if gemini_status == "quota_exceeded":
            health_report["alerts"].append("🔄 Gemini API quota exceeded")
        if db_response_time and db_response_time > 1.0:
            health_report["alerts"].append("🐌 Slow database response")
        return health_report
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "timestamp": datetime.now().isoformat(),
            "service_status": "unhealthy",
            "error": str(e),
            "render_plan": "starter"
        }

@app.get("/api/v1/diagnostics/cold-start")
async def cold_start_test():
    """🧊 Тест холодного старта"""
    start_time = time.time()
    operations = {}
    db_start = time.time()
    try:
        test_db = MishuraDB()
        test_db.get_stats()
        operations["database_init"] = time.time() - db_start
    except Exception as e:
        operations["database_init"] = f"error: {e}"
    env_start = time.time()
    env_vars = {
        "TELEGRAM_TOKEN": "set" if os.getenv('TELEGRAM_TOKEN') else "missing",
        "GEMINI_API_KEY": "set" if os.getenv('GEMINI_API_KEY') else "missing",
        "WEBAPP_URL": os.getenv('WEBAPP_URL', 'not_set'),
        "ENVIRONMENT": os.getenv('ENVIRONMENT', 'not_set')
    }
    operations["env_check"] = time.time() - env_start
    import_start = time.time()
    try:
        import google.generativeai as genai
        operations["heavy_imports"] = time.time() - import_start
    except Exception as e:
        operations["heavy_imports"] = f"error: {e}"
    total_time = time.time() - start_time
    return {
        "cold_start_test": {
            "total_time_ms": round(total_time * 1000, 2),
            "operations": {k: round(v * 1000, 2) if isinstance(v, float) else v 
                         for k, v in operations.items()},
            "environment": env_vars,
            "timestamp": datetime.now().isoformat()
        },
        "recommendations": {
            "acceptable_cold_start": "< 10 seconds",
            "your_result": f"{total_time:.2f} seconds",
            "status": "good" if total_time < 10 else "slow"
        }
    }

@app.get("/api/v1/diagnostics/memory")
async def memory_diagnostics():
    """🧠 Диагностика использования памяти"""
    try:
        memory = psutil.virtual_memory()
        import sys
        python_objects = len(gc.get_objects())
        process = psutil.Process()
        process_memory = process.memory_info()
        return {
            "memory_diagnostics": {
                "system": {
                    "total_mb": round(memory.total / 1024 / 1024, 2),
                    "used_mb": round(memory.used / 1024 / 1024, 2),
                    "available_mb": round(memory.available / 1024 / 1024, 2),
                    "percent": memory.percent
                },
                "process": {
                    "rss_mb": round(process_memory.rss / 1024 / 1024, 2),
                    "vms_mb": round(process_memory.vms / 1024 / 1024, 2),
                    "python_objects": python_objects
                },
                "limits": {
                    "starter_plan_limit_mb": 512,
                    "memory_pressure": memory.percent > 80,
                    "process_size_ok": process_memory.rss < 400 * 1024 * 1024
                }
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"error": str(e), "timestamp": datetime.now().isoformat()}

@app.get("/api/v1/diagnostics/gemini-quota")
async def gemini_quota_diagnostics():
    """🤖 Детальная диагностика квот Gemini API"""
    try:
        test_start = time.time()
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content("Hi", 
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=1,
                    temperature=0
                ))
            test_time = time.time() - test_start
            return {
                "gemini_quota_status": {
                    "status": "available",
                    "response_time_ms": round(test_time * 1000, 2),
                    "test_response": str(response.text)[:50],
                    "model": "gemini-1.5-flash",
                    "quota_info": {
                        "tier": "free",
                        "daily_limit": 50,
                        "note": "Quota resets at 00:00 UTC"
                    }
                },
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            error_msg = str(e).lower()
            if 'quota' in error_msg or '429' in error_msg:
                return {
                    "gemini_quota_status": {
                        "status": "quota_exceeded",
                        "error": str(e),
                        "diagnosis": "Daily quota of 50 requests exceeded",
                        "reset_time": "00:00 UTC tomorrow",
                        "recommendation": "Wait for quota reset or upgrade to paid tier"
                    },
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "gemini_quota_status": {
                        "status": "api_error",
                        "error": str(e),
                        "diagnosis": "API connectivity or configuration issue"
                    },
                    "timestamp": datetime.now().isoformat()
                }
    except Exception as e:
        return {
            "gemini_quota_status": {
                "status": "system_error",
                "error": str(e)
            },
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/v1/diagnostics/render-logs")
async def render_deployment_info():
    """📋 Информация о deployment в Render"""
    return {
        "render_info": {
            "service_name": os.getenv('RENDER_SERVICE_NAME', 'unknown'),
            "service_id": os.getenv('RENDER_SERVICE_ID', 'unknown'),
            "deploy_id": os.getenv('RENDER_DEPLOY_ID', 'unknown'),
            "git_commit": os.getenv('RENDER_GIT_COMMIT', 'unknown'),
            "external_url": os.getenv('RENDER_EXTERNAL_URL', 'unknown'),
            "region": os.getenv('RENDER_REGION', 'unknown'),
            "plan": "starter",
            "should_not_sleep": True
        },
        "python_info": {
            "version": sys.version,
            "executable": sys.executable,
            "path": sys.path[:3]
        },
        "timestamp": datetime.now().isoformat()
    }

# === ENDPOINT ДЛЯ КОМПЛЕКСНОЙ ДИАГНОСТИКИ ===

@app.get("/api/v1/diagnostics/full-report")
async def full_diagnostic_report():
    """📊 Полный диагностический отчет"""
    report_start = time.time()
    health = await comprehensive_health_check()
    cold_start = await cold_start_test()
    memory = await memory_diagnostics()
    gemini = await gemini_quota_diagnostics()
    render_info = await render_deployment_info()
    total_time = time.time() - report_start
    return {
        "full_diagnostic_report": {
            "generated_at": datetime.now().isoformat(),
            "report_generation_time_ms": round(total_time * 1000, 2),
            "summary": {
                "service_healthy": health.get("service_status") == "healthy",
                "memory_ok": memory.get("memory_diagnostics", {}).get("limits", {}).get("memory_pressure", True) == False,
                "gemini_available": gemini.get("gemini_quota_status", {}).get("status") == "available",
                "cold_start_acceptable": cold_start.get("recommendations", {}).get("status") == "good"
            },
            "detailed_reports": {
                "health": health,
                "cold_start": cold_start,
                "memory": memory,
                "gemini": gemini,
                "render": render_info
            }
        }
    }

# =================== WEBSOCKET ENDPOINT ДЛЯ БАЛАНСА ===================

@app.websocket("/ws/balance")
async def balance_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Ожидаем идентификатор пользователя (user_id) от клиента
            data = await websocket.receive_json()
            user_id = data.get("user_id")
            if not user_id:
                await websocket.send_json({"error": "user_id required"})
                continue
            # Получаем баланс пользователя
            db = MishuraDB()
            user = db.get_user(user_id)
            if user:
                await websocket.send_json({"balance": user.get("balance", 0)})
            else:
                await websocket.send_json({"error": "user not found"})
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
    finally:
        await websocket.close()

# =================== ENDPOINT ДЛЯ ОБНОВЛЕНИЯ АКТИВНОСТИ УСТРОЙСТВА ===================

from fastapi import Body

@app.post("/api/v1/users/activity")
async def update_device_activity(data: Dict[str, Any] = Body(...)):
    """
    Обновление активности устройства (heartbeat)
    Ожидает: { device_fingerprint: str }
    """
    try:
        device_fingerprint = data.get("device_fingerprint")
        if not device_fingerprint:
            raise HTTPException(status_code=400, detail="device_fingerprint required")
        db = MishuraDB()
        success = db.update_device_activity(device_fingerprint)
        if success:
            return {"status": "success", "device_fingerprint": device_fingerprint}
        else:
            raise HTTPException(status_code=500, detail="Ошибка обновления активности устройства")
    except Exception as e:
        logger.error(f"❌ Ошибка обновления активности устройства: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сервера: {str(e)}")

if __name__ == "__main__":
    logger.info(f"🎭 МИШУРА API Server starting on port {PORT}")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=PORT,
        reload=DEBUG and ENVIRONMENT != 'production',
        log_level="info" if not DEBUG else "debug"
    )