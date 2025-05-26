import pytest
import os
from PIL import Image
from io import BytesIO
from gemini_ai import (
    analyze_clothing_image,
    compare_clothing_images,
    test_gemini_connection,
    optimize_image
)

# Фикстура для тестового изображения
@pytest.fixture
def test_image():
    # Создаем простое тестовое изображение
    img = Image.new('RGB', (100, 100), color='red')
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='JPEG')
    return img_byte_arr.getvalue()

@pytest.mark.asyncio
async def test_gemini_connection():
    """Тест соединения с Gemini API"""
    success, message = await test_gemini_connection()
    assert success, f"Ошибка соединения с Gemini API: {message}"

@pytest.mark.asyncio
async def test_analyze_clothing_image(test_image):
    """Тест анализа одного изображения"""
    occasion = "повседневный стиль"
    preferences = "люблю яркие цвета"
    
    result = await analyze_clothing_image(test_image, occasion, preferences)
    assert isinstance(result, str)
    assert len(result) > 0
    assert "Ошибка" not in result

@pytest.mark.asyncio
async def test_compare_clothing_images(test_image):
    """Тест сравнения нескольких изображений"""
    occasion = "деловой стиль"
    preferences = "классический стиль"
    
    # Создаем список из двух одинаковых изображений для теста
    image_list = [test_image, test_image]
    
    result = await compare_clothing_images(image_list, occasion, preferences)
    assert isinstance(result, str)
    assert len(result) > 0
    assert "Ошибка" not in result

def test_optimize_image(test_image):
    """Тест оптимизации изображения"""
    # Конвертируем bytes в PIL Image
    img = Image.open(BytesIO(test_image))
    
    # Тестируем оптимизацию
    optimized = optimize_image(img)
    assert isinstance(optimized, bytes)
    assert len(optimized) > 0
    
    # Проверяем, что оптимизированное изображение можно открыть
    optimized_img = Image.open(BytesIO(optimized))
    assert optimized_img.size[0] <= 1024
    assert optimized_img.size[1] <= 1024

{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "debugpy",
      "request": "launch",
      "name": "Run FastAPI API (api.py)",
      "program": "${workspaceFolder}/api.py",
      "args": [
        "run"
      ],
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    },
    {
      "type": "debugpy",
      "request": "launch",
      "name": "Run Simple API Demo (api_simple.py)",
      "program": "${workspaceFolder}/api_simple.py",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    },
    {
      "type": "debugpy",
      "request": "launch",
      "name": "Run Telegram Bot (bot.py)",
      "program": "${workspaceFolder}/bot.py",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    },
    {
      "type": "debugpy",
      "request": "launch",
      "name": "Run Webapp Static Server (webapp/server.py)",
      "program": "${workspaceFolder}/webapp/server.py",
      "console": "integratedTerminal"
    },
    {
      "type": "debugpy",
      "request": "launch",
      "name": "Run Demo Data Init (init_demo_data.py)",
      "program": "${workspaceFolder}/init_demo_data.py",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    },
    {
      "type": "debugpy",
      "request": "launch",
      "name": "Run Setup Webhook (setup_webhook.py)",
      "program": "${workspaceFolder}/setup_webhook.py",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    }
  ]
}