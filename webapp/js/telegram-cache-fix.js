// 🔄 ПРИНУДИТЕЛЬНАЯ ОЧИСТКА КЭША TELEGRAM

// Создайте файл webapp/js/telegram-cache-fix.js

(function() {
    'use strict';
    
    console.log('🔄 Запуск принудительной очистки кэша Telegram');
    
    // Функция агрессивной очистки кэша
    function aggressiveCacheClear() {
        try {
            // 1. Очистка localStorage
            const keysToRemove = [
                'user_balance', 'balance_timestamp', 'last_balance_sync',
                'cached_balance', 'balance_cache', 'stcoin_balance',
                'userBalance', 'current_balance', 'mishura_balance',
                'user_data', 'session_data', 'app_state'
            ];
            
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                    sessionStorage.removeItem(key);
                } catch(e) {}
            });
            
            // 2. Очистка всех возможных кэшей
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch(e) {}
            
            // 3. Очистка глобальных переменных
            if (window.userBalance !== undefined) delete window.userBalance;
            if (window.balance !== undefined) delete window.balance;
            if (window.currentBalance !== undefined) delete window.currentBalance;
            
            console.log('🧹 Агрессивная очистка кэша завершена');
            
        } catch (error) {
            console.error('❌ Ошибка очистки кэша:', error);
        }
    }
    
    // Функция принудительной синхронизации
    async function forceBalanceSync() {
        try {
            // Получаем telegram_id различными способами
            let telegramId = null;
            
            // Способ 1: Telegram WebApp
            if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
                telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
            }
            
            // Способ 2: URL параметры
            if (!telegramId) {
                const urlParams = new URLSearchParams(window.location.search);
                telegramId = urlParams.get('telegram_id') || urlParams.get('user_id');
                if (telegramId) telegramId = parseInt(telegramId);
            }
            
            // Способ 3: Промпт пользователю (только для браузера)
            if (!telegramId && !window.Telegram?.WebApp) {
                telegramId = prompt('Введите ваш Telegram ID для синхронизации:');
                if (telegramId) telegramId = parseInt(telegramId);
            }
            
            if (!telegramId) {
                console.warn('⚠️ Не удалось определить Telegram ID');
                return;
            }
            
            console.log(`🔄 Принудительная синхронизация для ${telegramId}`);
            
            // Запрос актуального баланса с сервера
            const response = await fetch(`/api/v1/users/${telegramId}/balance/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify({
                    force_refresh: true,
                    clear_cache: true,
                    aggressive_sync: true,
                    timestamp: Date.now()
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const actualBalance = data.balance;
            
            console.log(`✅ Актуальный баланс с сервера: ${actualBalance} STcoin`);
            
            // Обновляем ВСЕ элементы баланса на странице
            updateAllBalanceElements(actualBalance);
            
            // Показываем уведомление
            showSyncNotification(actualBalance);
            
            // Сохраняем актуальный баланс
            const cacheData = {
                telegramId: telegramId,
                balance: actualBalance,
                timestamp: Date.now(),
                synced: true,
                source: 'aggressive_sync'
            };
            
            localStorage.setItem('user_balance', JSON.stringify(cacheData));
            
            return actualBalance;
            
        } catch (error) {
            console.error('❌ Ошибка принудительной синхронизации:', error);
            showErrorNotification('Ошибка синхронизации баланса');
        }
    }
    
    // Обновление всех элементов баланса
    function updateAllBalanceElements(balance) {
        const selectors = [
            '#balance-display', '.balance-amount', '.balance-value',
            '[data-balance]', '#user-balance', '.stcoin-balance',
            '.balance-text', '#balance-counter', '.current-balance',
            '.balance', '.balance-number', '#current-balance'
        ];
        
        let updatedCount = 0;
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element) {
                    element.textContent = `${balance} STcoin`;
                    element.setAttribute('data-balance', balance);
                    
                    // Визуальное выделение обновления
                    element.style.backgroundColor = '#4CAF50';
                    element.style.color = 'white';
                    element.style.fontWeight = 'bold';
                    element.style.padding = '2px 6px';
                    element.style.borderRadius = '4px';
                    element.style.transition = 'all 0.3s ease';
                    
                    setTimeout(() => {
                        element.style.backgroundColor = '';
                        element.style.color = '';
                        element.style.padding = '';
                    }, 2000);
                    
                    updatedCount++;
                }
            });
        });
        
        console.log(`🎨 Обновлено ${updatedCount} элементов баланса`);
    }
    
    // Уведомление об успешной синхронизации
    function showSyncNotification(balance) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #4CAF50; color: white; padding: 15px 20px;
            border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-size: 16px; font-weight: bold;
        `;
        notification.innerHTML = `
            ✅ Баланс синхронизирован<br>
            💰 ${balance} STcoin
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
    }
    
    // Уведомление об ошибке
    function showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #f44336; color: white; padding: 15px 20px;
            border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = `❌ ${message}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Автоматический запуск при загрузке
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            aggressiveCacheClear();
            forceBalanceSync();
        }, 1000);
    });
    
    // Принудительная синхронизация при фокусе на странице
    window.addEventListener('focus', () => {
        setTimeout(forceBalanceSync, 500);
    });
    
    // Глобальная функция для ручного запуска
    window.forceTelegramCacheSync = function() {
        aggressiveCacheClear();
        return forceBalanceSync();
    };
    
    console.log('✅ Система принудительной очистки кэша Telegram загружена');
    console.log('💡 Используйте window.forceTelegramCacheSync() для ручного запуска');
    
})();