@echo off
echo ===================================
echo    МИШУРА - ИИ Стилист - Бот
echo ===================================
echo.
echo Проверка установленных компонентов...
python -c "import telebot" 2>nul
if errorlevel 1 (
    echo [ОШИБКА] pyTelegramBotAPI не установлен!
    echo Установите его командой: pip install pyTelegramBotAPI
    pause
    exit /b 1
)
echo.
echo Запуск бота...
echo.
echo Для остановки бота нажмите Ctrl+C
echo.
python bot.py
pause 