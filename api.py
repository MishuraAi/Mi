#!/usr/bin/env python3
"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Production API сервер с интеграцией ЮKassa (api.py)
ВЕРСИЯ: 1.3.1 - ИСПРАВЛЕНЫ ПРОБЛЕМЫ RENDER.COM
ДАТА ОБНОВЛЕНИЯ: 2025-06-16

НАЗНАЧЕНИЕ:
FastAPI сервер для обработки запросов анализа изображений через Gemini AI
+ интеграция платежной системы ЮKassa

ИСПРАВЛЕНИЯ v1.3.1:
- Исправлены CORS настройки для Render.com
- Убрана блокирующая проверка payment_service.configured
- Добавлено детальное логирование ошибок
- Исправлена обработка тестовых ключей ЮKassa
==========================================================================================
"""

import os
import sys
import asyncio
from datetime import datetime
from pathlib import Path
import logging
import base64
import json
import traceback
from typing import Optional, List, Dict, Any
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
import google.generativeai as genai
from PIL import Image
import io
from fastapi.staticfiles import StaticFiles

# Добавляем текущую директорию в путь для импорта database.py и payment_service.py
sys.path.append(str(Path(__file__).parent))

try:
    import database
except ImportError:
    print("❌ ОШИБКА: Не удалось импортировать database.py")
    print("💡 Убедитесь, что файл database.py находится в той же папке")
    sys.exit(1)

try:
    import payment_service
except ImportError:
    print("❌ ОШИБКА: Не удалось импортировать payment_service.py")
    print("💡 Убедитесь, что файл payment_service.py находится в той же папке")
    sys.exit(1)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(name)s - %(message)s',
    handlers=[
        logging.FileHandler('api_server.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("MishuraAPI")

# Загрузка переменных окружения
from dotenv import load_dotenv
load_dotenv()

# Конфигурация
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('BACKEND_PORT', 8000))

# Создание FastAPI приложения
app = FastAPI(
    title="МИШУРА ИИ-Стилист API с ЮKassa",
    description="API для анализа стиля одежды с помощью Google Gemini AI + платежная система",
    version="1.3.1",
    docs_url="/api/v1/docs" if DEBUG else None,
    redoc_url="/api/v1/redoc" if DEBUG else None
)

# ИСПРАВЛЕННАЯ НАСТРОЙКА CORS ДЛЯ RENDER.COM
if ENVIRONMENT == 'production':
    origins = [
        "https://style-ai-bot.onrender.com",
        "https://style-ai-bot.onrender.com/webapp",
        "http://localhost:8000",  # Для локального тестирования
        "http://127.0.0.1:8000"
    ]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Добавлен OPTIONS
    allow_headers=["*"],
)

# Инициализация Gemini AI
gemini_configured = False
gemini_model = None

def init_gemini():
    """Инициализация Gemini AI"""
    global gemini_configured, gemini_model
    
    try:
        if not GEMINI_API_KEY:
            logger.error("❌ GEMINI_API_KEY не найден в переменных окружения")
            return False
        
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel(GEMINI_MODEL)
        
        # Тестовый запрос
        test_response = gemini_model.generate_content("Test connection")
        
        gemini_configured = True
        logger.info(f"✅ Gemini AI подключен успешно (модель: {GEMINI_MODEL})")
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка подключения к Gemini AI: {e}")
        gemini_configured = False
        return False

# Модели данных для существующих эндпоинтов
class AnalyzeRequest(BaseModel):
    occasion: str = "повседневный"
    preferences: Optional[str] = None
    user_id: Optional[int] = None

class CompareRequest(BaseModel):
    occasion: str = "повседневный"
    preferences: Optional[str] = None
    user_id: Optional[int] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    gemini_configured: bool
    gemini_working: bool
    environment: str
    timestamp: str

# НОВЫЕ МОДЕЛИ ДАННЫХ ДЛЯ ПЛАТЕЖЕЙ
class CreatePaymentRequest(BaseModel):
    user_id: int
    package_id: str
    return_url: Optional[str] = None

class WebhookRequest(BaseModel):
    event: str
    object: Dict[str, Any]

# Модели данных для работы с пользователем
class UserBalanceRequest(BaseModel):
    user_id: int

class UserBalanceResponse(BaseModel):
    status: str
    user_id: int
    balance: int
    consultations_available: int
    timestamp: str

class UserInitRequest(BaseModel):
    user_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

# Утилиты для работы с изображениями
def process_image(image_data: bytes) -> Image.Image:
    """Обработка изображения"""
    try:
        image = Image.open(io.BytesIO(image_data))
        
        # Конвертируем в RGB если нужно
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Изменяем размер если изображение слишком большое
        max_size = 1024
        if max(image.size) > max_size:
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        return image
        
    except Exception as e:
        logger.error(f"❌ Ошибка обработки изображения: {e}")
        raise HTTPException(status_code=400, detail="Некорректный формат изображения")

async def analyze_with_gemini(image: Image.Image, occasion: str, preferences: str = None) -> str:
    """Анализ изображения с помощью Gemini AI"""
    try:
        if not gemini_configured:
            raise HTTPException(status_code=503, detail="Gemini AI недоступен")
        
        # НОВЫЙ ПРОМПТ для Instagram-блогера
        prompt = f"""
Ты — модный Instagram-блогер с 1 млн подписчиков из России. Твои подписчики обожают тебя за лёгкость, чувство стиля и дружелюбные советы. Ты всегда даешь понятные, стильные и трендовые рекомендации. Используй выражения, которые популярны в соцсетях, не бойся лайфхаков и визуальных метафор. Будь как подружка, которая всегда скажет честно — но с любовью.

ПОВОД: {occasion}
{'ПРЕДПОЧТЕНИЯ: ' + preferences if preferences else ''}

Проанализируй образ и дай краткие, но емкие советы:

1. **Общее впечатление** (1-2 предложения)
2. **Что работает** в образе 
3. **Что можно улучшить** (конкретные советы)
4. **Прическа и макияж** (если видно)
5. **Рейтинг: X/10** и почему

Пиши живо, с эмодзи, как в Инстаграме. Начни с эмодзи и "Привет, красотка!"

Пример стиля: "Обожаю total beige, но здесь не хватает контраста. Добавь яркий багет или красную помаду — и образ заиграет ✨"

Будь краткой, но точной!
"""
        
        # Отправляем запрос к Gemini
        response = await asyncio.to_thread(
            gemini_model.generate_content, 
            [prompt, image]
        )
        
        if not response.text:
            raise Exception("Пустой ответ от Gemini")
        
        logger.info("✅ Анализ Gemini AI выполнен успешно")
        return response.text
        
    except Exception as e:
        logger.error(f"❌ Ошибка анализа Gemini: {e}")
        # Возвращаем fallback ответ в новом стиле
        return f"""
💫 Привет, красотка!

## ⚠️ Ой, технический сбой!

Прости, сейчас немного глючит, но скоро все исправим!

**Повод:** {occasion}

**Быстрые советы на всякий случай:**
• Проверь посадку — все должно сидеть идеально!
• Максимум 3 цвета в образе, остальное — детали
• Один яркий акцент и ты звезда ⭐
• Не забывай про аксессуары — они делают образ

**Рейтинг:** Увидимся через минутку! 💕

*Попробуй еще раз, я уже скучаю! 🥰*
"""

async def compare_with_gemini(images: List[Image.Image], occasion: str, preferences: str = None) -> str:
    """Сравнение нескольких образов с помощью Gemini AI"""
    try:
        if not gemini_configured:
            raise HTTPException(status_code=503, detail="Gemini AI недоступен")
        
        # НОВЫЙ ПРОМПТ для сравнения в стиле Instagram-блогера
        prompt = f"""
Ты — модный Instagram-блогер с 1 млн подписчиков из России. Твои подписчики обожают тебя за лёгкость, чувство стиля и дружелюбные советы.

Сравни эти {len(images)} образа для: {occasion}
{'Учти предпочтения: ' + preferences if preferences else ''}

Для каждого образа дай:
1. **Краткое описание** (1 предложение)
2. **Рейтинг X/10** 
3. **Почему именно такая оценка**
4. **Прическа/макияж** (если видно)

Потом **ИТОГОВЫЙ ВЕРДИКТ**: какой образ лучше и почему.

Пиши живо, с эмодзи, как подружка! Начни с "Ого, какая дилемма! 😍"

Будь краткой, но честной!
"""
        
        # Подготавливаем контент для отправки
        content = [prompt] + images
        
        response = await asyncio.to_thread(
            gemini_model.generate_content,
            content
        )
        
        if not response.text:
            raise Exception("Пустой ответ от Gemini")
        
        logger.info(f"✅ Сравнение {len(images)} образов выполнено успешно")
        return response.text
        
    except Exception as e:
        logger.error(f"❌ Ошибка сравнения Gemini: {e}")
        return f"""
😍 Ого, какая дилемма!

## ⚠️ Упс, технические неполадки!

Хочется сравнить все твои образы, но что-то глючит!

**Повод:** {occasion}

**Мои универсальные правила выбора:**
🎯 Подходит ли дресс-коду события?
💫 Чувствуешь ли себя уверенно?
✨ Все ли элементы в гармонии?
💕 Нравится ли тебе самой?

**Совет:** Выбирай тот, в котором чувствуешь себя на 100! 

*Попробуй еще раз, решим эту дилемму вместе! 💪*
"""

# Подключаем статические файлы веб-приложения  
app.mount("/webapp", StaticFiles(directory="webapp"), name="webapp")

# ===========================================================================
# СУЩЕСТВУЮЩИЕ API РОУТЫ (без изменений)
# ===========================================================================

@app.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    """Проверка состояния сервера"""
    
    # Проверяем работоспособность Gemini
    gemini_working = False
    if gemini_configured:
        try:
            test_response = await asyncio.to_thread(
                gemini_model.generate_content, 
                "Test"
            )
            gemini_working = bool(test_response.text)
        except:
            gemini_working = False
    
    return HealthResponse(
        status="healthy",
        service="МИШУРА ИИ-Стилист API с ЮKassa",
        version="1.3.1",
        gemini_configured=gemini_configured,
        gemini_working=gemini_working,
        environment=ENVIRONMENT,
        timestamp=datetime.now().isoformat()
    )

@app.post("/api/v1/analyze")
async def analyze_clothing(
    request: Request,
    file: UploadFile = File(...),
    occasion: str = Form("повседневный"),
    preferences: Optional[str] = Form(None),
    user_id: Optional[int] = Form(None)
):
    """Анализ одного изображения одежды"""
    
    logger.info(f"📤 Получен запрос на анализ: {file.filename}, повод: {occasion}")
    
    try:
        # Проверяем тип файла
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Файл должен быть изображением")
        
        # Читаем и обрабатываем изображение
        image_data = await file.read()
        image = process_image(image_data)
        
        # Анализируем с помощью Gemini
        advice = await analyze_with_gemini(image, occasion, preferences)
        
        # Сохраняем консультацию в базу данных
        consultation_id = None
        if user_id:
            try:
                consultation_id = database.save_consultation(
                    user_id=user_id,
                    occasion=occasion,
                    preferences=preferences,
                    image_path=file.filename,
                    advice=advice
                )
                
                # Списываем баланс
                database.update_user_balance(user_id, -10)  # STcoin: списываем 10 STcoin
                logger.info(f"💰 Баланс пользователя {user_id} уменьшен на 10 STcoin")
                
            except Exception as e:
                logger.warning(f"⚠️ Ошибка сохранения в БД: {e}")
        
        response_data = {
            "status": "success",
            "advice": advice,
            "metadata": {
                "consultation_id": consultation_id,
                "occasion": occasion,
                "preferences": preferences,
                "timestamp": datetime.now().isoformat(),
                "model": GEMINI_MODEL,
                "environment": ENVIRONMENT
            }
        }
        
        logger.info(f"✅ Анализ завершен успешно (ID: {consultation_id})")
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка анализа: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка анализа: {str(e)}")

@app.post("/api/v1/compare")
async def compare_clothing(
    request: Request,
    files: List[UploadFile] = File(...),
    occasion: str = Form("повседневный"),
    preferences: Optional[str] = Form(None),
    user_id: Optional[int] = Form(None)
):
    """Сравнение нескольких образов"""
    
    logger.info(f"📤 Получен запрос на сравнение: {len(files)} изображений, повод: {occasion}")
    
    try:
        if len(files) < 2:
            raise HTTPException(status_code=400, detail="Нужно минимум 2 изображения для сравнения")
        
        if len(files) > 4:
            raise HTTPException(status_code=400, detail="Максимум 4 изображения для сравнения")
        
        # Обрабатываем все изображения
        images = []
        for file in files:
            if not file.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail=f"Файл {file.filename} не является изображением")
            
            image_data = await file.read()
            image = process_image(image_data)
            images.append(image)
        
        # Сравниваем с помощью Gemini
        advice = await compare_with_gemini(images, occasion, preferences)
        
        # Сохраняем консультацию в базу данных
        consultation_id = None
        if user_id:
            try:
                filenames = ", ".join([f.filename for f in files])
                consultation_id = database.save_consultation(
                    user_id=user_id,
                    occasion=occasion,
                    preferences=preferences,
                    image_path=filenames,
                    advice=advice
                )
                
                # Списываем баланс (сравнение стоит больше)
                cost = len(files) * 10  # STcoin: 10 STcoin за каждое изображение
                database.update_user_balance(user_id, -cost)
                logger.info(f"💰 Баланс пользователя {user_id} уменьшен на {cost} STcoin")
                
            except Exception as e:
                logger.warning(f"⚠️ Ошибка сохранения в БД: {e}")
        
        response_data = {
            "status": "success",
            "advice": advice,
            "metadata": {
                "consultation_id": consultation_id,
                "occasion": occasion,
                "preferences": preferences,
                "images_count": len(files),
                "timestamp": datetime.now().isoformat(),
                "model": GEMINI_MODEL,
                "environment": ENVIRONMENT
            }
        }
        
        logger.info(f"✅ Сравнение завершено успешно (ID: {consultation_id})")
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка сравнения: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сравнения: {str(e)}")

@app.get("/api/v1/status")
async def get_status():
    """Получение статуса сервера и Gemini AI"""
    return {
        "api_status": "online",
        "gemini_status": "connected" if gemini_configured else "disconnected",
        "environment": ENVIRONMENT,
        "model": GEMINI_MODEL if gemini_configured else None,
        "timestamp": datetime.now().isoformat()
    }

# ===========================================================================
# НОВЫЕ API РОУТЫ ДЛЯ ПЛАТЕЖЕЙ ЮKassa
# ===========================================================================

@app.get("/api/v1/payments/packages")
async def get_payment_packages():
    """Получить доступные пакеты пополнения STcoin"""
    logger.info("📦 Запрос пакетов пополнения")
    
    try:
        packages = payment_service.payment_service.get_packages()
        return JSONResponse(content=packages)
        
    except Exception as e:
        logger.error(f"❌ Ошибка получения пакетов: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения пакетов")

@app.post("/api/v1/payments/create")
async def create_payment(request: CreatePaymentRequest):
    """Создать платеж для пополнения баланса - ИСПРАВЛЕННАЯ ВЕРСИЯ ДЛЯ RENDER.COM"""
    logger.info(f"💳 Создание платежа для user_id={request.user_id}, package={request.package_id}")
    
    try:
        # Логируем входящие данные
        logger.info(f"📥 Request data: user_id={request.user_id}, package_id={request.package_id}, return_url={request.return_url}")
        
        # Проверяем что payment_service инициализирован
        if not hasattr(payment_service, 'payment_service'):
            logger.error("❌ payment_service не инициализирован")
            raise HTTPException(status_code=503, detail="Платежная система не инициализирована")
        
        # ИСПРАВЛЕНИЕ: В продакшне НЕ проверяем configured (тестовые ключи могут не проходить проверку)
        logger.info(f"🔧 Payment service status: configured={payment_service.payment_service.configured}")
        logger.info(f"🔧 Environment: {ENVIRONMENT}")
        logger.info(f"🔧 YuKassa keys present: shop_id={bool(os.getenv('YUKASSA_SHOP_ID'))}, secret_key={bool(os.getenv('YUKASSA_SECRET_KEY'))}")
        
        # Создаем платеж даже если configured=False (для тестовых ключей)
        try:
            result = payment_service.payment_service.create_payment(
                user_id=request.user_id,
                package_id=request.package_id,
                return_url=request.return_url
            )
            
            logger.info(f"🔧 Payment service result status: {result.get('status', 'unknown')}")
            
            if result.get('status') == 'success':
                logger.info(f"✅ Платеж создан: {result.get('payment_id', 'unknown')}")
                return JSONResponse(content=result)
            else:
                logger.error(f"❌ Ошибка создания платежа: {result}")
                
                # Детальное логирование ошибки
                error_detail = result.get('message', 'Не удалось создать платеж')
                error_type = result.get('error', 'unknown')
                
                logger.error(f"❌ Error type: {error_type}")
                logger.error(f"❌ Error detail: {error_detail}")
                
                # Возвращаем более информативную ошибку
                raise HTTPException(
                    status_code=400, 
                    detail={
                        "error": error_type,
                        "message": error_detail,
                        "debug_info": {
                            "environment": ENVIRONMENT,
                            "payment_service_configured": payment_service.payment_service.configured,
                            "yukassa_keys_present": bool(os.getenv('YUKASSA_SHOP_ID') and os.getenv('YUKASSA_SECRET_KEY'))
                        }
                    }
                )
                
        except Exception as payment_error:
            logger.error(f"❌ Exception при создании платежа: {payment_error}")
            logger.error(f"❌ Exception type: {type(payment_error)}")
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            
            # Если это ошибка ЮKassa API
            if "yookassa" in str(payment_error).lower() or "unauthorized" in str(payment_error).lower():
                raise HTTPException(
                    status_code=503,
                    detail=f"Ошибка платежной системы ЮKassa: {str(payment_error)}"
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Внутренняя ошибка: {str(payment_error)}"
                )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Неожиданная ошибка создания платежа: {e}")
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )

@app.post("/api/v1/payments/webhook")
async def payment_webhook(
    request: Request,
    signature: Optional[str] = Header(None, alias="X-Signature")
):
    """Webhook для обработки уведомлений от ЮKassa"""
    logger.info("🔔 Получен webhook от ЮKassa")
    
    try:
        # Читаем тело запроса
        body = await request.body()
        webhook_data = json.loads(body.decode('utf-8'))
        
        logger.debug(f"📨 Webhook данные: {json.dumps(webhook_data, ensure_ascii=False, indent=2)}")
        
        # Проверяем подпись (в продакшне)
        if signature and ENVIRONMENT == 'production':
            is_valid = payment_service.payment_service.validate_webhook_signature(
                body.decode('utf-8'), 
                signature
            )
            if not is_valid:
                logger.warning("⚠️ Неверная подпись webhook")
                raise HTTPException(status_code=401, detail="Неверная подпись")
        
        # Обрабатываем webhook
        result = payment_service.payment_service.process_webhook(webhook_data)
        
        if result['status'] == 'success':
            logger.info(f"✅ Webhook обработан успешно: {result}")
            return JSONResponse(content={"status": "ok"})
        elif result['status'] == 'ignored':
            logger.info(f"ℹ️ Webhook проигнорирован: {result}")
            return JSONResponse(content={"status": "ok"})
        else:
            logger.error(f"❌ Ошибка обработки webhook: {result}")
            return JSONResponse(
                content={"status": "error", "message": result.get('message')},
                status_code=400
            )
            
    except json.JSONDecodeError:
        logger.error("❌ Некорректный JSON в webhook")
        raise HTTPException(status_code=400, detail="Некорректный JSON")
    except Exception as e:
        logger.error(f"❌ Ошибка обработки webhook: {e}")
        raise HTTPException(status_code=500, detail="Ошибка обработки webhook")

@app.get("/api/v1/payments/status/{payment_id}")
async def get_payment_status(payment_id: str):
    """Получить статус платежа"""
    logger.info(f"🔍 Запрос статуса платежа: {payment_id}")
    
    try:
        result = payment_service.payment_service.get_payment_status(payment_id)
        
        if result['status'] == 'success':
            return JSONResponse(content=result)
        else:
            raise HTTPException(
                status_code=404, 
                detail=result.get('message', 'Платеж не найден')
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка получения статуса платежа: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения статуса")

# ===========================================================================
# СТАТИЧЕСКИЕ ФАЙЛЫ И МАРШРУТИЗАЦИЯ
# ===========================================================================

# Главная страница
@app.get("/")
async def read_root():
    return FileResponse('webapp/index.html')

# Catch-all (ПОСЛЕДНИМ!)
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    file_path = Path("webapp") / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    return FileResponse('webapp/index.html')

# ===========================================================================
# СОБЫТИЯ ЖИЗНЕННОГО ЦИКЛА
# ===========================================================================

@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске сервера"""
    logger.info("🚀 Запуск МИШУРА API сервера с ЮKassa...")
    logger.info(f"📋 Среда: {ENVIRONMENT}")
    logger.info(f"🌐 Хост: {HOST}:{PORT}")
    logger.info(f"🔧 Debug режим: {DEBUG}")
    
    # Инициализируем базу данных
    try:
        if database.init_db():
            logger.info("✅ База данных инициализирована")
        else:
            logger.error("❌ Ошибка инициализации базы данных")
    except Exception as e:
        logger.error(f"❌ Ошибка подключения к БД: {e}")
    
    # Инициализируем Gemini AI
    if init_gemini():
        logger.info("✅ Gemini AI готов к работе")
    else:
        logger.warning("⚠️ Gemini AI недоступен, работаем в режиме fallback")
    
    # Проверяем статус платежной системы
    payment_status = payment_service.payment_service.get_service_status()
    logger.info(f"🔧 Payment service status: {payment_status}")
    
    if payment_status['status'] == 'online':
        logger.info("✅ ЮKassa платежная система настроена и готова")
    else:
        logger.warning(f"⚠️ ЮKassa статус: {payment_status['status']}")
        logger.warning("ℹ️ Платежи могут работать в тестовом режиме")
    
    logger.info("🎭 МИШУРА API сервер с ЮKassa полностью готов!")

@app.on_event("shutdown")
async def shutdown_event():
    """Очистка ресурсов при остановке"""
    logger.info("🛑 Остановка МИШУРА API сервера...")

# ===========================================================================
# API РОУТЫ ДЛЯ СИНХРОНИЗАЦИИ БАЛАНСА ПОЛЬЗОВАТЕЛЯ
# ===========================================================================

@app.get("/api/v1/user/{user_id}/balance", response_model=UserBalanceResponse)
async def get_user_balance(user_id: int):
    """Получить актуальный баланс пользователя"""
    logger.info(f"👤 Запрос баланса для user_id={user_id}")
    
    try:
        # Проверяем существует ли пользователь
        user = database.get_user(user_id)
        if not user:
            # Создаем нового пользователя с начальным балансом
            logger.info(f"🆕 Создаем нового пользователя {user_id}")
            database.save_user(user_id, None, None, None)
            # Устанавливаем начальный баланс 200 STcoin
            database.update_user_balance(user_id, 200)
        
        # Получаем текущий баланс
        balance = database.get_user_balance(user_id)
        consultations_available = balance // 10  # 1 консультация = 10 STcoin
        
        logger.info(f"💰 Баланс user_id={user_id}: {balance} STcoin ({consultations_available} консультаций)")
        
        return UserBalanceResponse(
            status="success",
            user_id=user_id,
            balance=balance,
            consultations_available=consultations_available,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"❌ Ошибка получения баланса для user_id={user_id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения баланса")

@app.post("/api/v1/user/init")
async def init_user(request: UserInitRequest):
    """Инициализация пользователя (создание или обновление данных)"""
    logger.info(f"🔄 Инициализация пользователя {request.user_id}")
    
    try:
        # Проверяем существует ли пользователь
        existing_user = database.get_user(request.user_id)
        
        if existing_user:
            logger.info(f"✅ Пользователь {request.user_id} уже существует")
            # Обновляем данные пользователя если они изменились
            if request.username or request.first_name or request.last_name:
                database.save_user(
                    request.user_id, 
                    request.username, 
                    request.first_name, 
                    request.last_name
                )
                logger.info(f"📝 Данные пользователя {request.user_id} обновлены")
        else:
            logger.info(f"🆕 Создаем нового пользователя {request.user_id}")
            # Создаем нового пользователя
            database.save_user(
                request.user_id, 
                request.username, 
                request.first_name, 
                request.last_name
            )
            
            # Устанавливаем начальный баланс 200 STcoin
            database.update_user_balance(request.user_id, 200)
            logger.info(f"💰 Пользователю {request.user_id} начислен стартовый баланс 200 STcoin")
        
        # Получаем актуальный баланс
        balance = database.get_user_balance(request.user_id)
        consultations_available = balance // 10
        
        return {
            "status": "success",
            "user_id": request.user_id,
            "balance": balance,
            "consultations_available": consultations_available,
            "is_new_user": not bool(existing_user),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Ошибка инициализации пользователя {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка инициализации пользователя")

@app.get("/api/v1/user/{user_id}/history")
async def get_user_history(user_id: int, limit: int = 20):
    """Получить историю консультаций пользователя"""
    logger.info(f"📚 Запрос истории для user_id={user_id}, limit={limit}")
    
    try:
        # Получаем историю консультаций
        consultations = database.get_user_consultations(user_id, limit)
        
        # Форматируем данные
        formatted_consultations = []
        for consultation in consultations:
            formatted_consultations.append({
                "id": consultation[0],
                "occasion": consultation[2],
                "preferences": consultation[3],
                "advice": consultation[5],
                "created_at": consultation[6],
                "image_path": consultation[4]
            })
        
        return {
            "status": "success",
            "user_id": user_id,
            "consultations": formatted_consultations,
            "total_count": len(formatted_consultations),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Ошибка получения истории для user_id={user_id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения истории")

@app.post("/api/v1/user/{user_id}/balance/sync")
async def sync_user_balance(user_id: int):
    """Принудительная синхронизация баланса (для отладки)"""
    logger.info(f"🔄 Синхронизация баланса для user_id={user_id}")
    
    try:
        # Получаем актуальный баланс из БД
        balance = database.get_user_balance(user_id)
        consultations_available = balance // 10
        
        # Получаем последние платежи пользователя
        payments = database.get_connection()
        cursor = payments.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM payments WHERE user_id = ? AND status = 'completed'",
            (user_id,)
        )
        completed_payments = cursor.fetchone()[0]
        payments.close()
        
        return {
            "status": "success",
            "user_id": user_id,
            "balance": balance,
            "consultations_available": consultations_available,
            "completed_payments": completed_payments,
            "synced_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Ошибка синхронизации баланса для user_id={user_id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка синхронизации баланса")

# Запуск сервера
if __name__ == "__main__":
    logger.info(f"🎯 Запуск в режиме: {ENVIRONMENT}")
    
    # Render автоматически устанавливает переменную PORT
    render_port = os.environ.get('PORT')
    if render_port:
        PORT = int(render_port)
        logger.info(f"🌐 Render PORT обнаружен: {PORT}")
    else:
        logger.info(f"🏠 Локальный PORT: {PORT}")
    
    # Настройки для uvicorn
    uvicorn.run(
        "api:app",
        host=HOST,
        port=PORT,
        log_level="info" if ENVIRONMENT == "production" else "debug",
        reload=False  # Отключаем reload в продакшне
    )