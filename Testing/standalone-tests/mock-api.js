// 🎭 MOCK API ДЛЯ ТЕСТИРОВАНИЯ МИШУРЫ
// mock-api.js - Полная имитация API для безопасного тестирования
// Версия: 1.0.0

console.log('🎭 Mock API для МИШУРЫ загружается...');

/**
 * Класс Mock API Service
 * Имитирует поведение реального API для безопасного тестирования
 */
class MockMishuraAPIService {
    constructor() {
        this.baseURL = '/api/v1';
        this.timeout = 90000; // 90 секунд как в патчах V2
        this.retryCount = 3;
        this.retryDelay = 1000;
        
        // Статистика для тестирования
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            lastRequestTime: null
        };
        
        // Настройки поведения для тестирования
        this.settings = {
            simulateDelay: true,
            minDelay: 1000,
            maxDelay: 3000,
            failureRate: 0, // 0 = никогда не падает, 0.1 = 10% шанс ошибки
            customResponses: new Map()
        };
        
        this.log('✅ Mock API сервис создан для тестирования');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = {
            'info': 'ℹ️',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️'
        }[type] || 'ℹ️';
        
        console.log(`[${timestamp}] [MOCK-API] ${prefix} ${message}`);
        
        // Отправляем в тестовый лог если он есть
        if (typeof window.testLog === 'function') {
            window.testLog(`Mock API: ${message}`, type);
        }
    }

    /**
     * Симуляция задержки сети
     */
    async simulateNetworkDelay() {
        if (!this.settings.simulateDelay) return;
        
        const delay = Math.random() * (this.settings.maxDelay - this.settings.minDelay) + this.settings.minDelay;
        this.log(`Симуляция задержки сети: ${Math.round(delay)}мс`);
        
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Симуляция случайных ошибок
     */
    shouldSimulateFailure() {
        return Math.random() < this.settings.failureRate;
    }

    /**
     * Обновление статистики
     */
    updateStats(success, responseTime) {
        this.stats.totalRequests++;
        this.stats.lastRequestTime = Date.now();
        
        if (success) {
            this.stats.successfulRequests++;
        } else {
            this.stats.failedRequests++;
        }
        
        // Обновляем среднее время ответа
        this.stats.averageResponseTime = (
            (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime) / 
            this.stats.totalRequests
        );
    }

    /**
     * Анализ одного изображения (Mock)
     */
    async analyzeSingle(imageFile, occasion, preferences = '') {
        const startTime = Date.now();
        this.log(`📤 analyzeSingle вызван для повода: "${occasion}"`);
        
        try {
            // Валидация входных данных
            if (!imageFile) {
                throw new Error('Изображение не предоставлено');
            }
            
            if (!occasion || occasion.trim() === '') {
                throw new Error('Повод не указан');
            }
            
            // Симуляция задержки
            await this.simulateNetworkDelay();
            
            // Симуляция случайных ошибок
            if (this.shouldSimulateFailure()) {
                throw new Error('Симулированная ошибка API');
            }
            
            // Проверяем кастомные ответы
            const customKey = `single_${occasion}`;
            if (this.settings.customResponses.has(customKey)) {
                const customResponse = this.settings.customResponses.get(customKey);
                this.log(`📋 Используется кастомный ответ для "${occasion}"`, 'info');
                return customResponse;
            }
            
            // Генерируем mock ответ
            const response = this.generateSingleAnalysisResponse(occasion, preferences, imageFile);
            
            const responseTime = Date.now() - startTime;
            this.updateStats(true, responseTime);
            this.log(`✅ analyzeSingle завершен за ${responseTime}мс`, 'success');
            
            return response;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.updateStats(false, responseTime);
            this.log(`❌ analyzeSingle ошибка: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Сравнение нескольких изображений (Mock)
     */
    async analyzeCompare(imageFiles, occasion, preferences = '') {
        const startTime = Date.now();
        this.log(`📤 analyzeCompare вызван (${imageFiles.length} изображений) для повода: "${occasion}"`);
        
        try {
            // Валидация входных данных
            if (!Array.isArray(imageFiles) || imageFiles.length < 2) {
                throw new Error('Необходимо минимум 2 изображения для сравнения');
            }
            
            if (imageFiles.length > 4) {
                throw new Error('Максимум 4 изображения для сравнения');
            }
            
            if (!occasion || occasion.trim() === '') {
                throw new Error('Повод не указан');
            }
            
            // Симуляция более длительной задержки для сравнения
            this.settings.minDelay = 2000;
            this.settings.maxDelay = 5000;
            await this.simulateNetworkDelay();
            
            // Восстанавливаем обычные задержки
            this.settings.minDelay = 1000;
            this.settings.maxDelay = 3000;
            
            // Симуляция случайных ошибок
            if (this.shouldSimulateFailure()) {
                throw new Error('Симулированная ошибка API сравнения');
            }
            
            // Проверяем кастомные ответы
            const customKey = `compare_${occasion}_${imageFiles.length}`;
            if (this.settings.customResponses.has(customKey)) {
                const customResponse = this.settings.customResponses.get(customKey);
                this.log(`📋 Используется кастомный ответ для сравнения "${occasion}"`, 'info');
                return customResponse;
            }
            
            // Генерируем mock ответ
            const response = this.generateCompareAnalysisResponse(occasion, preferences, imageFiles);
            
            const responseTime = Date.now() - startTime;
            this.updateStats(true, responseTime);
            this.log(`✅ analyzeCompare завершен за ${responseTime}мс`, 'success');
            
            return response;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.updateStats(false, responseTime);
            this.log(`❌ analyzeCompare ошибка: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Генерация mock ответа для анализа одного изображения
     */
    generateSingleAnalysisResponse(occasion, preferences, imageFile) {
        const occasionAnalysis = this.getOccasionAnalysis(occasion);
        const fileName = imageFile.name || 'image.jpg';
        const fileSize = imageFile.size || 'неизвестно';
        
        const advice = `
# 🎨 Анализ образа от МИШУРЫ

**Повод**: ${occasion}
**Предпочтения**: ${preferences || 'не указаны'}

## Общая оценка
${occasionAnalysis.generalFeedback}

## 🌈 Цветовая гамма
${occasionAnalysis.colorAdvice}

## 👗 Стиль и силуэт
${occasionAnalysis.styleAdvice}

## 💡 Рекомендации
${occasionAnalysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## 📝 Дополнительные советы
${occasionAnalysis.additionalTips}

## ⭐ Итоговая оценка: ${occasionAnalysis.rating}/10

💡 **Совет от МИШУРЫ**: ${occasionAnalysis.proTip} (ТЕСТОВЫЙ РЕЖИМ)

---
*Анализ файла: ${fileName} (${fileSize} байт)*
*Время анализа: ${new Date().toLocaleString()}*
        `.trim();

        return {
            status: 'success',
            advice: advice,
            metadata: {
                timestamp: new Date().toISOString(),
                testMode: true,
                apiVersion: 'mock-v1.0.0',
                occasion: occasion,
                preferences: preferences,
                fileInfo: {
                    name: fileName,
                    size: fileSize,
                    type: imageFile.type || 'unknown'
                },
                processingTime: `${Math.random() * 3 + 1}s`,
                rating: occasionAnalysis.rating
            }
        };
    }

    /**
     * Генерация mock ответа для сравнения изображений
     */
    generateCompareAnalysisResponse(occasion, preferences, imageFiles) {
        const occasionAnalysis = this.getOccasionAnalysis(occasion);
        const imageCount = imageFiles.length;
        
        // Генерируем оценки для каждого образа
        const ratings = Array.from({length: imageCount}, () => Math.floor(Math.random() * 3) + 7); // 7-10
        const sortedIndices = ratings
            .map((rating, index) => ({rating, index}))
            .sort((a, b) => b.rating - a.rating)
            .map(item => item.index);
        
        const colors = ['Синий', 'Красный', 'Белый', 'Черный', 'Зеленый', 'Серый'];
        
        let comparisonDetails = '';
        sortedIndices.forEach((imageIndex, position) => {
            const medal = position === 0 ? '🥇' : position === 1 ? '🥈' : '🥉';
            const color = colors[imageIndex] || `Образ ${imageIndex + 1}`;
            const rating = ratings[imageIndex];
            
            comparisonDetails += `
### ${medal} ${color} образ - Оценка: ${rating}/10
- **Плюсы**: ${this.getRandomAdvantage()}
- **Минусы**: ${this.getRandomDisadvantage()}
- **Совет**: ${this.getRandomTip()}
`;
        });
        
        const advice = `
# 🏆 Сравнение образов от МИШУРЫ

**Повод**: ${occasion}
**Предпочтения**: ${preferences || 'не указаны'}
**Количество образов**: ${imageCount}

## Результат сравнения
**Лучший образ для ${occasion}**: ${colors[sortedIndices[0]]} образ выигрывает с оценкой ${ratings[sortedIndices[0]]}/10!

## 📊 Детальное сравнение
${comparisonDetails}

## 💡 Общие рекомендации
${occasionAnalysis.generalFeedback}

Все образы имеют свои достоинства. Выбирайте исходя из настроения и конкретной ситуации!

## 🎯 Итоговый рейтинг
${sortedIndices.map((index, position) => 
    `${position + 1}. ${colors[index]} образ - ${ratings[index]}/10`
).join('\n')}

💡 **Совет от МИШУРЫ**: ${occasionAnalysis.proTip} (ТЕСТОВЫЙ РЕЖИМ)

---
*Сравнение ${imageCount} образов*
*Время анализа: ${new Date().toLocaleString()}*
        `.trim();

        return {
            status: 'success',
            advice: advice,
            metadata: {
                timestamp: new Date().toISOString(),
                testMode: true,
                apiVersion: 'mock-v1.0.0',
                occasion: occasion,
                preferences: preferences,
                imagesCount: imageCount,
                ratings: ratings,
                bestImageIndex: sortedIndices[0],
                processingTime: `${Math.random() * 5 + 2}s`
            }
        };
    }

    /**
     * Получение специфичной информации для повода
     */
    getOccasionAnalysis(occasion) {
        const occasionLower = occasion.toLowerCase();
        
        if (occasionLower.includes('деловая') || occasionLower.includes('собеседование') || occasionLower.includes('работа')) {
            return {
                generalFeedback: 'Ваш деловой образ выглядит профессионально и уверенно. Отличный выбор для бизнес-среды!',
                colorAdvice: 'Выбранная цветовая гамма отлично подходит для делового стиля - строго, но не скучно.',
                styleAdvice: 'Силуэт подчеркивает профессионализм и создает впечатление компетентности.',
                recommendations: [
                    'Добавьте качественные аксессуары для завершения образа',
                    'Рассмотрите классическую обувь на небольшом каблуке',
                    'Дополните образ структурированной сумкой или портфелем'
                ],
                additionalTips: 'Помните: в деловой среде важна не только красота, но и уместность. Ваш образ должен говорить о профессионализме.',
                rating: Math.floor(Math.random() * 2) + 8, // 8-9
                proTip: 'Для деловых встреч лучше выбирать проверенные сочетания, чем экспериментировать'
            };
        }
        
        if (occasionLower.includes('свидание') || occasionLower.includes('романтик')) {
            return {
                generalFeedback: 'Романтичный и привлекательный образ! Вы точно произведете впечатление на свидании.',
                colorAdvice: 'Цвета создают нужное настроение - нежно и женственно, но не вызывающе.',
                styleAdvice: 'Силуэт подчеркивает достоинства фигуры и создает загадочность.',
                recommendations: [
                    'Добавьте деликатные украшения для романтичности',
                    'Выберите обувь, в которой будете чувствовать себя уверенно',
                    'Дополните образ небольшой изящной сумочкой'
                ],
                additionalTips: 'Главное на свидании - чувствовать себя комфортно и естественно. Красота идет изнутри!',
                rating: Math.floor(Math.random() * 2) + 8, // 8-9
                proTip: 'На свидании важнее быть собой, чем пытаться соответствовать чужим ожиданиям'
            };
        }
        
        if (occasionLower.includes('вечеринка') || occasionLower.includes('клуб') || occasionLower.includes('празд')) {
            return {
                generalFeedback: 'Яркий и запоминающийся образ для вечеринки! Вы точно будете в центре внимания.',
                colorAdvice: 'Смелая цветовая гамма отлично подходит для праздничного настроения.',
                styleAdvice: 'Динамичный силуэт позволит вам комфортно двигаться и танцевать.',
                recommendations: [
                    'Добавьте яркие аксессуары и украшения',
                    'Выберите удобную обувь для танцев',
                    'Дополните образ стильной сумочкой на длинной ручке'
                ],
                additionalTips: 'На вечеринке можно позволить себе больше экспериментов с цветом и стилем!',
                rating: Math.floor(Math.random() * 2) + 7, // 7-8
                proTip: 'Для вечеринок выбирайте вещи, которые хорошо переносят активное движение'
            };
        }
        
        // Дефолтный анализ
        return {
            generalFeedback: 'Гармоничный и стильный образ! Отлично подходит для выбранного повода.',
            colorAdvice: 'Цветовое решение создает приятное визуальное впечатление.',
            styleAdvice: 'Пропорции выбраны удачно и подчеркивают достоинства фигуры.',
            recommendations: [
                'Рассмотрите добавление акцентного аксессуара',
                'Обратите внимание на обувь - она должна гармонировать с общим стилем',
                'Дополните образ подходящей сумкой'
            ],
            additionalTips: 'Помните: лучший образ - тот, в котором вы чувствуете себя уверенно и комфортно.',
            rating: Math.floor(Math.random() * 2) + 7, // 7-8
            proTip: 'Экспериментируйте с разными стилями, чтобы найти свой уникальный образ'
        };
    }

    /**
     * Вспомогательные методы для генерации разнообразного контента
     */
    getRandomAdvantage() {
        const advantages = [
            'Отличное сочетание цветов',
            'Идеальная посадка по фигуре',
            'Стильный и современный вид',
            'Хорошие пропорции',
            'Качественные материалы',
            'Универсальность образа',
            'Элегантный силуэт',
            'Интересные детали'
        ];
        return advantages[Math.floor(Math.random() * advantages.length)];
    }

    getRandomDisadvantage() {
        const disadvantages = [
            'Можно добавить больше цвета',
            'Стиль немного консервативный',
            'Не хватает ярких акцентов',
            'Силуэт можно разнообразить',
            'Образ слегка однообразен',
            'Можно поэкспериментировать с текстурами',
            'Практически идеален',
            'Минимальные недочеты'
        ];
        return disadvantages[Math.floor(Math.random() * disadvantages.length)];
    }

    getRandomTip() {
        const tips = [
            'Добавьте яркий аксессуар',
            'Попробуйте другую обувь',
            'Рассмотрите контрастный пояс',
            'Дополните образ украшениями',
            'Поэкспериментируйте с прической',
            'Добавьте интересную сумку',
            'Попробуйте многослойность',
            'Уже отлично, менять не нужно'
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    }

    /**
     * Настройки поведения Mock API
     */
    setFailureRate(rate) {
        this.settings.failureRate = Math.max(0, Math.min(1, rate));
        this.log(`Частота ошибок установлена: ${(rate * 100).toFixed(1)}%`);
    }

    setDelay(min, max) {
        this.settings.minDelay = min;
        this.settings.maxDelay = max;
        this.log(`Задержка установлена: ${min}-${max}мс`);
    }

    setCustomResponse(type, occasion, response) {
        const key = `${type}_${occasion}`;
        this.settings.customResponses.set(key, response);
        this.log(`Кастомный ответ установлен для: ${key}`);
    }

    /**
     * Получение статистики
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Сброс статистики
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            lastRequestTime: null
        };
        this.log('Статистика сброшена');
    }

    /**
     * Проверка здоровья API (Mock)
     */
    async healthCheck() {
        this.log('🏥 Проверка здоровья Mock API');
        
        await this.simulateNetworkDelay();
        
        return {
            isHealthy: true,
            data: {
                status: 'healthy',
                service: 'МИШУРА Mock API',
                version: 'mock-v1.0.0',
                uptime: Date.now() - this.stats.lastRequestTime || 0,
                statistics: this.getStats()
            }
        };
    }
}

// === ЭКСПОРТ И ИНИЦИАЛИЗАЦИЯ ===

// Делаем класс доступным глобально
window.MockMishuraAPIService = MockMishuraAPIService;

// Создаем глобальный экземпляр для тестирования
window.mockAPI = new MockMishuraAPIService();

// Заменяем оригинальный API Service на Mock (только для тестирования)
if (typeof window.originalMishuraAPIService === 'undefined') {
    window.originalMishuraAPIService = window.MishuraAPIService;
}
window.MishuraAPIService = MockMishuraAPIService;

// === ТЕСТОВЫЕ УТИЛИТЫ ===

window.mockAPIUtils = {
    // Быстрые настройки
    enableErrors: (rate = 0.1) => window.mockAPI.setFailureRate(rate),
    disableErrors: () => window.mockAPI.setFailureRate(0),
    fastMode: () => window.mockAPI.setDelay(100, 500),
    slowMode: () => window.mockAPI.setDelay(3000, 8000),
    normalMode: () => window.mockAPI.setDelay(1000, 3000),
    
    // Кастомные ответы
    setCustom: (type, occasion, response) => window.mockAPI.setCustomResponse(type, occasion, response),
    
    // Статистика
    stats: () => window.mockAPI.getStats(),
    resetStats: () => window.mockAPI.resetStats(),
    
    // Восстановление оригинального API
    restore: () => {
        if (window.originalMishuraAPIService) {
            window.MishuraAPIService = window.originalMishuraAPIService;
            console.log('✅ Оригинальный API Service восстановлен');
        }
    }
};

console.log(`
🎭 === MOCK API ДЛЯ МИШУРЫ ГОТОВ ===

📋 ДОСТУПНЫЕ КОМАНДЫ:
• mockAPIUtils.enableErrors(0.1) - включить 10% ошибок
• mockAPIUtils.disableErrors() - отключить ошибки
• mockAPIUtils.fastMode() - быстрый режим
• mockAPIUtils.slowMode() - медленный режим
• mockAPIUtils.stats() - статистика
• mockAPIUtils.restore() - восстановить оригинальный API

🧪 ТЕСТИРОВАНИЕ:
• Все API запросы теперь обрабатываются Mock сервисом
• Генерируются реалистичные ответы для любых поводов
• Можно симулировать ошибки и задержки
• Статистика автоматически собирается

⚠️ ВАЖНО:
• Это только для тестирования!
• Используйте mockAPIUtils.restore() для возврата к реальному API
• Mock API не отправляет данные на сервер
`);

console.log('✅ Mock API для МИШУРЫ готов к использованию!');