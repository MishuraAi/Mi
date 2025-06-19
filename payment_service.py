#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
🎭 МИШУРА - Payment Service
Сервис для работы с платежами ЮKassa
"""

import os
import sqlite3
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

# Настройка логирования
logger = logging.getLogger(__name__)

# Путь к базе данных
DATABASE_PATH = os.getenv('DB_PATH', 'styleai.db')

# ================================
# ОСНОВНЫЕ ФУНКЦИИ ПЛАТЕЖЕЙ
# ================================

def save_payment(payment_id: str, user_id: int, amount: float, currency: str, 
                status: str, plan_id: str = None, stcoins_amount: int = None):
    """Сохранить платеж с информацией о тарифном плане"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Проверяем, существует ли таблица с нужными колонками
        cursor.execute("PRAGMA table_info(payments)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Базовый запрос
        if 'plan_id' in columns and 'stcoins_amount' in columns:
            # Новая схема с plan_id и stcoins_amount
            cursor.execute("""
                INSERT INTO payments (
                    payment_id, user_id, amount, currency, status, 
                    plan_id, stcoins_amount, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payment_id, user_id, amount, currency, status,
                plan_id, stcoins_amount, datetime.now()
            ))
        else:
            # Старая схема - только базовые поля
            cursor.execute("""
                INSERT INTO payments (
                    payment_id, user_id, amount, currency, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                payment_id, user_id, amount, currency, status, datetime.now()
            ))
        
        conn.commit()
        logger.info(f"Payment saved: {payment_id} for user {user_id}, plan {plan_id}")
    except Exception as e:
        logger.error(f"Error saving payment: {e}")
        raise
    finally:
        conn.close()

def get_payment(payment_id: str) -> Optional[Dict[str, Any]]:
    """Получить платеж по ID"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT payment_id, user_id, amount, currency, status, 
                   plan_id, stcoins_amount, created_at
            FROM payments 
            WHERE payment_id = ?
        """, (payment_id,))
        
        row = cursor.fetchone()
        if not row:
            return None
        
        return {
            'payment_id': row[0],
            'user_id': row[1],
            'amount': row[2],
            'currency': row[3],
            'status': row[4],
            'plan_id': row[5] if len(row) > 5 else None,
            'stcoins_amount': row[6] if len(row) > 6 else None,
            'created_at': row[7] if len(row) > 7 else row[5]  # Fallback для старой схемы
        }
        
    except Exception as e:
        logger.error(f"Error getting payment {payment_id}: {e}")
        return None
    finally:
        conn.close()

def update_payment_status(payment_id: str, status: str):
    """Обновить статус платежа"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE payments 
            SET status = ?, updated_at = ?
            WHERE payment_id = ?
        """, (status, datetime.now(), payment_id))
        
        conn.commit()
        
        if cursor.rowcount == 0:
            logger.warning(f"Payment {payment_id} not found for status update")
        else:
            logger.info(f"Payment {payment_id} status updated to {status}")
        
    except Exception as e:
        logger.error(f"Error updating payment status: {e}")
        raise
    finally:
        conn.close()

def get_user_payments(user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
    """Получить платежи пользователя"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT payment_id, amount, currency, status, plan_id, 
                   stcoins_amount, created_at
            FROM payments 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (user_id, limit))
        
        rows = cursor.fetchall()
        payments = []
        
        for row in rows:
            payment = {
                'payment_id': row[0],
                'amount': row[1],
                'currency': row[2],
                'status': row[3],
                'plan_id': row[4] if len(row) > 4 else None,
                'stcoins_amount': row[5] if len(row) > 5 else None,
                'created_at': row[6] if len(row) > 6 else row[4]  # Fallback
            }
            payments.append(payment)
        
        return payments
        
    except Exception as e:
        logger.error(f"Error getting user payments: {e}")
        return []
    finally:
        conn.close()

# ================================
# СТАТИСТИКА И АНАЛИТИКА
# ================================

def get_payment_stats() -> Dict[str, Any]:
    """Получить статистику платежей"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Общая статистика
        cursor.execute("""
            SELECT 
                COUNT(*) as total_payments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled_payments,
                SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
                AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as avg_payment
            FROM payments
        """)
        
        stats_row = cursor.fetchone()
        
        # Статистика по планам (если есть колонка plan_id)
        cursor.execute("PRAGMA table_info(payments)")
        columns = [column[1] for column in cursor.fetchall()]
        
        plans_stats = []
        if 'plan_id' in columns:
            cursor.execute("""
                SELECT 
                    plan_id,
                    COUNT(*) as sales_count,
                    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as revenue,
                    SUM(CASE WHEN status = 'completed' THEN stcoins_amount ELSE 0 END) as stcoins_sold
                FROM payments 
                WHERE plan_id IS NOT NULL
                GROUP BY plan_id
                ORDER BY sales_count DESC
            """)
            
            plans_rows = cursor.fetchall()
            for row in plans_rows:
                plans_stats.append({
                    'plan_id': row[0],
                    'sales_count': row[1],
                    'revenue': row[2],
                    'stcoins_sold': row[3]
                })
        
        return {
            'total_payments': stats_row[0] or 0,
            'successful_payments': stats_row[1] or 0,
            'pending_payments': stats_row[2] or 0,
            'canceled_payments': stats_row[3] or 0,
            'total_revenue': stats_row[4] or 0.0,
            'average_payment': stats_row[5] or 0.0,
            'plans_stats': plans_stats,
            'success_rate': (stats_row[1] / stats_row[0] * 100) if stats_row[0] > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Error getting payment stats: {e}")
        return {
            'total_payments': 0,
            'successful_payments': 0,
            'pending_payments': 0,
            'canceled_payments': 0,
            'total_revenue': 0.0,
            'average_payment': 0.0,
            'plans_stats': [],
            'success_rate': 0
        }
    finally:
        conn.close()

def get_revenue_by_period(days: int = 30) -> List[Dict[str, Any]]:
    """Получить доходы за период"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as payments_count,
                SUM(amount) as daily_revenue,
                SUM(CASE WHEN status = 'completed' THEN stcoins_amount ELSE 0 END) as stcoins_sold
            FROM payments 
            WHERE created_at >= datetime('now', '-{} days')
                AND status = 'completed'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        """.format(days))
        
        rows = cursor.fetchall()
        revenue_data = []
        
        for row in rows:
            revenue_data.append({
                'date': row[0],
                'payments_count': row[1],
                'revenue': row[2],
                'stcoins_sold': row[3]
            })
        
        return revenue_data
        
    except Exception as e:
        logger.error(f"Error getting revenue data: {e}")
        return []
    finally:
        conn.close()

# ================================
# ПЛАН-СПЕЦИФИЧНЫЕ ФУНКЦИИ
# ================================

def get_plan_purchases(plan_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Получить покупки конкретного плана"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT payment_id, user_id, amount, status, stcoins_amount, created_at
            FROM payments 
            WHERE plan_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (plan_id, limit))
        
        rows = cursor.fetchall()
        purchases = []
        
        for row in rows:
            purchases.append({
                'payment_id': row[0],
                'user_id': row[1],
                'amount': row[2],
                'status': row[3],
                'stcoins_amount': row[4],
                'created_at': row[5]
            })
        
        return purchases
                
    except Exception as e:
        logger.error(f"Error getting plan purchases: {e}")
        return []
    finally:
        conn.close()

def get_most_popular_plans(limit: int = 5) -> List[Dict[str, Any]]:
    """Получить самые популярные планы"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                plan_id,
                COUNT(*) as total_purchases,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_purchases,
                SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as revenue,
                AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as avg_amount
            FROM payments 
            WHERE plan_id IS NOT NULL
            GROUP BY plan_id
            ORDER BY successful_purchases DESC
            LIMIT ?
        """, (limit,))
        
        rows = cursor.fetchall()
        popular_plans = []
        
        for row in rows:
            popular_plans.append({
                'plan_id': row[0],
                'total_purchases': row[1],
                'successful_purchases': row[2],
                'revenue': row[3] or 0.0,
                'average_amount': row[4] or 0.0,
                'conversion_rate': (row[2] / row[1] * 100) if row[1] > 0 else 0
            })
        
        return popular_plans
        
    except Exception as e:
        logger.error(f"Error getting popular plans: {e}")
        return []
    finally:
        conn.close()

# ================================
# УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ================================

def check_payment_exists(payment_id: str) -> bool:
    """Проверить существование платежа"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT 1 FROM payments WHERE payment_id = ?", (payment_id,))
        return cursor.fetchone() is not None
        
    except Exception as e:
        logger.error(f"Error checking payment existence: {e}")
        return False
    finally:
        conn.close()

def cleanup_old_pending_payments(days: int = 7):
    """Очистка старых неоплаченных платежей"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE payments 
            SET status = 'expired'
            WHERE status = 'pending' 
                AND created_at < datetime('now', '-{} days')
        """.format(days))
        
        expired_count = cursor.rowcount
        conn.commit()
        
        if expired_count > 0:
            logger.info(f"Marked {expired_count} pending payments as expired")
        
        return expired_count
                
    except Exception as e:
        logger.error(f"Error cleaning up old payments: {e}")
        return 0
    finally:
        conn.close()

def get_user_payment_history(user_id: int, status: str = None) -> List[Dict[str, Any]]:
    """Получить историю платежей пользователя с фильтром"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        if status:
            cursor.execute("""
                SELECT payment_id, amount, currency, status, plan_id, 
                       stcoins_amount, created_at
                FROM payments 
                WHERE user_id = ? AND status = ?
                ORDER BY created_at DESC
            """, (user_id, status))
        else:
            cursor.execute("""
                SELECT payment_id, amount, currency, status, plan_id, 
                       stcoins_amount, created_at
                FROM payments 
                WHERE user_id = ?
                ORDER BY created_at DESC
            """, (user_id,))
        
        rows = cursor.fetchall()
        history = []
        
        for row in rows:
            payment = {
                'payment_id': row[0],
                'amount': row[1],
                'currency': row[2],
                'status': row[3],
                'plan_id': row[4] if len(row) > 4 else None,
                'stcoins_amount': row[5] if len(row) > 5 else None,
                'created_at': row[6] if len(row) > 6 else row[4]
            }
            history.append(payment)
        
        return history
        
    except Exception as e:
        logger.error(f"Error getting user payment history: {e}")
        return []
    finally:
        conn.close()

# ================================
# ИНИЦИАЛИЗАЦИЯ И МИГРАЦИИ
# ================================

def init_payment_tables():
    """Инициализация таблиц платежей"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Создаем базовую таблицу платежей
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_id TEXT UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'RUB',
                status TEXT NOT NULL,
                plan_id TEXT,
                stcoins_amount INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Создаем индексы для быстрого поиска
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_payments_plan_id ON payments(plan_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at)")
        
        conn.commit()
        logger.info("Payment tables initialized successfully")
            
    except Exception as e:
        logger.error(f"Error initializing payment tables: {e}")
        raise
    finally:
        conn.close()

def migrate_payment_schema():
    """Миграция схемы платежей для поддержки новых полей"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Проверяем существующие колонки
        cursor.execute("PRAGMA table_info(payments)")
        existing_columns = [column[1] for column in cursor.fetchall()]
        
        # Добавляем новые колонки если их нет
        if 'plan_id' not in existing_columns:
            cursor.execute("ALTER TABLE payments ADD COLUMN plan_id TEXT")
            logger.info("Added plan_id column to payments table")
        
        if 'stcoins_amount' not in existing_columns:
            cursor.execute("ALTER TABLE payments ADD COLUMN stcoins_amount INTEGER")
            logger.info("Added stcoins_amount column to payments table")
        
        if 'updated_at' not in existing_columns:
            cursor.execute("ALTER TABLE payments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            logger.info("Added updated_at column to payments table")
        
        conn.commit()
        logger.info("Payment schema migration completed")
        
    except Exception as e:
        logger.error(f"Error migrating payment schema: {e}")
        raise
    finally:
        conn.close()

# ================================
# ЭКСПОРТ И ИМПОРТ
# ================================

def export_payments_csv(filename: str = None) -> str:
    """Экспорт платежей в CSV"""
    import csv
    from io import StringIO
    
    if not filename:
        filename = f"payments_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT payment_id, user_id, amount, currency, status, 
                   plan_id, stcoins_amount, created_at, updated_at
            FROM payments
            ORDER BY created_at DESC
        """)
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Заголовки
        writer.writerow([
            'Payment ID', 'User ID', 'Amount', 'Currency', 'Status',
            'Plan ID', 'STcoins Amount', 'Created At', 'Updated At'
        ])
        
        # Данные
        for row in cursor.fetchall():
            writer.writerow(row)
        
        csv_content = output.getvalue()
        output.close()
        
        # Сохраняем в файл если указан путь
        if filename.endswith('.csv'):
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                f.write(csv_content)
            logger.info(f"Payments exported to {filename}")
        
        return csv_content
            
    except Exception as e:
        logger.error(f"Error exporting payments: {e}")
        return ""
    finally:
        conn.close()

# ================================
# ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ
# ================================

def init_payment_service():
    """Инициализация сервиса платежей"""
    try:
        init_payment_tables()
        migrate_payment_schema()
        
        # Очищаем старые неоплаченные платежи
        cleanup_old_pending_payments(7)
        
        logger.info("Payment service initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing payment service: {e}")
        raise

# Автоматическая инициализация при импорте
if __name__ != "__main__":
    try:
        init_payment_service()
    except Exception as e:
        logger.warning(f"Failed to auto-initialize payment service: {e}")

# ================================
# ТЕСТИРОВАНИЕ И ОТЛАДКА
# ================================

if __name__ == "__main__":
    # Тестирование функций
    print("🧪 Testing Payment Service...")
    
    try:
        # Инициализация
        init_payment_service()
        print("✅ Payment service initialized")
        
        # Тестовые данные
        test_payment_id = "test_payment_123"
        test_user_id = 12345
        
        # Тест сохранения платежа
        save_payment(
            payment_id=test_payment_id,
            user_id=test_user_id,
            amount=150.0,
            currency="RUB",
            status="pending",
            plan_id="basic",
            stcoins_amount=100
        )
        print("✅ Payment saved")
        
        # Тест получения платежа
        payment = get_payment(test_payment_id)
        if payment:
            print(f"✅ Payment retrieved: {payment['status']}")
        
        # Тест обновления статуса
        update_payment_status(test_payment_id, "completed")
        print("✅ Payment status updated")
        
        # Тест статистики
        stats = get_payment_stats()
        print(f"✅ Payment stats: {stats['total_payments']} total payments")
        
        # Очистка тестовых данных
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM payments WHERE payment_id = ?", (test_payment_id,))
        conn.commit()
        conn.close()
        print("✅ Test data cleaned up")
        
        print("🎉 All tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")