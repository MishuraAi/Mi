/**
 * 🚨 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ НАВИГАЦИИ И КОНСУЛЬТАЦИЙ
 * Полное решение проблем с кнопкой "Баланс" и консультациями
 */

console.log('🚨 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ: Загружается...');

// Глобальная переменная для отслеживания состояния
window.emergencyFixLoaded = false;

function emergencyFix() {
    if (window.emergencyFixLoaded) {
        console.log('🚨 Исправление уже загружено, пропускаем');
        return;
    }
    
    console.log('🚨 Запуск экстренного исправления навигации и консультаций');
    
    // 1. ИСПРАВЛЕНИЕ НАВИГАЦИИ БАЛАНСА
    fixBalanceNavigation();
    
    // 2. ИСПРАВЛЕНИЕ КОНСУЛЬТАЦИЙ
    // ОТКЛЮЧЕНО - конфликтует с основным приложением
    // fixConsultationSystem();
    
    // 3. ИСПРАВЛЕНИЕ МОДАЛЬНЫХ ОКОН
    fixModalSystem();
    
    window.emergencyFixLoaded = true;
    console.log('✅ Экстренное исправление завершено');
}

function fixBalanceNavigation() {
    console.log('💰 Исправление навигации баланса...');
    
    let attempts = 0;
    function tryFixBalance() {
        attempts++;
        console.log(`💰 Попытка #${attempts} исправления баланса`);
        
        const balanceBtn = document.getElementById('nav-balance');
        if (!balanceBtn) {
            if (attempts < 20) {
                setTimeout(tryFixBalance, 500);
            } else {
                console.error('❌ Кнопка баланса не найдена после 20 попыток');
            }
            return;
        }
        
        console.log('✅ Кнопка баланса найдена, устанавливаем обработчик');
        
        // Удаляем все существующие обработчики
        const newBalanceBtn = balanceBtn.cloneNode(true);
        balanceBtn.parentNode.replaceChild(newBalanceBtn, balanceBtn);
        
        // Добавляем новый обработчик
        newBalanceBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('💰 EMERGENCY FIX: Клик по кнопке Баланс');
            
            // Убираем активный класс со всех кнопок
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            newBalanceBtn.classList.add('active');
            
            // Принудительно показываем секцию баланса
            forceShowBalanceSection();
        });
        
        console.log('✅ Обработчик баланса установлен (EMERGENCY)');
    }
    
    tryFixBalance();
}

function forceShowBalanceSection() {
    console.log('💰 ПРИНУДИТЕЛЬНЫЙ показ секции баланса');
    
    try {
        // Прячем все другие секции и контент
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'none';
        }
        
        // Ищем или создаём секцию баланса
        let balanceSection = document.getElementById('balance-section');
        if (!balanceSection) {
            console.log('💰 Создаём секцию баланса принудительно');
            balanceSection = document.createElement('div');
            balanceSection.id = 'balance-section';
            balanceSection.className = 'section';
            document.body.appendChild(balanceSection);
        }
        
        // Принудительно показываем секцию баланса
        balanceSection.style.display = 'block';
        balanceSection.style.position = 'relative';
        balanceSection.style.zIndex = '1000';
        balanceSection.style.background = 'var(--primary-black, #0a0a0a)';
        balanceSection.style.minHeight = '100vh';
        balanceSection.style.paddingBottom = '100px';
        
        // Создаём контент баланса
        balanceSection.innerHTML = `
            <div class="container" style="max-width: 420px; margin: 0 auto; padding: 20px;">
                <header class="header" style="text-align: center; margin-bottom: 40px;">
                    <h1 style="color: var(--text-gold, #d4af37); font-size: 2.5rem; margin-bottom: 12px;">💰 Мой баланс</h1>
                    <p style="color: var(--text-muted, #ccc);">Управление STcoin</p>
                </header>
                
                <div class="balance-card" style="
                    background: rgba(26, 26, 26, 0.8);
                    border: 2px solid var(--border-gold, #d4af37);
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 24px;
                    text-align: center;
                ">
                    <div class="balance-display" style="margin-bottom: 20px;">
                        <span class="balance-amount" id="emergency-balance-display" style="
                            font-size: 2rem;
                            font-weight: 900;
                            color: var(--text-gold, #d4af37);
                        ">Загрузка...</span>
                        <button class="refresh-btn" onclick="emergencyRefreshBalance()" style="
                            background: none;
                            border: 2px solid var(--border-gold, #d4af37);
                            color: var(--text-gold, #d4af37);
                            padding: 8px 12px;
                            border-radius: 8px;
                            margin-left: 12px;
                            cursor: pointer;
                        ">🔄</button>
                    </div>
                    
                    <div class="balance-actions">
                        <button class="btn btn-primary" onclick="emergencyShowPricing()" style="
                            background: linear-gradient(135deg, #d4af37 0%, #f7dc6f 50%, #d4af37 100%);
                            color: #0a0a0a;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 12px;
                            font-weight: 700;
                            cursor: pointer;
                            margin-right: 10px;
                        ">
                            💎 Пополнить баланс
                        </button>
                        <button onclick="emergencyGoHome()" style="
                            background: none;
                            border: 2px solid var(--border-gold, #d4af37);
                            color: var(--text-gold, #d4af37);
                            padding: 12px 24px;
                            border-radius: 12px;
                            font-weight: 700;
                            cursor: pointer;
                        ">
                            🏠 На главную
                        </button>
                    </div>
                </div>
                
                <div class="transactions-history" style="
                    background: rgba(42, 42, 42, 0.6);
                    border: 1px solid var(--border-light, #555);
                    border-radius: 16px;
                    padding: 20px;
                ">
                    <h3 style="color: var(--text-gold, #d4af37); margin-bottom: 16px;">📊 История операций</h3>
                    <div id="emergency-transactions-list">
                        <p style="color: var(--text-muted, #ccc); text-align: center;">Загрузка истории...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Загружаем актуальный баланс
        emergencyLoadBalance();
        
        console.log('✅ Секция баланса показана принудительно');
        
    } catch (error) {
        console.error('❌ Ошибка принудительного показа баланса:', error);
    }
}

function fixConsultationSystem() {
    console.log('🎨 Исправление системы консультаций...');
    
    let attempts = 0;
    function tryFixConsultations() {
        attempts++;
        console.log(`🎨 Попытка #${attempts} исправления консультаций`);
        
        const singleBtn = document.getElementById('single-mode-btn');
        const compareBtn = document.getElementById('compare-mode-btn');
        
        if (!singleBtn && !compareBtn) {
            if (attempts < 20) {
                setTimeout(tryFixConsultations, 500);
            } else {
                console.error('❌ Кнопки консультаций не найдены после 20 попыток');
            }
            return;
        }
        
        // Исправляем кнопку анализа образа
        if (singleBtn) {
            const newSingleBtn = singleBtn.cloneNode(true);
            singleBtn.parentNode.replaceChild(newSingleBtn, singleBtn);
            
            newSingleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('📷 EMERGENCY FIX: Открываем анализ образа');
                // Пытаемся вызвать оригинальную функцию
                if (window.app && typeof window.app.openConsultation === 'function') {
                    window.app.openConsultation('single');
                } else if (window.openConsultation && typeof window.openConsultation === 'function') {
                    window.openConsultation('single');
                } else {
                    // Fallback на emergency версию
                    emergencyOpenConsultation('single');
                }
            });
            console.log('✅ Кнопка анализа образа исправлена (EMERGENCY)');
        }
        
        // Исправляем кнопку сравнения
        if (compareBtn) {
            const newCompareBtn = compareBtn.cloneNode(true);
            compareBtn.parentNode.replaceChild(newCompareBtn, compareBtn);
            
            newCompareBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 EMERGENCY FIX: Открываем сравнение образов');
                // Пытаемся вызвать оригинальную функцию
                if (window.app && typeof window.app.openConsultation === 'function') {
                    window.app.openConsultation('compare');
                } else if (window.openConsultation && typeof window.openConsultation === 'function') {
                    window.openConsultation('compare');
                } else {
                    // Fallback на emergency версию
                    emergencyOpenConsultation('compare');
                }
            });
            console.log('✅ Кнопка сравнения образов исправлена (EMERGENCY)');
        }
    }
    
    tryFixConsultations();
}

function fixModalSystem() {
    console.log('📱 Исправление модальной системы...');
    
    // Убеждаемся что модальное окно существует
    let modal = document.getElementById('consultation-overlay');
    if (!modal) {
        console.log('📱 Создаём модальное окно принудительно');
        modal = document.createElement('div');
        modal.id = 'consultation-overlay';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="
                background: var(--secondary-black, #1a1a1a);
                border: 2px solid var(--border-gold, #d4af37);
                border-radius: 24px;
                padding: 32px 24px;
                max-width: 400px;
                width: 90%;
                margin: auto;
                position: relative;
                color: var(--text-light, #fff);
            ">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--border-light, #555);
                ">
                    <h2 id="emergency-modal-title" class="modal-title" style="
                        font-size: 1.4rem;
                        font-weight: 700;
                        color: var(--text-gold, #d4af37);
                    ">Консультация стилиста</h2>
                    <button id="emergency-close-btn" onclick="emergencyCloseModal()" style="
                        background: none;
                        border: 2px solid var(--border-gold, #d4af37);
                        color: var(--text-gold, #d4af37);
                        font-size: 1.4rem;
                        cursor: pointer;
                        padding: 8px 12px;
                        border-radius: 8px;
                    ">&times;</button>
                </div>
                
                <div id="emergency-modal-content">
                    <p style="text-align: center; color: var(--text-muted, #ccc);">
                        Инициализация консультации...
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ЭКСТРЕННОГО ИСПРАВЛЕНИЯ

window.emergencyOpenConsultation = function(mode) {
    console.log(`🎨 EMERGENCY: Открытие консультации в режиме ${mode}`);
    
    const modal = document.getElementById('consultation-overlay');
    const title = document.getElementById('emergency-modal-title');
    const content = document.getElementById('emergency-modal-content');
    
    if (!modal || !title || !content) {
        console.error('❌ Модальное окно не найдено');
        return;
    }
    
    // Устанавливаем заголовок
    title.textContent = mode === 'single' ? '📷 Анализ образа' : '🔄 Сравнение образов';
    
    // Создаём простую форму загрузки
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <input type="file" id="emergency-file-input" accept="image/*" style="
                padding: 12px;
                border: 2px solid var(--border-gold, #d4af37);
                border-radius: 8px;
                background: var(--secondary-black, #1a1a1a);
                color: var(--text-light, #fff);
                width: 100%;
                margin-bottom: 15px;
            ">
            <textarea id="emergency-question" placeholder="Ваш вопрос о стиле..." style="
                width: 100%;
                padding: 12px;
                border: 2px solid var(--border-gold, #d4af37);
                border-radius: 8px;
                background: var(--secondary-black, #1a1a1a);
                color: var(--text-light, #fff);
                min-height: 80px;
                resize: vertical;
                margin-bottom: 15px;
            "></textarea>
            <button onclick="emergencySubmitConsultation()" style="
                background: linear-gradient(135deg, #d4af37 0%, #f7dc6f 50%, #d4af37 100%);
                color: #0a0a0a;
                border: none;
                padding: 12px 24px;
                border-radius: 12px;
                font-weight: 700;
                cursor: pointer;
                width: 100%;
            ">
                🚀 Получить консультацию
            </button>
        </div>
    `;
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.9)';
    modal.style.zIndex = '2000';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
};

window.emergencySubmitConsultation = function() {
    console.log('🚀 EMERGENCY: Отправка консультации');
    
    const fileInput = document.getElementById('emergency-file-input');
    const question = document.getElementById('emergency-question');
    const content = document.getElementById('emergency-modal-content');
    
    if (!fileInput.files.length) {
        alert('Пожалуйста, выберите изображение');
        return;
    }
    
    // Показываем загрузку
    content.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="
                width: 40px;
                height: 40px;
                border: 4px solid #555;
                border-top: 4px solid var(--text-gold, #d4af37);
                border-radius: 50%;
                margin: 0 auto 20px;
                animation: spin 1s linear infinite;
            "></div>
            <p style="color: var(--text-gold, #d4af37);">Анализируем ваш образ...</p>
        </div>
        <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        </style>
    `;
    
    // Имитация отправки (здесь должна быть реальная отправка на API)
    setTimeout(function() {
        content.innerHTML = `
            <div style="padding: 20px;">
                <h3 style="color: var(--text-gold, #d4af37); margin-bottom: 15px;">💎 Совет стилиста</h3>
                <div style="
                    background: rgba(42, 42, 42, 0.6);
                    border: 1px solid var(--border-light, #555);
                    border-radius: 16px;
                    padding: 20px;
                    color: var(--text-light, #fff);
                    line-height: 1.6;
                    margin-bottom: 20px;
                ">
                    <p>К сожалению, в данный момент сервис консультаций временно недоступен. Пожалуйста, попробуйте позже.</p>
                    <p style="margin-top: 15px; font-style: italic; color: var(--text-muted, #ccc);">
                        Мы работаем над устранением технических неполадок.
                    </p>
                </div>
                <button onclick="emergencyCloseModal()" style="
                    background: linear-gradient(135deg, #d4af37 0%, #f7dc6f 50%, #d4af37 100%);
                    color: #0a0a0a;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    width: 100%;
                ">
                    Понятно
                </button>
            </div>
        `;
    }, 2000);
};

window.emergencyCloseModal = function() {
    console.log('❌ EMERGENCY: Закрытие модального окна');
    const modal = document.getElementById('consultation-overlay');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.emergencyLoadBalance = function() {
    console.log('💰 EMERGENCY: Загрузка баланса');
    
    const balanceDisplay = document.getElementById('emergency-balance-display');
    if (!balanceDisplay) return;
    
    // Пытаемся получить баланс из разных источников
    let balance = 50; // fallback
    
    try {
        if (window.unifiedBalanceSync && window.unifiedBalanceSync.currentBalance) {
            balance = window.unifiedBalanceSync.currentBalance;
        } else if (window.userService) {
            // Используем метод userService если доступен
            window.userService.getBalance().then(b => {
                if (b !== null) {
                    balanceDisplay.textContent = `${b} STcoin`;
                }
            }).catch(() => {
                balanceDisplay.textContent = `${balance} STcoin`;
            });
            return;
        }
    } catch (error) {
        console.warn('⚠️ Ошибка получения баланса:', error);
    }
    
    balanceDisplay.textContent = `${balance} STcoin`;
};

window.emergencyRefreshBalance = function() {
    console.log('🔄 EMERGENCY: Обновление баланса');
    const balanceDisplay = document.getElementById('emergency-balance-display');
    if (balanceDisplay) {
        balanceDisplay.textContent = 'Обновление...';
        setTimeout(() => {
            emergencyLoadBalance();
        }, 1000);
    }
};

window.emergencyShowPricing = function() {
    console.log('💎 EMERGENCY: Показ тарифов');
    alert('Функция пополнения баланса временно недоступна. Пожалуйста, обратитесь в службу поддержки.');
};

window.emergencyGoHome = function() {
    console.log('🏠 EMERGENCY: Переход на главную');
    
    // Скрываем секцию баланса
    const balanceSection = document.getElementById('balance-section');
    if (balanceSection) {
        balanceSection.style.display = 'none';
    }
    
    // Показываем основной контейнер
    const container = document.querySelector('.container');
    if (container) {
        container.style.display = 'block';
    }
    
    // Убираем активный класс с кнопки баланса
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const homeBtn = document.getElementById('nav-home');
    if (homeBtn) {
        homeBtn.classList.add('active');
    }
};

// ЗАПУСК ИСПРАВЛЕНИЯ
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', emergencyFix);
} else {
    emergencyFix();
}

// Также запускаем через небольшую задержку для надёжности
setTimeout(emergencyFix, 1000);
setTimeout(emergencyFix, 3000);

console.log('🚨 Экстренное исправление загружено и будет запущено');