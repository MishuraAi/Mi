# 🎭 МИШУРА - Полезные команды

## 🐍 Активация виртуального окружения

### Windows PowerShell
```powershell
.\venv\Scripts\Activate.ps1
```

### Windows Command Prompt
```cmd
venv\Scripts\activate.bat
```

### Linux/Mac
```bash
source venv/bin/activate
```

## 🚀 Запуск приложения

### Запуск API сервера
```bash
python api.py
```

### Запуск веб-сервера (для разработки)
```bash
cd webapp
python server.py
```

### Запуск через скрипт
```bash
./run.sh
```

## 📦 Установка зависимостей

### Установка всех зависимостей
```bash
pip install -r requirements.txt
```

### Обновление зависимостей
```bash
pip install --upgrade -r requirements.txt
```

## 🗄️ Работа с базой данных

### Создание тестового пользователя
```bash
python -c "from database import create_test_user_with_balance; create_test_user_with_balance()"
```

### Проверка статуса базы
```bash
python -c "from database import check_database_status; check_database_status()"
```

## 🔧 Полезные команды

### Проверка версии Python
```bash
python --version
```

### Проверка установленных пакетов
```bash
pip list
```

### Деактивация виртуального окружения
```bash
deactivate
```

### Очистка кэша pip
```bash
pip cache purge
```

## 🌐 Доступ к приложению

После запуска API сервера:
- **API**: http://localhost:8000
- **Веб-приложение**: http://localhost:8000/webapp/
- **Документация API**: http://localhost:8000/docs

## 📝 Логи

### Просмотр логов в реальном времени
```bash
tail -f logs/app.log
```

### Очистка логов
```bash
echo "" > logs/app.log
```

## 🔍 Отладка

### Проверка переменных окружения
```bash
python -c "import os; print('GEMINI_API_KEY:', '✅' if os.getenv('GEMINI_API_KEY') else '❌')"
```

### Тест подключения к Gemini
```bash
python -c "from gemini_ai import test_gemini_connection; import asyncio; print(asyncio.run(test_gemini_connection()))"
```

---

## 💡 Быстрые ссылки

- **Главная папка**: `C:\Mi`
- **Веб-приложение**: `C:\Mi\webapp`
- **Виртуальное окружение**: `C:\Mi\venv`
- **Логи**: `C:\Mi\logs`

## 🚨 Часто используемые команды

1. **Активация окружения**: `.\venv\Scripts\Activate.ps1`
2. **Запуск API**: `python api.py`
3. **Деактивация**: `deactivate`

---

*💾 Сохраните этот файл для быстрого доступа к командам!* 