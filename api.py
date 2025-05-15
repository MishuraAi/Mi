import os
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

# Проверка файлов в директории webapp
@app.get("/check-webapp")
async def check_webapp():
    try:
        index_path = "webapp/index.html"
        if os.path.exists(index_path):
            with open(index_path, "r") as f:
                content = f.read()
                return {"exists": True, "size": len(content), "first_100": content[:100]}
        else:
            return {"exists": False, "message": "index.html not found"}
    except Exception as e:
        return {"error": str(e)}

# Прямой доступ к index.html
@app.get("/webapp", response_class=HTMLResponse)
@app.get("/webapp/", response_class=HTMLResponse)
async def serve_webapp():
    try:
        index_path = "webapp/index.html"
        if os.path.exists(index_path):
            with open(index_path, "r") as f:
                content = f.read()
                return HTMLResponse(content=content)
        else:
            raise HTTPException(status_code=404, detail="index.html not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Прямой доступ к статическим файлам
@app.get("/webapp/{file_path:path}")
async def serve_static(file_path: str):
    full_path = f"webapp/{file_path}"
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return FileResponse(full_path)
    raise HTTPException(status_code=404, detail=f"File {file_path} not found")

# Проверка файлов
@app.get("/check-files")
async def check_files():
    files = os.listdir(".")
    webapp_exists = os.path.exists("webapp")
    webapp_files = []
    if webapp_exists:
        webapp_files = os.listdir("webapp")
    return {"files": files, "webapp_exists": webapp_exists, "webapp_files": webapp_files}

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