/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Загрузчик приложения (app.js)
ВЕРСИЯ: 0.4.0 (Модульная структура)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Основной файл-загрузчик, который импортирует и инициализирует все модули приложения.
Организует правильный порядок инициализации и обрабатывает ошибки загрузки.
==========================================================================================
*/

// Главный объект приложения должен быть создан раньше в config.js
// Но на всякий случай проверяем его наличие
if (typeof MishuraApp === 'undefined') {
    console.error('КРИТИЧЕСКАЯ ОШИБКА: Основной объект MishuraApp не определен. Проверьте загрузку config.js.');
    MishuraApp = {
        utils: {},
        api: {},
        components: {},
        features: {}
    };
}

// Обеспечиваем наличие всех необходимых подобъектов
MishuraApp.utils = MishuraApp.utils || {};
MishuraApp.api = MishuraApp.api || {};
MishuraApp.components = MishuraApp.components || {};
MishuraApp.features = MishuraApp.features || {};

// Когда DOM полностью загружен, начинаем инициализацию
document.addEventListener('DOMContentLoaded', function() {
    console.log('МИШУРА app.js загружен - инициализация модульной структуры...');
    
    try {
        // Инициализация конфигурации
        if (MishuraApp.config && typeof MishuraApp.config.init === 'function') {
            MishuraApp.config.init();
            console.log('Инициализация конфигурации завершена');
        } else {
            console.warn('Модуль конфигурации не найден или не имеет метода init');
        }
        
        // Инициализация утилит
        initModuleIfExists(MishuraApp.utils.logger, 'Логгер');
        initModuleIfExists(MishuraApp.utils.deviceDetect, 'Определение устройства');
        initModuleIfExists(MishuraApp.utils.uiHelpers, 'UI-хелперы');
        console.log('Базовые утилиты инициализированы');
        
        // Инициализация API
        initModuleIfExists(MishuraApp.api.service, 'API-сервис');
        console.log('API-сервис инициализирован');
        
        // Инициализация компонентов
        initModuleIfExists(MishuraApp.components.navigation, 'Навигация');
        initModuleIfExists(MishuraApp.components.modals, 'Модальные окна');
        initModuleIfExists(MishuraApp.components.imageUpload, 'Загрузка изображений');
        console.log('Компоненты интерфейса инициализированы');
        
        // Инициализация функциональных модулей
        initModuleIfExists(MishuraApp.features.consultation, 'Консультация');
        initModuleIfExists(MishuraApp.features.comparison, 'Сравнение');
        initModuleIfExists(MishuraApp.features.tryOn, 'Виртуальная примерка');
        console.log('Функциональные модули инициализированы');
        
        // Инициализация главного модуля
        initModuleIfExists(MishuraApp.main, 'Основной модуль');
        
        console.log('МИШУРА успешно инициализирована и готова к работе!');
        document.body.classList.add('app-initialized');
        
    } catch (error) {
        console.error('КРИТИЧЕСКАЯ ОШИБКА при инициализации МИШУРА:', error);
    }
    
    // Вспомогательная функция для безопасной инициализации модулей
    function initModuleIfExists(module, moduleName) {
        if (module && typeof module.init === 'function') {
            try {
                module.init();
                if (MishuraApp.utils.logger && MishuraApp.utils.logger.info) {
                    MishuraApp.utils.logger.info(`Модуль ${moduleName} инициализирован`);
                }
            } catch (e) {
                console.error(`Ошибка при инициализации модуля ${moduleName}:`, e);
                throw e; // Пробрасываем ошибку дальше для обработки в основном блоке
            }
        } else {
            console.warn(`Модуль ${moduleName} не найден или не имеет метода init`);
        }
    }
});

// Страхуемся от потенциальных ошибок загрузки стилей
window.addEventListener('load', function() {
    setTimeout(function() {
        if (!document.body.classList.contains('loaded')) {
            document.body.classList.add('loaded');
            console.warn('Принудительное отображение страницы после таймаута загрузки');
        }
    }, 1000);
});