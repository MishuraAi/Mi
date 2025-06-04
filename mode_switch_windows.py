#!/usr/bin/env python3
"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Скрипт переключения режимов (mode_switch_windows.py)
ВЕРСИЯ: 1.1.0 (ИСПРАВЛЕНО ДЛЯ WINDOWS)
ДАТА СОЗДАНИЯ: 2025-06-04

ИСПРАВЛЕНИЯ:
- Убраны эмодзи для совместимости с Windows
- Заменены Linux команды на Windows аналоги
- Исправлены пути и кодировка
==========================================================================================
"""

import os
import sys
import json
import shutil
import argparse
import subprocess
import platform
from datetime import datetime
from pathlib import Path
import logging

# Настройка логирования для Windows
if platform.system() == "Windows":
    # Используем ANSI кодировку и убираем эмодзи
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - [%(levelname)s] - %(message)s',
        handlers=[
            logging.FileHandler('mode_switch.log', encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - [%(levelname)s] - %(message)s',
        handlers=[
            logging.FileHandler('mode_switch.log'),
            logging.StreamHandler()
        ]
    )

logger = logging.getLogger(__name__)

class MishuraModeSwitch:
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.backup_dir = self.root_dir / "BACKUPS" / "config-backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.is_windows = platform.system() == "Windows"
        
        # Пути к конфигурационным файлам
        self.config_files = {
            'env': self.root_dir / '.env',
            'config_js': self.root_dir / 'webapp' / 'js' / 'config.js',
            'database_py': self.root_dir / 'database.py'
        }
        
        # Конфигурации для разных режимов
        self.mode_configs = {
            'demo': {
                'ENVIRONMENT': 'demo',
                'DEBUG': 'True',
                'DEMO_MODE': 'True',
                'PAYMENT_PROCESSING': 'False',
                'REAL_AI_ANALYSIS': 'False',
                'LOG_LEVEL': 'DEBUG',
                'RATE_LIMIT_PER_MINUTE': '1000',
                'DEMO_BALANCE': '999',
                'API_URL': 'http://localhost:8000',
                'WEBAPP_URL': 'http://localhost:3000'
            },
            'development': {
                'ENVIRONMENT': 'development',
                'DEBUG': 'True',
                'DEMO_MODE': 'False',
                'PAYMENT_PROCESSING': 'False',
                'REAL_AI_ANALYSIS': 'True',
                'LOG_LEVEL': 'DEBUG',
                'RATE_LIMIT_PER_MINUTE': '100',
                'DEMO_BALANCE': '10',
                'API_URL': 'http://localhost:8000',
                'WEBAPP_URL': 'http://localhost:3000'
            },
            'production': {
                'ENVIRONMENT': 'production',
                'DEBUG': 'False',
                'DEMO_MODE': 'False',
                'PAYMENT_PROCESSING': 'True',
                'REAL_AI_ANALYSIS': 'True',
                'LOG_LEVEL': 'WARNING',
                'RATE_LIMIT_PER_MINUTE': '30',
                'DEMO_BALANCE': '5',
                'API_URL': 'https://style-ai-bot.onrender.com',
                'WEBAPP_URL': 'https://style-ai-bot.onrender.com'
            }
        }

    def create_backup(self, mode_name=None):
        """Создает резервную копию текущих конфигураций"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{mode_name}_{timestamp}" if mode_name else f"backup_{timestamp}"
        backup_path = self.backup_dir / backup_name
        backup_path.mkdir(exist_ok=True)
        
        logger.info(f"[BACKUP] Создание резервной копии: {backup_path}")
        
        # Создаем метаинформацию
        meta_info = {
            'timestamp': timestamp,
            'mode': mode_name,
            'current_mode': self.get_current_mode(),
            'files_backed_up': []
        }
        
        # Копируем конфигурационные файлы
        for file_type, file_path in self.config_files.items():
            if file_path.exists():
                backup_file = backup_path / f"{file_type}_{file_path.name}"
                shutil.copy2(file_path, backup_file)
                meta_info['files_backed_up'].append(str(backup_file))
                logger.debug(f"  [OK] {file_path} -> {backup_file}")
        
        # Сохраняем метаинформацию
        with open(backup_path / 'backup_info.json', 'w', encoding='utf-8') as f:
            json.dump(meta_info, f, indent=2, ensure_ascii=False)
        
        logger.info(f"[OK] Резервная копия создана: {backup_path}")
        return backup_path

    def get_current_mode(self):
        """Определяет текущий режим работы"""
        try:
            if self.config_files['env'].exists():
                with open(self.config_files['env'], 'r', encoding='utf-8') as f:
                    content = f.read()
                    for line in content.split('\n'):
                        if line.startswith('ENVIRONMENT='):
                            # Убираем комментарии и пробелы
                            value = line.split('=')[1].strip()
                            if '#' in value:
                                value = value.split('#')[0].strip()
                            return value
            return 'unknown'
        except Exception as e:
            logger.error(f"[ERROR] Ошибка определения режима: {e}")
            return 'error'

    def update_env_file(self, mode):
        """Обновляет .env файл"""
        logger.info(f"[UPDATE] Обновление .env файла для режима: {mode}")
        
        env_content = f"""# ====================================
# МИШУРА - {mode.upper()} КОНФИГУРАЦИЯ
# Автоматически сгенерировано: {datetime.now()}
# ====================================

# Режим работы
ENVIRONMENT={self.mode_configs[mode]['ENVIRONMENT']}
DEBUG={self.mode_configs[mode]['DEBUG']}
DEMO_MODE={self.mode_configs[mode]['DEMO_MODE']}
PAYMENT_PROCESSING={self.mode_configs[mode]['PAYMENT_PROCESSING']}
REAL_AI_ANALYSIS={self.mode_configs[mode]['REAL_AI_ANALYSIS']}

# API настройки
API_URL={self.mode_configs[mode]['API_URL']}
API_VERSION=v1
API_TIMEOUT=30000
BACKEND_PORT=8000

# Telegram Bot
TELEGRAM_BOT_TOKEN=7978914124:AAEMTwF7yav1nwRztkLGzB9eCfShalM6y_Q
TELEGRAM_WEBHOOK_URL={self.mode_configs[mode]['API_URL']}/webhook
TELEGRAM_BOT_USERNAME=style_ai_bot

# Gemini AI
GEMINI_API_KEY=AIzaSyDbCDaDQQnmUXakqXDLaZvntLBGK-i2H50
GEMINI_MODEL=gemini-1.5-flash

# База данных
DATABASE_URL=sqlite:///styleai.db
DB_PATH=styleai.db

# Настройки приложения
SECRET_KEY=MishuraSecretKey2025{mode.title()}
MAX_UPLOAD_SIZE=20971520
ALLOWED_ORIGINS=*

# Rate limiting
RATE_LIMIT_PER_MINUTE={self.mode_configs[mode]['RATE_LIMIT_PER_MINUTE']}
RATE_LIMIT_PER_HOUR=1000

# Cache settings
CACHE_TTL=3600
CACHE_MAX_SIZE=100

# Порты
FRONTEND_PORT=3000
BACKEND_PORT=8000
WEBAPP_PORT=3000
HOST=0.0.0.0

# Web Application Configuration
WEBAPP_URL={self.mode_configs[mode]['WEBAPP_URL']}

# Logging Configuration
LOG_LEVEL={self.mode_configs[mode]['LOG_LEVEL']}
LOG_FILE=mishura_{mode}.log

# Upload Configuration
MAX_FILE_SIZE=20971520
ALLOWED_EXTENSIONS=jpg,jpeg,png,webp

# Security
CORS_ORIGINS=*

# Monitoring
HEALTH_CHECK_INTERVAL=30

# Demo settings
DEMO_BALANCE={self.mode_configs[mode]['DEMO_BALANCE']}
"""
        
        with open(self.config_files['env'], 'w', encoding='utf-8') as f:
            f.write(env_content)
        
        logger.info("[OK] .env файл обновлен")

    def update_config_js(self, mode):
        """Обновляет config.js файл"""
        logger.info(f"[UPDATE] Обновление config.js для режима: {mode}")
        
        is_production = mode == 'production'
        is_demo = mode == 'demo'
        
        possible_hosts = ['http://localhost', 'http://127.0.0.1']
        if is_production:
            possible_hosts = ['https://style-ai-bot.onrender.com']
        
        config_js_content = f"""/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Конфигурация (config.js)
ВЕРСИЯ: 1.3.0 (АВТОМАТИЧЕСКИ СГЕНЕРИРОВАНО ДЛЯ WINDOWS)
РЕЖИМ: {mode.upper()}
ДАТА ОБНОВЛЕНИЯ: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {{}};
window.MishuraApp.config = (function() {{
    'use strict';
    
    let logger;
    let isInitialized = false;
    
    const CONFIG = {{
        // API настройки для {mode}
        API: {{
            POSSIBLE_PORTS: [8000, 8001],
            POSSIBLE_HOSTS: {possible_hosts},
            VERSION: 'v1',
            TIMEOUT: 30000,
            RETRIES: {'3' if is_demo else '2' if mode == 'development' else '1'},
            BASE_URL: '{self.mode_configs[mode]['API_URL']}/api/v1',
            PORT: 8000
        }},
        
        // UI настройки
        UI: {{
            TOAST_DURATION: {'5000' if is_demo else '3000'},
            LOADING_MIN_DURATION: {'2000' if is_demo else '1000' if mode == 'development' else '500'},
            ANIMATION_DURATION: {'500' if is_demo else '300' if mode == 'development' else '200'}
        }},
        
        // Настройки файлов
        FILES: {{
            MAX_SIZE: 20 * 1024 * 1024,
            ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
            MAX_COMPARE_IMAGES: 4
        }},
        
        // Режимы работы
        MODES: {{
            SINGLE: 'single',
            COMPARE: 'compare'
        }},
        
        // Настройки режима
        DEBUG: {str(is_demo or mode == 'development').lower()},
        DEMO_MODE: {str(is_demo).lower()},
        PRODUCTION: {str(is_production).lower()},
        ENVIRONMENT: '{mode}',
        
        // Специфичные настройки
        DEMO_MESSAGES: {str(is_demo).lower()},
        PAYMENT_ENABLED: {str(mode == 'production').lower()},
        AI_ANALYSIS_REAL: {str(mode != 'demo').lower()}
    }};
    
    function init() {{
        if (isInitialized) {{
            return CONFIG;
        }}
        
        logger = window.MishuraApp.utils?.logger || createFallbackLogger();
        logger.info('Инициализация МИШУРА в режиме: {mode.upper()}');
        
        detectApiUrl();
        isInitialized = true;
        
        if (CONFIG.DEMO_MODE) {{
            logger.warn('[DEMO] ВНИМАНИЕ: Приложение в ДЕМО режиме');
        }} else if (CONFIG.PRODUCTION) {{
            logger.info('[PROD] Приложение в PRODUCTION режиме');
        }} else {{
            logger.info('[DEV] Приложение в DEVELOPMENT режиме');
        }}
        
        return CONFIG;
    }}
    
    function createFallbackLogger() {{
        return {{
            debug: (...args) => console.debug("Config:", ...args),
            info: (...args) => console.info("Config:", ...args),
            warn: (...args) => console.warn("Config:", ...args),
            error: (...args) => console.error("Config:", ...args)
        }};
    }}
    
    function detectApiUrl() {{
        if (CONFIG.PRODUCTION) {{
            CONFIG.API.BASE_URL = 'https://style-ai-bot.onrender.com/api/v1';
            return;
        }}
        
        // Для development и demo пробуем локальные порты
        for (const port of CONFIG.API.POSSIBLE_PORTS) {{
            const url = `http://localhost:${{port}}/api/v1`;
            
            fetch(`http://localhost:${{port}}/api/v1/health`, {{
                method: 'GET',
                timeout: 3000
            }}).then(response => {{
                if (response.ok) {{
                    CONFIG.API.BASE_URL = url;
                    CONFIG.API.PORT = port;
                    logger.info(`API найден на порту ${{port}}`);
                    return;
                }}
            }}).catch(error => {{
                logger.debug(`Порт ${{port}} недоступен`);
            }});
        }}
        
        if (!CONFIG.API.BASE_URL) {{
            CONFIG.API.BASE_URL = 'http://localhost:8000/api/v1';
            CONFIG.API.PORT = 8000;
        }}
    }}
    
    function getApiUrl(endpoint = '') {{
        if (!CONFIG.API.BASE_URL) {{
            detectApiUrl();
        }}
        return CONFIG.API.BASE_URL + (endpoint ? `/${{endpoint.replace(/^\//, '')}}` : '');
    }}
    
    function isValidImageFile(file) {{
        if (!file) return false;
        return CONFIG.FILES.ALLOWED_TYPES.includes(file.type) && 
               file.size <= CONFIG.FILES.MAX_SIZE;
    }}
    
    // Публичный API
    return {{
        init,
        get: () => CONFIG,
        api: () => CONFIG.API,
        ui: () => CONFIG.UI,
        files: () => CONFIG.FILES,
        modes: () => CONFIG.MODES,
        getApiUrl,
        isValidImageFile,
        isInitialized: () => isInitialized,
        isDebug: () => CONFIG.DEBUG,
        isDemoMode: () => CONFIG.DEMO_MODE,
        isProduction: () => CONFIG.PRODUCTION,
        getEnvironment: () => CONFIG.ENVIRONMENT
    }};
}})();

// Автоинициализация
if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', () => {{
        window.MishuraApp.config.init();
    }});
}} else {{
    window.MishuraApp.config.init();
}}
"""
        
        with open(self.config_files['config_js'], 'w', encoding='utf-8') as f:
            f.write(config_js_content)
        
        logger.info("[OK] config.js файл обновлен")

    def update_database_users(self, mode):
        """Обновляет балансы пользователей в соответствии с режимом"""
        logger.info(f"[DATABASE] Обновление базы данных для режима: {mode}")
        
        try:
            import database
            
            # Получаем демо баланс для режима
            demo_balance = int(self.mode_configs[mode]['DEMO_BALANCE'])
            
            if mode == 'demo':
                # В демо режиме даем всем большой баланс
                logger.info(f"Установка демо баланса {demo_balance} для всех пользователей")
                conn = database.get_connection()
                cursor = conn.cursor()
                cursor.execute('UPDATE users SET balance = ?', (demo_balance,))
                conn.commit()
                conn.close()
                
            elif mode == 'production':
                # В production режиме устанавливаем стартовый баланс
                logger.info(f"Установка стартового баланса {demo_balance} для новых пользователей")
                conn = database.get_connection()
                cursor = conn.cursor()
                # Сбрасываем демо балансы
                cursor.execute('UPDATE users SET balance = ? WHERE balance > 100', (demo_balance,))
                conn.commit()
                conn.close()
                
            else:  # development
                # В development умеренный баланс
                logger.info(f"Установка баланса разработки {demo_balance}")
                conn = database.get_connection()
                cursor = conn.cursor()
                cursor.execute('UPDATE users SET balance = ? WHERE balance != ?', (demo_balance, demo_balance))
                conn.commit()
                conn.close()
            
            logger.info("[OK] База данных обновлена")
            
        except Exception as e:
            logger.error(f"[ERROR] Ошибка обновления базы данных: {e}")

    def find_python_processes(self):
        """Находит Python процессы в Windows"""
        processes = []
        try:
            if self.is_windows:
                # Windows команда
                result = subprocess.run(['tasklist', '/fi', 'imagename eq python.exe', '/fo', 'csv'], 
                                      capture_output=True, text=True, encoding='cp1251')
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')[1:]  # Убираем заголовок
                    for line in lines:
                        if 'python.exe' in line:
                            parts = line.split(',')
                            if len(parts) >= 2:
                                pid = parts[1].strip('"')
                                processes.append(pid)
            else:
                # Linux/macOS команда
                result = subprocess.run(['pgrep', '-f', 'python'], capture_output=True, text=True)
                if result.returncode == 0:
                    processes = result.stdout.strip().split('\n')
        except Exception as e:
            logger.debug(f"Ошибка поиска процессов: {e}")
        
        return processes

    def stop_python_processes(self):
        """Останавливает Python процессы"""
        try:
            if self.is_windows:
                # Windows: завершаем по имени
                subprocess.run(['taskkill', '/f', '/im', 'python.exe'], capture_output=True)
                logger.info("[STOP] Python процессы остановлены (Windows)")
            else:
                # Linux/macOS
                subprocess.run(['pkill', '-f', 'python.*bot.py'], capture_output=True)
                subprocess.run(['pkill', '-f', 'python.*webapp'], capture_output=True)
                logger.info("[STOP] Python процессы остановлены (Linux)")
        except Exception as e:
            logger.debug(f"Ошибка остановки процессов: {e}")

    def restart_services(self):
        """Перезапускает сервисы приложения"""
        logger.info("[RESTART] Перезапуск сервисов...")
        
        try:
            # Останавливаем процессы
            self.stop_python_processes()
            logger.info("[STOP] Сервисы остановлены")
            
            # Даем время на завершение
            import time
            time.sleep(2)
            
            # Запускаем сервисы
            if self.is_windows:
                # Windows: запуск в фоновом режиме
                bot_process = subprocess.Popen(['python', 'bot.py'], 
                                             stdout=subprocess.PIPE, 
                                             stderr=subprocess.PIPE,
                                             creationflags=subprocess.CREATE_NEW_CONSOLE)
                
                webapp_process = subprocess.Popen(['python', 'webapp/server.py'], 
                                                stdout=subprocess.PIPE, 
                                                stderr=subprocess.PIPE,
                                                creationflags=subprocess.CREATE_NEW_CONSOLE)
            else:
                # Linux/macOS
                bot_process = subprocess.Popen(['python3', 'bot.py'], 
                                             stdout=subprocess.PIPE, 
                                             stderr=subprocess.PIPE)
                
                webapp_process = subprocess.Popen(['python3', 'webapp/server.py'], 
                                                stdout=subprocess.PIPE, 
                                                stderr=subprocess.PIPE)
            
            logger.info("[START] Сервисы запущены")
            logger.info(f"   Bot PID: {bot_process.pid}")
            logger.info(f"   Webapp PID: {webapp_process.pid}")
            
        except Exception as e:
            logger.error(f"[ERROR] Ошибка перезапуска сервисов: {e}")

    def switch_mode(self, target_mode):
        """Переключает режим работы приложения"""
        if target_mode not in self.mode_configs:
            logger.error(f"[ERROR] Неизвестный режим: {target_mode}")
            return False
        
        current_mode = self.get_current_mode()
        
        if current_mode == target_mode:
            logger.info(f"[INFO] Приложение уже работает в режиме: {target_mode}")
            return True
        
        logger.info(f"[SWITCH] Переключение с '{current_mode}' на '{target_mode}'")
        
        try:
            # 1. Создаем резервную копию
            backup_path = self.create_backup(current_mode)
            
            # 2. Обновляем конфигурационные файлы
            self.update_env_file(target_mode)
            self.update_config_js(target_mode)
            
            # 3. Обновляем базу данных
            self.update_database_users(target_mode)
            
            # 4. Перезапускаем сервисы
            self.restart_services()
            
            logger.info(f"[SUCCESS] Успешно переключено в режим: {target_mode.upper()}")
            logger.info(f"[BACKUP] Резервная копия сохранена: {backup_path}")
            
            return True
            
        except Exception as e:
            logger.error(f"[ERROR] Ошибка переключения режима: {e}")
            logger.error("[HELP] Попробуйте восстановить из резервной копии")
            return False

    def check_processes(self):
        """Проверяет запущенные процессы"""
        try:
            processes = self.find_python_processes()
            bot_running = False
            webapp_running = False
            
            if self.is_windows:
                # В Windows сложнее определить конкретные скрипты
                # Проверяем наличие python процессов
                bot_running = len(processes) > 0
                webapp_running = len(processes) > 1
            else:
                # Linux/macOS - более точная проверка
                result = subprocess.run(['pgrep', '-f', 'python.*bot.py'], capture_output=True)
                bot_running = result.returncode == 0
                
                result = subprocess.run(['pgrep', '-f', 'python.*webapp'], capture_output=True)
                webapp_running = result.returncode == 0
            
            return bot_running, webapp_running
            
        except Exception as e:
            logger.debug(f"Ошибка проверки процессов: {e}")
            return False, False

    def show_status(self):
        """Показывает текущий статус приложения"""
        current_mode = self.get_current_mode()
        
        print(f"\nМИШУРА - Статус приложения")
        print(f"=" * 50)
        print(f"Текущий режим: {current_mode.upper()}")
        print(f"Рабочая директория: {self.root_dir}")
        print(f"Директория бэкапов: {self.backup_dir}")
        print(f"Платформа: {platform.system()}")
        
        # Проверяем конфигурационные файлы
        print(f"\nКонфигурационные файлы:")
        for file_type, file_path in self.config_files.items():
            status = "[OK]" if file_path.exists() else "[MISSING]"
            print(f"  {status} {file_type}: {file_path}")
        
        # Проверяем процессы
        print(f"\nЗапущенные процессы:")
        try:
            bot_running, webapp_running = self.check_processes()
            bot_status = "[RUNNING]" if bot_running else "[STOPPED]"
            webapp_status = "[RUNNING]" if webapp_running else "[STOPPED]"
            print(f"  {bot_status} Bot процесс")
            print(f"  {webapp_status} Webapp процесс")
        except Exception as e:
            print(f"  [ERROR] Ошибка проверки процессов: {e}")
        
        # Показываем доступные режимы
        print(f"\nДоступные режимы:")
        for mode, config in self.mode_configs.items():
            marker = ">>>" if mode == current_mode else "   "
            print(f"  {marker} {mode}: {config['ENVIRONMENT']}")
        
        print(f"\nИспользование:")
        print(f"  python mode_switch_windows.py --mode [demo|development|production]")
        print(f"=" * 50)

    def list_backups(self):
        """Показывает список доступных резервных копий"""
        backups = list(self.backup_dir.glob("*"))
        backups.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        print(f"\nДоступные резервные копии:")
        print(f"=" * 50)
        
        if not backups:
            print("  [INFO] Резервные копии не найдены")
            return
        
        for backup in backups[:10]:  # Показываем последние 10
            try:
                info_file = backup / 'backup_info.json'
                if info_file.exists():
                    with open(info_file, 'r', encoding='utf-8') as f:
                        info = json.load(f)
                    print(f"  [BACKUP] {backup.name}")
                    print(f"     Режим: {info.get('mode', 'unknown')}")
                    print(f"     Дата: {info.get('timestamp', 'unknown')}")
                    print(f"     Файлов: {len(info.get('files_backed_up', []))}")
                else:
                    print(f"  [BACKUP] {backup.name} (без метаинформации)")
            except Exception as e:
                print(f"  [ERROR] {backup.name} (ошибка чтения: {e})")
        
        print(f"\nВосстановление:")
        print(f"  Скопируйте файлы из нужной папки бэкапа вручную")

def main():
    parser = argparse.ArgumentParser(description='МИШУРА - Переключение режимов работы (Windows)')
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--mode', choices=['demo', 'development', 'production'],
                      help='Переключить в указанный режим')
    group.add_argument('--status', action='store_true',
                      help='Показать текущий статус')
    group.add_argument('--backup', action='store_true',
                      help='Создать резервную копию текущих настроек')
    group.add_argument('--list-backups', action='store_true',
                      help='Показать список резервных копий')
    
    parser.add_argument('--no-restart', action='store_true',
                       help='Не перезапускать сервисы после переключения')
    
    args = parser.parse_args()
    
    switcher = MishuraModeSwitch()
    
    try:
        if args.mode:
            # Переключение режима
            success = switcher.switch_mode(args.mode)
            sys.exit(0 if success else 1)
            
        elif args.status:
            # Показать статус
            switcher.show_status()
            
        elif args.backup:
            # Создать резервную копию
            backup_path = switcher.create_backup()
            print(f"[OK] Резервная копия создана: {backup_path}")
            
        elif args.list_backups:
            # Показать список резервных копий
            switcher.list_backups()
            
    except KeyboardInterrupt:
        logger.info("\n[STOP] Операция прервана пользователем")
        sys.exit(1)
    except Exception as e:
        logger.error(f"[ERROR] Критическая ошибка: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()