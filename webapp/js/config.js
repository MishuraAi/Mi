// 🎭 МИШУРА - Конфигурация веб-приложения
// Файл: webapp/js/config.js

// ================================
// ОСНОВНАЯ КОНФИГУРАЦИЯ
// ================================

// API конфигурация
const API_BASE_URL = window.location.origin;
const API_VERSION = 'v1';

// Пользовательские данные (получаются из URL параметров)
const urlParams = new URLSearchParams(window.location.search);
// Безопасное получение USER_ID с fallback
function getEffectiveUserId() {
    try {
        // Проверяем URL параметры
        const urlUserId = urlParams.get('user_id');
        if (urlUserId && urlUserId !== '5930269100') {
            return parseInt(urlUserId);
        }
        
        // Проверяем unifiedBalanceSync если доступен
        if (window.unifiedBalanceSync && typeof window.unifiedBalanceSync.getEffectiveUserId === 'function') {
            return window.unifiedBalanceSync.getEffectiveUserId();
        }
        
        // Проверяем userService если доступен
        if (window.userService && typeof window.userService.getCurrentUserId === 'function') {
            return window.userService.getCurrentUserId();
        }
        
        // Fallback
        return 5930269100;
    } catch (error) {
        console.warn('⚠️ Ошибка получения USER_ID:', error);
        return 5930269100;
    }
}

// Инициализируем USER_ID безопасно
let USER_ID = getEffectiveUserId();

// Обновляем USER_ID когда системы инициализированы
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const newUserId = getEffectiveUserId();
        if (newUserId !== USER_ID) {
            console.log(`🔄 USER_ID обновлен: ${USER_ID} → ${newUserId}`);
            USER_ID = newUserId;
        }
    }, 1000);
});

// Конфигурация загрузки файлов
const FILE_CONFIG = {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
};

// ================================
// ТАРИФНЫЕ ПЛАНЫ
// ================================

const PRICING_PLANS = {
    mini: {
        name: "🌱 Мини-пакет",
        description: "Пробный тариф",
        consultations: 1,
        stcoins: 10,
        price: 20,
        discount: 0,
        popular: false,
        temporary: true,
        color: "🌱",
        pricePerConsultation: 20.0
    },
    basic: {
        name: "🌟 Базовый",
        description: "Отличный старт для регулярных консультаций",
        consultations: 10,
        stcoins: 100,
        price: 150,
        discount: 25,
        popular: false,
        temporary: false,
        color: "🔵",
        pricePerConsultation: 15.0
    },
    standard: {
        name: "⭐ Стандарт",
        description: "Популярный выбор для стильной жизни",
        consultations: 30,
        stcoins: 300,
        price: 300,
        discount: 50,
        popular: true,
        temporary: false,
        color: "🟢",
        pricePerConsultation: 10.0
    },
    premium: {
        name: "💎 Премиум",
        description: "Максимум стиля и экономии",
        consultations: 100,
        stcoins: 1000,
        price: 800,
        discount: 60,
        popular: false,
        temporary: false,
        color: "🟣",
        pricePerConsultation: 8.0
    }
};

// ================================
// ТЕКСТЫ ИНТЕРФЕЙСА
// ================================

const UI_TEXTS = {
    pricing: {
        title: "💰 Тарифные планы МИШУРА",
        subtitle: "Выберите подходящий пакет консультаций",
        consultation_cost: "💎 1 консультация = 10 STcoin",
        features: [
            "📱 Детальный анализ образа от ИИ-стилиста",
            "🎨 Безлимитное сохранение в персональный гардероб",
            "⚖️ Сравнение нескольких образов",
            "💡 Персональные рекомендации по стилю"
        ]
    },
    purchase: {
        creating_payment: "Создание платежа...",
        payment_created: "✅ Платеж создан!",
        payment_instructions: [
            "Завершите оплату в открывшемся окне",
            "STcoin поступят автоматически после оплаты", 
            "Вы получите уведомление в Telegram"
        ],
        security_note: "🔒 Безопасная оплата через ЮKassa"
    },
    consultation: {
        occasions: {
            business: "👔 Деловая встреча",
            party: "🎉 Вечеринка",
            casual: "🚶 Прогулка",
            date: "💕 Свидание",
            home: "🏠 Дома",
            creative: "🎨 Творческое мероприятие"
        },
        upload_prompt: "📷 Загрузите фото вашего образа",
        analyzing: "🔄 Анализирую ваш образ...",
        insufficient_balance: "❌ Недостаточно STcoin для консультации"
    },
    errors: {
        network_error: "Ошибка сети. Проверьте интернет-соединение.",
        file_too_large: "Файл слишком большой. Максимум 20MB.",
        invalid_file_type: "Неподдерживаемый формат файла. Используйте JPG, PNG или WebP.",
        upload_failed: "Ошибка загрузки файла",
        analysis_failed: "Ошибка анализа изображения",
        payment_failed: "Ошибка создания платежа"
    }
};

// ================================
// ФУНКЦИИ ТАРИФНЫХ ПЛАНОВ
// ================================

function createPricingCard(planId, plan) {
    const badgesHTML = `
        ${plan.popular ? '<div class="badge badge-popular">🔥 ПОПУЛЯРНЫЙ</div>' : ''}
        ${plan.temporary ? '<div class="badge badge-temporary">⏰ ВРЕМЕННОЕ ПРЕДЛОЖЕНИЕ</div>' : ''}
        ${plan.discount > 0 ? `<div class="badge badge-discount">💰 Экономия ${plan.discount}%</div>` : ''}
    `;
    
    return `
        <div class="pricing-card ${plan.popular ? 'popular' : ''}" data-plan-id="${planId}">
            <div class="card-badges">${badgesHTML}</div>
            
            <div class="card-header">
                <h3 class="plan-title">${plan.color} ${plan.name}</h3>
                <p class="plan-description">${plan.description}</p>
            </div>
            
            <div class="card-content">
                <div class="price-section">
                    <div class="price-main">
                        <span class="price-amount">${plan.price}</span>
                        <span class="price-currency">₽</span>
                    </div>
                    <div class="price-per-consultation">
                        ${plan.pricePerConsultation}₽ за консультацию
                    </div>
                </div>
                
                <div class="features-section">
                    <div class="feature-item">
                        <span class="feature-icon">📊</span>
                        <span class="feature-text">${plan.consultations} консультаций</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">💎</span>
                        <span class="feature-text">${plan.stcoins} STcoin</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🎨</span>
                        <span class="feature-text">Персональный гардероб</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">⚖️</span>
                        <span class="feature-text">Сравнение образов</span>
                    </div>
                </div>
            </div>
            
            <div class="card-footer">
                <button class="btn-purchase" onclick="purchasePlan('${planId}')">
                    💳 Купить план
                </button>
            </div>
        </div>
    `;
}

function displayPricingPlans() {
    const container = document.getElementById('pricing-container');
    if (!container) return;
    
    const headerHTML = `
        <div class="pricing-header">
            <h2>${UI_TEXTS.pricing.title}</h2>
            <p class="pricing-subtitle">${UI_TEXTS.pricing.subtitle}</p>
            <div class="pricing-info">
                <p>${UI_TEXTS.pricing.consultation_cost}</p>
                <ul class="features-list">
                    ${UI_TEXTS.pricing.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    
    const plansHTML = Object.entries(PRICING_PLANS)
        .map(([planId, plan]) => createPricingCard(planId, plan))
        .join('');
    
    container.innerHTML = `
        ${headerHTML}
        <div class="pricing-grid">
            ${plansHTML}
        </div>
    `;
}

async function purchasePlan(planId) {
    const plan = PRICING_PLANS[planId];
    if (!plan) {
        showNotification('План не найден', 'error');
        return;
    }
    
    try {
        // Показываем подтверждение
        const confirmed = await showPurchaseConfirmation(plan, planId);
        if (!confirmed) return;
        
        // Показываем загрузку
        showLoadingSpinner(UI_TEXTS.purchase.creating_payment);
        
        // Создаем платеж
        const response = await fetch(`${API_BASE_URL}/api/v1/payments/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: USER_ID,
                plan_id: planId,
                return_url: window.location.href
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        hideLoadingSpinner();
        
        if (data.payment_url) {
            // Сохраняем информацию о платеже
            localStorage.setItem('pending_payment', JSON.stringify({
                payment_id: data.payment_id,
                plan_id: planId,
                amount: data.amount,
                created_at: new Date().toISOString()
            }));
            
            // Открываем страницу оплаты
            window.open(data.payment_url, '_blank');
            
            // Показываем информацию
            showPaymentInfo(data, plan);
        } else {
            throw new Error('Не получен URL для оплаты');
        }
        
    } catch (error) {
        hideLoadingSpinner();
        console.error('Ошибка создания платежа:', error);
        showNotification(`${UI_TEXTS.errors.payment_failed}: ${error.message}`, 'error');
    }
}

// ================================
// МОДАЛЬНЫЕ ОКНА
// ================================

function createModal(id, content) {
    // Удаляем существующий модал
    const existingModal = document.getElementById(id);
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal('${id}')"></div>
        <div class="modal-dialog">
            ${content}
        </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}

function closeModal(id = null) {
    if (id) {
        const modal = document.getElementById(id);
        if (modal) modal.remove();
    } else {
        // Закрываем все модальные окна
        document.querySelectorAll('.modal').forEach(modal => modal.remove());
    }
}

function showPurchaseConfirmation(plan, planId) {
    return new Promise((resolve) => {
        const modal = createModal('purchase-confirmation', `
            <div class="modal-header">
                <h3>💳 Подтверждение покупки</h3>
                <button class="close-btn" onclick="closeModal('purchase-confirmation')">&times;</button>
            </div>
            <div class="modal-content">
                <div class="plan-summary">
                    <h4>${plan.color} ${plan.name}</h4>
                    <p>${plan.description}</p>
                    
                    <div class="purchase-details">
                        <div class="detail-row">
                            <span>Консультации:</span>
                            <strong>${plan.consultations} шт.</strong>
                        </div>
                        <div class="detail-row">
                            <span>STcoin:</span>
                            <strong>+${plan.stcoins}</strong>
                        </div>
                        <div class="detail-row">
                            <span>Цена за консультацию:</span>
                            <strong>${plan.pricePerConsultation}₽</strong>
                        </div>
                        ${plan.discount > 0 ? `
                        <div class="detail-row discount-row">
                            <span>Экономия:</span>
                            <strong>${plan.discount}%</strong>
                        </div>` : ''}
                        <div class="detail-row total-row">
                            <span>Итого к оплате:</span>
                            <strong>${plan.price}₽</strong>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('purchase-confirmation'); window.confirmPurchaseResolve(false);">
                    Отмена
                </button>
                <button class="btn btn-primary" onclick="closeModal('purchase-confirmation'); window.confirmPurchaseResolve(true);">
                    💳 Перейти к оплате
                </button>
            </div>
        `);
        
        // Глобальная функция для резолва
        window.confirmPurchaseResolve = resolve;
    });
}

function showPaymentInfo(paymentData, plan) {
    createModal('payment-info', `
        <div class="modal-header">
            <h3>💳 ${UI_TEXTS.purchase.payment_created}</h3>
            <button class="close-btn" onclick="closeModal('payment-info')">&times;</button>
        </div>
        <div class="modal-content">
            <div class="payment-summary">
                <p><strong>${plan.color} ${plan.name}</strong></p>
                <p>💰 Сумма: <strong>${paymentData.amount}₽</strong></p>
                <p>🆔 ID платежа: <code>${paymentData.payment_id}</code></p>
                
                <div class="payment-instructions">
                    <h4>📋 Что дальше:</h4>
                    <ol>
                        ${UI_TEXTS.purchase.payment_instructions.map(instruction => 
                            `<li>${instruction}</li>`
                        ).join('')}
                    </ol>
                </div>
                
                <div class="security-note">
                    <p>${UI_TEXTS.purchase.security_note}</p>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" onclick="closeModal('payment-info')">
                Понятно
            </button>
        </div>
    `);
}

// ================================
// УВЕДОМЛЕНИЯ
// ================================

function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Добавляем в контейнер уведомлений
    let container = document.getElementById('notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'notifications-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Автоматическое удаление
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }
}

function showLoadingSpinner(message = 'Загрузка...') {
    const spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="spinner-overlay"></div>
        <div class="spinner-content">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(spinner);
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// ================================
// РАБОТА С БАЛАНСОМ
// ================================

async function updateUserBalance() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/${USER_ID}/balance`);
        if (response.ok) {
            const data = await response.json();
            updateBalanceDisplay(data.balance);
            return data.balance;
        }
    } catch (error) {
        console.error('Ошибка получения баланса:', error);
    }
    return null;
}

function updateBalanceDisplay(balance) {
    const balanceElements = document.querySelectorAll('.user-balance');
    balanceElements.forEach(element => {
        element.textContent = `${balance} STcoin`;
    });
}

// ================================
// ПРОВЕРКА ПЛАТЕЖЕЙ
// ================================

async function checkPaymentStatus() {
    const pendingPayment = localStorage.getItem('pending_payment');
    if (!pendingPayment) return;
    
    try {
        const payment = JSON.parse(pendingPayment);
        const response = await fetch(`${API_BASE_URL}/api/v1/payments/status/${payment.payment_id}`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'succeeded') {
                localStorage.removeItem('pending_payment');
                showNotification('✅ Платеж успешно завершен! STcoin зачислены на баланс.', 'success');
                
                // Обновляем баланс пользователя
                await updateUserBalance();
            } else if (data.status === 'canceled') {
                localStorage.removeItem('pending_payment');
                showNotification('❌ Платеж отменен.', 'warning');
            }
        }
    } catch (error) {
        console.error('Ошибка проверки платежа:', error);
    }
}

// ================================
// УТИЛИТЫ
// ================================

function validateFile(file) {
    // Проверка размера
    if (file.size > FILE_CONFIG.maxSize) {
        throw new Error(UI_TEXTS.errors.file_too_large);
    }
    
    // Проверка типа
    if (!FILE_CONFIG.allowedTypes.includes(file.type)) {
        throw new Error(UI_TEXTS.errors.invalid_file_type);
    }
    
    return true;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ================================
// CSS СТИЛИ
// ================================

const PRICING_STYLES = `
.pricing-header {
    text-align: center;
    margin-bottom: 2rem;
}

.pricing-subtitle {
    font-size: 1.2rem;
    color: #666;
    margin: 1rem 0;
}

.pricing-info {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
}

.features-list {
    text-align: left;
    margin: 0.5rem 0;
}

.pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin: 2rem 0;
}

.pricing-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    position: relative;
    transition: all 0.3s ease;
    border: 2px solid transparent;
}

.pricing-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.pricing-card.popular {
    border-color: #28a745;
    transform: scale(1.02);
}

.card-badges {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
}

.badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: bold;
    color: white;
}

.badge-popular { background: #28a745; }
.badge-temporary { background: #ff6b35; }
.badge-discount { background: #17a2b8; }

.card-header {
    text-align: center;
    margin-bottom: 1.5rem;
    padding-top: 1rem;
}

.plan-title {
    font-size: 1.4rem;
    margin: 0 0 0.5rem 0;
    color: #333;
}

.plan-description {
    color: #666;
    font-size: 0.9rem;
    margin: 0;
}

.price-section {
    text-align: center;
    margin: 1.5rem 0;
}

.price-main {
    font-size: 2.5rem;
    font-weight: bold;
    color: #333;
}

.price-currency {
    font-size: 1.2rem;
    color: #666;
    margin-left: 0.25rem;
}

.price-per-consultation {
    font-size: 0.9rem;
    color: #666;
    margin-top: 0.5rem;
}

.features-section {
    margin: 1.5rem 0;
}

.feature-item {
    display: flex;
    align-items: center;
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: #f8f9fa;
    border-radius: 6px;
}

.feature-icon {
    margin-right: 0.5rem;
    font-size: 1rem;
}

.feature-text {
    font-size: 0.9rem;
}

.btn-purchase {
    width: 100%;
    background: #007bff;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.3s ease;
}

.btn-purchase:hover {
    background: #0056b3;
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
}

.modal-dialog {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    z-index: 1001;
}

.modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-content {
    padding: 1.5rem;
}

.modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #dee2e6;
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #999;
}

.btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
}

.btn-primary { background: #007bff; color: white; }
.btn-secondary { background: #6c757d; color: white; }

.purchase-details {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    margin: 0.5rem 0;
    padding: 0.25rem 0;
}

.total-row {
    border-top: 2px solid #dee2e6;
    font-weight: bold;
    font-size: 1.1rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
}

.discount-row {
    color: #28a745;
    font-weight: bold;
}

.notifications-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1100;
    max-width: 400px;
}

.notification {
    margin-bottom: 10px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    animation: slideIn 0.3s ease;
}

.notification-info { background: #d1ecf1; border-left: 4px solid #bee5eb; }
.notification-success { background: #d4edda; border-left: 4px solid #c3e6cb; }
.notification-warning { background: #fff3cd; border-left: 4px solid #ffeaa7; }
.notification-error { background: #f8d7da; border-left: 4px solid #f5c6cb; }

.notification-content {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.notification-close {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    margin-left: 1rem;
}

.loading-spinner {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
}

.spinner-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
}

.spinner-content {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
    position: relative;
    z-index: 1201;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
`;

// ================================
// ИНИЦИАЛИЗАЦИЯ
// ================================

// Добавляем стили
if (!document.getElementById('pricing-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'pricing-styles';
    styleSheet.textContent = PRICING_STYLES;
    document.head.appendChild(styleSheet);
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎭 МИШУРА Config loaded');
    
    // Отображаем тарифы если есть контейнер
    if (document.getElementById('pricing-container')) {
        displayPricingPlans();
    }
    
    // Обновляем баланс пользователя
    updateUserBalance();
    
    // Проверяем статус платежа
    checkPaymentStatus();
    
    // Периодическая проверка статуса
    setInterval(checkPaymentStatus, 30000); // каждые 30 секунд
    
    // Глобальные функции для доступа из HTML
    window.purchasePlan = purchasePlan;
    window.showNotification = showNotification;
    window.showLoadingSpinner = showLoadingSpinner;
    window.hideLoadingSpinner = hideLoadingSpinner;
    window.closeModal = closeModal;
    window.updateUserBalance = updateUserBalance;
    window.PRICING_PLANS = PRICING_PLANS;
    window.UI_TEXTS = UI_TEXTS;
    window.USER_ID = USER_ID;
    window.API_BASE_URL = API_BASE_URL;
});

// Экспорт для модульной системы
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRICING_PLANS,
        UI_TEXTS,
        API_BASE_URL,
        USER_ID,
        FILE_CONFIG
    };
}
