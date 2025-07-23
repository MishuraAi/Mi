/**
 * 🧠 УМНОЕ ИСПРАВЛЕНИЕ НАВИГАЦИИ
 * Исправляет только кнопку баланса, не трогая основные функции
 */

console.log('🧠 Умное исправление навигации загружается...');

(function() {
    'use strict';
    
    let balanceFixApplied = false;
    
    function smartFixBalance() {
        if (balanceFixApplied) return;
        
        console.log('🧠 Применяем умное исправление для кнопки баланса');
        
        const balanceBtn = document.getElementById('nav-balance');
        if (!balanceBtn) {
            console.warn('⚠️ Кнопка баланса не найдена, повторим попытку');
            setTimeout(smartFixBalance, 500);
            return;
        }
        
        // Сохраняем оригинальные обработчики
        const originalOnClick = balanceBtn.onclick;
        const originalListeners = balanceBtn._eventListeners;
        
        // Добавляем новый обработчик БЕЗ удаления старых
        balanceBtn.addEventListener('click', function(e) {
            console.log('💰 Smart Fix: Клик по кнопке баланса');
            
            // Пытаемся использовать оригинальные методы
            if (window.app && typeof window.app.showBalanceSection === 'function') {
                console.log('✅ Используем app.showBalanceSection()');
                window.app.showBalanceSection();
            } else if (window.MishuraApp?.components?.navigation?.showBalanceSection) {
                console.log('✅ Используем MishuraApp.components.navigation.showBalanceSection()');
                window.MishuraApp.components.navigation.showBalanceSection();
            } else {
                console.log('⚠️ Используем fallback метод');
                smartShowBalance();
            }
        }, true); // Используем capture phase для приоритета
        
        balanceFixApplied = true;
        console.log('✅ Умное исправление баланса применено');
    }
    
    function smartShowBalance() {
        console.log('💰 Smart показ баланса (fallback)');
        
        // Скрываем основной контейнер
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'none';
        }
        
        // Показываем секцию баланса
        let balanceSection = document.getElementById('balance-section');
        if (balanceSection) {
            balanceSection.style.display = 'block';
            
            // Обновляем баланс если есть методы
            if (window.app?.refreshBalance) {
                window.app.refreshBalance();
            }
            
            // Загружаем транзакции если есть методы
            if (window.MishuraApp?.components?.navigation?.loadTransactionHistory) {
                window.MishuraApp.components.navigation.loadTransactionHistory();
            }
        } else {
            console.warn('⚠️ Секция баланса не найдена');
        }
        
        // Обновляем активную кнопку
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const balanceBtn = document.getElementById('nav-balance');
        if (balanceBtn) {
            balanceBtn.classList.add('active');
        }
    }
    
    // Запуск при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', smartFixBalance);
    } else {
        smartFixBalance();
    }
    
    // Дополнительная попытка через секунду
    setTimeout(smartFixBalance, 1000);
    
    // Экспортируем для глобального доступа
    window.smartNavFix = {
        fixBalance: smartFixBalance,
        showBalance: smartShowBalance,
        isFixed: () => balanceFixApplied
    };
    
})();

console.log('🧠 Умное исправление навигации загружено');