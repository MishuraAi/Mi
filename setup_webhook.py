# 🔧 Скрипт для настройки webhook ЮKassa
# Сохраните этот файл как setup_webhook.py

import os
import requests
import base64

# Ваши настройки ЮKassa
YOOKASSA_SHOP_ID = "1103345"  # Из логов
YOOKASSA_SECRET_KEY = input("Введите ваш YOOKASSA_SECRET_KEY: ")
WEBAPP_URL = "https://mi-q7ae.onrender.com"  # Из логов

def setup_yookassa_webhook():
    """Настройка webhook для ЮKassa"""
    
    if not YOOKASSA_SHOP_ID or not YOOKASSA_SECRET_KEY:
        print("❌ Отсутствуют настройки ЮKassa")
        return False
    
    # URL для webhook
    webhook_url = f"{WEBAPP_URL}/api/v1/payments/webhook"
    
    # Подготовка авторизации для ЮKassa API
    credentials = f"{YOOKASSA_SHOP_ID}:{YOOKASSA_SECRET_KEY}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    
    headers = {
        'Authorization': f'Basic {encoded_credentials}',
        'Content-Type': 'application/json',
        'Idempotence-Key': f'webhook-setup-{YOOKASSA_SHOP_ID}-v2'
    }
    
    # Данные для создания webhook
    webhook_data = {
        "event": "payment.succeeded",
        "url": webhook_url
    }
    
    print(f"🔧 Настройка webhook ЮKassa:")
    print(f"   Shop ID: {YOOKASSA_SHOP_ID}")
    print(f"   Webhook URL: {webhook_url}")
    
    try:
        # Создание webhook через ЮKassa API
        response = requests.post(
            'https://api.yookassa.ru/v3/webhooks',
            headers=headers,
            json=webhook_data,
            timeout=30
        )
        
        print(f"📡 Response status: {response.status_code}")
        print(f"📡 Response body: {response.text}")
        
        if response.status_code in [200, 201]:
            print("✅ Webhook успешно настроен")
            return True
        elif response.status_code == 400:
            response_data = response.json()
            if "already exists" in response_data.get("description", "").lower():
                print("✅ Webhook уже существует")
                return True
            else:
                print(f"❌ Ошибка настройки webhook: {response_data}")
                return False
        else:
            print(f"❌ Ошибка настройки webhook: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Исключение при настройке webhook: {e}")
        return False

def check_existing_webhooks():
    """Проверка существующих webhook'ов"""
    
    credentials = f"{YOOKASSA_SHOP_ID}:{YOOKASSA_SECRET_KEY}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    
    headers = {
        'Authorization': f'Basic {encoded_credentials}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(
            'https://api.yookassa.ru/v3/webhooks',
            headers=headers,
            timeout=30
        )
        
        print(f"📡 Webhooks list status: {response.status_code}")
        
        if response.status_code == 200:
            webhooks = response.json().get('items', [])
            print(f"📋 Существующие webhooks ({len(webhooks)}):")
            
            for webhook in webhooks:
                print(f"   ID: {webhook.get('id')}")
                print(f"   URL: {webhook.get('url')}")
                print(f"   Event: {webhook.get('event')}")
                print("   ---")
                
            return webhooks
        else:
            print(f"❌ Ошибка получения webhooks: {response.status_code}")
            print(f"Response: {response.text}")
            return []
            
    except Exception as e:
        print(f"❌ Исключение при получении webhooks: {e}")
        return []

def test_webhook_endpoint():
    """Тест доступности webhook endpoint"""
    webhook_url = f"{WEBAPP_URL}/api/v1/payments/webhook"
    
    try:
        # Простой GET запрос для проверки доступности
        response = requests.get(f"{WEBAPP_URL}/api/v1/health", timeout=10)
        if response.status_code == 200:
            print(f"✅ Сервер доступен: {WEBAPP_URL}")
            return True
        else:
            print(f"❌ Сервер недоступен: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Ошибка подключения к серверу: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Настройка ЮKassa webhook для МИШУРА")
    print(f"   WEBAPP_URL: {WEBAPP_URL}")
    print(f"   Shop ID: {YOOKASSA_SHOP_ID}")
    
    # Проверяем доступность сервера
    if not test_webhook_endpoint():
        print("❌ Сервер недоступен, прекращаем настройку")
        exit(1)
    
    # Проверяем существующие webhooks
    print("\n1️⃣ Проверяем существующие webhooks...")
    existing_webhooks = check_existing_webhooks()
    
    # Проверяем, есть ли уже webhook для нашего URL
    webhook_url = f"{WEBAPP_URL}/api/v1/payments/webhook"
    webhook_exists = any(
        webhook.get('url') == webhook_url 
        for webhook in existing_webhooks
    )
    
    if webhook_exists:
        print("✅ Webhook уже настроен для текущего URL")
        print("🎉 Настройка завершена!")
    else:
        print("\n2️⃣ Настраиваем новый webhook...")
        success = setup_yookassa_webhook()
        
        if success:
            print("🎉 Webhook успешно настроен!")
            print(f"✅ Теперь ЮKassa будет отправлять уведомления на: {webhook_url}")
        else:
            print("❌ Не удалось настроить webhook автоматически")
            print("💡 Настройте webhook вручную в личном кабинете ЮKassa:")
            print(f"   URL: {webhook_url}")
            print(f"   Event: payment.succeeded")
    
    print(f"\n🔗 Ваше приложение доступно по адресу: {WEBAPP_URL}")