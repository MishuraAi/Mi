"""
Модуль ограничения частоты запросов (rate limiting) для проекта МИШУРА.
"""
import time
from collections import defaultdict
from typing import Dict, List, Optional
import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(
        self,
        requests_per_minute: int = 60,
        burst_size: int = 10,
        window_size: int = 60
    ):
        """
        Инициализация rate limiter'а.
        
        Args:
            requests_per_minute: Максимальное количество запросов в минуту
            burst_size: Максимальное количество запросов в burst
            window_size: Размер окна в секундах
        """
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.window_size = window_size
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self.burst_requests: Dict[str, List[float]] = defaultdict(list)
        
    def _cleanup_old_requests(self, client_id: str) -> None:
        """Очистка старых запросов из истории"""
        current_time = time.time()
        
        # Очистка обычных запросов
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if current_time - req_time < self.window_size
        ]
        
        # Очистка burst запросов
        self.burst_requests[client_id] = [
            req_time for req_time in self.burst_requests[client_id]
            if current_time - req_time < 1  # Burst окно - 1 секунда
        ]
    
    def _get_client_id(self, request: Request) -> str:
        """Получение идентификатора клиента"""
        # Сначала пробуем получить IP из X-Forwarded-For
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # Если нет, используем IP клиента
        return request.client.host if request.client else "unknown"
    
    async def check_rate_limit(self, request: Request) -> bool:
        """
        Проверка ограничения частоты запросов.
        
        Args:
            request: FastAPI Request объект
            
        Returns:
            bool: True если запрос разрешен, False если превышен лимит
        """
        client_id = self._get_client_id(request)
        current_time = time.time()
        
        # Очищаем старые запросы
        self._cleanup_old_requests(client_id)
        
        # Проверяем burst limit
        if len(self.burst_requests[client_id]) >= self.burst_size:
            logger.warning(f"Burst limit exceeded for client {client_id}")
            return False
        
        # Проверяем общий limit
        if len(self.requests[client_id]) >= self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for client {client_id}")
            return False
        
        # Добавляем новый запрос
        self.requests[client_id].append(current_time)
        self.burst_requests[client_id].append(current_time)
        
        return True

class RateLimitMiddleware:
    def __init__(self, rate_limiter: RateLimiter):
        self.rate_limiter = rate_limiter
    
    async def __call__(self, request: Request, call_next):
        if not await self.rate_limiter.check_rate_limit(request):
            return JSONResponse(
                status_code=429,
                content={
                    "status": "error",
                    "message": "Too many requests. Please try again later."
                }
            )
        return await call_next(request)

# Создаем глобальный экземпляр rate limiter'а
default_rate_limiter = RateLimiter()

# Middleware для использования по умолчанию
default_rate_limit_middleware = RateLimitMiddleware(default_rate_limiter) 