@echo off
echo ===================================
echo    МИШУРА - ИИ Стилист - Сервер
echo ===================================
echo.

echo Проверка установленных компонентов...
python -c "import uvicorn" 2>nul
if errorlevel 1 (
    echo [ОШИБКА] uvicorn не установлен!
    echo Установите его командой: pip install uvicorn
    pause
    exit /b 1
)

echo Проверка порта 8000...
netstat -ano | findstr :8000 >nul
if not errorlevel 1 (
    echo [ОШИБКА] Порт 8000 уже занят!
    echo Возможно, сервер уже запущен или порт используется другой программой.
    echo Закройте другие программы, использующие порт 8000, и попробуйте снова.
    pause
    exit /b 1
)

echo.
echo Запуск сервера...
echo Сервер будет доступен по адресу: http://localhost:8000
echo.
echo Для остановки сервера нажмите Ctrl+C
echo.

uvicorn main:app --reload --host 0.0.0.0 --port 8000
if errorlevel 1 (
    echo.
    echo [ОШИБКА] Не удалось запустить сервер!
    echo Проверьте:
    echo 1. Все ли зависимости установлены
    echo 2. Нет ли ошибок в коде
    echo 3. Доступен ли порт 8000
    echo.
    echo Для установки всех зависимостей выполните:
    echo pip install -r requirements.txt
)
pause 