"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API Сервер (api.py)
ВЕРСИЯ: 0.3.4 (Добавлена поддержка virtual-fitting)
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
from dotenv import load_dotenv
import uvicorn
from pydantic import BaseModel

# Попытка импорта модулей проекта
try:
    from gemini_ai import analyze_clothing_image, compare_clothing_images, virtual_fitting_with_gemini
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
    async def virtual_fitting_with_gemini(*args, **kwargs):
        logging.error("Функция virtual_fitting_with_gemini не доступна из-за ошибки импорта gemini_ai.")
        return {"status": "error", "message": "Ошибка сервера: ИИ-модуль не инициализирован."}


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


app = FastAPI(
    title="МИШУРА - API ИИ-Стилиста",
    description="API для поддержки Telegram Mini App 'МИШУРА', предоставляющего консультации по стилю с использованием Gemini AI.",
    version="0.3.4"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("CORS middleware настроен с allow_origins=['*'].")

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
async def root():
    logger.info("Обращение к корневому эндпоинту API (/api/v1/).")
    return {
        "project": "МИШУРА - ИИ Стилист",
        "message": "API сервера 'МИШУРА' успешно запущен и готов к работе!",
        "version": app.version,
        "webapp_status": "Веб-приложение доступно по адресу /webapp/",
        "docs_url": "/docs", "redoc_url": "/redoc"
    }

@app.get("/webapp/{file_path:path}", summary="Обслуживание статических файлов веб-приложения", tags=["WebApp"])
async def serve_static_file(request: Request, file_path: str):
    # Формируем полный путь к запрашиваемому файлу внутри WEBAPP_DIR
    # Проверяем, что WEBAPP_DIR существует
    if not os.path.exists(WEBAPP_DIR) or not os.path.isdir(WEBAPP_DIR):
        logger.critical(f"Директория веб-приложения '{WEBAPP_DIR}' не найдена. Невозможно отдать статические файлы.")
        return Response(content="Ошибка сервера: директория веб-приложения не настроена.", status_code=500)

    requested_path = os.path.join(WEBAPP_DIR, file_path.strip("/")) # Убираем возможные слеши в начале file_path
    logger.info(f"Запрос статического файла: '{file_path}'. Абсолютный путь: '{os.path.abspath(requested_path)}'")

    normalized_path = os.path.normpath(requested_path)

    if not normalized_path.startswith(os.path.normpath(WEBAPP_DIR)):
        logger.warning(f"Попытка доступа к файлу вне директории webapp: '{file_path}' (нормализован в '{normalized_path}')")
        return Response(content=f"Доступ запрещен: {file_path}", status_code=403)

    if os.path.isdir(normalized_path):
        index_file_path = os.path.join(normalized_path, "index.html")
        if os.path.isfile(index_file_path):
            logger.info(f"Запрошена директория '{file_path}', отдается index.html: '{index_file_path}'")
            return FileResponse(index_file_path, media_type="text/html")
        else:
            logger.error(f"Запрошена директория '{file_path}', но index.html в ней не найден ('{index_file_path}').")
            return Response(content=f"Directory listing not allowed, and no index.html found in: {file_path}", status_code=404)

    if not os.path.exists(normalized_path) or not os.path.isfile(normalized_path):
        logger.error(f"Статический файл не найден: '{normalized_path}' (запрошен как '{file_path}')")
        return Response(content=f"Файл не найден: {file_path}", status_code=404)

    mime_type = get_mime_type(normalized_path)
    logger.info(f"Отдача статического файла: '{normalized_path}' с MIME-типом '{mime_type}'")
    return FileResponse(normalized_path, media_type=mime_type)

@app.get("/webapp", response_class=HTMLResponse, include_in_schema=False)
@app.get("/webapp/", response_class=HTMLResponse, include_in_schema=False)
async def serve_webapp_root_redirect():
    index_html_path = os.path.join(WEBAPP_DIR, "index.html")
    logger.info(f"Запрос к /webapp/ или /webapp, попытка отдать: {index_html_path}")
    if not os.path.exists(WEBAPP_DIR) or not os.path.isdir(WEBAPP_DIR):
        logger.critical(f"Директория веб-приложения '{WEBAPP_DIR}' не найдена. Невозможно отдать index.html.")
        return HTMLResponse(content="Ошибка сервера: директория веб-приложения не настроена.", status_code=500)
    if os.path.exists(index_html_path) and os.path.isfile(index_html_path):
        return FileResponse(index_html_path, media_type="text/html")
    else:
        logger.critical(f"КРИТИЧЕСКАЯ ОШИБКА: Основной файл webapp/index.html не найден по пути: {index_html_path}")
        return HTMLResponse(content="Ошибка сервера: основной файл веб-приложения не найден.", status_code=500)

@api_v1.post("/analyze-outfit", summary="Анализ одного предмета одежды", tags=["AI Analysis"])
async def analyze_outfit_endpoint(
    image: UploadFile = File(..., description="Фотография предмета одежды для анализа."),
    occasion: str = Form(..., description="Повод/ситуация, для которой подбирается одежда."),
    preferences: str = Form(None, description="Дополнительные предпочтения пользователя (опционально).")
):
    logger.info(f"Получен запрос на /api/v1/analyze-outfit. Повод: '{occasion}', Предпочтения: '{preferences}', Имя файла: '{image.filename}'")
    try:
        image_data = await image.read()
        if not image_data:
            logger.error("Ошибка в /api/v1/analyze-outfit: получены пустые данные изображения.")
            return JSONResponse(status_code=400, content={"status": "error", "message": "Файл изображения не может быть пустым."})

        logger.info(f"Изображение для /api/v1/analyze-outfit прочитано, размер: {len(image_data)} байт. Вызов Gemini AI...")
        advice = await analyze_clothing_image(image_data, occasion, preferences)
        if "Ошибка сервера" in advice:
             logger.error(f"Ошибка вызова ИИ-модуля для /api/v1/analyze-outfit: {advice}")
             return JSONResponse(status_code=503, content={"status": "error", "message": advice})
        logger.info("Анализ от Gemini AI для /api/v1/analyze-outfit успешно получен.")
        return {"status": "success", "advice": advice}
    except Exception as e:
        logger.error(f"Критическая ошибка при обработке /api/v1/analyze-outfit: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": f"Внутренняя ошибка сервера при анализе одежды: {str(e)}"})

@api_v1.post("/compare-outfits", summary="Сравнение нескольких предметов одежды", tags=["AI Analysis"])
async def compare_outfits_endpoint(
    images: list[UploadFile] = File(..., description="Список из 2-5 фотографий предметов одежды для сравнения."),
    occasion: str = Form(..., description="Повод/ситуация, для которой подбирается одежда."),
    preferences: str = Form(None, description="Дополнительные предпочтения пользователя (опционально).")
):
    logger.info(f"Получен запрос на /api/v1/compare-outfits. Количество изображений: {len(images)}, Повод: '{occasion}', Предпочтения: '{preferences}'")
    try:
        if not (2 <= len(images) <= 5):
            logger.warning(f"Некорректное количество изображений для /api/v1/compare-outfits: {len(images)}")
            return JSONResponse(status_code=400, content={"status": "error", "message": "Необходимо загрузить от 2 до 5 изображений для сравнения."})
        
        image_data_list = []
        for i, img_file in enumerate(images):
            image_data = await img_file.read()
            if not image_data:
                logger.error(f"Ошибка в /api/v1/compare-outfits: изображение #{i+1} ('{img_file.filename}') содержит пустые данные.")
                return JSONResponse(status_code=400, content={"status": "error", "message": f"Файл изображения '{img_file.filename}' не может быть пустым."})
            image_data_list.append(image_data)
            logger.debug(f"Изображение #{i+1} для /api/v1/compare-outfits ('{img_file.filename}') прочитано, размер: {len(image_data)} байт.")
        
        logger.info("Все изображения для /api/v1/compare-outfits прочитаны. Вызов Gemini AI...")
        advice = await compare_clothing_images(image_data_list, occasion, preferences)
        if "Ошибка сервера" in advice:
             logger.error(f"Ошибка вызова ИИ-модуля для /api/v1/compare-outfits: {advice}")
             return JSONResponse(status_code=503, content={"status": "error", "message": advice})
        logger.info("Сравнительный анализ от Gemini AI для /api/v1/compare-outfits успешно получен.")
        return {"status": "success", "advice": advice}
    except Exception as e:
        logger.error(f"Критическая ошибка при обработке /api/v1/compare-outfits: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": f"Внутренняя ошибка сервера при сравнении образов: {str(e)}"})

@api_v1.get("/test", summary="Тестовый эндпоинт API", tags=["Debug"])
async def test_endpoint():
    logger.info("Обращение к тестовому эндпоинту API (/api/v1/test).")
    return {
        "status": "success",
        "message": "API v1 работает корректно",
        "timestamp": datetime.now().isoformat()
    }

@api_v1.post("/virtual-fitting", summary="Виртуальная примерка одежды", tags=["AI Analysis"])
async def virtual_fitting_endpoint(
    person_image: UploadFile = File(..., description="Фотография человека в полный рост."),
    outfit_image: UploadFile = File(..., description="Фотография одежды для примерки."),
    style_type: str = Form("default", description="Тип стиля примерки (default, casual, business, evening).")
):
    """
    Эндпоинт для виртуальной примерки одежды на фотографию человека.
    
    Args:
        person_image: Фотография человека в полный рост
        outfit_image: Фотография одежды для примерки
        style_type: Тип стиля примерки (default, casual, business, evening)
        
    Returns:
        VirtualFittingResponse: Результат виртуальной примерки
    """
    logger.info(f"Получен запрос на виртуальную примерку. Тип стиля: {style_type}")
    
    try:
        # Проверка типов файлов
        if not person_image.content_type.startswith('image/') or not outfit_image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="Оба файла должны быть изображениями"
            )
        
        # Проверка размера файлов (максимум 10MB)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        person_size = 0
        outfit_size = 0
        
        # Читаем файлы и проверяем их размер
        person_data = await person_image.read()
        person_size = len(person_data)
        if person_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Размер фотографии человека превышает 10MB"
            )
            
        outfit_data = await outfit_image.read()
        outfit_size = len(outfit_data)
        if outfit_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Размер фотографии одежды превышает 10MB"
            )
        
        logger.info(f"Размеры файлов: человек - {person_size/1024/1024:.2f}MB, одежда - {outfit_size/1024/1024:.2f}MB")
        
        # Выполняем виртуальную примерку
        result = await virtual_fitting_with_gemini(person_data, outfit_data, style_type)
        
        if result.get("status") == "error":
            logger.error(f"Ошибка при выполнении виртуальной примерки: {result.get('message', 'Неизвестная ошибка')}")
            raise HTTPException(
                status_code=422,
                detail=result.get("message", "Неизвестная ошибка при выполнении виртуальной примерки")
            )
        
        return VirtualFittingResponse(
            status="ok",
            resultImage=result.get("resultImage", ""),
            advice=result.get("advice", "Виртуальная примерка выполнена успешно!"),
            metadata=result.get("metadata", {})
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Неожиданная ошибка при выполнении виртуальной примерки: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера при выполнении виртуальной примерки"
        )

# Подключаем роутер API v1 к основному приложению
app.include_router(api_v1)

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

class VirtualFittingResponse(BaseModel):
    status: str
    resultImage: str
    advice: str
    metadata: dict = {}

if __name__ == "__main__":
    PORT = int(os.getenv("PORT", 8000))
    HOST = os.getenv("HOST", "0.0.0.0") # Позволяет изменять хост через переменную окружения
    LOG_LEVEL = os.getenv("LOG_LEVEL", "info").lower() # Позволяет изменять уровень логирования

    logger.info(f"Запуск Uvicorn сервера напрямую из __main__ (api.py) на {HOST}:{PORT}, LOG_LEVEL: {LOG_LEVEL}")
    uvicorn.run(
        "api:app", # Важно использовать строку, чтобы --reload работал корректно
        host=HOST,
        port=PORT,
        log_level=LOG_LEVEL,
        reload=True # Включаем reload по умолчанию для удобства разработки при запуске python api.py
    )