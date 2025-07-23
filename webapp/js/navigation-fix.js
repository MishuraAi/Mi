/**
 * 🔧 ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ - НАВИГАЦИЯ БАЛАНСА
 * Исправляет проблему с кнопкой "Баланс" которая не работает
 */

console.log('🔧 Загружается исправление навигации баланса...');

// Дожидаемся загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBalanceNavFix);
} else {
    initBalanceNavFix();
}

function initBalanceNavFix() {
    console.log('🔧 Инициализация исправления навигации баланса');
    
    // Пытаемся несколько раз найти кнопку (на случай если она загружается асинхронно)
    let attempts = 0;
    const maxAttempts = 10;
    
    function trySetupNavigation() {
        attempts++;
        console.log(`🔧 Попытка #${attempts} настройки навигации баланса`);
        
        const balanceBtn = document.getElementById('nav-balance');
        const homeBtn = document.getElementById('nav-home');
        const historyBtn = document.getElementById('nav-history');
        
        if (balanceBtn) {
            console.log('✅ Кнопка баланса найдена, добавляем обработчик');
            
            // Удаляем старые обработчики
            const newBalanceBtn = balanceBtn.cloneNode(true);
            balanceBtn.parentNode.replaceChild(newBalanceBtn, balanceBtn);
            
            // Добавляем новый обработчик
            newBalanceBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('💰 Клик по кнопке Баланс');
                
                // Убираем активный класс со всех кнопок
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Добавляем активный класс на кнопку баланса
                newBalanceBtn.classList.add('active');
                
                // Показываем секцию баланса
                showBalanceSection();
            });
            
            console.log('✅ Обработчик для кнопки Баланс установлен');
        } else if (attempts < maxAttempts) {
            // Если кнопка не найдена, пробуем еще раз через 500мс
            console.log('⏳ Кнопка баланса не найдена, повторяем через 500мс');
            setTimeout(trySetupNavigation, 500);
            return;
        } else {
            console.error('❌ Не удалось найти кнопку баланса после 10 попыток');
            return;
        }
        
        // Настройка других кнопок навигации для консистентности
        if (homeBtn) {
            const newHomeBtn = homeBtn.cloneNode(true);
            homeBtn.parentNode.replaceChild(newHomeBtn, homeBtn);
            
            newHomeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🏠 Клик по кнопке Главная');
                
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                newHomeBtn.classList.add('active');
                
                showHomeSection();
            });
        }
        
        if (historyBtn) {
            const newHistoryBtn = historyBtn.cloneNode(true);
            historyBtn.parentNode.replaceChild(newHistoryBtn, historyBtn);
            
            newHistoryBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('📚 Клик по кнопке История');
                
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                newHistoryBtn.classList.add('active');
                
                showHistorySection();
            });
        }
    }
    
    // Запускаем настройку навигации
    trySetupNavigation();
}

function showBalanceSection() {
    console.log('💰 Показ секции баланса');
    
    try {
        // Скрываем другие секции
        hideAllSections();
        
        // Показываем секцию баланса
        const balanceSection = document.getElementById('balance-section');
        if (balanceSection) {
            balanceSection.style.display = 'block';
            console.log('✅ Секция баланса показана');
            
            // Обновляем баланс
            if (window.app && typeof window.app.refreshBalance === 'function') {
                console.log('🔄 Обновляем баланс через window.app');
                window.app.refreshBalance();
            } else if (window.unifiedBalanceSync && typeof window.unifiedBalanceSync.forceSyncBalance === 'function') {
                console.log('🔄 Обновляем баланс через unifiedBalanceSync');
                window.unifiedBalanceSync.forceSyncBalance();
            }
            
            // Загружаем историю транзакций
            if (window.MishuraApp?.components?.navigation?.loadTransactionHistory) {
                console.log('📊 Загружаем историю транзакций');
                window.MishuraApp.components.navigation.loadTransactionHistory();
            }
            
        } else {
            console.error('❌ Секция баланса не найдена в DOM');
            
            // Попробуем создать секцию баланса динамически
            createBalanceSection();
        }
        
    } catch (error) {
        console.error('❌ Ошибка показа секции баланса:', error);
    }
}

function showHomeSection() {
    console.log('🏠 Показ домашней секции');
    hideAllSections();
    
    // Восстанавливаем основной контент
    const container = document.querySelector('.container');
    if (container && !container.querySelector('.action-buttons')) {
        container.innerHTML = `
            <header class="header">
                <h1>✨ МИШУРА</h1>
                <p>Твой личный стилист</p>
            </header>

            <div class="action-buttons">
                <button id="single-mode-btn" class="action-btn">
                    <span class="icon">📷</span>
                    Анализ образа
                </button>
                <button id="compare-mode-btn" class="action-btn">
                    <span class="icon">🔄</span>
                    Сравнение образов
                </button>
            </div>
        `;
        
        // Переинициализируем кнопки режимов
        if (window.app && typeof window.app.fixModeButtons === 'function') {
            window.app.fixModeButtons();
        }
    }
}

function showHistorySection() {
    console.log('📚 Показ секции истории');
    hideAllSections();
    
    // Простая заглушка для истории
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <header class="header">
                <h1>📚 История</h1>
                <p>Ваши консультации</p>
            </header>
            <div style="padding: 20px; text-align: center; color: var(--text-muted);">
                <p>История консультаций будет доступна в ближайшее время</p>
            </div>
        `;
    }
}

function hideAllSections() {
    console.log('🙈 Скрываем все секции');
    
    // Скрываем секцию баланса
    const balanceSection = document.getElementById('balance-section');
    if (balanceSection) {
        balanceSection.style.display = 'none';
    }
    
    // Можно добавить другие секции при необходимости
}

function createBalanceSection() {
    console.log('🔧 Создание секции баланса динамически');
    
    // Создаем секцию баланса если её нет
    let balanceSection = document.getElementById('balance-section');
    if (!balanceSection) {
        balanceSection = document.createElement('div');
        balanceSection.id = 'balance-section';
        balanceSection.className = 'section';
        balanceSection.style.display = 'none';
        
        balanceSection.innerHTML = `
            <div class="container">
                <h2>💰 Мой баланс</h2>
                
                <div class="balance-card" style="
                    background: rgba(26, 26, 26, 0.8);
                    border: 2px solid var(--border-gold);
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 24px;
                    text-align: center;
                ">
                    <div class="balance-display" style="margin-bottom: 20px;">
                        <span class="balance-amount" id="balance-display-main" style="
                            font-size: 2rem;
                            font-weight: 900;
                            color: var(--text-gold);
                        ">50 STcoin</span>
                        <button class="refresh-btn" onclick="refreshBalance()" style="
                            background: none;
                            border: 2px solid var(--border-gold);
                            color: var(--text-gold);
                            padding: 8px 12px;
                            border-radius: 8px;
                            margin-left: 12px;
                            cursor: pointer;
                            transition: var(--transition);
                        ">🔄</button>
                    </div>
                    
                    <div class="balance-actions">
                        <button class="btn btn-primary" onclick="showPricingModal()" style="
                            background: var(--gold-gradient);
                            color: var(--text-dark);
                            border: none;
                            padding: 12px 24px;
                            border-radius: 12px;
                            font-weight: 700;
                            cursor: pointer;
                            transition: var(--transition);
                        ">
                            💎 Пополнить баланс
                        </button>
                    </div>
                </div>
                
                <div class="transactions-history" id="transactions-container" style="
                    background: rgba(42, 42, 42, 0.6);
                    border: 1px solid var(--border-light);
                    border-radius: 16px;
                    padding: 20px;
                ">
                    <h3 style="color: var(--text-gold); margin-bottom: 16px;">📊 История операций</h3>
                    <div id="transactions-list">
                        <p style="color: var(--text-muted); text-align: center;">Загрузка истории...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(balanceSection);
        console.log('✅ Секция баланса создана динамически');
    }
    
    // Показываем созданную секцию
    balanceSection.style.display = 'block';
}

// Глобальные функции для использования в HTML
window.refreshBalance = function() {
    console.log('🔄 Обновление баланса...');
    if (window.unifiedBalanceSync && typeof window.unifiedBalanceSync.forceSyncBalance === 'function') {
        window.unifiedBalanceSync.forceSyncBalance().then(balance => {
            const balanceDisplay = document.getElementById('balance-display-main');
            if (balanceDisplay) {
                balanceDisplay.textContent = `${balance} STcoin`;
            }
        });
    }
};

window.showPricingModal = function() {
    console.log('💎 Показ модального окна тарифов');
    if (window.displayPricingPlans) {
        window.displayPricingPlans();
    }
    const pricingModal = document.getElementById('pricing-modal');
    if (pricingModal) {
        pricingModal.classList.add('active');
    }
};

console.log('✅ Исправление навигации баланса загружено');