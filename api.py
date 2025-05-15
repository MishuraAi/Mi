import os
import base64
import json
import requests
from fastapi import FastAPI, HTTPException, Request, File, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO
import database as db

# Загрузка переменных окружения
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Монтирование статических файлов веб-приложения
# Эта строка должна быть перед определением маршрутов
try:
    app.mount("/webapp", StaticFiles(directory="webapp"), name="webapp")
    print("Webapp directory mounted successfully")
except Exception as e:
    print(f"Error mounting webapp directory: {e}")

# Прямой доступ к файлу index.html
@app.get("/webapp/", response_class=FileResponse)
async def webapp_root():
    return FileResponse("webapp/index.html")

# Эндпоинт для анализа изображения
@app.post("/analyze-outfit")
async def analyze_outfit(image: UploadFile = File(...), 
                      occasion: str = Form(...),
                      preferences: str = Form(None)):
    try:
        # Чтение и конвертация изображения
        image_data = await image.read()
        
        # Сохранение изображения (временная заглушка для демонстрации)
        user_id = 123  # В реальном приложении здесь будет ID пользователя из Telegram
        os.makedirs("user_photos", exist_ok=True)
        file_path = f"user_photos/{user_id}_{occasion}.jpg"
        
        with open(file_path, "wb") as f:
            f.write(image_data)
        
        # Временная заглушка для демонстрации
        advice = f"""
# Анализ вашей одежды

## Описание
На изображении представлена классическая белая блуза с V-образным вырезом и длинными рукавами. Материал выглядит как легкий хлопок или шелковая смесь.

## Оценка для повода "{occasion}"
Эта блуза является универсальным предметом гардероба и подходит для многих случаев, включая "{occasion}". {"Для офиса она создаст профессиональный образ" if occasion == 'work' else "Для свидания она может стать основой романтичного наряда" if occasion == 'date' else "Для вечеринки её можно дополнить яркими аксессуарами" if occasion == 'party' else "Для повседневных выходов она создаст элегантный кэжуал"}.

## Рекомендации по сочетанию
- **Для работы/офиса**: Сочетайте с классическими брюками или юбкой-карандаш темно-синего или черного цвета.
- **Для повседневного образа**: Подойдут джинсы или цветные брюки, можно заправить блузу или оставить навыпуск.
- **Для вечернего выхода**: Комбинируйте с элегантной юбкой миди или узкими брюками и добавьте яркие аксессуары.

## Советы по аксессуарам
- Добавьте ожерелье средней длины, которое будет хорошо смотреться с V-образным вырезом
- Элегантные серьги подчеркнут образ
- Для придания образу цвета можно использовать яркий шарф или платок
- Пояс на талии поможет подчеркнуть силуэт

Эта блуза - прекрасная базовая вещь, которая послужит основой для множества разнообразных образов.
        """
        
        # В реальном приложении здесь будет вызов OpenAI API для анализа изображения
        # Также здесь может быть сохранение консультации в базу данных
        
        return {"status": "success", "advice": advice}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Эндпоинт для веб-хука Telegram
@app.post("/webhook")
async def telegram_webhook(request: Request):
    data = await request.json()
    
    # Обработка данных от Telegram Mini App
    if 'web_app_data' in data['message']:
        web_app_data = json.loads(data['message']['web_app_data']['data'])
        user_id = data['message']['from']['id']
        
        if web_app_data.get('action') == 'consultation_result':
            # Здесь можно обрабатывать результаты консультации
            pass
    
    return {"status": "success"}

# Проверка файлов для диагностики
@app.get("/check-files")
async def check_files():
    try:
        import os
        files = os.listdir(".")
        webapp_exists = os.path.exists("webapp")
        webapp_files = []
        if webapp_exists:
            webapp_files = os.listdir("webapp")
        
        # Проверка конкретного файла
        index_exists = os.path.exists("webapp/index.html")
        
        return {
            "root_files": files,
            "webapp_exists": webapp_exists,
            "webapp_files": webapp_files,
            "index_html_exists": index_exists
        }
    except Exception as e:
        return {"error": str(e)}

# Главная страница
@app.get("/")
async def root():
    return {"message": "Style AI API is running", "info": "Access the webapp at /webapp/"}

# Запуск сервера
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)