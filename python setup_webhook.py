# 🔧 Скрипт для настройки webhook ЮKassa
# Запустите этот код ОДИН РАЗ после деплоя

import os
import requests
import base64
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

YOOKASSA_SHOP_ID = os.getenv('YOOKASSA_SHOP_ID')
YOOKASSA_SECRET_KEY = os.getenv('YOOKASSA_SECRET_KEY')
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://your-app.onrender.com')

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
        'Idempotence-Key': f'webhook-setup-{YOOKASSA_SHOP_ID}'
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
        
        if response.status_code in [200, 201]:
            print("✅ Webhook успешно настроен")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Ошибка настройки webhook: {response.status_code}")
            print(f"   Response: {response.text}")
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
            return []
            
    except Exception as e:
        print(f"❌ Исключение при получении webhooks: {e}")
        return []

if __name__ == "__main__":
    print("🚀 Настройка ЮKassa integration")
    print(f"   WEBAPP_URL: {WEBAPP_URL}")
    
    # Проверяем существующие webhooks
    existing_webhooks = check_existing_webhooks()
    
    # Проверяем, есть ли уже webhook для нашего URL
    webhook_url = f"{WEBAPP_URL}/api/v1/payments/webhook"
    webhook_exists = any(
        webhook.get('url') == webhook_url 
        for webhook in existing_webhooks
    )
    
    if webhook_exists:
        print("✅ Webhook уже настроен для текущего URL")
    else:
        print("🔧 Настраиваем новый webhook...")
        success = setup_yookassa_webhook()
        
        if success:
            print("🎉 Webhook успешно настроен!")
        else:
            print("❌ Не удалось настроить webhook")
            print("💡 Возможно, нужно настроить вручную в личном кабинете ЮKassa")