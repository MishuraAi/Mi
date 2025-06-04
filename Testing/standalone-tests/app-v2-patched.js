// 🎭 МИШУРА - Luxury ИИ Стилист
// app-v2-patched.js - Новая версия с патчами V2 для тестирования
// Версия: 2.0.0 - Все критические исправления применены

console.log('🎭 МИШУРА App загружается с патчами V2...');

class MishuraApp {
    constructor() {
        console.log('🚀 Инициализация MishuraApp с патчами V2...');
        
        // Состояние приложения
        this.currentMode = null; // 'single' или 'compare'
        this.currentSection = 'home'; // 'home', 'history', 'balance'
        this.compareImages = [null, null, null, null];
        this.singleImage = null;
        this.isLoading = false;
        this.lastAnalysisResult = null;
        
        // ПАТЧ V2: Увеличен timeout до 90 секунд
        this.requestTimeout = 90000; // 90 секунд вместо 30
        
        // ПАТЧ V2: Предотвращение бесконечных циклов
        this.eventListenersAttached = false;
        this.initializationComplete = false;
        
        // Пользовательские данные
        this.userBalance = 100;
        this.consultationsHistory = [];
        this.consultationsUsed = 0;
        
        // ПАТЧ V2: Исправленная инициализация API с правильным контекстом
        this.api = null;
        this.initializeAPI();
        
        // Варианты поводов
        this.occasionOptions = [
            '💼 Деловая встреча',
            '❤️ Свидание', 
            '🚶 Повседневная прогулка',
            '🎉 Вечеринка',
            '👔 Собеседование',
            '🍽️ Ужин в ресторане',
            '🎭 Театр/концерт',
            '🏋️ Спортзал/тренировка',
            '🛍️ Шоппинг',
            '✈️ Путешествие',
            '🎓 Учеба/университет',
            '🏠 Дома/отдых',
            '🌞 Пляж/отпуск',
            '❄️ Зимняя прогулка',
            '🌧️ Дождливая погода',
            '🎪 Мероприятие на свежем воздухе'
        ];
        
        // Аналитика
        this.analytics = {
            appStartTime: Date.now(),
            analysisRequested: 0,
            successfulAnalysis: 0,
            errors: 0
        };
        
        // ПАТЧ V2: Отложенная инициализация для предотвращения race condition
        this.init = this.init.bind(this);
        setTimeout(() => this.init(), 100);
    }

    // ПАТЧ V2: Исправленная инициализация API
    initializeAPI() {
        try {
            if (window.MishuraAPIService) {
                this.api = new window.MishuraAPIService();
                console.log('✅ API экземпляр создан:', this.api);
            } else if (window.mishuraAPI) {
                this.api = window.mishuraAPI;
                console.log('✅ API клиент подключен:', this.api);
            } else {
                console.warn('⚠️ API клиент не найден, будет повторная попытка...');
                // ПАТЧ V2: Повторная попытка через 1 секунду
                setTimeout(() => {
                    this.initializeAPI();
                }, 1000);
            }
        } catch (error) {
            console.error('❌ Ошибка инициализации API:', error);
            this.api = null;
        }
    }

    // 🎯 ПАТЧ V2: Исправленная инициализация без циклов
    init() {
        if (this.initializationComplete) {
            console.log('⚠️ Инициализация уже завершена, пропускаем');
            return;
        }

        try {
            console.log('🎯 Начало безопасной инициализации...');
            
            // Основные обработчики с защитой от дублирования
            this.setupModeButtons();
            this.setupCloseButtons();
            this.setupSubmitButton();
            this.initUploaders();
            this.setupNavigation();
            
            // Дополнительные функции
            this.setupKeyboardShortcuts();
            this.setupDragAndDrop();
            this.setupContextMenu();
            this.setupOccasionDropdown();
            
            // Загружаем данные пользователя
            this.loadUserData();
            
            // Telegram интеграция
            this.setupTelegramIntegration();
            
            this.initializationComplete = true;
            console.log('✅ MishuraApp инициализирован с патчами V2');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }

    // ПАТЧ V2: Нормализация ответов API в единый формат
    normalizeAPIResponse(response) {
        console.log('🔄 Нормализация ответа API:', response);
        
        // Если ответ уже в правильном формате
        if (response && typeof response === 'object' && response.advice) {
            return {
                advice: response.advice,
                metadata: response.metadata || {
                    timestamp: new Date().toISOString(),
                    status: response.status || 'success'
                }
            };
        }
        
        // Если ответ - строка
        if (typeof response === 'string') {
            return {
                advice: response,
                metadata: {
                    timestamp: new Date().toISOString(),
                    status: 'success',
                    source: 'string_response'
                }
            };
        }
        
        // Если ответ содержит message вместо advice
        if (response && response.message) {
            return {
                advice: response.message,
                metadata: {
                    timestamp: new Date().toISOString(),
                    status: response.status || 'success',
                    source: 'message_field'
                }
            };
        }
        
        // Если ответ содержит другие поля с контентом
        if (response && typeof response === 'object') {
            const contentFields = ['text', 'content', 'result', 'analysis'];
            for (const field of contentFields) {
                if (response[field]) {
                    return {
                        advice: response[field],
                        metadata: {
                            timestamp: new Date().toISOString(),
                            status: response.status || 'success',
                            source: field
                        }
                    };
                }
            }
        }
        
        // Fallback
        return {
            advice: 'Анализ получен, но формат ответа неожиданный. Попробуйте еще раз.',
            metadata: {
                timestamp: new Date().toISOString(),
                status: 'warning',
                source: 'fallback'
            }
        };
    }

    // ПАТЧ V2: Новый метод парсинга markdown структуры
    parseMarkdownStructure(text) {
        if (!text) return '';
        
        console.log('📋 Парсинг markdown структуры...');
        
        // Обрабатываем заголовки разных уровней
        text = text.replace(/^### (.*$)/gm, '<h4>$1</h4>');
        text = text.replace(/^## (.*$)/gm, '<h3>$1</h3>');
        text = text.replace(/^# (.*$)/gm, '<h2>$1</h2>');
        
        // Обрабатываем заголовки с **Заголовок:**
        text = text.replace(/\*\*(.*?):\*\*/g, '<h4>$1</h4>');
        
        // Обрабатываем жирный текст
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Обрабатываем курсив
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Обрабатываем списки
        text = text.replace(/^- (.*$)/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        
        // Обрабатываем абзацы
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        let formattedText = '';
        
        paragraphs.forEach(paragraph => {
            paragraph = paragraph.trim();
            if (paragraph) {
                // Если это уже HTML тег, не оборачиваем в <p>
                if (paragraph.startsWith('<h') || paragraph.startsWith('<ul') || paragraph.startsWith('<div')) {
                    formattedText += paragraph;
                } else {
                    formattedText += `<p>${paragraph}</p>`;
                }
            }
        });
        
        console.log('✅ Markdown структура обработана');
        return formattedText;
    }

    // ПАТЧ V2: Полностью переписанный метод submitSingle с улучшенной обработкой
    async submitSingle(occasion, preferences) {
        console.log('🚀 Single submit начался с патчами V2');
        
        if (!this.singleImage) {
            this.showNotification('Загрузите изображение', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        // Проверяем API
        if (!this.api) {
            this.showNotification('❌ API не подключен', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        this.showLoading();
        this.triggerHapticFeedback('medium');
        
        // ПАТЧ V2: Создаем promise с увеличенным timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Превышено время ожидания (${this.requestTimeout / 1000} сек)`));
            }, this.requestTimeout);
        });
        
        try {
            console.log('📡 Отправляем запрос к API с timeout 90 сек...');
            console.log('🔍 Используем метод: analyzeSingle');
            
            // ПАТЧ V2: Race между API запросом и timeout
            const apiPromise = this.api.analyzeSingle(this.singleImage, occasion, preferences);
            const result = await Promise.race([apiPromise, timeoutPromise]);
            
            console.log('✅ Single результат получен:', result);
            
            // ПАТЧ V2: Валидация ответа перед обработкой
            if (!result) {
                throw new Error('Пустой ответ от API');
            }
            
            this.lastAnalysisResult = result;
            this.analytics.successfulAnalysis++;
            this.showResult(result);
            this.triggerHapticFeedback('success');
            
        } catch (error) {
            console.error('❌ Single ошибка:', error);
            this.analytics.errors++;
            
            // ПАТЧ V2: Улучшенная обработка различных типов ошибок
            let errorMessage = 'Ошибка анализа';
            
            if (error.message.includes('timeout') || error.message.includes('Превышено время')) {
                errorMessage = 'Анализ занимает больше времени чем обычно. Попробуйте еще раз.';
            } else if (error.message.includes('сети') || error.message.includes('network')) {
                errorMessage = 'Проблемы с сетью. Проверьте подключение к интернету.';
            } else if (error.message.includes('API')) {
                errorMessage = 'Сервис временно недоступен. Попробуйте через несколько минут.';
            } else {
                errorMessage = `Ошибка анализа: ${error.message}`;
            }
            
            this.showError(errorMessage);
            this.triggerHapticFeedback('error');
        }
    }

    // ПАТЧ V2: Метод для получения аналитики и отладочной информации
    getAnalytics() {
        return {
            ...this.analytics,
            sessionDuration: Date.now() - this.analytics.appStartTime,
            userBalance: this.userBalance,
            consultationsHistory: this.consultationsHistory.length,
            currentMode: this.currentMode,
            currentSection: this.currentSection,
            apiConnected: !!this.api,
            initializationComplete: this.initializationComplete
        };
    }

    // ПАТЧ V2: Метод для диагностики состояния приложения
    diagnostics() {
        console.log('🔍 ДИАГНОСТИКА MISHURA APP:');
        console.log('📊 Аналитика:', this.getAnalytics());
        console.log('🔧 API статус:', this.api ? 'Подключен' : 'Не подключен');
        console.log('🖼️ Изображения:', {
            single: !!this.singleImage,
            compare: this.compareImages.filter(img => img !== null).length
        });
        console.log('💰 Пользователь:', {
            balance: this.userBalance,
            used: this.consultationsUsed,
            history: this.consultationsHistory.length
        });
    }

    // Заглушки для других методов (добавьте полный код из артефакта)
    setupModeButtons() { /* код из артефакта */ }
    setupNavigation() { /* код из артефакта */ }
    setupCloseButtons() { /* код из артефакта */ }
    setupSubmitButton() { /* код из артефакта */ }
    initUploaders() { /* код из артефакта */ }
    setupKeyboardShortcuts() { /* код из артефакта */ }
    setupDragAndDrop() { /* код из артефакта */ }
    setupContextMenu() { /* код из артефакта */ }
    setupOccasionDropdown() { /* код из артефакта */ }
    loadUserData() { /* код из артефакта */ }
    setupTelegramIntegration() { /* код из артефакта */ }
    showNotification() { /* код из артефакта */ }
    triggerHapticFeedback() { /* код из артефакта */ }
    showLoading() { /* код из артефакта */ }
    showResult() { /* код из артефакта */ }
    showError() { /* код из артефакта */ }
    // ... и все остальные методы
}

// ЭКСПОРТ ДЛЯ ИСПОЛЬЗОВАНИЯ
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MishuraApp;
} else {
    window.MishuraApp = MishuraApp;
}

console.log('✅ MishuraApp класс с патчами V2 загружен');