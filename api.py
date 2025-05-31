"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API Сервер (api.py)
ВЕРСИЯ: 0.6.0 (ИСПРАВЛЕНЫ ЭНДПОИНТЫ И ПОРТЫ)
ДАТА ОБНОВЛЕНИЯ: 2025-05-31

ИСПРАВЛЕНИЯ:
- Добавлены эндпоинты /analyze/single и /analyze/compare для фронтенда
- Исправлен порт с 8001 на 8000 (соответствие .env)
- Улучшена проверка Gemini connection
- Добавлен async test_gemini_connection
==========================================================================================
"""
import os
import logging
import platform
import sys
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form, Request, APIRouter, HTTPException
from fastapi.responses import JSONResponse, FileResponse, Response, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import uvicorn
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import asyncio

# Попытка импорта модулей проекта
try:
    from gemini_ai import analyze_clothing_image, compare_clothing_images
    GEMINI_AVAILABLE = True
    logging.info("Gemini AI модуль успешно импортирован")
except ImportError as e:
    logging.critical(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось импортировать модуль gemini_ai. {e}")
    GEMINI_AVAILABLE = False
    
    # Заглушки для функций ИИ
    async def analyze_clothing_image(image_data, occasion, preferences=None):
        logging.error("Функция analyze_clothing_image не доступна из-за ошибки импорта gemini_ai.")
        return "Ошибка сервера: ИИ-модуль не инициализирован. Проверьте настройки Gemini API."
    
    async def compare_clothing_images(image_data_list, occasion, preferences=None):
        logging.error("Функция compare_clothing_images не доступна из-за ошибки импорта gemini_ai.")
        return "Ошибка сервера: ИИ-модуль не инициализирован. Проверьте настройки Gemini API."

# Настройка стандартного логирования Python
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s",
)
logger = logging.getLogger("MishuraAPI")

logger.info("Запуск API сервера для проекта МИШУРА...")

# Загрузка переменных окружения из .env файла
if load_dotenv():
    logger.info("Переменные окружения из .env файла успешно загружены.")
else:
    logger.warning("Файл .env не найден или пуст. Используются системные переменные окружения (если установлены).")

# Директория веб-приложения
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEBAPP_DIR = os.path.join(BASE_DIR, "webapp")
logger.info(f"Определена директория веб-приложения: {WEBAPP_DIR}")

# Проверяем существование директории webapp
if not os.path.exists(WEBAPP_DIR) or not os.path.isdir(WEBAPP_DIR):
    logger.critical(f"Директория веб-приложения '{WEBAPP_DIR}' не найдена!")
    raise RuntimeError(f"Директория веб-приложения '{WEBAPP_DIR}' не найдена!")

# Проверяем существование index.html
index_html_path = os.path.join(WEBAPP_DIR, "index.html")
if not os.path.exists(index_html_path) or not os.path.isfile(index_html_path):
    logger.critical(f"Основной файл webapp/index.html не найден по пути: {index_html_path}")
    raise RuntimeError(f"Основной файл webapp/index.html не найден по пути: {index_html_path}")

app = FastAPI(
    title="МИШУРА - API ИИ-Стилиста",
    description="API для поддержки Telegram Mini App 'МИШУРА', предоставляющего консультации по стилю с использованием Gemini AI.",
    version="0.6.0"
)

# Настройка CORS - РАСШИРЕННАЯ для фронтенда
CORS_ORIGINS = [
    "https://style-ai-bot.onrender.com",
    "https://web.telegram.org",
    "https://t.me",
    "http://localhost:8000",  # Для фронтенда и API
    "http://localhost:8001",  # Для резервного API
    "http://localhost:3000",  # Для фронтенда разработки
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8001",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
        "X-Telegram-Init-Data"
    ],
    max_age=3600,
)

logger.info(f"CORS middleware настроен. Разрешенные домены: {CORS_ORIGINS}")

# Модели данных для валидации
class AnalysisRequest(BaseModel):
    occasion: str
    preferences: Optional[str] = ""

class ComparisonRequest(BaseModel):
    occasion: str
    preferences: Optional[str] = ""

# Функция тестирования Gemini connection
async def test_gemini_connection():
    """Тестирует соединение с Gemini AI"""
    try:
        if not GEMINI_AVAILABLE:
            return False, "Gemini модуль не импортирован"
        
        # Создаем тестовое изображение (1x1 пиксель PNG)
        test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xddɎ\xdb\x00\x00\x00\x00IEND\xaeB`\x82'
        
        # Быстрый тест анализа
        result = await analyze_clothing_image(test_image_data, "тест", "")
        
        if "ошибка" in result.lower() or "error" in result.lower():
            return False, result
        
        return True, "Gemini AI доступен и работает"
        
    except Exception as e:
        logger.error(f"Ошибка тестирования Gemini: {e}")
        return False, f"Ошибка подключения: {str(e)}"

# Корневой маршрут для перенаправления на веб-приложение
@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root():
    logger.info("Обращение к корневому URL (/), перенаправление на /webapp/")
    return HTMLResponse(content=f"""
        <html>
            <head>
                <meta http-equiv="refresh" content="0;url=/webapp/">
                <title>Перенаправление на МИШУРА</title>
            </head>
            <body>
                <p>Перенаправление на <a href="/webapp/">МИШУРА - ИИ Стилист</a>...</p>
            </body>
        </html>
    """)

# Монтируем статические файлы
app.mount("/webapp", StaticFiles(directory=WEBAPP_DIR, html=True), name="webapp")
logger.info(f"Статические файлы из директории '{WEBAPP_DIR}' смонтированы по пути /webapp")

# Создаем подгруппу API v1
api_v1 = APIRouter(prefix="/api/v1")

# Вспомогательные функции
def validate_image_file(file: UploadFile) -> bool:
    """Валидация загружаемого файла изображения"""
    if not file:
        return False
    
    # Проверяем MIME тип
    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if file.content_type not in allowed_types:
        return False
    
    # Проверяем размер (максимум 10MB)
    if hasattr(file, 'size') and file.size > 10 * 1024 * 1024:
        return False
    
    return True

def is_error_message(text: str) -> bool:
    """Проверяет, является ли текст сообщением об ошибке"""
    error_indicators = [
        "ошибка", "error", "не удалось", "failed", 
        "недоступно", "unavailable", "превышен лимит",
        "не инициализирован", "not initialized"
    ]
    return any(indicator in text.lower() for indicator in error_indicators)

@api_v1.get("/", summary="Корневой эндпоинт API", tags=["General"])
async def api_root():
    logger.info("Обращение к корневому эндпоинту API (/api/v1/).")
    return {
        "project": "МИШУРА - ИИ Стилист",
        "message": "API сервера 'МИШУРА' успешно запущен и готов к работе!",
        "version": app.version,
        "gemini_available": GEMINI_AVAILABLE,
        "webapp_status": "Веб-приложение доступно по адресу /webapp/",
        "docs_url": "/docs", 
        "redoc_url": "/redoc"
    }

# === ОСНОВНЫЕ ЭНДПОИНТЫ (НОВЫЕ) ===

@api_v1.post("/analyze-outfit", summary="Анализ одного предмета одежды", tags=["AI Analysis"])
async def analyze_outfit_endpoint(
    image: UploadFile = File(...),
    occasion: str = Form(...),
    preferences: str = Form(""),
):
    logger.info(f"Получен запрос на анализ. Повод: '{occasion}'")
    
    try:
        # Проверка доступности Gemini перед обработкой
        if not GEMINI_AVAILABLE:
            logger.error("Gemini AI недоступен при запросе анализа")
            return JSONResponse(
                status_code=503,
                content={
                    "status": "error", 
                    "message": "ИИ-сервис временно недоступен. Проверьте GEMINI_API_KEY в настройках.",
                    "code": "GEMINI_UNAVAILABLE"
                }
            )

        # Валидация файла
        if not validate_image_file(image):
            logger.error("Ошибка валидации файла изображения")
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error", 
                    "message": "Некорректный файл изображения",
                    "code": "INVALID_IMAGE"
                }
            )

        # Читаем и анализируем
        image_data = await image.read()
        logger.info(f"Изображение прочитано, размер: {len(image_data)} байт")
        
        advice = await analyze_clothing_image(image_data, occasion, preferences)
        
        # Проверка на ошибки в ответе ИИ
        if is_error_message(advice):
            logger.error(f"Ошибка от ИИ-модуля: {advice}")
            return JSONResponse(
                status_code=503, 
                content={
                    "status": "error", 
                    "message": advice,
                    "code": "AI_RESPONSE_ERROR"
                }
            )
        
        logger.info("Анализ от Gemini AI успешно получен")
        return {
            "status": "success", 
            "advice": advice,
            "metadata": {
                "occasion": occasion,
                "preferences": preferences,
                "timestamp": datetime.now().isoformat(),
                "processing_time": "~2-3 секунды"
            }
        }
        
    except Exception as e:
        logger.error(f"Критическая ошибка при анализе: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "status": "error", 
                "message": "Внутренняя ошибка сервера при обработке изображения",
                "code": "INTERNAL_ERROR"
            }
        )

@api_v1.post("/compare-outfits", summary="Сравнение нескольких предметов одежды", tags=["AI Analysis"])
async def compare_outfits_endpoint(
    images: List[UploadFile] = File(...),
    occasion: str = Form(...),
    preferences: str = Form("")
):
    logger.info(f"Получен запрос на сравнение. Количество изображений: {len(images)}, Повод: '{occasion}'")
    
    try:
        # Валидация количества изображений
        if len(images) < 2 or len(images) > 5:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Необходимо загрузить от 2 до 5 изображений для сравнения."}
            )

        # Проверяем доступность Gemini
        if not GEMINI_AVAILABLE:
            logger.error("Gemini AI недоступен для сравнения")
            return JSONResponse(
                status_code=503,
                content={"status": "error", "message": "ИИ-модуль временно недоступен. Проверьте настройки Gemini API."}
            )

        # Валидация и чтение файлов
        image_data_list = []
        for i, img_file in enumerate(images):
            if not validate_image_file(img_file):
                logger.error(f"Ошибка валидации файла {i+1}: {img_file.filename}")
                return JSONResponse(
                    status_code=400,
                    content={"status": "error", "message": f"Некорректный файл изображения #{i+1}: {img_file.filename}"}
                )
            
            image_data = await img_file.read()
            if not image_data:
                return JSONResponse(
                    status_code=400,
                    content={"status": "error", "message": f"Файл изображения #{i+1} пуст."}
                )
            image_data_list.append(image_data)
        
        logger.info(f"Все {len(image_data_list)} изображений прочитаны. Вызов Gemini AI...")
        
        # Вызываем сравнение
        advice = await compare_clothing_images(image_data_list, occasion, preferences)
        
        # Проверяем на ошибки в ответе
        if is_error_message(advice):
            logger.error(f"Ошибка от ИИ-модуля при сравнении: {advice}")
            return JSONResponse(
                status_code=503, 
                content={"status": "error", "message": advice}
            )
        
        logger.info("Сравнение от Gemini AI успешно получено")
        return {"status": "success", "advice": advice}
        
    except Exception as e:
        logger.error(f"Критическая ошибка при обработке сравнения: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Внутренняя ошибка сервера: {str(e)}"}
        )

# === ФРОНТЕНД ЭНДПОИНТЫ (НОВЫЕ - для совместимости с api.js) ===

@api_v1.post("/analyze/single", summary="Анализ одного предмета одежды (Frontend)", tags=["Frontend API"])
async def analyze_single_frontend(
    image: UploadFile = File(...),
    occasion: str = Form(""),
    preferences: str = Form(""),
    metadata: str = Form("{}")
):
    """Эндпоинт специально для фронтенда - /api/v1/analyze/single"""
    logger.info(f"Получен запрос от фронтенда на анализ. Повод: '{occasion}'")
    
    # Перенаправляем на основной обработчик
    return await analyze_outfit_endpoint(image, occasion, preferences)

@api_v1.post("/analyze/compare", summary="Сравнение нескольких предметов одежды (Frontend)", tags=["Frontend API"])
async def analyze_compare_frontend(
    image_0: UploadFile = File(...),
    image_1: UploadFile = File(...),
    image_2: UploadFile = File(None),
    image_3: UploadFile = File(None),
    image_4: UploadFile = File(None),
    occasion: str = Form(""),
    preferences: str = Form(""),
    metadata: str = Form("{}")
):
    """Эндпоинт специально для фронтенда - /api/v1/analyze/compare"""
    logger.info(f"Получен запрос от фронтенда на сравнение. Повод: '{occasion}'")
    
    # Собираем только загруженные изображения
    images = [image_0, image_1]
    for img in [image_2, image_3, image_4]:
        if img and img.filename:
            images.append(img)
    
    logger.info(f"Обработка {len(images)} изображений для сравнения")
    
    # Перенаправляем на основной обработчик
    return await compare_outfits_endpoint(images, occasion, preferences)

@api_v1.get("/health", summary="Проверка состояния сервера", tags=["System"])
async def health_check():
    """Эндпоинт для проверки состояния сервера"""
    
    # Проверяем Gemini connection
    gemini_connection, gemini_message = await test_gemini_connection()
    
    health_status = {
        "status": "healthy",
        "version": app.version,
        "timestamp": datetime.now().isoformat(),
        "gemini_ai": {
            "available": GEMINI_AVAILABLE,
            "status": "active" if gemini_connection else "unavailable",
            "message": gemini_message
        },
        "system": {
            "platform": platform.platform(),
            "python_version": sys.version.split()[0],
        }
    }
    
    # Если Gemini недоступен, возвращаем предупреждение, но сервер считается работающим
    if not GEMINI_AVAILABLE or not gemini_connection:
        health_status["warnings"] = [gemini_message]
    
    return health_status

# Подключаем роутер API v1 к основному приложению
app.include_router(api_v1)

# === LEGACY ЭНДПОИНТЫ (для обратной совместимости) ===

@app.post("/api/analyze", summary="Анализ одного предмета одежды (совместимость)", tags=["Legacy API"])
async def analyze_outfit_legacy(
    image: UploadFile = File(...),
    occasion: str = Form(...),
    preferences: str = Form(""),
    mode: str = Form("single")
):
    """Endpoint для обратной совместимости с веб-приложением"""
    logger.info(f"Получен запрос на /api/analyze (legacy). Режим: '{mode}', Повод: '{occasion}'")
    
    # Перенаправляем на новый endpoint
    return await analyze_outfit_endpoint(image, occasion, preferences)

@app.post("/api/compare", summary="Сравнение нескольких предметов одежды (совместимость)", tags=["Legacy API"])
async def compare_outfits_legacy(
    images: List[UploadFile] = File(...),
    occasion: str = Form(...),
    preferences: str = Form("")
):
    """Endpoint для обратной совместимости с веб-приложением"""
    logger.info(f"Получен запрос на /api/compare (legacy). Количество изображений: {len(images)}")
    
    # Перенаправляем на новый endpoint
    return await compare_outfits_endpoint(images, occasion, preferences)

@app.get("/health", summary="Проверка состояния сервера (корневой)", tags=["System"])
async def health_check_root():
    """Корневой эндпоинт для проверки состояния сервера"""
    return await health_check()

@app.get("/debug/info", summary="Отладочная информация", tags=["Debug"])
async def debug_info():
    logger.info("Запрошена отладочная информация (/debug/info).")
    return {
        "project_name": "МИШУРА - ИИ Стилист",
        "api_version": app.version,
        "timestamp_utc": datetime.utcnow().isoformat() + "Z",
        "gemini_ai": {
            "module_imported": GEMINI_AVAILABLE,
            "status": "ready" if GEMINI_AVAILABLE else "not_available"
        },
        "environment": {
            "python_version": sys.version,
            "platform": platform.platform(),
            "working_directory": os.getcwd(),
            "webapp_directory": WEBAPP_DIR,
            "webapp_exists": os.path.exists(WEBAPP_DIR)
        },
        "cors_origins": CORS_ORIGINS,
        "available_endpoints": {
            "api_v1": "/api/v1/",
            "health": "/api/v1/health",
            "analyze_outfit": "/api/v1/analyze-outfit",
            "compare_outfits": "/api/v1/compare-outfits",
            "analyze_single": "/api/v1/analyze/single",
            "analyze_compare": "/api/v1/analyze/compare",
            "webapp": "/webapp/"
        }
    }

# Обработчик ошибок 404
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "status": "error",
            "message": f"Эндпоинт {request.url.path} не найден",
            "available_endpoints": {
                "api_v1": "/api/v1/",
                "health": "/api/v1/health",
                "analyze": "/api/v1/analyze-outfit",
                "compare": "/api/v1/compare-outfits",
                "analyze_single": "/api/v1/analyze/single",  # ✅ ДОБАВЛЕНО
                "analyze_compare": "/api/v1/analyze/compare", # ✅ ДОБАВЛЕНО
                "webapp": "/webapp/"
            }
        }
    )

if __name__ == "__main__":
    # Проверяем наличие Gemini API ключа при запуске
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        logger.warning("GEMINI_API_KEY не установлен! ИИ функции будут недоступны.")
        logger.warning("Добавьте GEMINI_API_KEY в файл .env для работы с Gemini AI")
    
    # ИСПРАВЛЕНО: Порт изменен с 8001 на 8000 (соответствие .env)
    port = int(os.getenv("BACKEND_PORT", "8000"))
    logger.info(f"Запуск API сервера на порту {port}")
    
    # Запускаем сервер
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=port,  # ✅ ИСПРАВЛЕНО: Теперь используется порт 8000
        reload=True,
        log_level="info"
    )