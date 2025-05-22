@echo off
echo Running MISHURA tests...

REM Активация виртуального окружения
call .venv\Scripts\activate

REM Запуск тестов с подробным выводом
pytest tests/ -v --cov=. --cov-report=term-missing

REM Если тесты не прошли, ждем ввода перед закрытием
if errorlevel 1 (
    echo.
    echo Some tests failed!
    pause
) 