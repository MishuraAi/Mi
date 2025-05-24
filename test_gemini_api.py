#!/usr/bin/env python3
"""
Тест API Gemini AI для проекта МИШУРА
Проверяет работу анализа и сравнения изображений
"""

import requests
import time

API_BASE_URL = "http://localhost:8001"

def test_api_health():
    """Проверка состояния API сервера"""
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ API сервер работает!")
            print(f"   Версия: {data.get('version')}")
            print(f"   Статус: {data.get('status')}")
            return True
        else:
            print(f"❌ API сервер недоступен: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Ошибка подключения к API: {e}")
        return False

def test_api_info():
    """Проверка информации об API"""
    try:
        response = requests.get(f"{API_BASE_URL}/api")
        if response.status_code == 200:
            data = response.json()
            print("📋 Информация об API:")
            print(f"   Проект: {data.get('project')}")
            print(f"   Сообщение: {data.get('message')}")
            return True
        else:
            print(f"❌ Информация API недоступна: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Ошибка получения информации: {e}")
        return False

def main():
    print("🚀 МИШУРА - Тестирование Gemini AI API")
    print("=" * 50)
    
    # Проверка состояния сервера
    if not test_api_health():
        print("\n💡 Убедитесь что API сервер запущен: python api.py")
        return
    
    print()
    
    # Проверка информации API
    test_api_info()
    
    print("\n🎯 Готово к тестированию!")
    print("\n📱 Веб-приложение: http://localhost:8000")
    print("🔧 API документация: http://localhost:8001/docs")
    print("\n💡 Для полного тестирования:")
    print("   1. Откройте веб-приложение")
    print("   2. Загрузите фото одежды")
    print("   3. Получите стилистический совет от Gemini AI")

if __name__ == "__main__":
    main() 