// ПРОСТОЙ API КЛИЕНТ - webapp/api.js
console.log('🔗 API клиент загружается...');

class MishuraAPIService {
    constructor() {
        this.baseURL = '/api/v1';
        console.log('✅ MishuraAPIService создан:', this.baseURL);
    }

    async analyzeCompare(imageFiles, occasion, preferences = '') {
        console.log(`📤 Отправка ${imageFiles.length} изображений на сравнение`);
        
        const formData = new FormData();
        imageFiles.forEach((file, index) => {
            formData.append(`image_${index}`, file);
        });
        formData.append('occasion', occasion);
        formData.append('preferences', preferences);

        const response = await fetch(`${this.baseURL}/analyze/compare`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }
}

// ОБЯЗАТЕЛЬНО экспортируем в window
window.MishuraAPIService = MishuraAPIService;
console.log('✅ MishuraAPIService доступен в window');