// Исправление в webapp/js/components/modals.js

/**
 * Открытие модального окна консультации
 */
function openConsultationModal() {
    // Сбрасываем активный режим на "одиночный" при каждом открытии
    const singleModeButton = document.querySelector('.mode-button[data-mode="single"]');
    const compareModeButton = document.querySelector('.mode-button[data-mode="compare"]');
    
    if (singleModeButton && compareModeButton) {
        singleModeButton.classList.add('active');
        compareModeButton.classList.remove('active');
        
        const singleAnalysisMode = document.getElementById('single-analysis-mode');
        const compareAnalysisMode = document.getElementById('compare-analysis-mode');
        
        if (singleAnalysisMode && compareAnalysisMode) {
            singleAnalysisMode.classList.remove('hidden');
            compareAnalysisMode.classList.add('hidden');
        }
    }
    
    openModal('consultation-overlay');
}