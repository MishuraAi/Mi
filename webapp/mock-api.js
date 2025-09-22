// 🎭 РЕЗЕРВНЫЙ MOCK API ДЛЯ МИШУРЫ
// mock-api.js - Полная имитация API для демо-режима в продакшне
// Версия: 1.1.0 - Улучшенные ответы из тестирования

/**
 * Класс Mock API Service для демо-режима
 * Используется когда реальный API недоступен
 */
class MockMishuraAPIService {
    constructor() {
        // Используем same-origin базу для избежания CORS
        try {
            this.baseURL = `${window.location.origin}/api/v1`;
        } catch {
            this.baseURL = '/api/v1';
        }
        this.timeout = 90000; // 90 секунд как в патчах V2
        this.retryCount = 3;
        this.retryDelay = 1000;
        this.isMock = true; // Флаг для определения Mock API
        
        // Статистика для мониторинга
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            lastRequestTime: null,
            startTime: Date.now()
        };
        
        // Настройки поведения
        this.settings = {
            simulateDelay: true,
            minDelay: 1500,
            maxDelay: 4000,
            failureRate: 0.02, // 2% шанс ошибки для реалистичности
            customResponses: new Map()
        };
    }

    log(message, type = 'info') {
        // Удалено для оптимизации
    }

    /**
     * Симуляция задержки сети для реалистичности
     */
    async simulateNetworkDelay() {
        if (!this.settings.simulateDelay) return;
        
        const delay = Math.random() * (this.settings.maxDelay - this.settings.minDelay) + this.settings.minDelay;
        // this.log(`Симуляция задержки сети: ${Math.round(delay)}мс`); // удалено для оптимизации
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
        this.log(`📤 Демо-анализ для повода: "${occasion}"`);
        
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
            
            // Симуляция редких ошибок
            if (this.shouldSimulateFailure()) {
                throw new Error('Временная недоступность сервиса. Попробуйте позже.');
            }
            
            // Генерируем realistic ответ
            const response = this.generateSingleAnalysisResponse(occasion, preferences, imageFile);
            
            const responseTime = Date.now() - startTime;
            this.updateStats(true, responseTime);
            this.log(`✅ Демо-анализ завершен за ${responseTime}мс`, 'success');
            
            return response;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.updateStats(false, responseTime);
            this.log(`❌ Ошибка демо-анализа: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Сравнение нескольких изображений (Mock)
     */
    async analyzeCompare(imageFiles, occasion, preferences = '') {
        const startTime = Date.now();
        this.log(`📤 Демо-сравнение (${imageFiles.length} изображений) для повода: "${occasion}"`);
        
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
            const originalMin = this.settings.minDelay;
            const originalMax = this.settings.maxDelay;
            this.settings.minDelay = 2000;
            this.settings.maxDelay = 6000;
            
            await this.simulateNetworkDelay();
            
            // Восстанавливаем обычные задержки
            this.settings.minDelay = originalMin;
            this.settings.maxDelay = originalMax;
            
            // Симуляция редких ошибок
            if (this.shouldSimulateFailure()) {
                throw new Error('Временная недоступность сервиса сравнения. Попробуйте позже.');
            }
            
            // Генерируем realistic ответ
            const response = this.generateCompareAnalysisResponse(occasion, preferences, imageFiles);
            
            const responseTime = Date.now() - startTime;
            this.updateStats(true, responseTime);
            this.log(`✅ Демо-сравнение завершено за ${responseTime}мс`, 'success');
            
            return response;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.updateStats(false, responseTime);
            this.log(`❌ Ошибка демо-сравнения: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Генерация реалистичного ответа для анализа одного изображения
     */
    generateSingleAnalysisResponse(occasion, preferences, imageFile) {
        const occasionAnalysis = this.getOccasionAnalysis(occasion);
        const fileName = imageFile.name || 'image.jpg';
        const fileSize = this.formatFileSize(imageFile.size || 0);
        
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

💡 **Совет от МИШУРЫ**: ${occasionAnalysis.proTip}

---
*🔬 Демо-режим: показан пример анализа*
*Файл: ${fileName} (${fileSize})*
*Время анализа: ${new Date().toLocaleString()}*
        `.trim();

        return {
            status: 'success',
            advice: advice,
            metadata: {
                timestamp: new Date().toISOString(),
                demoMode: true,
                apiVersion: 'mock-v1.1.0',
                occasion: occasion,
                preferences: preferences,
                fileInfo: {
                    name: fileName,
                    size: fileSize,
                    type: imageFile.type || 'unknown'
                },
                processingTime: `${(Math.random() * 3 + 1).toFixed(1)}s`,
                rating: occasionAnalysis.rating
            }
        };
    }

    /**
     * Генерация реалистичного ответа для сравнения изображений
     */
    generateCompareAnalysisResponse(occasion, preferences, imageFiles) {
        const occasionAnalysis = this.getOccasionAnalysis(occasion);
        const imageCount = imageFiles.length;
        
        // Генерируем оценки для каждого образа (более реалистичные)
        const ratings = Array.from({length: imageCount}, () => 
            Math.floor(Math.random() * 4) + 6 // 6-9 для более реалистичности
        );
        
        const sortedIndices = ratings
            .map((rating, index) => ({rating, index}))
            .sort((a, b) => b.rating - a.rating)
            .map(item => item.index);
        
        const imageDescriptions = this.generateImageDescriptions(imageCount);
        
        let comparisonDetails = '';
        sortedIndices.forEach((imageIndex, position) => {
            const medal = position === 0 ? '🥇' : position === 1 ? '🥈' : position === 2 ? '🥉' : `${position + 1}️⃣`;
            const description = imageDescriptions[imageIndex];
            const rating = ratings[imageIndex];
            
            comparisonDetails += `
### ${medal} ${description} - Оценка: ${rating}/10
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
**Лучший образ для ${occasion}**: ${imageDescriptions[sortedIndices[0]]} выигрывает с оценкой ${ratings[sortedIndices[0]]}/10!

## 📊 Детальное сравнение
${comparisonDetails}

## 💡 Общие рекомендации для ${occasion}
${occasionAnalysis.generalFeedback}

Все образы имеют свои достоинства. Выбирайте исходя из настроения и конкретных обстоятельств!

## 🎯 Итоговый рейтинг
${sortedIndices.map((index, position) => 
    `${position + 1}. ${imageDescriptions[index]} - ${ratings[index]}/10`
).join('\n')}

💡 **Совет от МИШУРЫ**: ${occasionAnalysis.proTip}

---
*🔬 Демо-режим: показан пример сравнения*
*Сравнение ${imageCount} образов*
*Время анализа: ${new Date().toLocaleString()}*
        `.trim();

        return {
            status: 'success',
            advice: advice,
            metadata: {
                timestamp: new Date().toISOString(),
                demoMode: true,
                apiVersion: 'mock-v1.1.0',
                occasion: occasion,
                preferences: preferences,
                imagesCount: imageCount,
                ratings: ratings,
                bestImageIndex: sortedIndices[0],
                processingTime: `${(Math.random() * 5 + 2).toFixed(1)}s`
            }
        };
    }

    /**
     * Получение специфичной информации для повода
     */
    getOccasionAnalysis(occasion) {
        const occasionLower = occasion.toLowerCase();
        
        // Деловой стиль
        if (occasionLower.includes('деловая') || occasionLower.includes('собеседование') || 
            occasionLower.includes('работа') || occasionLower.includes('офис') ||
            occasionLower.includes('встреча') || occasionLower.includes('презентация')) {
            return {
                generalFeedback: 'Ваш деловой образ выглядает профессионально и уверенно. Отличный выбор для бизнес-среды, создающий впечатление компетентности и надежности.',
                colorAdvice: 'Выбранная цветовая гамма отлично подходит для делового стиля - строго, элегантно, но не скучно. Такие цвета внушают доверие.',
                styleAdvice: 'Силуэт подчеркивает профессионализм и создает впечатление компетентности. Пропорции выбраны удачно для деловой среды.',
                recommendations: [
                    'Добавьте качественные минималистичные аксессуары для завершения образа',
                    'Рассмотрите классическую обувь на небольшом каблуке или строгие лоферы',
                    'Дополните образ структурированной сумкой, портфелем или папкой для документов',
                    'Обратите внимание на аккуратную прическу и неяркий макияж'
                ],
                additionalTips: 'Помните: в деловой среде важна не только красота, но и уместность. Ваш образ должен говорить о профессионализме в первую очередь.',
                rating: Math.floor(Math.random() * 2) + 8, // 8-9
                proTip: 'Для деловых встреч лучше выбирать проверенные сочетания, чем экспериментировать с новыми трендами'
            };
        }
        
        // Романтический стиль
        if (occasionLower.includes('свидание') || occasionLower.includes('романтик') ||
            occasionLower.includes('ужин') || occasionLower.includes('прогулка')) {
            return {
                generalFeedback: 'Романтичный и привлекательный образ! Вы точно произведете впечатление и будете чувствовать себя уверенно на свидании.',
                colorAdvice: 'Цвета создают нужное настроение - нежно и женственно, но не вызывающе. Идеальный баланс между элегантностью и привлекательностью.',
                styleAdvice: 'Силуэт подчеркивает достоинства фигуры и создает легкую загадочность. Отличный выбор для романтического образа.',
                recommendations: [
                    'Добавьте деликатные украшения - тонкие цепочки, изящные серьги',
                    'Выберите обувь, в которой будете чувствовать себя уверенно при ходьбе',
                    'Дополните образ небольшой изящной сумочкой или клатчем',
                    'Рассмотрите легкий парфюм и естественный макияж'
                ],
                additionalTips: 'Главное на свидании - чувствовать себя комфортно и естественно. Красота идет изнутри, а образ должен подчеркивать вашу индивидуальность!',
                rating: Math.floor(Math.random() * 2) + 8, // 8-9
                proTip: 'На свидании важнее быть собой, чем пытаться соответствовать чужим ожиданиям'
            };
        }
        
        // Праздничный стиль
        if (occasionLower.includes('вечеринка') || occasionLower.includes('клуб') || 
            occasionLower.includes('празд') || occasionLower.includes('день рождения') ||
            occasionLower.includes('корпоратив') || occasionLower.includes('концерт')) {
            return {
                generalFeedback: 'Яркий и запоминающийся образ для вечеринки! Вы точно будете в центре внимания и сможете наслаждаться праздником.',
                colorAdvice: 'Смелая цветовая гамма отлично подходит для праздничного настроения. Такие цвета создают позитивную энергетику.',
                styleAdvice: 'Динамичный силуэт позволит вам комфортно двигаться, танцевать и активно участвовать в празднике.',
                recommendations: [
                    'Добавьте яркие statement аксессуары и блестящие украшения',
                    'Выберите удобную обувь для танцев или возьмите сменную пару',
                    'Дополните образ стильной сумочкой на длинной ручке для свободы движений',
                    'Рассмотрите яркий макияж и прическу, которая выдержит активный вечер'
                ],
                additionalTips: 'На вечеринке можно позволить себе больше экспериментов с цветом, блестками и стилем! Главное - чувствовать себя уверенно.',
                rating: Math.floor(Math.random() * 2) + 7, // 7-8
                proTip: 'Для вечеринок выбирайте вещи, которые хорошо переносят активное движение и не требуют постоянной коррекции'
            };
        }
        
        // Повседневный стиль
        if (occasionLower.includes('каждый день') || occasionLower.includes('прогулка') ||
            occasionLower.includes('шоппинг') || occasionLower.includes('университет') ||
            occasionLower.includes('casual') || occasionLower.includes('повседневный')) {
            return {
                generalFeedback: 'Комфортный и стильный повседневный образ! Отлично подходит для активного дня, совмещая практичность и красоту.',
                colorAdvice: 'Универсальная цветовая гамма, которая легко сочетается с разными аксессуарами и подходит для большинства ситуаций.',
                styleAdvice: 'Удобный силуэт обеспечивает свободу движений и комфорт в течение всего дня.',
                recommendations: [
                    'Добавьте практичные аксессуары - часы, удобную сумку, солнцезащитные очки',
                    'Выберите комфортную обувь для долгой ходьбы',
                    'Рассмотрите многослойность для адаптации к изменениям погоды',
                    'Дополните образ универсальными украшениями'
                ],
                additionalTips: 'Повседневный образ должен отражать вашу личность и обеспечивать комфорт. Экспериментируйте с деталями!',
                rating: Math.floor(Math.random() * 2) + 7, // 7-8
                proTip: 'Инвестируйте в качественную базовую одежду - она станет основой множества образов'
            };
        }
        
        // Дефолтный анализ для остальных поводов
        return {
            generalFeedback: 'Гармоничный и стильный образ! Отлично подходит для выбранного повода и создает приятное впечатление.',
            colorAdvice: 'Цветовое решение создает приятное визуальное впечатление и гармонично сочетается.',
            styleAdvice: 'Пропорции выбраны удачно и подчеркивают достоинства фигуры, создавая привлекательный силуэт.',
            recommendations: [
                'Рассмотрите добавление акцентного аксессуара для завершения образа',
                'Обратите внимание на обувь - она должна гармонировать с общим стилем',
                'Дополните образ подходящей сумкой или клатчем',
                'Подберите украшения, которые дополнят, но не перегрузят образ'
            ],
            additionalTips: 'Помните: лучший образ - тот, в котором вы чувствуете себя уверенно и комфортно. Доверяйте своему вкусу!',
            rating: Math.floor(Math.random() * 2) + 7, // 7-8
            proTip: 'Экспериментируйте с разными стилями, чтобы найти свой уникальный образ'
        };
    }

    /**
     * Генерация описаний изображений для сравнения
     */
    generateImageDescriptions(count) {
        const styles = [
            'Классический образ', 'Романтичный стиль', 'Спортивный лук', 'Элегантный наряд',
            'Casual образ', 'Деловой стиль', 'Богемный look', 'Минималистичный образ',
            'Винтажный стиль', 'Современный look', 'Творческий образ', 'Утонченный стиль'
        ];
        
        const colors = [
            'Синий', 'Красный', 'Белый', 'Черный', 'Зеленый', 'Серый',
            'Бежевый', 'Розовый', 'Фиолетовый', 'Коричневый'
        ];
        
        const descriptions = [];
        const usedStyles = new Set();
        const usedColors = new Set();
        
        for (let i = 0; i < count; i++) {
            let style, color;
            
            // Выбираем уникальные стили и цвета
            do {
                style = styles[Math.floor(Math.random() * styles.length)];
            } while (usedStyles.has(style) && usedStyles.size < styles.length);
            
            do {
                color = colors[Math.floor(Math.random() * colors.length)];
            } while (usedColors.has(color) && usedColors.size < colors.length);
            
            usedStyles.add(style);
            usedColors.add(color);
            
            // Иногда используем только цвет, иногда только стиль, иногда оба
            const descriptionType = Math.random();
            if (descriptionType < 0.4) {
                descriptions.push(`${color} образ`);
            } else if (descriptionType < 0.7) {
                descriptions.push(style);
            } else {
                descriptions.push(`${color.toLowerCase()} ${style.toLowerCase()}`);
            }
        }
        
        return descriptions;
    }

    /**
     * Вспомогательные методы для генерации разнообразного контента
     */
    getRandomAdvantage() {
        const advantages = [
            'Отличное сочетание цветов и пропорций',
            'Идеальная посадка по фигуре',
            'Стильный и современный внешний вид',
            'Хорошие пропорции и баланс элементов',
            'Качественные материалы и крой',
            'Универсальность и практичность',
            'Элегантный и утонченный силуэт',
            'Интересные детали и акценты',
            'Гармоничная цветовая палитра',
            'Соответствие актуальным трендам',
            'Подчеркивает достоинства фигуры',
            'Создает уверенный образ'
        ];
        return advantages[Math.floor(Math.random() * advantages.length)];
    }

    getRandomDisadvantage() {
        const disadvantages = [
            'Можно добавить больше ярких акцентов',
            'Стиль слегка консервативный',
            'Не хватает контрастных элементов',
            'Силуэт можно немного разнообразить',
            'Образ выглядит слегка однообразно',
            'Можно поэкспериментировать с текстурами',
            'Практически идеальный образ',
            'Минимальные стилистические недочеты',
            'Можно добавить интересную деталь',
            'Слегка не хватает индивидуальности',
            'Образ немного предсказуем',
            'Хороший, но можно добавить креативности'
        ];
        return disadvantages[Math.floor(Math.random() * disadvantages.length)];
    }

    getRandomTip() {
        const tips = [
            'Добавьте яркий аксессуар для завершения образа',
            'Попробуйте другую обувь для разнообразия',
            'Рассмотрите контрастный пояс или шарф',
            'Дополните образ интересными украшениями',
            'Поэкспериментируйте с прической и макияжем',
            'Добавьте стильную сумку или клатч',
            'Попробуйте технику многослойности',
            'Образ уже отличный, менять ничего не нужно',
            'Добавьте часы или браслет',
            'Рассмотрите яркую помаду для акцента',
            'Попробуйте интересную брошь или значок',
            'Дополните образ стильными очками'
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    }

    /**
     * Форматирование размера файла
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Получение статистики
     */
    getStats() {
        return { 
            ...this.stats,
            uptime: Date.now() - this.stats.startTime,
            successRate: this.stats.totalRequests > 0 ? 
                (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(1) + '%' : '0%'
        };
    }

    /**
     * Проверка здоровья API (Mock)
     */
    async healthCheck() {
        this.log('🏥 Проверка здоровья резервного API');
        
        await this.simulateNetworkDelay();
        
        return {
            isHealthy: true,
            data: {
                status: 'healthy',
                service: 'МИШУРА Mock API',
                version: 'mock-v1.1.0',
                mode: 'demo',
                uptime: Date.now() - this.stats.startTime,
                statistics: this.getStats()
            }
        };
    }
}

// === ЭКСПОРТ И АВТОМАТИЧЕСКАЯ АКТИВАЦИЯ ===

// Создаем экземпляр резервного API
window.MockMishuraAPIService = MockMishuraAPIService;
window.mockAPIInstance = new MockMishuraAPIService();

// Функция для автоматической активации резервного режима
window.activateMockAPI = function() {
    if (typeof window.originalMishuraAPIService === 'undefined') {
        window.originalMishuraAPIService = window.MishuraAPIService;
    }
    window.MishuraAPIService = MockMishuraAPIService;
    // this.log('🎭 Резервный Mock API активирован'); // удалено для оптимизации
    
    // Показываем уведомление пользователю
    if (typeof window.showNotification === 'function') {
        window.showNotification('🔬 Демо-режим активирован', 'info');
    }
};

// Функция для восстановления оригинального API
window.restoreOriginalAPI = function() {
    if (window.originalMishuraAPIService) {
        window.MishuraAPIService = window.originalMishuraAPIService;
        // this.log('✅ Оригинальный API восстановлен'); // удалено для оптимизации
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('✅ Основной API восстановлен', 'success');
        }
    }
};

// Мост: гарантируем наличие MishuraApp.api для потребителей (consultation.js)
(function ensureApiBridge(){
    try {
        window.MishuraApp = window.MishuraApp || {};
        if (!window.MishuraApp.api) {
            const ApiClass = window.MishuraAPIService || window.MockMishuraAPIService;
            if (ApiClass) {
                const apiInstance = new ApiClass();
                window.mishuraApiService = apiInstance;
                window.MishuraApp.api = {
                    analyzeImage: async (file, { occasion, preferences }) => {
                        const userId = (window.userService && window.userService.getCurrentUserId && window.userService.getCurrentUserId()) || null;
                        if (typeof apiInstance.analyzeSingle === 'function') {
                            return await apiInstance.analyzeSingle(file, occasion, preferences, userId);
                        }
                        throw new Error('API клиент не инициализирован');
                    },
                    compareImages: async (files, { occasion, preferences }) => {
                        const userId = (window.userService && window.userService.getCurrentUserId && window.userService.getCurrentUserId()) || null;
                        if (typeof apiInstance.analyzeCompare === 'function') {
                            return await apiInstance.analyzeCompare(files, occasion, preferences, userId);
                        }
                        throw new Error('API клиент не инициализирован');
                    }
                };
                console.log('✅ API bridge для MishuraApp.api создан');
            }
        }
    } catch (e) {
        console.warn('⚠️ Не удалось создать API bridge:', e);
    }
})();

// this.log('✅ Резервный Mock API для МИШУРЫ готов к использованию!'); // удалено для оптимизации