async function processTryOn(formData) {
    try {
        logger.info('API_Service: Отправка запроса на виртуальную примерку...');
        
        const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/v1/virtual-fitting`,
            {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        logger.info('API_Service: Ответ от сервера получен:', result);
        
        // Проверяем структуру ответа
        if (!result || typeof result !== 'object') {
            throw new Error('Неверный формат ответа от сервера: ожидался объект');
        }

        // Если сервер вернул ошибку
        if (result.status === 'error') {
            throw new Error(result.message || 'Неизвестная ошибка сервера');
        }

        // Проверяем наличие необходимых полей
        if (!result.resultImage) {
            throw new Error('В ответе отсутствует поле resultImage');
        }

        // Формируем стандартизированный ответ
        return {
            success: true,
            resultImage: result.resultImage,
            advice: result.advice || null,
            metadata: result.metadata || {}
        };
    } catch (error) {
        logger.error('API_Service: Ошибка при обработке запроса:', error);
        throw error;
    }
} 