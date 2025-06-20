# 🎭 МИШУРА - PowerShell команды
# Скопируйте нужную команду и вставьте в PowerShell

# Активация виртуального окружения
.\venv\Scripts\Activate.ps1

# Запуск API сервера
python api.py

# Деактивация окружения
deactivate

# Установка зависимостей
pip install -r requirements.txt

# Проверка версии Python
python --version

# Проверка установленных пакетов
pip list

# Очистка кэша pip
pip cache purge

# Создание тестового пользователя
python -c "from database import create_test_user_with_balance; create_test_user_with_balance()"

# Проверка переменных окружения
python -c "import os; print('GEMINI_API_KEY:', '✅' if os.getenv('GEMINI_API_KEY') else '❌')"

# Тест подключения к Gemini
python -c "from gemini_ai import test_gemini_connection; import asyncio; print(asyncio.run(test_gemini_connection()))" 