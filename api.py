import os
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
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

# Попытка монтирования директории webapp
try:
    if os.path.exists("webapp"):
        app.mount("/webapp", StaticFiles(directory="webapp"), name="webapp")
        print("Webapp directory mounted successfully")
    else:
        print("Webapp directory not found")
except Exception as e:
    print(f"Error mounting webapp directory: {e}")

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
    return {"message": "Style AI API is running"}

# Запуск сервера
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)