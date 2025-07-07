#!/usr/bin/env python3
"""
🔧 СКРИПТ ИСПРАВЛЕНИЯ app.js
Удаляет запятые между методами класса MishuraApp
"""

import re
import os

def fix_app_js():
    """Исправляет синтаксис класса в app.js"""
    
    file_path = 'webapp/app.js'
    
    if not os.path.exists(file_path):
        print(f"❌ Файл {file_path} не найден!")
        return False
    
    print(f"🔧 Исправление файла {file_path}...")
    
    # Читаем файл
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Создаем резервную копию
    backup_path = f"{file_path}.backup"
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"💾 Создана резервная копия: {backup_path}")
    
    # Счетчик исправлений
    fixes_count = 0
    
    # Паттерн для поиска запятых после методов класса
    # Ищем: },\n    methodName() {
    pattern = r'},(\s*\n\s*)([a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{)'
    
    def replace_comma(match):
        nonlocal fixes_count
        fixes_count += 1
        whitespace = match.group(1)
        method_signature = match.group(2)
        return f'}}{whitespace}{method_signature}'
    
    # Применяем замену
    new_content = re.sub(pattern, replace_comma, content)
    
    # Дополнительные исправления для специальных случаев
    
    # Исправляем запятые перед async методами
    pattern_async = r'},(\s*\n\s*)(async\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{)'
    def replace_comma_async(match):
        nonlocal fixes_count
        fixes_count += 1
        whitespace = match.group(1)
        method_signature = match.group(2)
        return f'}}{whitespace}{method_signature}'
    
    new_content = re.sub(pattern_async, replace_comma_async, new_content)
    
    # Исправляем запятые перед геттерами и сеттерами
    pattern_getter = r'},(\s*\n\s*)(get\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(\s*\)\s*\{)'
    new_content = re.sub(pattern_getter, replace_comma_async, new_content)
    
    pattern_setter = r'},(\s*\n\s*)(set\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{)'
    new_content = re.sub(pattern_setter, replace_comma_async, new_content)
    
    # Исправляем запятые перед статическими методами
    pattern_static = r'},(\s*\n\s*)(static\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{)'
    new_content = re.sub(pattern_static, replace_comma_async, new_content)
    
    # Проверяем были ли изменения
    if fixes_count == 0:
        print("✅ Запятые между методами не найдены - файл уже исправлен!")
        os.remove(backup_path)  # Удаляем ненужную резервную копию
        return True
    
    # Записываем исправленный файл
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✅ Исправлено {fixes_count} запятых между методами")
    print(f"📝 Резервная копия сохранена как: {backup_path}")
    print("🚀 Файл app.js исправлен!")
    
    return True

def fix_database_postgres_balance():
    """Исправляет DEFAULT 200 на DEFAULT 50 в PostgreSQL схеме"""
    
    file_path = 'database.py'
    
    if not os.path.exists(file_path):
        print(f"❌ Файл {file_path} не найден!")
        return False
    
    print(f"🔧 Исправление PostgreSQL схемы в {file_path}...")
    
    # Читаем файл
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Ищем и заменяем DEFAULT 200 на DEFAULT 50 в PostgreSQL схеме
    old_pattern = r'balance INTEGER DEFAULT 200,'
    new_pattern = 'balance INTEGER DEFAULT 50,'
    
    if old_pattern in content:
        new_content = content.replace(old_pattern, new_pattern)
        
        # Записываем исправленный файл
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print("✅ PostgreSQL схема исправлена: DEFAULT 200 → DEFAULT 50")
        return True
    else:
        print("✅ PostgreSQL схема уже исправлена")
        return True

def main():
    """Главная функция"""
    print("🎭 === ИСПРАВЛЕНИЕ ФАЙЛОВ МИШУРА ===\n")
    
    success = True
    
    # Исправляем app.js
    if not fix_app_js():
        success = False
    
    print()  # Пустая строка
    
    # Исправляем database.py
    if not fix_database_postgres_balance():
        success = False
    
    print("\n🎯 === РЕЗУЛЬТАТ ===")
    if success:
        print("✅ Все файлы успешно исправлены!")
        print("\n🚀 Теперь выполните деплой:")
        print("git add webapp/app.js database.py")
        print('git commit -m "Fix class syntax and PostgreSQL default balance"')
        print("git push origin main")
    else:
        print("❌ Произошли ошибки при исправлении")
    
    return success

if __name__ == "__main__":
    main()