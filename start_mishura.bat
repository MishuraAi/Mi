@echo off
title МИШУРА - Персональный ИИ-Стилист
cd /d "%~dp0webapp"
echo.
echo ================================
echo   МИШУРА - Запуск сервера
echo ================================
echo.
echo Папка: %CD%
echo URL: http://localhost:8080
echo.
echo Для остановки нажмите Ctrl+C
echo.
python -m http.server 8080
pause 