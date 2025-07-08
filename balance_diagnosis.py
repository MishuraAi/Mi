# 🔍 ДИАГНОСТИКА БАЛАНСА ПОЛЬЗОВАТЕЛЯ
# Сохраните как balance_diagnosis.py и запустите локально

import os
import sqlite3
from datetime import datetime

def diagnose_balance(telegram_id):
    """
    Диагностика баланса конкретного пользователя
    """
    
    print(f"🔍 ДИАГНОСТИКА БАЛАНСА для telegram_id: {telegram_id}")
    print("=" * 60)
    
    # Подключаемся к базе данных
    db_path = "styleai.db"  # или путь к вашей БД
    
    if not os.path.exists(db_path):
        print(f"❌ База данных не найдена: {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Проверяем пользователя в таблице users
        cursor.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,))
        user = cursor.fetchone()
        
        if user:
            print(f"✅ ПОЛЬЗОВАТЕЛЬ НАЙДЕН:")
            print(f"   ID: {user[0]}")
            print(f"   Telegram ID: {user[1]}")
            print(f"   Username: {user[2]}")
            print(f"   Имя: {user[3]} {user[4] or ''}")
            print(f"   🎯 БАЛАНС В БД: {user[5]} STcoin")
            print(f"   Создан: {user[6]}")
            print(f"   Обновлен: {user[7]}")
        else:
            print(f"❌ ПОЛЬЗОВАТЕЛЬ НЕ НАЙДЕН в базе данных!")
            return
        
        # 2. История транзакций (если есть таблица transactions)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
        if cursor.fetchone():
            cursor.execute("""
                SELECT transaction_type, amount, created_at, metadata 
                FROM transactions 
                WHERE telegram_id = ? 
                ORDER BY created_at DESC 
                LIMIT 10
            """, (telegram_id,))
            
            transactions = cursor.fetchall()
            if transactions:
                print(f"\n💰 ПОСЛЕДНИЕ 10 ТРАНЗАКЦИЙ:")
                for i, tx in enumerate(transactions, 1):
                    print(f"   {i}. {tx[0]}: {tx[1]:+} STcoin ({tx[2]}) - {tx[3] or 'N/A'}")
            else:
                print(f"\n💰 ТРАНЗАКЦИЙ НЕ НАЙДЕНО")
        
        # 3. История консультаций
        cursor.execute("""
            SELECT COUNT(*), MIN(created_at), MAX(created_at)
            FROM consultations 
            WHERE user_id = ?
        """, (user[0],))
        
        consult_stats = cursor.fetchone()
        if consult_stats and consult_stats[0] > 0:
            print(f"\n📋 КОНСУЛЬТАЦИИ:")
            print(f"   Всего: {consult_stats[0]}")
            print(f"   Первая: {consult_stats[1]}")
            print(f"   Последняя: {consult_stats[2]}")
        
        # 4. История платежей
        cursor.execute("""
            SELECT status, amount, stcoins_amount, created_at, processed_at
            FROM payments 
            WHERE telegram_id = ?
            ORDER BY created_at DESC
            LIMIT 5
        """, (telegram_id,))
        
        payments = cursor.fetchall()
        if payments:
            print(f"\n💳 ПОСЛЕДНИЕ 5 ПЛАТЕЖЕЙ:")
            for i, payment in enumerate(payments, 1):
                status_emoji = "✅" if payment[0] == "succeeded" else "⏳" if payment[0] == "pending" else "❌"
                print(f"   {i}. {status_emoji} {payment[1]} руб → {payment[2]} STcoin ({payment[0]})")
                print(f"      Создан: {payment[3]}, Обработан: {payment[4] or 'N/A'}")
        
        # 5. Balance locks (если есть)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='balance_locks'")
        if cursor.fetchone():
            cursor.execute("SELECT * FROM balance_locks WHERE telegram_id = ?", (telegram_id,))
            lock = cursor.fetchone()
            if lock:
                print(f"\n🔐 BALANCE LOCK:")
                print(f"   Version: {lock[1]}")
                print(f"   Обновлен: {lock[2] if len(lock) > 2 else 'N/A'}")
        
        conn.close()
        
        # 6. РЕКОМЕНДАЦИИ
        print(f"\n🎯 РЕКОМЕНДАЦИИ:")
        
        current_balance = user[5]
        
        if current_balance == 40:
            print("   ✅ Баланс 40 STcoin совпадает с браузером - это актуальный!")
        elif current_balance == 2290:
            print("   ⚠️ Баланс 2290 STcoin совпадает с мобильным - возможно актуальный")
        elif current_balance == 2345:
            print("   ⚠️ Баланс 2345 STcoin совпадает с компьютером Telegram")
        else:
            print(f"   🤔 Баланс {current_balance} не совпадает ни с одним устройством")
        
        print(f"\n🔧 ПЛАН ДЕЙСТВИЙ:")
        print(f"   1. База данных показывает: {current_balance} STcoin")
        print(f"   2. Это должно быть источником истины")
        print(f"   3. Все устройства должны показывать: {current_balance} STcoin")
        
    except Exception as e:
        print(f"❌ Ошибка диагностики: {e}")

if __name__ == "__main__":
    # Замените на актуальный telegram_id
    user_telegram_id = int(input("Введите telegram_id пользователя: "))
    diagnose_balance(user_telegram_id)