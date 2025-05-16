import os

def find_env_files(start_path='.'):
    """Находит все .env файлы начиная с указанной директории"""
    env_files = []
    for root, dirs, files in os.walk(start_path):
        for file in files:
            if file == '.env' or file.endswith('.env'):
                full_path = os.path.join(root, file)
                env_files.append(full_path)
                # Показываем первые несколько строк файла
                try:
                    with open(full_path, 'r') as f:
                        content = f.read(500)  # Первые 500 символов
                        print(f"\nСодержимое файла {full_path}:\n{content}")
                except Exception as e:
                    print(f"Ошибка при чтении {full_path}: {e}")
    return env_files

if __name__ == "__main__":
    current_dir = os.getcwd()
    print(f"Ищем .env файлы в {current_dir} и поддиректориях...")
    env_files = find_env_files(current_dir)
    print(f"\nНайдено {len(env