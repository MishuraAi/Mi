"""
Модуль мониторинга для проекта МИШУРА.
Обеспечивает сбор метрик производительности и состояния системы.
"""
import time
from functools import wraps
from prometheus_client import Counter, Histogram, Gauge
import logging

# Настройка логирования
logger = logging.getLogger(__name__)

# Метрики для HTTP запросов
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)

# Метрики для AI операций
AI_REQUEST_COUNT = Counter(
    'ai_requests_total',
    'Total AI analysis requests',
    ['operation_type']
)

AI_REQUEST_LATENCY = Histogram(
    'ai_request_duration_seconds',
    'AI request latency',
    ['operation_type']
)

# Метрики состояния системы
SYSTEM_MEMORY = Gauge(
    'system_memory_usage_bytes',
    'System memory usage in bytes'
)

SYSTEM_CPU = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage'
)

def monitor_request():
    """Декоратор для мониторинга HTTP запросов"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                # Получаем информацию о запросе
                request = next((arg for arg in args if hasattr(arg, 'method')), None)
                method = request.method if request else 'UNKNOWN'
                endpoint = request.url.path if request else 'UNKNOWN'
                
                # Выполняем запрос
                response = await func(*args, **kwargs)
                
                # Регистрируем успешный запрос
                status = getattr(response, 'status_code', 200)
                REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
                
                return response
            except Exception as e:
                # Регистрируем ошибку
                REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=500).inc()
                logger.error(f"Error in monitored request: {str(e)}")
                raise
            finally:
                # Регистрируем время выполнения
                duration = time.time() - start_time
                REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)
        return wrapper
    return decorator

def monitor_ai_operation(operation_type: str):
    """Декоратор для мониторинга операций AI"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                # Выполняем операцию
                result = await func(*args, **kwargs)
                
                # Регистрируем успешную операцию
                AI_REQUEST_COUNT.labels(operation_type=operation_type).inc()
                
                return result
            except Exception as e:
                logger.error(f"Error in AI operation {operation_type}: {str(e)}")
                raise
            finally:
                # Регистрируем время выполнения
                duration = time.time() - start_time
                AI_REQUEST_LATENCY.labels(operation_type=operation_type).observe(duration)
        return wrapper
    return decorator

def update_system_metrics():
    """Обновление метрик состояния системы"""
    try:
        import psutil
        
        # Обновляем метрики памяти
        memory = psutil.virtual_memory()
        SYSTEM_MEMORY.set(memory.used)
        
        # Обновляем метрики CPU
        cpu_percent = psutil.cpu_percent(interval=1)
        SYSTEM_CPU.set(cpu_percent)
        
    except ImportError:
        logger.warning("psutil не установлен. Метрики системы недоступны.")
    except Exception as e:
        logger.error(f"Ошибка при обновлении метрик системы: {str(e)}")

def start_metrics_server(port: int = 8000):
    """Запуск сервера метрик Prometheus"""
    try:
        from prometheus_client import start_http_server
        start_http_server(port)
        logger.info(f"Сервер метрик Prometheus запущен на порту {port}")
    except Exception as e:
        logger.error(f"Ошибка при запуске сервера метрик: {str(e)}") 