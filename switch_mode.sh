#!/bin/bash
# ==============================================================================
# МИШУРА - Вспомогательный скрипт переключения режимов
# Версия: 1.0.0
# Дата: 2025-06-04
# ==============================================================================

set -e  # Прекратить выполнение при любой ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функция для вывода цветного текста
print_color() {
    echo -e "${1}${2}${NC}"
}

# Функция для отображения логотипа
show_logo() {
    print_color $PURPLE "
🎭 ═══════════════════════════════════════════════════════════
   МИШУРА - Персональный ИИ-Стилист
   Система переключения режимов работы
═══════════════════════════════════════════════════════════"
}

# Функция помощи
show_help() {
    show_logo
    echo ""
    print_color $CYAN "📖 ИСПОЛЬЗОВАНИЕ:"
    echo "  ./switch_mode.sh [КОМАНДА] [ОПЦИИ]"
    echo ""
    print_color $CYAN "🎯 КОМАНДЫ:"
    echo "  demo         - Переключить в демо режим (тестирование)"
    echo "  dev          - Переключить в режим разработки"
    echo "  prod         - Переключить в production режим"
    echo "  status       - Показать текущий статус приложения"
    echo "  backup       - Создать резервную копию настроек"
    echo "  restore      - Показать доступные резервные копии"
    echo "  logs         - Показать логи переключений"
    echo "  check        - Проверить состояние системы"
    echo "  help         - Показать эту справку"
    echo ""
    print_color $CYAN "🔧 ОПЦИИ:"
    echo "  --force      - Принудительное переключение без подтверждения"
    echo "  --no-restart - Не перезапускать сервисы"
    echo "  --quiet      - Тихий режим (минимум вывода)"
    echo ""
    print_color $CYAN "💡 ПРИМЕРЫ:"
    echo "  ./switch_mode.sh status"
    echo "  ./switch_mode.sh demo"
    echo "  ./switch_mode.sh prod --force"
    echo "  ./switch_mode.sh backup"
    echo ""
}

# Проверка существования Python скрипта
check_python_script() {
    if [ ! -f "mode_switch.py" ]; then
        print_color $RED "❌ Ошибка: Файл mode_switch.py не найден!"
        print_color $YELLOW "💡 Убедитесь, что вы находитесь в корневой директории проекта МИШУРА"
        exit 1
    fi
}

# Проверка Python зависимостей
check_dependencies() {
    if ! command -v python3 &> /dev/null; then
        print_color $RED "❌ Ошибка: Python 3 не установлен!"
        exit 1
    fi
    
    # Проверяем наличие необходимых модулей
    python3 -c "import pathlib, json, shutil, subprocess" 2>/dev/null || {
        print_color $RED "❌ Ошибка: Отсутствуют необходимые Python модули!"
        exit 1
    }
}

# Функция подтверждения действия
confirm_action() {
    local action="$1"
    local current_mode="$2"
    
    print_color $YELLOW "⚠️  ВНИМАНИЕ: Вы собираетесь $action"
    if [ ! -z "$current_mode" ]; then
        print_color $YELLOW "   Текущий режим: $current_mode"
    fi
    print_color $YELLOW "   Это действие изменит конфигурацию приложения."
    echo ""
    
    read -p "Продолжить? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_color $YELLOW "❌ Операция отменена пользователем"
        exit 0
    fi
}

# Получение текущего режима
get_current_mode() {
    if [ -f ".env" ]; then
        grep "^ENVIRONMENT=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'"
    else
        echo "unknown"
    fi
}

# Проверка состояния системы
check_system() {
    print_color $BLUE "🔍 Проверка состояния системы МИШУРА..."
    
    # Проверяем файлы
    echo ""
    print_color $CYAN "📄 Конфигурационные файлы:"
    
    files=(".env" "webapp/js/config.js" "database.py" "bot.py")
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            print_color $GREEN "  ✅ $file"
        else
            print_color $RED "  ❌ $file (отсутствует)"
        fi
    done
    
    # Проверяем процессы
    echo ""
    print_color $CYAN "🔧 Запущенные процессы:"
    
    if pgrep -f "python.*bot.py" > /dev/null; then
        print_color $GREEN "  ✅ Bot процесс запущен"
    else
        print_color $YELLOW "  ⚠️  Bot процесс остановлен"
    fi
    
    if pgrep -f "python.*webapp" > /dev/null; then
        print_color $GREEN "  ✅ Webapp процесс запущен"
    else
        print_color $YELLOW "  ⚠️  Webapp процесс остановлен"
    fi
    
    # Проверяем базу данных
    echo ""
    print_color $CYAN "🗄️  База данных:"
    if [ -f "styleai.db" ]; then
        db_size=$(du -h styleai.db | cut -f1)
        print_color $GREEN "  ✅ База данных существует (размер: $db_size)"
    else
        print_color $RED "  ❌ База данных не найдена"
    fi
    
    # Проверяем директории
    echo ""
    print_color $CYAN "📁 Директории:"
    dirs=("webapp" "Testing" "BACKUPS" "DEPLOYMENT")
    for dir in "${dirs[@]}"; do
        if [ -d "$dir" ]; then
            print_color $GREEN "  ✅ $dir/"
        else
            print_color $YELLOW "  ⚠️  $dir/ (отсутствует)"
        fi
    done
}

# Показать логи
show_logs() {
    print_color $BLUE "📋 Логи переключения режимов:"
    echo ""
    
    if [ -f "mode_switch.log" ]; then
        print_color $CYAN "📄 Последние 20 записей из mode_switch.log:"
        echo "----------------------------------------"
        tail -20 mode_switch.log
    else
        print_color $YELLOW "⚠️  Файл логов mode_switch.log не найден"
    fi
    
    echo ""
    if [ -f "mishura.log" ]; then
        print_color $CYAN "📄 Последние 10 записей из mishura.log:"
        echo "----------------------------------------"
        tail -10 mishura.log
    else
        print_color $YELLOW "⚠️  Файл логов mishura.log не найден"
    fi
}

# Основная функция
main() {
    local command="$1"
    local force_flag=""
    local no_restart_flag=""
    local quiet_flag=""
    
    # Обработка опций
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                force_flag="--force"
                shift
                ;;
            --no-restart)
                no_restart_flag="--no-restart"
                shift
                ;;
            --quiet)
                quiet_flag="--quiet"
                shift
                ;;
            *)
                print_color $RED "❌ Неизвестная опция: $1"
                exit 1
                ;;
        esac
    done
    
    # Проверки системы
    check_python_script
    check_dependencies
    
    case $command in
        "demo"|"development"|"production"|"dev"|"prod")
            # Нормализация названий режимов
            case $command in
                "dev") command="development" ;;
                "prod") command="production" ;;
            esac
            
            current_mode=$(get_current_mode)
            
            if [ "$current_mode" = "$command" ]; then
                print_color $YELLOW "ℹ️  Приложение уже работает в режиме: $command"
                exit 0
            fi
            
            if [ -z "$force_flag" ]; then
                confirm_action "переключить в режим $command" "$current_mode"
            fi
            
            if [ -z "$quiet_flag" ]; then
                show_logo
                print_color $BLUE "🔄 Переключение в режим: $command"
            fi
            
            # Выполняем переключение
            python3 mode_switch.py --mode "$command" $no_restart_flag
            
            if [ $? -eq 0 ]; then
                print_color $GREEN "✅ Успешно переключено в режим: $command"
                if [ -z "$quiet_flag" ]; then
                    echo ""
                    print_color $CYAN "💡 Для проверки статуса: ./switch_mode.sh status"
                fi
            else
                print_color $RED "❌ Ошибка переключения режима"
                exit 1
            fi
            ;;
            
        "status")
            show_logo
            python3 mode_switch.py --status
            ;;
            
        "backup")
            if [ -z "$force_flag" ]; then
                confirm_action "создать резервную копию текущих настроек"
            fi
            
            python3 mode_switch.py --backup
            ;;
            
        "restore")
            show_logo
            python3 mode_switch.py --list-backups
            ;;
            
        "logs")
            show_logo
            show_logs
            ;;
            
        "check")
            show_logo
            check_system
            ;;
            
        "help"|"--help"|"-h"|"")
            show_help
            ;;
            
        *)
            print_color $RED "❌ Неизвестная команда: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Запуск основной функции
main "$@"