"""
🎭 МИШУРА - Production Entry Point
Точка входа для Render Web Service deployment
"""

import os
import sys
import logging
from pathlib import Path

# Настройка логирования для production
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Проверка окружения
ENVIRONMENT = os.getenv('ENVIRONMENT', 'production')
PORT = int(os.getenv('PORT', 8000))

logger.info(f"🚀 МИШУРА Production Entry Point starting...")
logger.info(f"   Environment: {ENVIRONMENT}")
logger.info(f"   Port: {PORT}")
logger.info(f"   Python: {sys.version}")
logger.info(f"   Working Directory: {Path.cwd()}")

try:
    # Импорт FastAPI приложения из api.py
    from api import app
    logger.info("✅ FastAPI application imported successfully")
    
    # Экспорт для gunicorn
    application = app
    
except ImportError as e:
    logger.error(f"❌ Critical: Failed to import FastAPI app from api.py: {e}")
    sys.exit(1)
except Exception as e:
    logger.error(f"❌ Critical: Unexpected error during import: {e}")
    sys.exit(1)

# Функция для проверки готовности
def check_readiness():
    """Проверка готовности приложения к запуску"""
    required_vars = ['TELEGRAM_TOKEN', 'GEMINI_API_KEY']
    
    if ENVIRONMENT == 'production':
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            logger.error(f"❌ Missing required environment variables: {missing_vars}")
            return False
    
    return True

# Запуск для локальной разработки
if __name__ == "__main__":
    if not check_readiness():
        sys.exit(1)
    
    import uvicorn
    
    logger.info(f"🎭 Starting МИШУРА API server on 0.0.0.0:{PORT}")
    
    try:
        uvicorn.run(
            app,  # ← ИСПРАВЛЕНИЕ: прямая ссылка на объект
            host="0.0.0.0", 
            port=PORT,
            log_level="info",
            access_log=True,
            reload=False  # Отключено в production
        )
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        sys.exit(1)