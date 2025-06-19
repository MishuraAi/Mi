#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🔧 ИСПРАВЛЕНИЕ PENDING ПЛАТЕЖЕЙ
Принудительное завершение всех pending платежей для тестирования
"""

import sqlite3
from datetime import datetime

def fix_pending_payments():
    """Принудительно завершаем все pending платежи"""
    
    try:
        conn = sqlite3.connect('styleai.db')
        
        # Получаем все pending платежи пользователя
        pending_payments = conn.execute("""
            SELECT payment_id, stcoins_amount, amount, plan_id
            FROM payments 
            WHERE user_id = 5930269100 AND status = 'pending'
            ORDER BY created_at DESC
        """).fetchall()
        
        if not pending_payments:
            print("❌ Нет pending платежей для обработки")
            conn.close()
            return
        
        print(f"🔍 Найдено {len(pending_payments)} pending платежей:")
        
        total_stcoins = 0
        
        for payment in pending_payments:
            payment_id = payment[0]
            stcoins_amount = payment[1]
            amount = payment[2]
            plan_id = payment[3]
            
            print(f"📦 Платеж {payment_id[:20]}...")
            print(f"   Сумма: {amount}₽")
            print(f"   STcoin: {stcoins_amount}")
            print(f"   План: {plan_id}")
            
            # Обновляем статус платежа (без updated_at)
            conn.execute("""
                UPDATE payments 
                SET status = 'completed' 
                WHERE payment_id = ?
            """, (payment_id,))
            
            # Зачисляем STcoin пользователю (без updated_at)
            conn.execute("""
                UPDATE users 
                SET balance = balance + ?
                WHERE telegram_id = 5930269100
            """, (stcoins_amount,))
            
            total_stcoins += stcoins_amount
            print(f"   ✅ Завершен: +{stcoins_amount} STcoin")
            print()
        
        # Сохраняем изменения
        conn.commit()
        
        # Получаем новый баланс
        new_balance = conn.execute("""
            SELECT balance FROM users WHERE telegram_id = 5930269100
        """).fetchone()
        
        if new_balance:
            new_balance = new_balance[0]
        else:
            print("❌ Пользователь не найден!")
            conn.close()
            return
        
        print("=" * 50)
        print(f"🎉 РЕЗУЛЬТАТ:")
        print(f"   Обработано платежей: {len(pending_payments)}")
        print(f"   Зачислено STcoin: {total_stcoins}")
        print(f"   Новый баланс: {new_balance} STcoin")
        print("=" * 50)
        
        # Проверяем, что pending платежей больше нет
        remaining_pending = conn.execute("""
            SELECT COUNT(*) FROM payments 
            WHERE user_id = 5930269100 AND status = 'pending'
        """).fetchone()[0]
        
        if remaining_pending == 0:
            print("✅ Все pending платежи обработаны!")
        else:
            print(f"⚠️ Остались pending платежи: {remaining_pending}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    print("🔧 ИСПРАВЛЕНИЕ PENDING ПЛАТЕЖЕЙ")
    print("=" * 50)
    fix_pending_payments()