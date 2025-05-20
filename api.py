"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: API Сервер (api.py)
ВЕРСИЯ: 0.3.2 (Внедрение методологических комментариев)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

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
from fastapi import FastAPI, File, UploadFile, Form, Request # Добавлен Request для потенциального использования
from fastapi.responses import JSONResponse, FileResponse, Response, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from gemini_ai import analyze_clothing_image, compare_clothing_images

# Настройка стандартного логирования Python
# Рекомендуется использовать более продвинутые конфигурации логирования для production
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s",
)
logger = logging.getLogger(__name__)

logger.info("Запуск API сервера для проекта МИШУРА...")

# Загрузка переменных окружения из .env файла
if load_dotenv():
    logger.info("Переменные окружения из .env файла успешно загружены.")
else:
    logger.warning("Файл .env не найден или пуст. Используются системные переменные окружения (если установлены).")

# Директория веб-приложения (относительно текущего файла api.py)
# Это более надежно, чем просто "webapp", если скрипт запускается из другого места
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEBAPP_DIR = os.path.join(BASE_DIR, "webapp")
logger.info(f"Определена директория веб-приложения: {WEBAPP_DIR}")


app = FastAPI(
    title="МИШУРА - API ИИ-Стилиста",
    description="API для поддержки Telegram Mini App 'МИШУРА', предоставляющего консультации по стилю с использованием Gemini AI.",
    version="0.3.2" # Версия API
)

# Настройка CORS (Cross-Origin Resource Sharing)
# Позволяет веб-приложению обращаться к API с другого домена/порта (актуально для разработки)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Для разработки можно оставить "*", для production лучше указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"], # Разрешить все методы (GET, POST, и т.д.)
    allow_headers=["*"], # Разрешить все заголовки
)
logger.info("CORS middleware настроен с allow_origins=['*'].")

# Словарь MIME-типов для корректной отдачи статических файлов
# Расширен для поддержки SVG и других потенциальных типов
MIME_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain",
    # Можно добавить другие по необходимости (e.g., шрифты woff/woff2)
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}

def get_mime_type(file_path: str) -> str:
    """
    Определяет MIME-тип файла на основе его расширения.

    Args:
        file_path (str): Путь к файлу.

    Returns:
        str: Строка MIME-типа или 'application/octet-stream' по умолчанию.
    """
    try:
        ext = os.path.splitext(file_path)[1].lower()
        return MIME_TYPES.get(ext, "application/octet-stream")
    except Exception as e:
        logger.error(f"Ошибка при определении MIME-типа для '{file_path}': {e}")
        return "application/octet-stream"

@app.get("/", summary="Корневой эндпоинт API", tags=["General"])
async def root():
    """
    Приветственное сообщение API. Показывает, что API запущен.
    """
    logger.info("Обращение к корневому эндпоинту API (/).")
    return {
        "project": "МИШУРА - ИИ Стилист",
        "message": "API сервера 'МИШУРА' успешно запущен и готов к работе!",
        "version": app.version,
        "webapp_status": "Веб-приложение доступно по адресу /webapp/",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

@app.get("/webapp/{file_path:path}", summary="Обслуживание статических файлов веб-приложения", tags=["WebApp"])
async def serve_static_file(file_path: str):
    """
    Отдает статические файлы (HTML, CSS, JS, изображения) для Telegram Mini App "МИШУРА".
    Файлы должны находиться в директории 'webapp'.
    Если запрашиваемый путь - директория, по умолчанию ищется 'index.html' в ней.
    """
    # Формируем полный путь к запрашиваемому файлу внутри WEBAPP_DIR
    requested_path = os.path.join(WEBAPP_DIR, file_path)
    logger.debug(f"Запрос статического файла: '{file_path}'. Полный путь: '{requested_path}'")

    # Нормализуем путь для безопасности и корректности
    # (предотвращает выход за пределы WEBAPP_DIR, например, с помощью ../)
    normalized_path = os.path.normpath(requested_path)

    # Проверка, что нормализованный путь все еще находится внутри WEBAPP_DIR
    if not normalized_path.startswith(os.path.normpath(WEBAPP_DIR)):
        logger.warning(f"Попытка доступа к файлу вне директории webapp: '{file_path}' (нормализован в '{normalized_path}')")
        return Response(content=f"Доступ запрещен: {file_path}", status_code=403) # Forbidden

    # Если путь указывает на директорию, пытаемся отдать index.html из этой директории
    if os.path.isdir(normalized_path):
        index_file_path = os.path.join(normalized_path, "index.html")
        if os.path.isfile(index_file_path):
            logger.info(f"Запрошена директория '{file_path}', отдается index.html: '{index_file_path}'")
            return FileResponse(index_file_path, media_type="text/html")
        else:
            logger.error(f"Запрошена директория '{file_path}', но index.html в ней не найден ('{index_file_path}').")
            return Response(content=f"Directory listing not allowed, and no index.html found in: {file_path}", status_code=404)

    # Проверяем существование файла
    if not os.path.exists(normalized_path) or not os.path.isfile(normalized_path):
        logger.error(f"Статический файл не найден: '{normalized_path}' (запрошен как '{file_path}')")
        return Response(content=f"Файл не найден: {file_path}", status_code=404)

    # Определяем MIME-тип и отдаем файл
    mime_type = get_mime_type(normalized_path)
    logger.info(f"Отдача статического файла: '{normalized_path}' с MIME-типом '{mime_type}'")
    return FileResponse(normalized_path, media_type=mime_type)

# Для удобства, перенаправляем /webapp и /webapp/ на /webapp/index.html
@app.get("/webapp", response_class=HTMLResponse, include_in_schema=False)
@app.get("/webapp/", response_class=HTMLResponse, include_in_schema=False)
async def serve_webapp_root_redirect():
    """
    Обслуживает корневой файл index.html для веб-приложения.
    """
    index_html_path = os.path.join(WEBAPP_DIR, "index.html")
    logger.info(f"Запрос к /webapp/ или /webapp, отдается: {index_html_path}")
    if os.path.exists(index_html_path):
        return FileResponse(index_html_path, media_type="text/html")
    else:
        logger.critical(f"КРИТИЧЕСКАЯ ОШИБКА: Основной файл webapp/index.html не найден по пути: {index_html_path}")
        return HTMLResponse(content="Ошибка сервера: основной файл веб-приложения не найден.", status_code=500)


@app.post("/analyze-outfit", summary="Анализ одного предмета одежды", tags=["AI Analysis"])
async def analyze_outfit(
    image: UploadFile = File(..., description="Фотография предмета одежды для анализа."),
    occasion: str = Form(..., description="Повод/ситуация, для которой подбирается одежда (например, 'повседневный', 'деловой')."),
    preferences: str = Form(None, description="Дополнительные предпочтения пользователя по стилю (опционально).")
):
    """
    Принимает изображение одежды, повод и предпочтения,
    возвращает стилистический анализ и рекомендации от ИИ "МИШУРА".
    """
    logger.info(f"Получен запрос на /analyze-outfit. Повод: '{occasion}', Предпочтения: '{preferences}', Имя файла: '{image.filename}'")
    try:
        image_data = await image.read()
        if not image_data:
            logger.error("Ошибка в /analyze-outfit: получены пустые данные изображения.")
            return JSONResponse(status_code=400, content={"status": "error", "message": "Файл изображения не может быть пустым."})

        logger.info(f"Изображение для /analyze-outfit прочитано, размер: {len(image_data)} байт. Вызов Gemini AI...")
        advice = await analyze_clothing_image(image_data, occasion, preferences)
        logger.info("Анализ от Gemini AI для /analyze-outfit успешно получен.")
        
        return {"status": "success", "advice": advice}
    except Exception as e:
        logger.error(f"Критическая ошибка при обработке /analyze-outfit: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": f"Внутренняя ошибка сервера при анализе одежды: {str(e)}"})

@app.post("/compare-outfits", summary="Сравнение нескольких предметов одежды", tags=["AI Analysis"])
async def compare_outfits(
    images: list[UploadFile] = File(..., description="Список из 2-5 фотографий предметов одежды для сравнения."),
    occasion: str = Form(..., description="Повод/ситуация, для которой подбирается одежда."),
    preferences: str = Form(None, description="Дополнительные предпочтения пользователя (опционально).")
):
    """
    Принимает список изображений (от 2 до 5), повод и предпочтения,
    возвращает сравнительный анализ и рекомендации от ИИ "МИШУРА".
    """
    logger.info(f"Получен запрос на /compare-outfits. Количество изображений: {len(images)}, Повод: '{occasion}', Предпочтения: '{preferences}'")
    try:
        if not (2 <= len(images) <= 5): # Валидация на стороне сервера
            logger.warning(f"Некорректное количество изображений для /compare-outfits: {len(images)}")
            return JSONResponse(status_code=400, content={"status": "error", "message": "Необходимо загрузить от 2 до 5 изображений для сравнения."})
        
        image_data_list = []
        for i, img_file in enumerate(images):
            image_data = await img_file.read()
            if not image_data:
                logger.error(f"Ошибка в /compare-outfits: изображение #{i+1} ({img_file.filename}) содержит пустые данные.")
                return JSONResponse(status_code=400, content={"status": "error", "message": f"Файл изображения '{img_file.filename}' не может быть пустым."})
            image_data_list.append(image_data)
            logger.debug(f"Изображение #{i+1} для /compare-outfits ('{img_file.filename}') прочитано, размер: {len(image_data)} байт.")
        
        logger.info("Все изображения для /compare-outfits прочитаны. Вызов Gemini AI...")
        advice = await compare_clothing_images(image_data_list, occasion, preferences)
        logger.info("Сравнительный анализ от Gemini AI для /compare-outfits успешно получен.")

        return {"status": "success", "advice": advice}
    except Exception as e:
        logger.error(f"Критическая ошибка при обработке /compare-outfits: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": f"Внутренняя ошибка сервера при сравнении одежды: {str(e)}"})

@app.get("/debug/info", summary="Отладочная информация о файлах и окружении", tags=["Debug"])
async def debug_info():
    """
    Предоставляет отладочную информацию о наличии ключевых файлов веб-приложения
    и параметрах окружения сервера. Полезно для диагностики проблем с развертыванием.
    """
    logger.info("Запрошена отладочная информация (/debug/info).")
    files_info = {}
    try:
        files_info["project_name"] = "МИШУРА - ИИ Стилист"
        files_info["api_version"] = app.version
        files_info["timestamp_utc"] = datetime.utcnow().isoformat() + "Z"


        # Информация о корневой директории и ее файлах
        root_dir = BASE_DIR # Используем определенную ранее BASE_DIR
        files_info["root_directory_checked"] = root_dir
        if os.path.exists(root_dir) and os.path.isdir(root_dir):
            try:
                files_info["root_files"] = [f for f in os.listdir(root_dir) if os.path.isfile(os.path.join(root_dir, f))]
                files_info["root_dirs"] = [d for d in os.listdir(root_dir) if os.path.isdir(os.path.join(root_dir, d))]
            except Exception as e_ls:
                 logger.error(f"Ошибка при листинге файлов в {root_dir}: {e_ls}")
                 files_info["root_files_error"] = str(e_ls)
        else:
            files_info["root_directory_error"] = f"Директория {root_dir} не найдена или не является директорией."


        # Информация о директории webapp и ее файлах
        files_info["webapp_directory_checked"] = WEBAPP_DIR
        if os.path.exists(WEBAPP_DIR) and os.path.isdir(WEBAPP_DIR):
            files_info["webapp_exists"] = True
            try:
                files_info["webapp_files_and_dirs"] = os.listdir(WEBAPP_DIR) # Все содержимое
                
                # Проверка конкретных ожидаемых файлов
                expected_webapp_files = {
                    "index.html": "index_html_details",
                    "styles.css": "styles_css_details",
                    "script.js": "script_js_details",
                    "cursor-effect.js": "cursor_effect_js_details",
                    os.path.join("images", "upload-icon.svg"): "upload_icon_svg_details" # Пример вложенного файла
                }
                
                for file_rel_path, key_name in expected_webapp_files.items():
                    full_file_path = os.path.join(WEBAPP_DIR, file_rel_path)
                    exists = os.path.exists(full_file_path) and os.path.isfile(full_file_path)
                    files_info[key_name] = {
                        "path_checked": full_file_path,
                        "exists": exists,
                        "size_bytes": os.path.getsize(full_file_path) if exists else 0,
                        "mime_type_guess": get_mime_type(full_file_path) if exists else "N/A"
                    }

                # Проверка существования директории images внутри webapp
                images_dir_path = os.path.join(WEBAPP_DIR, "images")
                files_info["images_dir_in_webapp"] = {
                    "path_checked": images_dir_path,
                    "exists": os.path.exists(images_dir_path) and os.path.isdir(images_dir_path),
                    "files": os.listdir(images_dir_path) if os.path.exists(images_dir_path) and os.path.isdir(images_dir_path) else []
                }

            except Exception as e_ls_webapp:
                logger.error(f"Ошибка при листинге файлов в {WEBAPP_DIR}: {e_ls_webapp}")
                files_info["webapp_files_error"] = str(e_ls_webapp)
        else:
            files_info["webapp_exists"] = False
            files_info["webapp_error_message"] = f"Директория webapp ({WEBAPP_DIR}) не найдена или не является директорией."
        
        # Информация о среде выполнения Python
        files_info["python_environment"] = {
            "system_path_to_python_executable": sys.executable, # Путь к интерпретатору Python
            "python_version": sys.version,
            "current_working_directory": os.getcwd(), # Фактическая CWD процесса
            "operating_system": platform.system() + " " + platform.release(),
            "machine_architecture": platform.machine()
        }
        
        return JSONResponse(content=files_info)
    except Exception as e:
        logger.error(f"Критическая ошибка при генерации отладочной информации /debug/info: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error_message": f"Ошибка при сборе отладочной информации: {str(e)}"})


# Точка входа для запуска Uvicorn, если файл запускается напрямую
# (например, python api.py). Однако, обычно используется uvicorn api:app.
if __name__ == "__main__":
    import uvicorn
    # Импортируем platform и sys здесь, так как они используются в debug_info, но не в основном коде модуля.
    # Хотя лучше их импортировать в начале файла для ясности. Перемещаю их наверх.
    import platform 
    import sys
    from datetime import datetime # Уже импортировано, но для ясности, что используется в debug_info

    PORT = int(os.getenv("PORT", 8000)) # Используем порт из .env или 8000 по умолчанию
    HOST = "0.0.0.0" # Слушать на всех интерфейсах

    logger.info(f"Запуск Uvicorn сервера напрямую из __main__ (api.py) на {HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT)