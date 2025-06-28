#!/usr/bin/env python3
# view_feedback.py - Просмотр отзывов из базы данных

"""
📝 СКРИПТ ПРОСМОТРА ОТЗЫВОВ МИШУРА
Показывает все отзывы пользователей с детальной информацией
"""

from database import MishuraDB
from datetime import datetime
import json

def view_all_feedback():
    """Показать все отзывы из базы данных"""
    print("📝 ПРОСМОТР ОТЗЫВОВ МИШУРА")
    print("=" * 60)
    
    try:
        db = MishuraDB()
        
        # Получаем все отзывы
        query = """
            SELECT id, telegram_id, feedback_text, feedback_rating, 
                   character_count, consultation_id, bonus_awarded, created_at
            FROM feedback_submissions 
            ORDER BY created_at DESC
        """
        
        results = db._execute_query(query, fetch_all=True)
        
        if not results:
            print("❌ Отзывов пока нет")
            return
        
        print(f"📊 Найдено отзывов: {len(results)}")
        print("=" * 60)
        
        for i, row in enumerate(results, 1):
            feedback_id = row[0]
            telegram_id = row[1]
            feedback_text = row[2]
            feedback_rating = row[3]
            character_count = row[4]
            consultation_id = row[5]
            bonus_awarded = row[6]
            created_at = row[7]
            
            # Определяем иконку рейтинга
            rating_icon = "👍" if feedback_rating == "positive" else "👎"
            bonus_icon = "💰" if bonus_awarded else "⏳"
            
            print(f"\n🔹 ОТЗЫВ #{i} (ID: {feedback_id})")
            print(f"   👤 Пользователь: {telegram_id}")
            print(f"   {rating_icon} Оценка: {feedback_rating}")
            print(f"   📏 Символов: {character_count}")
            print(f"   🆔 Консультация: {consultation_id}")
            print(f"   {bonus_icon} Бонус: {'Начислен' if bonus_awarded else 'Не начислен'}")
            print(f"   📅 Дата: {created_at}")
            print(f"   📝 Текст:")
            
            # Форматируем текст отзыва
            text_lines = feedback_text.split('\n')
            for line in text_lines:
                if line.strip():
                    print(f"      {line}")
            
            print("-" * 40)
        
        # Показываем статистику
        print(f"\n📊 СТАТИСТИКА:")
        stats = db.get_feedback_stats()
        print(f"   Всего отзывов: {stats.get('total_feedback', 0)}")
        print(f"   Сегодня: {stats.get('feedback_today', 0)}")
        print(f"   Средняя длина: {stats.get('avg_feedback_length', 0)} символов")
        print(f"   Положительных: {stats.get('positive_feedback_percent', 0)}%")
        print(f"   Бонусов начислено: {stats.get('bonuses_awarded', 0)}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

def view_user_feedback(telegram_id):
    """Показать отзывы конкретного пользователя"""
    print(f"📝 ОТЗЫВЫ ПОЛЬЗОВАТЕЛЯ {telegram_id}")
    print("=" * 50)
    
    try:
        db = MishuraDB()
        
        query = """
            SELECT id, feedback_text, feedback_rating, character_count, 
                   consultation_id, bonus_awarded, created_at
            FROM feedback_submissions 
            WHERE telegram_id = ?
            ORDER BY created_at DESC
        """
        
        results = db._execute_query(query, (telegram_id,), fetch_all=True)
        
        if not results:
            print(f"❌ У пользователя {telegram_id} нет отзывов")
            return
        
        print(f"📊 Найдено отзывов: {len(results)}")
        print("=" * 50)
        
        for i, row in enumerate(results, 1):
            feedback_id = row[0]
            feedback_text = row[1]
            feedback_rating = row[2]
            character_count = row[3]
            consultation_id = row[4]
            bonus_awarded = row[5]
            created_at = row[6]
            
            rating_icon = "👍" if feedback_rating == "positive" else "👎"
            bonus_icon = "💰" if bonus_awarded else "⏳"
            
            print(f"\n🔹 ОТЗЫВ #{i}")
            print(f"   {rating_icon} Оценка: {feedback_rating}")
            print(f"   📏 Символов: {character_count}")
            print(f"   {bonus_icon} Бонус: {'Начислен' if bonus_awarded else 'Не начислен'}")
            print(f"   📅 Дата: {created_at}")
            print(f"   📝 Текст: {feedback_text}")
            print("-" * 30)
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Показать отзывы конкретного пользователя
        try:
            user_id = int(sys.argv[1])
            view_user_feedback(user_id)
        except ValueError:
            print("❌ Укажите корректный telegram_id (число)")
    else:
        # Показать все отзывы
        view_all_feedback()
    
    print("\n" + "=" * 60)
    print("📊 Для просмотра отзывов конкретного пользователя:")
    print("   python view_feedback.py <telegram_id>")
    print("📊 Для просмотра всех отзывов:")
    print("   python view_feedback.py")