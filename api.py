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
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
import google.generativeai as genai
from PIL import Image
import io
from fastapi.staticfiles import StaticFiles

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

# 2. ВСЕ API роуты
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

# 3. Главная страница
@app.get("/")
async def read_root():
    return FileResponse('webapp/index.html')

# 4. Catch-all (ПОСЛЕДНИМ!)
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    file_path = Path("webapp") / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    return FileResponse('webapp/index.html')

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