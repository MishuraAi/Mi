@echo off
echo Запуск сервера API...
call new_venv\Scripts\activate.bat
uvicorn api:app --reload --host 0.0.0.0 --port 8000
pause