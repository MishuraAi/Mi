// 🧪 КОНСОЛЬНЫЕ ТЕСТЫ ДЛЯ МИШУРЫ
// console-tests.js - Полный набор тестов для безопасной проверки
// Версия: 1.0.0

console.log('🧪 === КОНСОЛЬНЫЕ ТЕСТЫ МИШУРЫ ЗАГРУЖЕНЫ ===');
console.log('📅 Версия тестов: 1.0.0');
console.log('🎯 Цель: Безопасное тестирование патчей V2');

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    startTime: Date.now(),
    tests: []
};

// === УТИЛИТЫ ТЕСТИРОВАНИЯ ===
function testLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
        'info': 'ℹ️',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'debug': '🔍'
    }[type] || 'ℹ️';
    
    const logMessage = `[${timestamp}] ${prefix} ${message}`;
    console.log(logMessage);
    
    // Сохраняем в результаты
    testResults.tests.push({
        timestamp: Date.now(),
        type,
        message,
        fullMessage: logMessage
    });
}

function assert(condition, message) {
    testResults.total++;
    if (condition) {
        testResults.passed++;
        testLog(`PASS: ${message}`, 'success');
        return true;
    } else {
        testResults.failed++;
        testLog(`FAIL: ${message}`, 'error');
        return false;
    }
}

function assertEqual(actual, expected, message) {
    const condition = actual === expected;
    if (!condition) {
        testLog(`Expected: ${expected}, Actual: ${actual}`, 'error');
    }
    return assert(condition, message);
}

function assertNotNull(value, message) {
    return assert(value !== null && value !== undefined, message);
}

function assertType(value, expectedType, message) {
    return assert(typeof value === expectedType, message);
}

// === СОЗДАНИЕ BACKUP ТЕКУЩЕГО СОСТОЯНИЯ ===
function createBackup() {
    testLog('🛡️ Создание backup текущего состояния...', 'info');
    
    window.originalMishuraApp = window.mishuraApp;
    window.originalMishuraAPIService = window.MishuraAPIService;
    
    if (window.originalMishuraApp) {
        testLog('✅ Backup основного приложения создан', 'success');
    } else {
        testLog('⚠️ Основное приложение не найдено', 'warning');
        testResults.warnings++;
    }
    
    if (window.originalMishuraAPIService) {
        testLog('✅ Backup API сервиса создан', 'success');
    } else {
        testLog('⚠️ API сервис не найден', 'warning');
        testResults.warnings++;
    }
}

function restoreBackup() {
    testLog('🔄 Восстановление из backup...', 'info');
    
    if (window.originalMishuraApp) {
        window.mishuraApp = window.originalMishuraApp;
        delete window.originalMishuraApp;
        testLog('✅ Основное приложение восстановлено', 'success');
    }
    
    if (window.originalMishuraAPIService) {
        window.MishuraAPIService = window.originalMishuraAPIService;
        delete window.originalMishuraAPIService;
        testLog('✅ API сервис восстановлен', 'success');
    }
    
    // Очищаем тестовые экземпляры
    if (window.testMishuraApp) {
        delete window.testMishuraApp;
        testLog('🧹 Тестовый экземпляр удален', 'info');
    }
}

// === БАЗОВЫЕ ТЕСТЫ ===
function testEnvironment() {
    testLog('🌐 === ТЕСТИРОВАНИЕ ОКРУЖЕНИЯ ===', 'info');
    
    // Проверяем браузер
    assertNotNull(window, 'window объект доступен');
    assertNotNull(document, 'document объект доступен');
    assertNotNull(console, 'console объект доступен');
    
    // Проверяем основные API
    assertType(localStorage, 'object', 'localStorage доступен');
    assertType(fetch, 'function', 'fetch API доступен');
    assert(typeof Promise !== 'undefined', 'Promise поддерживается');
    
    // Проверяем наличие необходимых элементов DOM
    const container = document.querySelector('.container');
    assert(!!container, 'Основной контейнер найден');
    
    testLog('✅ Тестирование окружения завершено', 'success');
}

function testMishuraAppClass() {
    testLog('🎭 === ТЕСТИРОВАНИЕ КЛАССА MishuraApp ===', 'info');
    
    // Проверяем доступность класса
    assertType(window.MishuraApp, 'function', 'Класс MishuraApp доступен');
    
    try {
        // Создаем тестовый экземпляр
        window.testMishuraApp = new window.MishuraApp();
        assert(true, 'Экземпляр MishuraApp создан успешно');
        
        // Проверяем основные свойства
        assertNotNull(window.testMishuraApp.currentMode, 'currentMode инициализирован');
        assertNotNull(window.testMishuraApp.currentSection, 'currentSection инициализирован');
        assertType(window.testMishuraApp.compareImages, 'object', 'compareImages массив создан');
        assertType(window.testMishuraApp.userBalance, 'number', 'userBalance число');
        
        // Проверяем новые свойства патчей V2
        assertEqual(window.testMishuraApp.requestTimeout, 90000, 'Timeout увеличен до 90 секунд');
        assertType(window.testMishuraApp.initializationComplete, 'boolean', 'initializationComplete флаг есть');
        
        // Проверяем методы
        assertType(window.testMishuraApp.normalizeAPIResponse, 'function', 'normalizeAPIResponse метод есть');
        assertType(window.testMishuraApp.parseMarkdownStructure, 'function', 'parseMarkdownStructure метод есть');
        assertType(window.testMishuraApp.diagnostics, 'function', 'diagnostics метод есть');
        assertType(window.testMishuraApp.getAnalytics, 'function', 'getAnalytics метод есть');
        
    } catch (error) {
        testLog(`Ошибка создания экземпляра: ${error.message}`, 'error');
        testResults.failed++;
    }
    
    testLog('✅ Тестирование класса MishuraApp завершено', 'success');
}

function testAPIResponseNormalization() {
    testLog('🔄 === ТЕСТИРОВАНИЕ НОРМАЛИЗАЦИИ API ===', 'info');
    
    if (!window.testMishuraApp) {
        testLog('❌ Тестовый экземпляр не найден', 'error');
        return;
    }
    
    const testCases = [
        {
            input: 'Простая строка',
            expectedType: 'string',
            description: 'Строковый ответ'
        },
        {
            input: { advice: 'Ответ с advice' },
            expectedField: 'advice',
            description: 'Объект с advice'
        },
        {
            input: { message: 'Ответ с message' },
            expectedField: 'advice',
            description: 'Объект с message'
        },
        {
            input: { text: 'Ответ с text' },
            expectedField: 'advice',
            description: 'Объект с text'
        },
        {
            input: null,
            expectedField: 'advice',
            description: 'null ответ'
        },
        {
            input: {},
            expectedField: 'advice',
            description: 'Пустой объект'
        }
    ];
    
    testCases.forEach((testCase, index) => {
        try {
            const result = window.testMishuraApp.normalizeAPIResponse(testCase.input);
            
            assert(!!result, `Тест ${index + 1}: Результат не null`);
            assert(!!result.advice, `Тест ${index + 1}: advice поле присутствует`);
            assert(!!result.metadata, `Тест ${index + 1}: metadata поле присутствует`);
            assertType(result.advice, 'string', `Тест ${index + 1}: advice является строкой`);
            
            testLog(`✅ ${testCase.description} - нормализован успешно`, 'success');
            
        } catch (error) {
            testLog(`❌ ${testCase.description} - ошибка: ${error.message}`, 'error');
            testResults.failed++;
        }
    });
    
    testLog('✅ Тестирование нормализации API завершено', 'success');
}

function testMarkdownParsing() {
    testLog('📋 === ТЕСТИРОВАНИЕ ПАРСИНГА MARKDOWN ===', 'info');
    
    if (!window.testMishuraApp) {
        testLog('❌ Тестовый экземпляр не найден', 'error');
        return;
    }
    
    const testMarkdown = `
# Заголовок 1
## Заголовок 2
### Заголовок 3

**Жирный текст**
*Курсив*

- Элемент списка 1
- Элемент списка 2

Обычный абзац текста.

**Рекомендации:**
Это рекомендации от стилиста.
    `;
    
    try {
        const result = window.testMishuraApp.parseMarkdownStructure(testMarkdown);
        
        assert(typeof result === 'string', 'Результат парсинга - строка');
        assert(result.includes('<h2>'), 'H1 заголовок преобразован в H2');
        assert(result.includes('<h3>'), 'H2 заголовок преобразован в H3');
        assert(result.includes('<h4>'), 'H3 заголовок преобразован в H4');
        assert(result.includes('<strong>'), 'Жирный текст преобразован');
        assert(result.includes('<em>'), 'Курсив преобразован');
        assert(result.includes('<ul>'), 'Список создан');
        assert(result.includes('<li>'), 'Элементы списка созданы');
        assert(result.includes('<p>'), 'Параграфы созданы');
        
        testLog('✅ Markdown парсинг работает корректно', 'success');
        
    } catch (error) {
        testLog(`❌ Ошибка парсинга markdown: ${error.message}`, 'error');
        testResults.failed++;
    }
    
    testLog('✅ Тестирование парсинга Markdown завершено', 'success');
}

function testAPIIntegration() {
    testLog('🌐 === ТЕСТИРОВАНИЕ API ИНТЕГРАЦИИ ===', 'info');
    
    if (!window.testMishuraApp) {
        testLog('❌ Тестовый экземпляр не найден', 'error');
        return;
    }
    
    // Проверяем наличие API
    if (!window.testMishuraApp.api) {
        testLog('⚠️ API не подключен к тестовому экземпляру', 'warning');
        testResults.warnings++;
        return;
    }
    
    // Проверяем методы API
    assertType(window.testMishuraApp.api.analyzeSingle, 'function', 'analyzeSingle метод доступен');
    assertType(window.testMishuraApp.api.analyzeCompare, 'function', 'analyzeCompare метод доступен');
    
    // Тест с mock данными
    const mockFile = new File(['test data'], 'test.jpg', { type: 'image/jpeg' });
    
    // Тестируем analyzeSingle (асинхронно)
    window.testMishuraApp.api.analyzeSingle(mockFile, 'тест', 'тестовые предпочтения')
        .then(result => {
            assert(!!result, 'analyzeSingle вернул результат');
            assert(!!result.advice || !!result.message, 'Результат содержит advice или message');
            testLog('✅ analyzeSingle тест пройден', 'success');
        })
        .catch(error => {
            testLog(`❌ analyzeSingle тест провален: ${error.message}`, 'error');
            testResults.failed++;
        });
    
    testLog('✅ Тестирование API интеграции завершено', 'success');
}

function testNavigationSystem() {
    testLog('🧭 === ТЕСТИРОВАНИЕ НАВИГАЦИИ ===', 'info');
    
    if (!window.testMishuraApp) {
        testLog('❌ Тестовый экземпляр не найден', 'error');
        return;
    }
    
    const sections = ['home', 'history', 'balance'];
    let successCount = 0;
    
    sections.forEach(section => {
        try {
            const initialSection = window.testMishuraApp.currentSection;
            window.testMishuraApp.navigateToSection(section);
            
            if (window.testMishuraApp.currentSection === section) {
                successCount++;
                testLog(`✅ Переход в ${section} успешен`, 'success');
            } else {
                testLog(`❌ Переход в ${section} не выполнен`, 'error');
                testResults.failed++;
            }
        } catch (error) {
            testLog(`❌ Ошибка перехода в ${section}: ${error.message}`, 'error');
            testResults.failed++;
        }
    });
    
    assert(successCount === sections.length, `Все переходы выполнены (${successCount}/${sections.length})`);
    
    testLog('✅ Тестирование навигации завершено', 'success');
}

function testAnalyticsAndDiagnostics() {
    testLog('📊 === ТЕСТИРОВАНИЕ АНАЛИТИКИ И ДИАГНОСТИКИ ===', 'info');
    
    if (!window.testMishuraApp) {
        testLog('❌ Тестовый экземпляр не найден', 'error');
        return;
    }
    
    // Тестируем getAnalytics
    try {
        const analytics = window.testMishuraApp.getAnalytics();
        
        assertType(analytics, 'object', 'getAnalytics возвращает объект');
        assertType(analytics.sessionDuration, 'number', 'sessionDuration число');
        assertType(analytics.userBalance, 'number', 'userBalance число');
        assertType(analytics.apiConnected, 'boolean', 'apiConnected булево');
        assertType(analytics.initializationComplete, 'boolean', 'initializationComplete булево');
        
        testLog('✅ getAnalytics работает корректно', 'success');
        
    } catch (error) {
        testLog(`❌ Ошибка getAnalytics: ${error.message}`, 'error');
        testResults.failed++;
    }
    
    // Тестируем diagnostics
    try {
        window.testMishuraApp.diagnostics();
        testLog('✅ diagnostics выполнена без ошибок', 'success');
        
    } catch (error) {
        testLog(`❌ Ошибка diagnostics: ${error.message}`, 'error');
        testResults.failed++;
    }
    
    testLog('✅ Тестирование аналитики завершено', 'success');
}

// === ПОЛНЫЙ ТЕСТ-СЬЮТ ===
async function runFullTestSuite() {
    testLog('🧪 === ЗАПУСК ПОЛНОГО ТЕСТ-СЬЮТА ===', 'info');
    testLog(`📅 Дата запуска: ${new Date().toLocaleString()}`, 'info');
    
    // Сброс результатов
    testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        startTime: Date.now(),
        tests: []
    };
    
    try {
        // Создаем backup
        createBackup();
        
        // Запускаем тесты
        testEnvironment();
        testMishuraAppClass();
        
        // Ждем инициализации
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        testAPIResponseNormalization();
        testMarkdownParsing();
        testAPIIntegration();
        testNavigationSystem();
        testAnalyticsAndDiagnostics();
        
        // Ждем завершения асинхронных тестов
        await new Promise(resolve => setTimeout(resolve, 3000));
        
    } catch (error) {
        testLog(`💥 Критическая ошибка тест-сьюта: ${error.message}`, 'error');
        testResults.failed++;
    }
    
    // Выводим итоги
    const duration = (Date.now() - testResults.startTime) / 1000;
    const successRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
    
    testLog('📊 === ИТОГИ ТЕСТИРОВАНИЯ ===', 'info');
    testLog(`✅ Пройдено: ${testResults.passed}`, 'success');
    testLog(`❌ Провалено: ${testResults.failed}`, 'error');
    testLog(`⚠️ Предупреждения: ${testResults.warnings}`, 'warning');
    testLog(`📈 Успешность: ${successRate}%`, 'info');
    testLog(`⏱️ Время выполнения: ${duration}с`, 'info');
    
    if (testResults.failed === 0) {
        testLog('🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!', 'success');
        testLog('💡 Приложение готово к развертыванию', 'info');
        return true;
    } else {
        testLog('⚠️ ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ', 'warning');
        testLog('🔧 Необходимы дополнительные исправления', 'info');
        return false;
    }
}

// === БЫСТРЫЕ ТЕСТЫ ===
function quickTest() {
    testLog('⚡ === БЫСТРЫЙ ТЕСТ ===', 'info');
    
    createBackup();
    testEnvironment();
    testMishuraAppClass();
    
    const successRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
    testLog(`⚡ Быстрый тест завершен: ${successRate}% успешность`, successRate > 80 ? 'success' : 'warning');
    
    return successRate > 80;
}

// === ЭКСПОРТ ФУНКЦИЙ ===
window.testingTools = {
    // Основные функции
    runFullTestSuite,
    quickTest,
    createBackup,
    restoreBackup,
    
    // Отдельные тесты
    testEnvironment,
    testMishuraAppClass,
    testAPIResponseNormalization,
    testMarkdownParsing,
    testAPIIntegration,
    testNavigationSystem,
    testAnalyticsAndDiagnostics,
    
    // Утилиты
    testLog,
    assert,
    assertEqual,
    assertNotNull,
    assertType,
    
    // Результаты
    getResults: () => testResults
};

// Делаем доступными глобально для удобства
window.runFullTestSuite = runFullTestSuite;
window.quickTest = quickTest;
window.createBackup = createBackup;
window.restoreBackup = restoreBackup;
window.testLog = testLog;

// === ИНСТРУКЦИИ ===
console.log(`
🧪 === КОНСОЛЬНОЕ ТЕСТИРОВАНИЕ МИШУРЫ ===

📋 ДОСТУПНЫЕ КОМАНДЫ:
1. runFullTestSuite() - полный тест (5-10 минут)
2. quickTest() - быстрый тест (30 секунд)
3. createBackup() - создать backup
4. restoreBackup() - восстановить backup

🚀 БЫСТРЫЙ СТАРТ:
1. Загрузите новый код MishuraApp
2. runFullTestSuite()
3. Если все ОК: переходите к внедрению
4. При проблемах: restoreBackup()

⚠️ ВАЖНО:
- Всегда создавайте backup перед тестами
- Тесты не влияют на production код
- При ошибках используйте restoreBackup()

🔍 ОТЛАДКА:
- testingTools.getResults() - результаты тестов
- Все логи дублируются в консоль
- Подробная диагностика доступна
`);

testLog('🎉 Консольные тесты готовы к запуску!', 'success');