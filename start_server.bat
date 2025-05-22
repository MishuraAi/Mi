@echo off
echo Starting MISHURA API Server...

REM Проверка наличия виртуального окружения
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate
    echo Installing dependencies...
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate
)

REM Проверка наличия .env файла
if not exist .env (
    echo Warning: .env file not found!
    echo Please create .env file with required environment variables:
    echo TELEGRAM_TOKEN=your_telegram_bot_token
    echo GEMINI_API_KEY=your_gemini_api_key
    echo WEBAPP_URL=your_webapp_url
    pause
    exit /b 1
)

REM Запуск сервера метрик в отдельном окне
start "MISHURA Metrics Server" cmd /c "call .venv\Scripts\activate && python -c "from monitoring import start_metrics_server; start_metrics_server(8000)""

REM Запуск основного API сервера
echo Starting main API server...
python api.py

REM Если сервер упал, ждем ввода перед закрытием окна
pause 