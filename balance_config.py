"""
Единая конфигурация балансов для всей системы МИШУРА
"""

# ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ ДЛЯ НАЧАЛЬНОГО БАЛАНСА
DEFAULT_INITIAL_BALANCE = 50  # НЕ 200!

# Операции с балансом
BALANCE_OPERATIONS = {
    'single_analysis': -10,
    'comparison': -15,
    'feedback_bonus': +10,
    'initial_bonus': DEFAULT_INITIAL_BALANCE
}

def get_initial_balance():
    """Получить начальный баланс для новых пользователей"""
    return DEFAULT_INITIAL_BALANCE

def get_operation_cost(operation_type):
    """Получить стоимость операции"""
    return BALANCE_OPERATIONS.get(operation_type, 0) 