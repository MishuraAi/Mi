#!/usr/bin/env python3
# safe_add_balance.py

"""
💰 БЕЗОПАСНОЕ ПОПОЛНЕНИЕ БАЛАНСА
Учитывает financial_service если доступен
"""

def safe_add_balance(telegram_id, amount):
    """Безопасно добавить баланс с учетом всех зависимостей"""
    try:
        from database import MishuraDB
        
        # Проверяем наличие financial_service
        financial_service = None
        try:
            import builtins
            financial_service = getattr(builtins, 'GLOBAL_FINANCIAL_SERVICE', None)
        except:
            pass
        
        db = MishuraDB()
        
        # Получаем текущий баланс
        current_balance = db.get_user_balance(telegram_id)
        print(f"💰 Текущий баланс пользователя {telegram_id}: {current_balance} STcoin")
        
        if financial_service:
            print("🔐 Используем financial_service для безопасного пополнения...")
            
            # Используем безопасную операцию
            result = financial_service.safe_balance_operation(
                telegram_id=telegram_id,
                amount_change=amount,
                operation_type="manual_admin_topup",
                metadata={
                    "admin_action": True,
                    "reason": "manual_balance_addition",
                    "original_balance": current_balance
                }
            )
            
            if result['success']:
                new_balance = result['new_balance']
                print(f"✅ Пополнение через financial_service успешно!")
            else:
                print(f"❌ Ошибка financial_service: {result}")
                return False
        else:
            print("📊 Используем прямое обновление database...")
            
            # Прямое обновление через database
            new_balance = db.update_user_balance(telegram_id, amount, "manual_admin_topup")
        
        print(f"✅ Баланс обновлен!")
        print(f"   Было: {current_balance} STcoin")
        print(f"   Добавлено: +{amount} STcoin")
        print(f"   Стало: {new_balance} STcoin")
        
        # Проверяем что баланс действительно изменился
        verification_balance = db.get_user_balance(telegram_id)
        if verification_balance == new_balance:
            print(f"✅ Верификация: баланс корректно сохранен")
            return True
        else:
            print(f"❌ Ошибка верификации: ожидалось {new_balance}, получено {verification_balance}")
            return False
        
    except Exception as e:
        print(f"❌ Критическая ошибка пополнения баланса: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    USER_ID = 5930269100
    AMOUNT = 1000
    
    print(f"💳 БЕЗОПАСНОЕ пополнение баланса пользователя {USER_ID} на {AMOUNT} STcoin...")
    print("🔍 Проверяем все зависимости...")
    
    success = safe_add_balance(USER_ID, AMOUNT)
    
    if success:
        print("\n🎉 ПОПОЛНЕНИЕ УСПЕШНО ЗАВЕРШЕНО!")
        print("📱 Обновите страницу приложения для синхронизации баланса")
    else:
        print("\n❌ ОШИБКА ПОПОЛНЕНИЯ - проверьте логи выше")