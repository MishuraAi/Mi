"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API Сервер (api.py)
ВЕРСИЯ: 0.4.0 (Добавлены мониторинг, валидация и rate limiting)
ДАТА ОБНОВЛЕНИЯ: 2025-05-22

МЕТОДОЛОГИЯ РАБОТЫ И ОБНОВЛЕНИЯ КОДА:
1.  Целостность Обновлений: Любые изменения файлов предоставляются целиком.
    Частичные изменения кода не допускаются для обеспечения стабильности интеграции.
2.  Язык Коммуникации: Комментарии и документация ведутся на русском языке.
3.  Стандарт Качества: Данный код является частью проекта "МИШУРА", разработанного
    с применением высочайших стандартов программирования и дизайна, соответствуя
    уровню лучших мировых практик.

НАЗНАЧЕНИЕ ФАЙЛА:
Основной API-сервер на FastAPI для веб-приложения Telegram Mini App "МИШУРА".
Обрабатывает запросы от фронтенда, взаимодействует с ИИ-модулем (Gemini AI)
и обслуживает статические файлы веб-приложения.
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
from typing import Dict, Any, Optional

# Импорт новых модулей
from monitoring import monitor_request, start_metrics_server
from validators import ImageAnalysisRequest, ImageComparisonRequest, UserFeedback, PaymentRequest
from rate_limiter import default_rate_limit_middleware

# Попытка импорта модулей проекта
try:
    from gemini_ai import analyze_clothing_image, compare_clothing_images
except ImportError as e:
    logging.critical(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось импортировать модуль gemini_ai. {e}")
    # В production можно было бы завершить работу или перейти в аварийный режим
    # Для целей отладки, мы позволим FastAPI запуститься, но эндпоинты с AI не будут работать.
    async def analyze_clothing_image(*args, **kwargs):
        logging.error("Функция analyze_clothing_image не доступна из-за ошибки импорта gemini_ai.")
        return "Ошибка сервера: ИИ-модуль не инициализирован."
    async def compare_clothing_images(*args, **kwargs):
        logging.error("Функция compare_clothing_images не доступна из-за ошибки импорта gemini_ai.")
        return "Ошибка сервера: ИИ-модуль не инициализирован."


# Настройка стандартного логирования Python
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s",
)
logger = logging.getLogger("MishuraAPI") # Имя логгера для API

logger.info("Запуск API сервера для проекта МИШУРА...")

# Загрузка переменных окружения из .env файла
if load_dotenv():
    logger.info("Переменные окружения из .env файла успешно загружены.")
else:
    logger.warning("Файл .env не найден или пуст. Используются системные переменные окружения (если установлены).")

# Директория веб-приложения (относительно текущего файла api.py)
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
    version="0.4.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8001", "http://localhost:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("CORS middleware настроен с allow_origins=['http://127.0.0.1:8001', 'http://localhost:8001'].")

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

MIME_TYPES = {
    ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
    ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
    ".ico": "image/x-icon", ".txt": "text/plain", ".woff": "font/woff", ".woff2": "font/woff2",
}

def get_mime_type(file_path: str) -> str:
    try:
        ext = os.path.splitext(file_path)[1].lower()
        return MIME_TYPES.get(ext, "application/octet-stream")
    except Exception as e:
        logger.error(f"Ошибка при определении MIME-типа для '{file_path}': {e}")
        return "application/octet-stream"

@api_v1.get("/", summary="Корневой эндпоинт API", tags=["General"])
@monitor_request()
async def root():
    logger.info("Обращение к корневому эндпоинту API (/api/v1/).")
    return {
        "project": "МИШУРА - ИИ Стилист",
        "message": "API сервера 'МИШУРА' успешно запущен и готов к работе!",
        "version": app.version,
        "webapp_status": "Веб-приложение доступно по адресу /webapp/",
        "docs_url": "/docs", "redoc_url": "/redoc"
    }

@api_v1.post("/analyze-outfit", summary="Анализ одного предмета одежды", tags=["AI Analysis"])
@monitor_request()
async def analyze_outfit_endpoint(
    image: UploadFile = File(..., description="Фотография предмета одежды для анализа."),
    occasion: str = Form(..., description="Повод/ситуация, для которой подбирается одежда."),
    preferences: str = Form(None, description="Дополнительные предпочтения пользователя (опционально).")
):
    # Валидация входных данных
    request_data = ImageAnalysisRequest(occasion=occasion, preferences=preferences)
    
    logger.info(f"Получен запрос на /api/v1/analyze-outfit. Повод: '{occasion}', Предпочтения: '{preferences}', Имя файла: '{image.filename}'")
    try:
        image_data = await image.read()
        if not image_data:
            logger.error("Ошибка в /api/v1/analyze-outfit: получены пустые данные изображения.")
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Файл изображения не может быть пустым."}
            )

        logger.info(f"Изображение для /api/v1/analyze-outfit прочитано, размер: {len(image_data)} байт. Вызов Gemini AI...")
        advice = await analyze_clothing_image(image_data, request_data.occasion, request_data.preferences)
        if "Ошибка сервера" in advice:
            logger.error(f"Ошибка вызова ИИ-модуля для /api/v1/analyze-outfit: {advice}")
            return JSONResponse(status_code=503, content={"status": "error", "message": advice})
        
        logger.info("Анализ от Gemini AI для /api/v1/analyze-outfit успешно получен.")
        return {"status": "success", "advice": advice}
    except Exception as e:
        logger.error(f"Критическая ошибка при обработке /api/v1/analyze-outfit: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Внутренняя ошибка сервера при анализе одежды: {str(e)}"}
        )

@api_v1.post("/compare-outfits", summary="Сравнение нескольких предметов одежды", tags=["AI Analysis"])
@monitor_request()
async def compare_outfits_endpoint(
    images: list[UploadFile] = File(..., description="Список из 2-5 фотографий предметов одежды для сравнения."),
    occasion: str = Form(..., description="Повод/ситуация, для которой подбирается одежда."),
    preferences: str = Form(None, description="Дополнительные предпочтения пользователя (опционально).")
):
    # Валидация входных данных
    request_data = ImageComparisonRequest(
        occasion=occasion,
        preferences=preferences,
        image_count=len(images)
    )
    
    logger.info(f"Получен запрос на /api/v1/compare-outfits. Количество изображений: {len(images)}, Повод: '{occasion}', Предпочтения: '{preferences}'")
    try:
        image_data_list = []
        for img_file in images:
            image_data = await img_file.read()
            if not image_data:
                logger.error(f"Ошибка в /api/v1/compare-outfits: получены пустые данные для изображения {img_file.filename}")
                return JSONResponse(
                    status_code=400,
                    content={"status": "error", "message": f"Файл изображения {img_file.filename} не может быть пустым."}
                )
            image_data_list.append(image_data)
        
        logger.info(f"Все изображения для /api/v1/compare-outfits прочитаны. Вызов Gemini AI...")
        advice = await compare_clothing_images(image_data_list, request_data.occasion, request_data.preferences)
        if "Ошибка сервера" in advice:
            logger.error(f"Ошибка вызова ИИ-модуля для /api/v1/compare-outfits: {advice}")
            return JSONResponse(status_code=503, content={"status": "error", "message": advice})
        
        logger.info("Сравнение от Gemini AI для /api/v1/compare-outfits успешно получено.")
        return {"status": "success", "advice": advice}
    except Exception as e:
        logger.error(f"Критическая ошибка при обработке /api/v1/compare-outfits: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Внутренняя ошибка сервера при сравнении одежды: {str(e)}"}
        )

@app.get("/health", summary="Проверка состояния сервера", tags=["System"])
@monitor_request()
async def health_check():
    """Эндпоинт для проверки состояния сервера"""
    return {
        "status": "healthy",
        "version": app.version,
        "timestamp": datetime.now().isoformat(),
        "system": {
            "platform": platform.platform(),
            "python_version": sys.version,
            "memory_usage": "N/A"  # Можно добавить реальные метрики
        }
    }

# Подключаем роутер API v1 к основному приложению
app.include_router(api_v1)

# Добавляем endpoint'ы для обратной совместимости с веб-приложением
@app.post("/api/analyze", summary="Анализ одного предмета одежды (совместимость)", tags=["AI Analysis"])
@monitor_request()
async def analyze_outfit_legacy(
    image: UploadFile = File(..., description="Фотография предмета одежды для анализа."),
    occasion: str = Form(..., description="Повод/ситуация, для которой подбирается одежда."),
    preferences: str = Form(None, description="Дополнительные предпочтения пользователя (опционально)."),
    mode: str = Form("single", description="Режим анализа (single или compare).")
):
    """Endpoint для обратной совместимости с веб-приложением"""
    logger.info(f"Получен запрос на /api/analyze (legacy). Режим: '{mode}', Повод: '{occasion}', Предпочтения: '{preferences}', Имя файла: '{image.filename}'")
    
    # Используем тот же код, что и в /api/v1/analyze-outfit
    request_data = ImageAnalysisRequest(occasion=occasion, preferences=preferences)
    
    try:
        image_data = await image.read()
        if not image_data:
            logger.error("Ошибка в /api/analyze: получены пустые данные изображения.")
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Файл изображения не может быть пустым."}
            )

        logger.info(f"Изображение для /api/analyze прочитано, размер: {len(image_data)} байт. Вызов Gemini AI...")
        advice = await analyze_clothing_image(image_data, request_data.occasion, request_data.preferences)
        if "Ошибка сервера" in advice:
            logger.error(f"Ошибка вызова ИИ-модуля для /api/analyze: {advice}")
            return JSONResponse(status_code=503, content={"status": "error", "message": advice})
        
        logger.info("Анализ от Gemini AI для /api/analyze успешно получен.")
        return {"status": "success", "advice": advice}
    except Exception as e:
        logger.error(f"Критическая ошибка при обработке /api/analyze: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Внутренняя ошибка сервера при анализе одежды: {str(e)}"}
        )

@app.post("/api/compare", summary="Сравнение нескольких предметов одежды (совместимость)", tags=["AI Analysis"])
@monitor_request()
async def compare_outfits_legacy(
    images: list[UploadFile] = File(..., description="Список из 2-5 фотографий предметов одежды для сравнения."),
    occasion: str = Form(..., description="Повод/ситуация, для которой подбирается одежда."),
    preferences: str = Form(None, description="Дополнительные предпочтения пользователя (опционально).")
):
    """Endpoint для обратной совместимости с веб-приложением"""
    logger.info(f"Получен запрос на /api/compare (legacy). Количество изображений: {len(images)}, Повод: '{occasion}', Предпочтения: '{preferences}'")
    
    # Используем тот же код, что и в /api/v1/compare-outfits
    request_data = ImageComparisonRequest(
        occasion=occasion,
        preferences=preferences,
        image_count=len(images)
    )
    
    try:
        image_data_list = []
        for img_file in images:
            image_data = await img_file.read()
            if not image_data:
                logger.error(f"Ошибка в /api/compare: получены пустые данные для изображения {img_file.filename}")
                return JSONResponse(
                    status_code=400,
                    content={"status": "error", "message": f"Файл изображения {img_file.filename} не может быть пустым."}
                )
            image_data_list.append(image_data)
        
        logger.info(f"Все изображения для /api/compare прочитаны. Вызов Gemini AI...")
        advice = await compare_clothing_images(image_data_list, request_data.occasion, request_data.preferences)
        if "Ошибка сервера" in advice:
            logger.error(f"Ошибка вызова ИИ-модуля для /api/compare: {advice}")
            return JSONResponse(status_code=503, content={"status": "error", "message": advice})
        
        logger.info("Сравнение от Gemini AI для /api/compare успешно получено.")
        return {"status": "success", "advice": advice}
    except Exception as e:
        logger.error(f"Критическая ошибка при обработке /api/compare: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Внутренняя ошибка сервера при сравнении одежды: {str(e)}"}
        )

# Оставляем старый корневой маршрут для обратной совместимости
@app.get("/api", summary="Корневой эндпоинт API (устаревший)", tags=["General"])
async def root_legacy():
    logger.info("Обращение к устаревшему корневому эндпоинту API (/api).")
    return {
        "project": "МИШУРА - ИИ Стилист",
        "message": "Этот эндпоинт устарел. Используйте /api/v1/",
        "version": app.version,
        "docs_url": "/docs", "redoc_url": "/redoc"
    }

@app.get("/debug/info", summary="Отладочная информация о файлах и окружении", tags=["Debug"])
async def debug_info():
    logger.info("Запрошена отладочная информация (/debug/info).")
    files_info = {}
    try:
        files_info["project_name"] = "МИШУРА - ИИ Стилист"
        files_info["api_version"] = app.version
        files_info["timestamp_utc"] = datetime.utcnow().isoformat() + "Z"

        root_dir = BASE_DIR
        files_info["root_directory_checked"] = root_dir
        if os.path.exists(root_dir) and os.path.isdir(root_dir):
            try:
                files_info["root_content"] = os.listdir(root_dir)
            except Exception as e_ls:
                 logger.error(f"Ошибка при листинге файлов в {root_dir}: {e_ls}")
                 files_info["root_content_error"] = str(e_ls)
        else:
            files_info["root_directory_error"] = f"Директория {root_dir} не найдена или не является директорией."

        files_info["webapp_directory_checked"] = WEBAPP_DIR
        if os.path.exists(WEBAPP_DIR) and os.path.isdir(WEBAPP_DIR):
            files_info["webapp_exists_and_is_dir"] = True
            try:
                files_info["webapp_content"] = os.listdir(WEBAPP_DIR)
                
                expected_webapp_files = {
                    "index.html": "index_html_details", "styles.css": "styles_css_details",
                    "script.js": "script_js_details", "cursor-effect.js": "cursor_effect_js_details",
                }
                for file_rel_path, key_name in expected_webapp_files.items():
                    full_file_path = os.path.join(WEBAPP_DIR, file_rel_path)
                    exists = os.path.exists(full_file_path) and os.path.isfile(full_file_path)
                    files_info[key_name] = {
                        "path_checked": full_file_path, "exists": exists,
                        "size_bytes": os.path.getsize(full_file_path) if exists else 0,
                        "mime_type_guess": get_mime_type(full_file_path) if exists else "N/A"
                    }
                images_dir_path = os.path.join(WEBAPP_DIR, "images")
                images_dir_exists = os.path.exists(images_dir_path) and os.path.isdir(images_dir_path)
                files_info["images_dir_in_webapp"] = {
                    "path_checked": images_dir_path, "exists": images_dir_exists,
                    "content": os.listdir(images_dir_path) if images_dir_exists else []
                }
                if images_dir_exists: # Проверка иконки только если папка images существует
                    upload_icon_path = os.path.join(images_dir_path, "upload-icon.svg")
                    icon_exists = os.path.exists(upload_icon_path) and os.path.isfile(upload_icon_path)
                    files_info["upload_icon_svg_details"] = {
                        "path_checked": upload_icon_path, "exists": icon_exists,
                        "size_bytes": os.path.getsize(upload_icon_path) if icon_exists else 0
                    }

            except Exception as e_ls_webapp:
                logger.error(f"Ошибка при листинге файлов в {WEBAPP_DIR}: {e_ls_webapp}")
                files_info["webapp_content_error"] = str(e_ls_webapp)
        else:
            files_info["webapp_exists_and_is_dir"] = False
            files_info["webapp_error_message"] = f"Директория webapp ({WEBAPP_DIR}) не найдена или не является директорией."
        
        files_info["python_environment"] = {
            "system_path_to_python_executable": sys.executable,
            "python_version_detailed": sys.version,
            "python_version_simple": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "current_working_directory": os.getcwd(),
            "operating_system": f"{platform.system()} {platform.release()}",
            "machine_architecture": platform.machine()
        }
        
        return JSONResponse(content=files_info)
    except Exception as e:
        logger.error(f"Критическая ошибка при генерации отладочной информации /debug/info: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error_message": f"Ошибка при сборе отладочной информации: {str(e)}"})

if __name__ == "__main__":
    # Запускаем сервер метрик на порту 8000
    start_metrics_server(8000)
    
    # Запускаем основной сервер
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )