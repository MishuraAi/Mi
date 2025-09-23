"""Global project settings and reusable constants."""
from typing import Dict, Optional
import os

# 🎯 Единый стартовый баланс для всех новых пользователей
DEFAULT_START_BALANCE: int = 50

# 🧪 Специальные тестовые балансы по Telegram ID
SPECIAL_START_BALANCES: Dict[int, int] = {
    5930269100: 2000,  # Основной тестовый аккаунт (активен только в TEST_MODE)
}

# Флаг тестового режима: overrides применяются ТОЛЬКО если TEST_MODE=true
TEST_MODE: bool = os.getenv('TEST_MODE', 'false').lower() == 'true'


def _normalize_telegram_id(telegram_id: Optional[int]) -> Optional[int]:
    """Безопасно привести Telegram ID к int или вернуть None."""
    try:
        if telegram_id is None:
            return None
        return int(telegram_id)
    except (TypeError, ValueError):
        return None


def get_initial_balance(telegram_id: Optional[int]) -> int:
    """Получить стартовый баланс для пользователя с учетом исключений."""
    normalized_id = _normalize_telegram_id(telegram_id)
    if normalized_id is None:
        return DEFAULT_START_BALANCE
    # Применяем тестовые балансы только в TEST_MODE
    if TEST_MODE:
        return SPECIAL_START_BALANCES.get(normalized_id, DEFAULT_START_BALANCE)
    return DEFAULT_START_BALANCE


def get_balance_override(telegram_id: Optional[int]) -> Optional[int]:
    """Вернуть фиксированный баланс для Telegram ID, если он задан."""
    normalized_id = _normalize_telegram_id(telegram_id)
    if normalized_id is None:
        return None
    # В обычном режиме overrides отключены
    if not TEST_MODE:
        return None
    return SPECIAL_START_BALANCES.get(normalized_id)
