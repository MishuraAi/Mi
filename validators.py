"""
Модуль валидации входных данных для проекта МИШУРА.
Использует Pydantic для валидации и сериализации данных.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from enum import Enum

class OccasionType(str, Enum):
    CASUAL = "повседневный"
    BUSINESS = "деловой"
    FORMAL = "формальный"
    SPORT = "спортивный"
    SPECIAL = "особый случай"

class ImageAnalysisRequest(BaseModel):
    occasion: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Повод/ситуация, для которой подбирается одежда"
    )
    preferences: Optional[str] = Field(
        None,
        max_length=500,
        description="Дополнительные предпочтения пользователя"
    )

    @validator('occasion')
    def validate_occasion(cls, v):
        """Валидация повода"""
        if len(v.strip()) < 3:
            raise ValueError("Повод должен содержать минимум 3 символа")
        return v.strip()

class ImageComparisonRequest(BaseModel):
    occasion: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Повод/ситуация, для которой подбирается одежда"
    )
    preferences: Optional[str] = Field(
        None,
        max_length=500,
        description="Дополнительные предпочтения пользователя"
    )
    image_count: int = Field(
        ...,
        ge=2,
        le=5,
        description="Количество изображений для сравнения (2-5)"
    )

class UserFeedback(BaseModel):
    rating: int = Field(
        ...,
        ge=1,
        le=5,
        description="Оценка консультации от 1 до 5"
    )
    comment: Optional[str] = Field(
        None,
        max_length=1000,
        description="Комментарий к оценке"
    )

class PaymentRequest(BaseModel):
    amount: int = Field(
        ...,
        gt=0,
        description="Сумма платежа в рублях"
    )
    user_id: int = Field(
        ...,
        gt=0,
        description="ID пользователя"
    )

    @validator('amount')
    def validate_amount(cls, v):
        """Валидация суммы платежа"""
        if v < 100:
            raise ValueError("Минимальная сумма платежа - 100 рублей")
        return v

class UserProfile(BaseModel):
    telegram_id: int = Field(..., gt=0)
    username: Optional[str] = Field(None, max_length=32)
    first_name: Optional[str] = Field(None, max_length=64)
    last_name: Optional[str] = Field(None, max_length=64)
    balance: int = Field(default=0, ge=0)

    @validator('username')
    def validate_username(cls, v):
        """Валидация имени пользователя"""
        if v and not v.replace('_', '').isalnum():
            raise ValueError("Имя пользователя может содержать только буквы, цифры и символ подчеркивания")
        return v 