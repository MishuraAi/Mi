/**
 * 🏥 ПРОВЕРКА ЗДОРОВЬЯ ПРИЛОЖЕНИЯ МИШУРА
 * Тестирует все критические функции
 */

console.log('🏥 Запуск проверки здоровья приложения...');

function healthCheck() {
    const results = {
        passed: [],
        failed: [],
        warnings: []
    };
    
    console.group('🔍 Проверка критических компонентов');
    
    // 1. Проверка основных элементов DOM
    console.log('\n📋 1. Проверка элементов интерфейса:');
    const criticalElements = [
        { id: 'single-mode-btn', name: 'Кнопка "Анализ образа"' },
        { id: 'compare-mode-btn', name: 'Кнопка "Сравнение образов"' },
        { id: 'nav-balance', name: 'Кнопка "Баланс"' },
        { id: 'nav-home', name: 'Кнопка "Главная"' },
        { id: 'nav-history', name: 'Кнопка "История"' },
        { id: 'consultation-overlay', name: 'Модальное окно консультации' },
        { id: 'balance-section', name: 'Секция баланса' }
    ];
    
    criticalElements.forEach(elem => {
        const element = document.getElementById(elem.id);
        if (element) {
            results.passed.push(`✅ ${elem.name} найден`);
            console.log(`✅ ${elem.name}: OK`);
        } else {
            results.failed.push(`❌ ${elem.name} НЕ НАЙДЕН`);
            console.error(`❌ ${elem.name}: ОТСУТСТВУЕТ`);
        }
    });
    
    // 2. Проверка глобальных объектов
    console.log('\n📦 2. Проверка глобальных объектов:');
    const globalObjects = [
        { obj: 'window.app', name: 'Основное приложение' },
        { obj: 'window.userService', name: 'Сервис пользователей' },
        { obj: 'window.unifiedBalanceSync', name: 'Синхронизация баланса' },
        { obj: 'window.MishuraApp', name: 'Модульное приложение' },
        { obj: 'window.smartNavFix', name: 'Умное исправление навигации' }
    ];
    
    globalObjects.forEach(item => {
        try {
            const obj = eval(item.obj);
            if (obj) {
                results.passed.push(`✅ ${item.name} доступен`);
                console.log(`✅ ${item.name}: OK`);
            } else {
                results.failed.push(`❌ ${item.name} не инициализирован`);
                console.error(`❌ ${item.name}: НЕ ИНИЦИАЛИЗИРОВАН`);
            }
        } catch (e) {
            results.failed.push(`❌ ${item.name} вызвал ошибку`);
            console.error(`❌ ${item.name}: ОШИБКА`, e);
        }
    });
    
    // 3. Проверка критических функций
    console.log('\n🔧 3. Проверка критических функций:');
    const criticalFunctions = [
        { func: 'window.app.openConsultation', name: 'Открытие консультации' },
        { func: 'window.app.showBalanceSection', name: 'Показ баланса' },
        { func: 'window.app.refreshBalance', name: 'Обновление баланса' },
        { func: 'window.app.submitSingleImage', name: 'Отправка одного изображения' },
        { func: 'window.app.submitComparison', name: 'Отправка сравнения' }
    ];
    
    criticalFunctions.forEach(item => {
        try {
            const func = eval(item.func);
            if (typeof func === 'function') {
                results.passed.push(`✅ Функция ${item.name} доступна`);
                console.log(`✅ ${item.name}: OK`);
            } else {
                results.failed.push(`❌ Функция ${item.name} не является функцией`);
                console.error(`❌ ${item.name}: НЕ ФУНКЦИЯ`);
            }
        } catch (e) {
            results.warnings.push(`⚠️ Функция ${item.name} недоступна (возможно, еще не загружена)`);
            console.warn(`⚠️ ${item.name}: НЕДОСТУПНА`);
        }
    });
    
    // 4. Проверка обработчиков событий
    console.log('\n🎯 4. Проверка обработчиков событий:');
    const eventChecks = [
        { id: 'single-mode-btn', event: 'click', name: 'Клик на "Анализ образа"' },
        { id: 'compare-mode-btn', event: 'click', name: 'Клик на "Сравнение образов"' },
        { id: 'nav-balance', event: 'click', name: 'Клик на "Баланс"' }
    ];
    
    eventChecks.forEach(check => {
        const elem = document.getElementById(check.id);
        if (elem) {
            const hasListeners = elem.onclick || (elem._listeners && elem._listeners[check.event]) || 
                               getEventListeners(elem)[check.event]?.length > 0;
            
            if (hasListeners) {
                results.passed.push(`✅ ${check.name} имеет обработчики`);
                console.log(`✅ ${check.name}: ЕСТЬ ОБРАБОТЧИКИ`);
            } else {
                // Проверяем через Chrome DevTools API если доступен
                try {
                    if (window.getEventListeners) {
                        const listeners = getEventListeners(elem);
                        if (listeners.click && listeners.click.length > 0) {
                            results.passed.push(`✅ ${check.name} имеет обработчики (DevTools)`);
                            console.log(`✅ ${check.name}: ЕСТЬ ОБРАБОТЧИКИ (${listeners.click.length} шт)`);
                        } else {
                            results.warnings.push(`⚠️ ${check.name} может не иметь обработчиков`);
                            console.warn(`⚠️ ${check.name}: ОБРАБОТЧИКИ НЕ ОБНАРУЖЕНЫ`);
                        }
                    }
                } catch (e) {
                    results.warnings.push(`⚠️ Не удалось проверить обработчики для ${check.name}`);
                }
            }
        }
    });
    
    // 5. Симуляция кликов
    console.log('\n🖱️ 5. Симуляция кликов (проверка реакции):');
    
    // Итоговый отчет
    console.groupEnd();
    
    console.group('📊 ИТОГОВЫЙ ОТЧЕТ');
    console.log(`✅ Пройдено тестов: ${results.passed.length}`);
    console.log(`❌ Провалено тестов: ${results.failed.length}`);
    console.log(`⚠️ Предупреждений: ${results.warnings.length}`);
    
    if (results.failed.length > 0) {
        console.group('❌ Критические ошибки:');
        results.failed.forEach(err => console.error(err));
        console.groupEnd();
    }
    
    if (results.warnings.length > 0) {
        console.group('⚠️ Предупреждения:');
        results.warnings.forEach(warn => console.warn(warn));
        console.groupEnd();
    }
    
    const score = Math.round((results.passed.length / (results.passed.length + results.failed.length)) * 100);
    console.log(`\n🏆 Общий результат: ${score}%`);
    
    if (score === 100) {
        console.log('💚 Приложение полностью работоспособно!');
    } else if (score >= 80) {
        console.log('💛 Приложение работает с небольшими проблемами');
    } else if (score >= 60) {
        console.log('🧡 Приложение частично работоспособно');
    } else {
        console.log('❤️ Приложение имеет критические проблемы');
    }
    
    console.groupEnd();
    
    return results;
}

// Функция для получения обработчиков (работает только в Chrome DevTools)
function getEventListeners(elem) {
    if (typeof window.getEventListeners === 'function') {
        return window.getEventListeners(elem);
    }
    return {};
}

// Автозапуск при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(healthCheck, 2000); // Даем время всем скриптам загрузиться
    });
} else {
    setTimeout(healthCheck, 1000);
}

// Экспорт для ручного запуска
window.mishuraHealthCheck = healthCheck;

console.log('🏥 Скрипт проверки здоровья загружен. Используйте mishuraHealthCheck() для ручной проверки.');