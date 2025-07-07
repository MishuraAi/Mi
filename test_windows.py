#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🪟 WINDOWS-СОВМЕСТИМЫЙ ТЕСТОВЫЙ СКРИПТ API.PY
Исправляет проблемы кодировки на Windows
"""

import os
import sys
import ast
import traceback

def test_file_encoding_and_syntax():
    """Тест кодировки и синтаксиса с обработкой Windows"""
    
    print("🧪 " + "="*60)
    print("🧪 WINDOWS-СОВМЕСТИМОЕ ТЕСТИРОВАНИЕ API.PY")
    print("🧪 " + "="*60)
    
    api_file = "api.py"
    
    # Проверяем существование файла
    if not os.path.exists(api_file):
        print(f"❌ Файл {api_file} не найден!")
        print("📁 Текущая директория:", os.getcwd())
        print("📋 Файлы в директории:")
        for f in os.listdir('.'):
            if f.endswith('.py'):
                print(f"   🐍 {f}")
        return False
    
    print(f"✅ Файл найден: {api_file}")
    print(f"📏 Размер файла: {os.path.getsize(api_file)} байт")
    print()
    
    # Пробуем разные кодировки
    encodings_to_try = ['utf-8', 'utf-8-sig', 'cp1251', 'latin1']
    content = None
    used_encoding = None
    
    print("🔍 Определение кодировки файла:")
    print("-" * 40)
    
    for encoding in encodings_to_try:
        try:
            with open(api_file, 'r', encoding=encoding) as f:
                content = f.read()
            print(f"✅ Успешно прочитан с кодировкой: {encoding}")
            used_encoding = encoding
            break
        except UnicodeDecodeError:
            print(f"❌ Ошибка кодировки: {encoding}")
        except Exception as e:
            print(f"❌ Ошибка чтения с {encoding}: {e}")
    
    if content is None:
        print("❌ Не удалось прочитать файл ни с одной кодировкой!")
        return False
    
    print(f"🎯 Используется кодировка: {used_encoding}")
    print()
    
    # Проверяем синтаксис
    print("🐍 Проверка синтаксиса Python:")
    print("-" * 40)
    
    try:
        # Парсим AST
        tree = ast.parse(content)
        print("✅ Синтаксис Python корректен!")
        
        # Анализируем структуру
        functions = []
        async_functions = []
        imports = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions.append(node.name)
            elif isinstance(node, ast.AsyncFunctionDef):
                async_functions.append(node.name)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom) and node.module:
                imports.append(node.module)
        
        print(f"📊 Найдено функций: {len(functions)}")
        print(f"📊 Найдено async функций: {len(async_functions)}")
        print(f"📊 Найдено импортов: {len(set(imports))}")
        
    except SyntaxError as e:
        print(f"❌ СИНТАКСИЧЕСКАЯ ОШИБКА:")
        print(f"   📍 Строка {e.lineno}: {e.text}")
        print(f"   💬 Ошибка: {e.msg}")
        
        # Показываем контекст ошибки
        if e.lineno:
            lines = content.split('\n')
            start = max(0, e.lineno - 3)
            end = min(len(lines), e.lineno + 2)
            
            print(f"\n🔍 Контекст ошибки (строки {start+1}-{end}):")
            for i in range(start, end):
                marker = ">>>" if i + 1 == e.lineno else "   "
                print(f"{marker} {i+1:3d}: {lines[i]}")
        
        return False
    
    except Exception as e:
        print(f"❌ Неожиданная ошибка парсинга: {e}")
        traceback.print_exc()
        return False
    
    # Проверяем ключевые структуры
    print("\n🔍 Проверка ключевых структур:")
    print("-" * 40)
    
    # PRICING_PLANS
    if 'PRICING_PLANS = {' in content:
        print("✅ PRICING_PLANS найден")
    else:
        print("❌ PRICING_PLANS не найден")
        return False
    
    # Ключевые функции
    key_functions = ['home', 'health_check', 'get_user_balance']
    missing_functions = []
    
    all_functions = functions + async_functions
    for func in key_functions:
        if func not in all_functions:
            missing_functions.append(func)
    
    if missing_functions:
        print(f"❌ Отсутствуют функции: {missing_functions}")
        return False
    else:
        print("✅ Все ключевые функции найдены")
    
    # Проверяем строку 227 (приблизительно)
    lines = content.split('\n')
    if len(lines) >= 227:
        line_227 = lines[226].strip()  # Индекс 226 = строка 227
        print(f"\n🎯 Строка 227: '{line_227}'")
        
        # Ищем проблемные паттерны
        if line_227.endswith(','):
            print("⚠️  Строка 227 заканчивается запятой")
        elif '}' in line_227 and not line_227.endswith(','):
            print("✅ Строка 227 выглядит корректно")
    
    print("\n" + "="*60)
    print("🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!")
    print("✅ Файл api.py готов к деплою!")
    print("="*60)
    
    return True

def fix_encoding_if_needed():
    """Исправление кодировки файла если нужно"""
    
    api_file = "api.py"
    
    if not os.path.exists(api_file):
        print(f"❌ Файл {api_file} не найден!")
        return False
    
    # Пробуем прочитать файл
    try:
        with open(api_file, 'r', encoding='utf-8') as f:
            content = f.read()
        print("✅ Файл уже в UTF-8")
        return True
    except UnicodeDecodeError:
        print("🔧 Файл не в UTF-8, пытаемся исправить...")
    
    # Пробуем другие кодировки
    for encoding in ['cp1251', 'latin1', 'utf-8-sig']:
        try:
            with open(api_file, 'r', encoding=encoding) as f:
                content = f.read()
            
            # Пересохраняем в UTF-8
            backup_file = f"{api_file}.backup"
            os.rename(api_file, backup_file)
            
            with open(api_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Файл перекодирован из {encoding} в UTF-8")
            print(f"💾 Создана резервная копия: {backup_file}")
            return True
            
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"❌ Ошибка перекодирования: {e}")
            return False
    
    print("❌ Не удалось определить кодировку файла")
    return False

def main():
    """Основная функция"""
    
    print("🪟 Начинаем тестирование на Windows...")
    print()
    
    # Сначала пытаемся исправить кодировку
    if not fix_encoding_if_needed():
        print("❌ Не удалось исправить кодировку")
        return False
    
    # Затем тестируем
    return test_file_encoding_and_syntax()

if __name__ == "__main__":
    success = main()
    
    if success:
        print("\n🚀 Готово к деплою! Выполните:")
        print("   git add api.py")
        print("   git commit -m \"🔧 FIX: Исправлены синтаксические ошибки\"")
        print("   git push")
    else:
        print("\n🚨 Требуются дополнительные исправления!")
    
    input("\n📱 Нажмите Enter для выхода...")
    sys.exit(0 if success else 1)