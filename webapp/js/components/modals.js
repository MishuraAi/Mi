// В файле js/components/modals.js или navigation.js

function initConsultationModeSwitching() {
    const singleModeButton = document.querySelector('.mode-button[data-mode="single"]');
    const compareModeButton = document.querySelector('.mode-button[data-mode="compare"]');
    const singleAnalysisMode = document.getElementById('single-analysis-mode');
    const compareAnalysisMode = document.getElementById('compare-analysis-mode');
    
    if (!singleModeButton || !compareModeButton) {
        MishuraApp.utils.logger.error('Кнопки переключения режима не найдены');
        return;
    }
    
    // Исправленный обработчик для кнопки "Один предмет"
    singleModeButton.addEventListener('click', function() {
        // Обновить классы кнопок
        singleModeButton.classList.add('active');
        compareModeButton.classList.remove('active');
        
        // Обновить атрибуты ARIA
        singleModeButton.setAttribute('aria-selected', 'true');
        compareModeButton.setAttribute('aria-selected', 'false');
        
        // Показать/скрыть соответствующие секции
        singleAnalysisMode.classList.remove('hidden');
        compareAnalysisMode.classList.add('hidden');
    });
    
    // Исправленный обработчик для кнопки "Сравнение"
    compareModeButton.addEventListener('click', function() {
        // Обновить классы кнопок
        singleModeButton.classList.remove('active');
        compareModeButton.classList.add('active');
        
        // Обновить атрибуты ARIA
        singleModeButton.setAttribute('aria-selected', 'false');
        compareModeButton.setAttribute('aria-selected', 'true');
        
        // Показать/скрыть соответствующие секции
        singleAnalysisMode.classList.add('hidden');
        compareAnalysisMode.classList.remove('hidden');
    });
}

// Убедитесь, что эта функция вызывается в init
function init() {
    // ...существующий код...
    initConsultationModeSwitching();
    // ...
}