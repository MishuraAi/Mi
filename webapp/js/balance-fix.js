// 🔄 ПРИНУДИТЕЛЬНАЯ СИНХРОНИЗАЦИЯ БАЛАНСА
(function() {
    console.log('🔄 Запуск принудительной синхронизации баланса');
    
    // Очищаем весь localStorage
    const keysToRemove = [
        'user_balance', 'balance_timestamp', 'last_balance_sync',
        'cached_balance', 'balance_cache', 'stcoin_balance'
    ];
    
    keysToRemove.forEach(key => {
        try {
            localStorage.removeItem(key);
        } catch(e) {}
    });
    
    // Получаем telegram_id
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    
    if (telegramId) {
        // Принудительно синхронизируем с сервером
        fetch(`/api/v1/users/${telegramId}/balance/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            console.log(`✅ Баланс синхронизирован: ${data.balance} STcoin`);
            
            // Обновляем все элементы баланса на странице
            const selectors = [
                '#balance-display', '.balance-amount', '[data-balance]', 
                '#user-balance', '.stcoin-balance'
            ];
            
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el) {
                        el.textContent = `${data.balance} STcoin`;
                        el.style.color = '#4CAF50';
                        el.style.fontWeight = 'bold';
                    }
                });
            });
            
            // Показываем уведомление
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; 
                background: #4CAF50; color: white; padding: 15px;
                border-radius: 8px; z-index: 10000;
            `;
            notification.textContent = `✅ Баланс синхронизирован: ${data.balance} STcoin`;
            document.body.appendChild(notification);
            
            setTimeout(() => notification.remove(), 3000);
        })
        .catch(err => {
            console.error('❌ Ошибка синхронизации:', err);
        });
    }
})(); 