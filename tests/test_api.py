import pytest
from fastapi.testclient import TestClient
from api import app
from PIL import Image
from io import BytesIO
import os

# Создаем тестовый клиент
client = TestClient(app)

# Фикстура для тестового изображения
@pytest.fixture
def test_image():
    img = Image.new('RGB', (100, 100), color='red')
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='JPEG')
    return img_byte_arr.getvalue()

def test_root_endpoint():
    """Тест корневого эндпоинта API"""
    response = client.get("/api/v1/")
    assert response.status_code == 200
    data = response.json()
    assert "project" in data
    assert "version" in data
    assert data["project"] == "МИШУРА - ИИ Стилист"

def test_health_check():
    """Тест эндпоинта проверки состояния"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data
    assert "system" in data

def test_analyze_outfit_endpoint(test_image):
    """Тест эндпоинта анализа одежды"""
    files = {
        'image': ('test.jpg', test_image, 'image/jpeg')
    }
    data = {
        'occasion': 'повседневный стиль',
        'preferences': 'люблю яркие цвета'
    }
    
    response = client.post("/api/v1/analyze-outfit", files=files, data=data)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "advice" in data
    assert data["status"] == "success"

def test_compare_outfits_endpoint(test_image):
    """Тест эндпоинта сравнения одежды"""
    files = [
        ('images', ('test1.jpg', test_image, 'image/jpeg')),
        ('images', ('test2.jpg', test_image, 'image/jpeg'))
    ]
    data = {
        'occasion': 'деловой стиль',
        'preferences': 'классический стиль'
    }
    
    response = client.post("/api/v1/compare-outfits", files=files, data=data)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "advice" in data
    assert data["status"] == "success"

def test_webapp_root():
    """Тест корневого пути веб-приложения"""
    response = client.get("/webapp")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

def test_invalid_image_analysis():
    """Тест обработки некорректного запроса анализа"""
    files = {
        'image': ('test.txt', b'invalid image data', 'text/plain')
    }
    data = {
        'occasion': 'повседневный стиль'
    }
    
    response = client.post("/api/v1/analyze-outfit", files=files, data=data)
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == "error"

def test_rate_limiting():
    """Тест ограничения частоты запросов"""
    # Делаем несколько запросов подряд
    for _ in range(65):  # Превышаем лимит в 60 запросов в минуту
        response = client.get("/api/v1/")
    
    # Последний запрос должен быть отклонен
    assert response.status_code == 429
    data = response.json()
    assert data["status"] == "error"
    assert "Too many requests" in data["message"] 