#!/usr/bin/env python3
"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Production API сервер (api.py)
ВЕРСИЯ: 1.2.0
ДАТА СОЗДАНИЯ: 2025-06-05

НАЗНАЧЕНИЕ:
FastAPI сервер для обработки запросов анализа изображений через Gemini AI
Предоставляет REST API для веб-приложения МИШУРЫ

ЭНДПОИНТЫ:
- GET /api/v1/health - проверка состояния сервера
- POST /api/v1/analyze - анализ одного изображения
- POST /api/v1/compare - сравнение нескольких изображений
- GET /api/v1/status - статус Gemini AI
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
from typing import Optional, List, Dict, Any
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import google.generativeai as genai
from PIL import Image
import io

# Добавляем текущую директорию в путь для импорта database.py
sys.path.append(str(Path(__file__).parent))

try:
    import database
except ImportError:
    print("❌ ОШИБКА: Не удалось импортировать database.py")
    print("💡 Убедитесь, что файл database.py находится в той же папке")
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
    title="МИШУРА ИИ-Стилист API",
    description="API для анализа стиля одежды с помощью Google Gemini AI",
    version="1.2.0",
    docs_url="/api/v1/docs" if DEBUG else None,
    redoc_url="/api/v1/redoc" if DEBUG else None
)

# Настройка CORS
if ENVIRONMENT == 'production':
    origins = [
        "https://style-ai-bot.onrender.com",
        "http://localhost:8000",
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
    allow_methods=["GET", "POST", "PUT", "DELETE"],
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

# Модели данных
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
        
        # Формируем промпт для анализа
        prompt = f"""
Ты - профессиональный стилист МИШУРА. Проанализируй это изображение одежды и дай подробную консультацию.

ПОВОД: {occasion}
{'ПРЕДПОЧТЕНИЯ: ' + preferences if preferences else ''}

Анализируй:
1. Стиль и тип одежды
2. Цветовая гамма и сочетания
3. Соответствие поводу
4. Аксессуары и дополнения
5. Улучшения и рекомендации

Ответь в формате markdown с заголовками и списками. Будь конкретным и полезным.
Начни с эмодзи 🎭 и названия "Анализ от МИШУРЫ".
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
        # Возвращаем fallback ответ
        return f"""
# 🎭 Анализ от МИШУРЫ

## ⚠️ Временные технические неполадки

К сожалению, сейчас наш ИИ-стилист временно недоступен. 

**Повод:** {occasion}

**Общие рекомендации:**
- Убедитесь, что одежда чистая и хорошо сидит
- Сочетайте не более 3 основных цветов
- Добавьте один яркий акцент
- Не забудьте про аксессуары

*Попробуйте анализ через несколько минут.*
"""

async def compare_with_gemini(images: List[Image.Image], occasion: str, preferences: str = None) -> str:
    """Сравнение нескольких образов с помощью Gemini AI"""
    try:
        if not gemini_configured:
            raise HTTPException(status_code=503, detail="Gemini AI недоступен")
        
        prompt = f"""
Ты - профессиональный стилист МИШУРА. Сравни эти {len(images)} образа и определи лучший для данного случая.

ПОВОД: {occasion}
{'ПРЕДПОЧТЕНИЯ: ' + preferences if preferences else ''}

Для каждого образа анализируй:
1. Стиль и общее впечатление  
2. Соответствие поводу
3. Цветовые сочетания
4. Практичность и комфорт

Выведи результат:
1. РЕЙТИНГ (от лучшего к худшему)
2. ОБОСНОВАНИЕ выбора для каждого
3. РЕКОМЕНДАЦИИ по улучшению

Ответь в формате markdown. Начни с эмодзи 🏆 и "Сравнение образов от МИШУРЫ".
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
# 🏆 Сравнение образов от МИШУРЫ

## ⚠️ Временные технические неполадки

Не удалось провести полное сравнение {len(images)} образов.

**Повод:** {occasion}

**Общие принципы выбора:**
1. Соответствие дресс-коду события
2. Комфорт и практичность
3. Гармония цветов и стилей
4. Ваша уверенность в образе

*Попробуйте сравнение через несколько минут.*
"""

# API эндпоинты
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
        service="МИШУРА ИИ-Стилист API",
        version="1.2.0",
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
                database.update_user_balance(user_id, -1)
                logger.info(f"💰 Баланс пользователя {user_id} уменьшен на 1")
                
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
                cost = len(files)  # 1 консультация за каждое изображение
                database.update_user_balance(user_id, -cost)
                logger.info(f"💰 Баланс пользователя {user_id} уменьшен на {cost}")
                
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

# События жизненного цикла
@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске сервера"""
    logger.info("🚀 Запуск МИШУРА API сервера...")
    logger.info(f"📋 Среда: {ENVIRONMENT}")
    logger.info(f"🌐 Хост: {HOST}:{PORT}")
    
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
    
    logger.info("🎭 МИШУРА API сервер полностью готов!")

@app.on_event("shutdown")
async def shutdown_event():
    """Очистка ресурсов при остановке"""
    logger.info("🛑 Остановка МИШУРА API сервера...")

# Запуск сервера
if __name__ == "__main__":
    logger.info(f"🎯 Запуск в режиме: {ENVIRONMENT}")
    
    # Настройки для разных сред
    if ENVIRONMENT == "production":
        # Production настройки
        uvicorn.run(
            "api:app",
            host=HOST,
            port=PORT,
            log_level="warning",
            access_log=False,
            reload=False
        )
    else:
        # Development настройки
        uvicorn.run(
            "api:app",
            host=HOST,
            port=PORT,
            log_level="info",
            access_log=True,
            reload=True
        )