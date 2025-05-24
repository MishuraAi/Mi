"""
Упрощенный API сервер для МИШУРА без внешних зависимостей
Только для демонстрации функциональности
"""
import os
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

class MishuraAPIHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Обработка CORS preflight запросов
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api':
            self.send_json_response({
                "project": "МИШУРА - ИИ Стилист",
                "message": "Демо API сервер запущен!",
                "version": "1.0.0-demo"
            })
        elif self.path == '/health':
            self.send_json_response({
                "status": "healthy",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            })
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        try:
            # Просто читаем и игнорируем все данные запроса
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                self.rfile.read(content_length)
            
            if self.path == '/api/analyze':
                self.handle_analyze()
            elif self.path == '/api/compare':
                self.handle_compare()
            else:
                self.send_response(404)
                self.end_headers()
        except Exception as e:
            print(f"Ошибка в do_POST: {e}")
            self.send_error_response(f"Ошибка сервера: {str(e)}")

    def handle_analyze(self):
        print("🎨 Обработка запроса анализа...")
        time.sleep(1)  # Имитируем работу ИИ
        
        response = {
            "status": "success",
            "advice": """# 🎨 Анализ образа (ДЕМО)

**Результат анализа:** Ваш образ выглядит стильно и современно!

## 📋 Оценка стиля:
✅ **Цветовая гамма:** Гармоничная
✅ **Крой:** Современный  
✅ **Общий вид:** Отличный

## 💡 Рекомендации:
1. **Аксессуары:** Добавьте минималистичные украшения
2. **Обувь:** Классические туфли отлично дополнят образ
3. **Цвет:** Попробуйте яркий акцент

## 🎯 Подходит для выбранного повода
Этот образ отлично подойдет для ваших планов!

---
*Это демо-версия. Полный анализ требует подключения к Gemini AI.*"""
        }
        self.send_json_response(response)

    def handle_compare(self):
        print("🔄 Обработка запроса сравнения...")
        time.sleep(2)  # Имитируем работу ИИ
        
        response = {
            "status": "success", 
            "advice": """# 🎨 Сравнение образов (ДЕМО)

## 📸 Анализ загруженных изображений:
**Образ 1:** Стильный и элегантный
**Образ 2:** Современный и практичный

## 🏆 Рекомендации:
1. **Лучший выбор:** Образ 1 идеально подходит для выбранного повода
2. **Альтернатива:** Образ 2 отлично подойдет для повседневной носки
3. **Совет:** Комбинируйте элементы из разных образов

## ✨ Финальный вердикт:
Оба образа имеют свои преимущества. Выбирайте в зависимости от настроения!

## 🎯 Подходящие случаи:
- Деловые встречи
- Прогулки с друзьями
- Романтические свидания

---
*Это демо-версия. Полный анализ требует подключения к Gemini AI.*"""
        }
        self.send_json_response(response)

    def send_json_response(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def send_error_response(self, message):
        self.send_response(500)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        error_data = {"status": "error", "message": message}
        self.wfile.write(json.dumps(error_data, ensure_ascii=False).encode('utf-8'))

    def log_message(self, format, *args):
        # Переопределяем для красивых логов
        print(f"🔧 API [{time.strftime('%H:%M:%S')}] {format % args}")

def run_server():
    server_address = ('', 8001)
    httpd = HTTPServer(server_address, MishuraAPIHandler)
    print("🚀 МИШУРА Demo API Server запущен на http://localhost:8001")
    print("📋 Доступные эндпоинты:")
    print("   • GET  /api - информация о сервере")
    print("   • GET  /health - проверка состояния")
    print("   • POST /api/analyze - анализ одежды")
    print("   • POST /api/compare - сравнение образов")
    print("   • Нажмите Ctrl+C для остановки")
    print("-" * 50)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Остановка сервера...")
        httpd.server_close()

if __name__ == "__main__":
    run_server() 