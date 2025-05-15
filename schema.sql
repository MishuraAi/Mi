-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    telegram_id INTEGER UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    balance INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица консультаций
CREATE TABLE IF NOT EXISTS consultations (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    occasion TEXT,
    preferences TEXT,
    image_path TEXT,
    advice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (telegram_id)
);

-- Таблица платежей
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    amount INTEGER,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (telegram_id)
);

-- Таблица отзывов
CREATE TABLE IF NOT EXISTS feedbacks (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    consultation_id INTEGER,
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (telegram_id),
    FOREIGN KEY (consultation_id) REFERENCES consultations (id)
);