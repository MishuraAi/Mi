// ГЛАВНОЕ ПРИЛОЖЕНИЕ - webapp/app.js
console.log('🚀 Главное приложение загружается...');

class MishuraApp {
    constructor() {
        console.log('🔧 Инициализация MishuraApp');
        this.api = new window.MishuraAPIService();
        this.compareImages = [null, null, null, null];
        this.init();
    }

    init() {
        console.log('🔗 Установка обработчиков событий');
        
        // Кнопка Compare
        const compareBtn = document.getElementById('compare-mode-btn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => {
                console.log('🔄 Открытие Compare режима');
                this.openCompareModal();
            });
            console.log('✅ Compare button обработчик установлен');
        }

        // Кнопки закрытия
        const cancelBtns = ['consultation-cancel', 'form-cancel'];
        cancelBtns.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.closeModal());
            }
        });

        // Кнопка отправки
        const submitBtn = document.getElementById('form-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submit());
        }

        // Инициализация загрузчиков
        this.initUploaders();
        
        console.log('✅ MishuraApp готово к работе');
    }

    openCompareModal() {
        const modal = document.getElementById('consultation-overlay');
        const compareMode = document.getElementById('compare-mode');
        
        if (modal && compareMode) {
            modal.classList.add('active');
            compareMode.classList.add('active');
            
            // Скрываем single режим
            const singleMode = document.getElementById('single-mode');
            if (singleMode) {
                singleMode.classList.remove('active');
            }
            
            console.log('✅ Compare modal открыт');
        }
    }

    closeModal() {
        const modal = document.getElementById('consultation-overlay');
        if (modal) {
            modal.classList.remove('active');
            console.log('✅ Modal закрыт');
        }
    }

    initUploaders() {
        for (let i = 0; i < 4; i++) {
            const slot = document.querySelector(`[data-slot="${i}"]`);
            const input = document.getElementById(`compare-file-input-${i}`);
            
            if (slot && input) {
                slot.addEventListener('click', () => {
                    console.log(`📁 Выбор файла для слота ${i + 1}`);
                    input.click();
                });
                
                input.addEventListener('change', (e) => {
                    if (e.target.files[0]) {
                        this.handleUpload(e.target.files[0], i);
                    }
                });
            }
        }
        console.log('✅ Загрузчики файлов настроены');
    }

    handleUpload(file, index) {
        console.log(`📷 Загружен файл в слот ${index + 1}: ${file.name}`);
        
        this.compareImages[index] = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const slot = document.querySelector(`[data-slot="${index}"]`);
            if (slot) {
                slot.innerHTML = `
                    <span class="slot-number">${index + 1}</span>
                    <img src="${e.target.result}" alt="Превью ${index + 1}">
                `;
                slot.classList.add('has-image');
            }
            
            this.updateSubmitButton();
            this.showForm();
        };
        reader.readAsDataURL(file);
    }

    updateSubmitButton() {
        const uploadedCount = this.compareImages.filter(img => img !== null).length;
        const btn = document.getElementById('form-submit');
        
        if (btn) {
            btn.disabled = uploadedCount < 2;
            console.log(`🔘 Кнопка отправки: ${btn.disabled ? 'неактивна' : 'АКТИВНА'} (${uploadedCount}/4 изображений)`);
        }
    }

    showForm() {
        const form = document.getElementById('consultation-form');
        if (form) {
            form.classList.add('active');
            console.log('✅ Форма показана');
        }
    }

    async submit() {
        const occasion = document.getElementById('occasion').value.trim();
        
        if (!occasion) {
            alert('Пожалуйста, укажите повод');
            return;
        }
        
        const images = this.compareImages.filter(img => img !== null);
        
        if (images.length < 2) {
            alert('Загрузите минимум 2 изображения');
            return;
        }
        
        console.log(`🚀 Отправка ${images.length} изображений на анализ...`);
        this.showLoading();
        
        try {
            const result = await this.api.analyzeCompare(images, occasion);
            console.log('✅ Результат получен:', result);
            this.showResult(result);
        } catch (error) {
            console.error('❌ Ошибка:', error);
            this.showError(error.message);
        }
    }

    showLoading() {
        document.getElementById('loading').classList.add('active');
        document.getElementById('consultation-form').classList.remove('active');
        document.getElementById('result').classList.remove('active');
    }

    showResult(result) {
        document.getElementById('loading').classList.remove('active');
        
        const content = document.getElementById('result-content');
        if (content) {
            content.innerHTML = result.advice || result.message || 'Анализ получен';
        }
        
        document.getElementById('result').classList.add('active');
    }

    showError(message) {
        document.getElementById('loading').classList.remove('active');
        
        const content = document.getElementById('result-content');
        if (content) {
            content.innerHTML = `<p style="color: #e74c3c;">Ошибка: ${message}</p>`;
        }
        
        document.getElementById('result').classList.add('active');
    }
}

// ОБЯЗАТЕЛЬНО экспортируем в window
window.MishuraApp = MishuraApp;
console.log('✅ MishuraApp доступен в window');

// Автоинициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 DOM загружен, создание приложения...');
    window.mishuraApp = new MishuraApp();
    console.log('🎉 МИШУРА готово к работе!');
});