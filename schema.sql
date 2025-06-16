-- ==========================================================================================
-- ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
-- КОМПОНЕНТ: Схема базы данных SQLite (schema.sql)
-- ВЕРСИЯ: 1.2.0 - Добавлена поддержка платежей ЮKassa
-- ДАТА ОБНОВЛЕНИЯ: 2025-06-16
-- ==========================================================================================

-- Включаем поддержку внешних ключей
PRAGMA foreign_keys = ON;

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    balance INTEGER DEFAULT 200,  -- STcoin баланс (стартовый бонус 200)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица консультаций
CREATE TABLE IF NOT EXISTS consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    occasion TEXT,
    preferences TEXT,
    image_path TEXT,
    advice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(telegram_id)
);

-- Таблица платежей (обновлена для ЮKassa)
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,  -- Сумма в рублях
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, completed, canceled, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_provider_id TEXT,  -- ID платежа в ЮKassa
    FOREIGN KEY (user_id) REFERENCES users(telegram_id)
);

-- Таблица гардероба пользователей
CREATE TABLE IF NOT EXISTS wardrobe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    telegram_file_id TEXT NOT NULL,
    item_name TEXT,
    item_tag TEXT,
    category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(telegram_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON payments(payment_provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_wardrobe_user_id ON wardrobe(user_id);

-- Демонстрационные данные (создаются только если таблицы пустые)
INSERT OR IGNORE INTO users (telegram_id, username, first_name, last_name, balance) 
VALUES (12345, 'demo_user', 'Демо', 'Пользователь', 200);

-- Комментарии к таблицам
-- users: Основная информация о пользователях Telegram
-- consultations: История консультаций с ИИ-стилистом  
-- payments: Транзакции пополнения баланса через ЮKassa
-- wardrobe: Личный гардероб пользователей с сохраненными предметами одежды

-- Версии схемы:
-- 1.0.0: Базовые таблицы (users, consultations, payments, wardrobe)
-- 1.1.0: Добавлена таблица payments для системы баланса
-- 1.2.0: Добавлена колонка payment_provider_id для интеграции с ЮKassa