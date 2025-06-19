# 💰 Конфигурация тарифных планов МИШУРА
# Файл: pricing_config.py (ИСПРАВЛЕННАЯ ВЕРСИЯ)

# Основная конфигурация тарифных планов
PRICING_PLANS = {
    "test": {
        "name": "🧪 Тестовый пакет",
        "description": "Попробуйте нашего ИИ-стилиста",
        "consultations": 1,
        "stcoins": 10,
        "coins": 10,  # ДОБАВЛЕНО: альтернативное название
        "price": 20.00,  # ДОБАВЛЕНО: основное поле для цены
        "price_rub": 20,
        "price_kop": 2000,  # цена в копейках для ЮKassa
        "discount": 0,
        "popular": False,
        "temporary": True,  # временный пакет
        "color": "🟡"
    },
    "basic": {
        "name": "🌟 Базовый",
        "description": "Отличный старт для регулярных консультаций", 
        "consultations": 10,
        "stcoins": 100,
        "coins": 100,  # ДОБАВЛЕНО
        "price": 150.00,  # ДОБАВЛЕНО
        "price_rub": 150,
        "price_kop": 15000,
        "discount": 25,  # экономия 25%
        "popular": False,
        "temporary": False,
        "color": "🔵"
    },
    "standard": {
        "name": "⭐ Стандарт",
        "description": "Популярный выбор для стильной жизни",
        "consultations": 30,
        "stcoins": 300,
        "coins": 300,  # ДОБАВЛЕНО
        "price": 300.00,  # ДОБАВЛЕНО
        "price_rub": 300,
        "price_kop": 30000,
        "discount": 50,  # экономия 50%
        "popular": True,  # самый популярный
        "temporary": False,
        "color": "🟢"
    },
    "premium": {
        "name": "💎 Премиум",
        "description": "Максимум стиля и экономии",
        "consultations": 100,
        "stcoins": 1000,
        "coins": 1000,  # ДОБАВЛЕНО
        "price": 800.00,  # ДОБАВЛЕНО
        "price_rub": 800,
        "price_kop": 80000,
        "discount": 60,  # экономия 60%
        "popular": False,
        "temporary": False,
        "color": "🟣"
    }
}

# Конфигурация для ЮKassa
YOOKASSA_PLANS_CONFIG = {
    "test": {
        "amount": {"value": "20.00", "currency": "RUB"},
        "stcoins_reward": 10,
        "description": "Тестовый пакет - 1 консультация"
    },
    "basic": {
        "amount": {"value": "150.00", "currency": "RUB"},
        "stcoins_reward": 100,
        "description": "Базовый пакет - 10 консультаций"
    },
    "standard": {
        "amount": {"value": "300.00", "currency": "RUB"},
        "stcoins_reward": 300,
        "description": "Стандарт пакет - 30 консультаций"
    },
    "premium": {
        "amount": {"value": "800.00", "currency": "RUB"},
        "stcoins_reward": 1000,
        "description": "Премиум пакет - 100 консультаций"
    }
}

def get_price_per_consultation(plan_id):
    """Получить цену за одну консультацию"""
    plan = PRICING_PLANS.get(plan_id)
    if not plan:
        return None
    return plan["price"] / plan["consultations"]

def format_discount(plan_id):
    """Форматировать текст скидки"""
    plan = PRICING_PLANS.get(plan_id)
    if not plan or plan["discount"] == 0:
        return ""
    return f"💰 Экономия {plan['discount']}%"

def create_pricing_keyboard():
    """Создать клавиатуру с тарифными планами для Telegram"""
    try:
        from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    except ImportError:
        # Если telegram не установлен, возвращаем None
        return None
    
    keyboard = []
    
    for plan_id, plan in PRICING_PLANS.items():
        button_text = f"{plan['color']} {plan['name']}"
        if plan['popular']:
            button_text += " 🔥"
        if plan['temporary']:
            button_text += " ⏰"
            
        keyboard.append([
            InlineKeyboardButton(
                button_text,
                callback_data=f"buy_plan_{plan_id}"
            )
        ])
    
    return InlineKeyboardMarkup(keyboard)

def format_plan_description(plan_id):
    """Детальное описание тарифного плана для Telegram"""
    plan = PRICING_PLANS.get(plan_id)
    if not plan:
        return "План не найден"
    
    price_per_consultation = get_price_per_consultation(plan_id)
    discount_text = format_discount(plan_id)
    
    description = f"""
{plan['color']} **{plan['name']}**

📋 {plan['description']}

💡 **Что входит:**
• {plan['consultations']} консультаций
• {plan['stcoins']} STcoin на балансе
• Анализ одежды и образов
• Персональные рекомендации
• Сохранение в гардероб

💰 **Стоимость:** {plan['price']} руб.
📊 **За консультацию:** {price_per_consultation:.1f} руб.
"""
    
    if discount_text:
        description += f"\n{discount_text}"
    
    if plan['popular']:
        description += "\n\n🔥 **ПОПУЛЯРНЫЙ ВЫБОР**"
    
    if plan['temporary']:
        description += "\n\n⏰ **ВРЕМЕННОЕ ПРЕДЛОЖЕНИЕ**"
    
    return description

def format_pricing_summary():
    """Краткая сводка всех планов для главного меню"""
    summary = ""
    
    for plan_id, plan in PRICING_PLANS.items():
        price_per_consultation = plan["price"] / plan["consultations"]
        
        summary += f"""
{plan['color']} **{plan['name']}**
• {plan['consultations']} консультаций за {plan['price']} руб.
• {price_per_consultation:.1f} руб/консультация"""
        
        if plan['discount'] > 0:
            summary += f" (экономия {plan['discount']}%)"
        
        if plan['popular']:
            summary += " 🔥"
        if plan['temporary']:
            summary += " ⏰"
            
        summary += "\n"
    
    return summary

def get_plan_by_id(plan_id):
    """Получить план по ID"""
    return PRICING_PLANS.get(plan_id)

def get_yookassa_config(plan_id):
    """Получить конфигурацию ЮKassa для плана"""
    return YOOKASSA_PLANS_CONFIG.get(plan_id)

# Настройки по умолчанию
DEFAULT_CONSULTATION_COST = 10  # STcoin за консультацию
CURRENCY_SYMBOL = "₽"
CURRENCY_CODE = "RUB"

# Тексты для интерфейса
PRICING_TEXTS = {
    "title": "💎 **ТАРИФНЫЕ ПЛАНЫ МИШУРА**",
    "subtitle": "🎯 Выберите подходящий пакет консультаций:",
    "currency_info": "💡 **STcoin** - внутренняя валюта для оплаты консультаций",
    "features_info": "📱 **1 консультация** = детальный анализ образа от ИИ-стилиста\n🎨 **Безлимитное** сохранение в персональный гардероб",
    "payment_processing": "🔒 Безопасная оплата через ЮKassa\n⚡ STcoin поступят автоматически после оплаты"
}