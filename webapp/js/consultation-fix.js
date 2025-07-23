/**
 * 🔧 ИСПРАВЛЕНИЕ КОНСУЛЬТАЦИЙ
 * Восстанавливает работу анализа и сравнения фотографий
 */

console.log('🔧 Загружается исправление консультаций...');

(function() {
    'use strict';
    
    let consultationFixed = false;
    
    function fixConsultation() {
        if (consultationFixed) return;
        
        console.log('🔧 Применяем исправление консультаций');
        
        // Исправляем обработчики для single mode
        const singlePreview = document.getElementById('single-preview');
        if (singlePreview) {
            // Удаляем старые обработчики
            const newSinglePreview = singlePreview.cloneNode(true);
            singlePreview.parentNode.replaceChild(newSinglePreview, singlePreview);
            
            // Добавляем input для файла если его нет
            let fileInput = document.getElementById('single-file-input');
            if (!fileInput) {
                fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.id = 'single-file-input';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);
            }
            
            // Обработчик клика по области preview
            newSinglePreview.addEventListener('click', function() {
                console.log('📷 Клик по области загрузки');
                fileInput.click();
            });
            
            // Обработчик выбора файла
            fileInput.addEventListener('change', async function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                console.log('📁 Файл выбран:', file.name);
                
                // Показываем превью
                const reader = new FileReader();
                reader.onload = function(e) {
                    newSinglePreview.innerHTML = `
                        <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
                        <button class="remove-btn" style="position: absolute; top: 10px; right: 10px; background: red; color: white; border: none; padding: 5px 10px; cursor: pointer;">✕</button>
                    `;
                    
                    // Кнопка удаления
                    const removeBtn = newSinglePreview.querySelector('.remove-btn');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            newSinglePreview.innerHTML = '<div class="upload-text">Нажмите для выбора фото</div>';
                            fileInput.value = '';
                        });
                    }
                };
                reader.readAsDataURL(file);
                
                // Добавляем кнопку отправки если её нет
                addSubmitButton(file);
            });
            
            console.log('✅ Single mode исправлен');
        }
        
        // Исправляем compare mode
        const compareSlots = document.querySelectorAll('.compare-slot');
        compareSlots.forEach((slot, index) => {
            const newSlot = slot.cloneNode(true);
            slot.parentNode.replaceChild(newSlot, slot);
            
            // Создаем input для каждого слота
            let slotInput = document.getElementById(`compare-input-${index}`);
            if (!slotInput) {
                slotInput = document.createElement('input');
                slotInput.type = 'file';
                slotInput.id = `compare-input-${index}`;
                slotInput.accept = 'image/*';
                slotInput.style.display = 'none';
                document.body.appendChild(slotInput);
            }
            
            newSlot.addEventListener('click', function() {
                console.log(`📷 Клик по слоту сравнения ${index + 1}`);
                slotInput.click();
            });
            
            slotInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    newSlot.innerHTML = `
                        <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
                        <button class="remove-btn" style="position: absolute; top: 5px; right: 5px; background: red; color: white; border: none; padding: 3px 8px; cursor: pointer; font-size: 12px;">✕</button>
                    `;
                    
                    const removeBtn = newSlot.querySelector('.remove-btn');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            newSlot.innerHTML = `
                                <span class="slot-number">${index + 1}</span>
                                <span class="add-icon">+</span>
                            `;
                            slotInput.value = '';
                        });
                    }
                };
                reader.readAsDataURL(file);
            });
        });
        
        consultationFixed = true;
        console.log('✅ Исправление консультаций применено');
    }
    
    function addSubmitButton(file) {
        const modalContent = document.querySelector('#consultation-overlay .modal-content');
        if (!modalContent) return;
        
        // Проверяем есть ли уже кнопка
        let submitBtn = modalContent.querySelector('.submit-consultation-btn');
        if (!submitBtn) {
            // Добавляем контейнер для вопроса и кнопки
            const formContainer = document.createElement('div');
            formContainer.className = 'consultation-form-container';
            formContainer.style.cssText = 'margin-top: 20px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px;';
            
            formContainer.innerHTML = `
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; color: var(--text-light); font-weight: 600;">
                        📝 Ваш вопрос о стиле (необязательно):
                    </label>
                    <textarea id="style-question" placeholder="Например: Подходит ли этот образ для деловой встречи?" 
                        style="width: 100%; min-height: 80px; padding: 12px; background: rgba(255,255,255,0.1); 
                        border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; 
                        resize: vertical;"></textarea>
                </div>
                <button class="submit-consultation-btn" style="
                    width: 100%; 
                    padding: 15px; 
                    background: linear-gradient(135deg, #d4af37 0%, #f7dc6f 50%, #d4af37 100%);
                    color: #0a0a0a;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">
                    🚀 Получить анализ образа (10 STcoin)
                </button>
            `;
            
            modalContent.appendChild(formContainer);
            
            // Обработчик отправки
            submitBtn = formContainer.querySelector('.submit-consultation-btn');
            submitBtn.addEventListener('click', async function() {
                console.log('🚀 Отправка консультации');
                await submitConsultation(file);
            });
        }
    }
    
    async function submitConsultation(file) {
        try {
            console.log('📤 Начинаем отправку консультации');
            
            // Получаем вопрос
            const questionInput = document.getElementById('style-question');
            const question = questionInput ? questionInput.value : '';
            
            // Показываем загрузку
            const submitBtn = document.querySelector('.submit-consultation-btn');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Анализируем ваш образ...';
            
            // Создаем FormData
            const formData = new FormData();
            formData.append('image', file);
            formData.append('mode', 'single');
            formData.append('question', question);
            
            // Получаем user_id
            const userId = window.app?.userId || window.USER_ID || 5930269100;
            
            // Отправляем запрос
            const response = await fetch(`/api/v1/consultation/${userId}/analyze`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Анализ получен:', result);
            
            // Показываем результат
            showConsultationResult(result);
            
        } catch (error) {
            console.error('❌ Ошибка отправки консультации:', error);
            alert('Ошибка при отправке консультации. Проверьте баланс и попробуйте снова.');
            
            // Восстанавливаем кнопку
            const submitBtn = document.querySelector('.submit-consultation-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Получить анализ образа (10 STcoin)';
            }
        }
    }
    
    function showConsultationResult(result) {
        const modalContent = document.querySelector('#consultation-overlay .modal-content');
        if (!modalContent) return;
        
        modalContent.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">💎 Анализ вашего образа</h2>
                <button onclick="window.app.closeModal()" class="close-btn">&times;</button>
            </div>
            <div class="consultation-result" style="padding: 20px;">
                <div class="result-content" style="
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    line-height: 1.6;
                    color: var(--text-light);
                ">
                    ${result.consultation?.analysis || result.analysis || 'Анализ недоступен'}
                </div>
                <div class="result-meta" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    background: rgba(212, 175, 55, 0.1);
                    border-radius: 8px;
                    margin-bottom: 20px;
                ">
                    <span>💰 Списано: 10 STcoin</span>
                    <span>🆔 ID: ${result.consultation_id || 'N/A'}</span>
                </div>
                <button onclick="window.app.closeModal(); window.app.showHomeSection();" style="
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #d4af37 0%, #f7dc6f 50%, #d4af37 100%);
                    color: #0a0a0a;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                ">
                    ✅ Готово
                </button>
            </div>
        `;
        
        // Обновляем баланс
        if (window.app && window.app.refreshBalance) {
            window.app.refreshBalance();
        }
    }
    
    // Запуск при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(fixConsultation, 1000);
        });
    } else {
        setTimeout(fixConsultation, 500);
    }
    
    // Следим за открытием модального окна
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.classList && mutation.target.classList.contains('active')) {
                setTimeout(fixConsultation, 100);
            }
        });
    });
    
    const overlay = document.getElementById('consultation-overlay');
    if (overlay) {
        observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    }
    
    // Экспорт
    window.consultationFix = {
        fix: fixConsultation,
        submit: submitConsultation
    };
    
})();

console.log('🔧 Исправление консультаций загружено');