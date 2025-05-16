import os
import logging
from fastapi import FastAPI, File, UploadFile, Form, Request
from fastapi.responses import JSONResponse, FileResponse, Response, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from gemini_ai import analyze_clothing_image

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Словарь MIME-типов для различных расширений файлов
MIME_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".txt": "text/plain",
}

def get_mime_type(file_path):
    """Определяет MIME-тип по расширению файла"""
    ext = os.path.splitext(file_path)[1].lower()
    return MIME_TYPES.get(ext, "application/octet-stream")

@app.get("/")
async def root():
    """Корневой маршрут API"""
    return {"message": "Style AI API is running", "webapp_url": "/webapp/"}

@app.get("/webapp", response_class=HTMLResponse)
@app.get("/webapp/", response_class=HTMLResponse)
async def serve_webapp_root():
    """Корневой маршрут веб-приложения"""
    try:
        path = "webapp/index.html"
        if os.path.exists(path):
            logger.info(f"Serving index.html")
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            return HTMLResponse(content=content)
        else:
            logger.error(f"File not found: {path}")
            return HTMLResponse(content="File not found", status_code=404)
    except Exception as e:
        logger.error(f"Error serving index.html: {e}")
        return HTMLResponse(content=f"Error: {str(e)}", status_code=500)

@app.get("/webapp/{file_path:path}")
async def serve_static_file(file_path: str):
    """Обслуживание статических файлов веб-приложения"""
    try:
        # Формируем полный путь к файлу
        full_path = f"webapp/{file_path}"
        
        # Проверяем существование файла
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            logger.error(f"File not found: {full_path}")
            return Response(content=f"File not found: {file_path}", status_code=404)
        
        # Определяем MIME-тип
        mime_type = get_mime_type(full_path)
        logger.info(f"Serving {full_path} with MIME type {mime_type}")
        
        # Возвращаем файл с правильным MIME-типом
        return FileResponse(full_path, media_type=mime_type)
    except Exception as e:
        logger.error(f"Error serving static file: {e}")
        return Response(content=f"Error: {str(e)}", status_code=500)

@app.post("/analyze-outfit")
async def analyze_outfit(image: UploadFile = File(...), 
                      occasion: str = Form(...),
                      preferences: str = Form(None)):
    """Анализ одежды на фотографии"""
    try:
        # Чтение содержимого загруженного файла
        image_data = await image.read()
        
        # Анализ изображения с помощью Gemini
        advice = await analyze_clothing_image(image_data, occasion, preferences)
        
        return {"status": "success", "advice": advice}
    except Exception as e:
        logger.error(f"Error analyzing outfit: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/debug/info")
async def debug_info():
    """Отладочная информация о файлах"""
    try:
        # Проверяем наличие основных файлов
        files_info = {}
        
        # Список всех файлов в корневой директории
        files_info["root_files"] = os.listdir(".")
        
        # Проверка webapp директории
        if os.path.exists("webapp"):
            files_info["webapp_exists"] = True
            files_info["webapp_files"] = os.listdir("webapp")
            
            # Проверка наличия основных файлов
            files_info["index_html"] = {
                "exists": os.path.exists("webapp/index.html"),
                "size": os.path.getsize("webapp/index.html") if os.path.exists("webapp/index.html") else 0
            }
            
            files_info["styles_css"] = {
                "exists": os.path.exists("webapp/styles.css"),
                "size": os.path.getsize("webapp/styles.css") if os.path.exists("webapp/styles.css") else 0
            }
            
            files_info["script_js"] = {
                "exists": os.path.exists("webapp/script.js"),
                "size": os.path.getsize("webapp/script.js") if os.path.exists("webapp/script.js") else 0
            }
            
            # Проверка images директории
            if os.path.exists("webapp/images"):
                files_info["images_dir_exists"] = True
                files_info["images_files"] = os.listdir("webapp/images")
                
                # Проверка наличия иконки загрузки
                icon_path = "webapp/images/upload-icon.svg"
                files_info["upload_icon"] = {
                    "exists": os.path.exists(icon_path),
                    "size": os.path.getsize(icon_path) if os.path.exists(icon_path) else 0
                }
            else:
                files_info["images_dir_exists"] = False
        else:
            files_info["webapp_exists"] = False
        
        # Информация о среде выполнения
        files_info["environment"] = {
            "current_directory": os.getcwd(),
            "python_path": os.path.dirname(os.__file__)
        }
        
        return files_info
    except Exception as e:
        logger.error(f"Error in debug info: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))