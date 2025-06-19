# 🔍 ПОЛНАЯ ДИАГНОСТИКА СИСТЕМЫ ПЛАТЕЖЕЙ МИШУРЫ
# Выполните этот файл для комплексной проверки

import os
import sqlite3
import requests
from datetime import datetime

def diagnose_payment_system():
    """Полная диагностика системы платежей"""
    
    print("🎭 МИШУРА - Диагностика системы платежей")
    print("=" * 60)
    
    # 1. Проверка переменных окружения
    print("1️⃣ ПРОВЕРКА КОНФИГУРАЦИИ:")
    
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        shop_id = os.getenv('YOOKASSA_SHOP_ID')
        secret_key = os.getenv('YOOKASSA_SECRET_KEY')
        webhook_url = os.getenv('WEBHOOK_URL')
        
        print(f"   YOOKASSA_SHOP_ID: {'✅ Найден' if shop_id else '❌ НЕ НАЙДЕН'}")
        print(f"   YOOKASSA_SECRET_KEY: {'✅ Найден' if secret_key else '❌ НЕ НАЙДЕН'}")
        print(f"   WEBHOOK_URL: {webhook_url if webhook_url else '❌ НЕ НАЙДЕН'}")
        
        if shop_id:
            print(f"   Shop ID: {shop_id}")
        if secret_key:
            print(f"   Secret Key: {secret_key[:10]}...")
            
    except Exception as e:
        print(f"   ❌ Ошибка загрузки .env: {e}")
    
    # 2. Проверка базы данных
    print("\n2️⃣ ПРОВЕРКА БАЗЫ ДАННЫХ:")
    
    try:
        conn = sqlite3.connect('styleai.db')
        
        # Структура таблицы payments
        schema = conn.execute("PRAGMA table_info(payments)").fetchall()
        print("   Структура таблицы payments:")
        for col in schema:
            print(f"     - {col[1]} ({col[2]})")
        
        # Статистика платежей
        stats = conn.execute("""
            SELECT 
                status, 
                COUNT(*) as count, 
                SUM(stcoins_amount) as total_stcoins,
                SUM(amount) as total_amount
            FROM payments 
            WHERE user_id = 5930269100 
            GROUP BY status
        """).fetchall()
        
        print("   Статистика платежей пользователя 5930269100:")
        for stat in stats:
            print(f"     - {stat[0]}: {stat[1]} платежей, {stat[2]} STcoin, {stat[3]}₽")
        
        # Последние платежи
        recent = conn.execute("""
            SELECT payment_id, amount, stcoins_amount, status, created_at 
            FROM payments 
            WHERE user_id = 5930269100 
            ORDER BY created_at DESC 
            LIMIT 5
        """).fetchall()
        
        print("   Последние 5 платежей:")
        for payment in recent:
            print(f"     - {payment[0][:15]}... | {payment[1]}₽ | {payment[2]} STcoin | {payment[3]} | {payment[4]}")
        
        conn.close()
        
    except Exception as e:
        print(f"   ❌ Ошибка БД: {e}")
    
    # 3. Проверка API endpoints
    print("\n3️⃣ ПРОВЕРКА API ENDPOINTS:")
    
    api_endpoints = [
        "/api/v1/health",
        "/api/v1/users/5930269100/balance", 
        "/api/v1/payments/history?user_id=5930269100",
        "/api/v1/payments/webhook"
    ]
    
    for endpoint in api_endpoints:
        try:
            if endpoint.endswith("webhook"):
                # POST для webhook
                response = requests.post(f"http://localhost:8000{endpoint}", 
                                       json={"test": True}, timeout=5)
            else:
                # GET для остальных
                response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
            
            print(f"   {endpoint}: {'✅' if response.status_code < 400 else '❌'} {response.status_code}")
            
        except Exception as e:
            print(f"   {endpoint}: ❌ Недоступен ({e})")
    
    # 4. Проверка ЮKassa подключения
    print("\n4️⃣ ПРОВЕРКА ЮKASSA ПОДКЛЮЧЕНИЯ:")
    
    try:
        # Попробуем создать тестовый платеж
        test_payment_data = {
            "user_id": 5930269100,
            "plan_id": "test",
            "return_url": "http://localhost:8000/test"
        }
        
        response = requests.post("http://localhost:8000/api/v1/payments/create", 
                               json=test_payment_data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print("   ✅ Создание платежа работает")
            print(f"   Payment ID: {result.get('payment_id', 'Не найден')}")
            print(f"   Payment URL: {'Найден' if result.get('payment_url') else 'Не найден'}")
        else:
            print(f"   ❌ Ошибка создания платежа: {response.status_code}")
            print(f"   Ответ: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Ошибка проверки ЮKassa: {e}")
    
    # 5. Проверка синхронизации
    print("\n5️⃣ ПРОВЕРКА СИНХРОНИЗАЦИИ:")
    
    try:
        response = requests.post("http://localhost:8000/api/v1/payments/sync_all", 
                               json={"user_id": 5930269100}, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print("   ✅ Синхронизация доступна")
            print(f"   Результат: {result}")
        else:
            print(f"   ❌ Ошибка синхронизации: {response.status_code}")
            print(f"   Ответ: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Ошибка проверки синхронизации: {e}")
    
    print("\n" + "=" * 60)
    print("🎯 ДИАГНОСТИКА ЗАВЕРШЕНА")
    print("\nРекомендации будут даны после анализа результатов.")
    
    return True

if __name__ == "__main__":
    diagnose_payment_system()