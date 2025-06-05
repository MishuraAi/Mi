#!/bin/bash
# Определяем что запускать по переменной окружения
if [ "$SERVICE_TYPE" = "webapp" ]; then
    echo "Запуск веб-приложения..."
    python webapp_server.py
else
    echo "Запуск API сервера..."
    pip install -r requirements.txt
    python api.py
fi