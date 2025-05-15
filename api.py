import os
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

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

# Словарь MIME-типов
MIME_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}

# Функция для определения MIME-типа
def get_mime_type(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    return MIME_TYPES.get(ext, "application/octet-stream")

# Прямой доступ к файлам веб-приложения
@app.get("/webapp/{path:path}")
async def serve_webapp_file(path: str, request: Request):
    # Если путь пустой или заканчивается на /, возвращаем index.html
    if path == "" or path.endswith("/"):
        file_path = "webapp/index.html"
    else:
        file_path = f"webapp/{path}"
    
    # Проверяем существование файла
    if not os.path.exists(file_path):
        # Пробуем найти index.html, если файл не найден
        if path == "":
            alt_path = "webapp/index.html"
            if os.path.exists(alt_path):
                return FileResponse(alt_path)
        raise HTTPException(status_code=404, detail="File not found")
    
    # Если это директория, пытаемся найти index.html внутри
    if os.path.isdir(file_path):
        index_path = os.path.join(file_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Directory index not found")
    
    # Определяем MIME-тип файла
    mime_type = get_mime_type(file_path)
    
    # Возвращаем файл с правильным MIME-типом
    return FileResponse(file_path, media_type=mime_type)

# Маршрут для корня веб-приложения
@app.get("/webapp", include_in_schema=False)
@app.get("/webapp/", include_in_schema=False)
async def serve_webapp_root():
    return FileResponse("webapp/index.html")

# Проверка путей к файлам
@app.get("/debug/check-files")
async def debug_check_files(path: str = None):
    if path:
        full_path = f"webapp/{path}"
        if os.path.exists(full_path):
            if os.path.isfile(full_path):
                size = os.path.getsize(full_path)
                mime = get_mime_type(full_path)
                return {
                    "exists": True, 
                    "is_file": True, 
                    "size": size,
                    "mime": mime
                }
            else:
                return {"exists": True, "is_file": False, "contents": os.listdir(full_path)}
        else:
            return {"exists": False}
    
    files = os.listdir(".")
    webapp_exists = os.path.exists("webapp")
    webapp_files = []
    if webapp_exists:
        webapp_files = os.listdir("webapp")
        
        # Проверяем основные файлы
        checks = {
            "index.html": os.path.exists("webapp/index.html"),
            "styles.css": os.path.exists("webapp/styles.css"),
            "script.js": os.path.exists("webapp/script.js"),
            "images_dir": os.path.exists("webapp/images") and os.path.isdir("webapp/images")
        }
        
        # Проверяем изображения
        images = []
        if checks["images_dir"]:
            images = os.listdir("webapp/images")
    
    return {
        "files": files, 
        "webapp_exists": webapp_exists, 
        "webapp_files": webapp_files,
        "file_checks": checks if webapp_exists else None,
        "images": images if webapp_exists and checks["images_dir"] else None
    }

# Простой эндпоинт для анализа
@app.post("/analyze-outfit")
async def analyze_outfit(image: UploadFile = File(...), 
                      occasion: str = Form(...),
                      preferences: str = Form(None)):
    return {"status": "success", "message": "Analysis endpoint is working"}

# Главная страница
@app.get("/")
async def root():
    return {"message": "Style AI API is running", "webapp": "/webapp/"}

# Запуск сервера
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)