/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Основной скрипт WebApp (script.js)
ВЕРСИЯ: 0.3.4 (Добавлен тест загрузки и Telegram WebApp)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

МЕТОДОЛОГИЯ РАБОТЫ И ОБНОВЛЕНИЯ КОДА:
1.  Целостность Обновлений: Любые изменения файлов предоставляются целиком.
    Частичные изменения кода не допускаются для обеспечения стабильности интеграции.
2.  Язык Коммуникации: Комментарии и документация ведутся на русском языке.
3.  Стандарт Качества: Данный код является частью проекта "МИШУРА", разработанного
    с применением высочайших стандартов программирования и дизайна, соответствуя
    уровню лучших мировых практик.

НАЗНАЧЕНИЕ ФАЙЛА:
Основная логика клиентской части Telegram Mini App "МИШУРА".
Управляет взаимодействием с пользователем, загрузкой изображений,
отправкой запросов на API и отображением результатов.
Включает диагностические сообщения для отладки в среде Telegram.
==========================================================================================
*/

// САМЫЙ ПЕРВЫЙ КОД В ФАЙЛЕ для теста:
alert("МИШУРА script.js загружен!"); // Первое уведомление для проверки загрузки скрипта

if (window.Telegram && window.Telegram.WebApp) {
    alert("Telegram WebApp API ДОСТУПЕН! Вызов ready()..."); // Уведомление о доступности API Telegram
    try {
        Telegram.WebApp.ready(); // Сообщаем Telegram, что приложение готово и можно показывать основные кнопки
        alert("Telegram.WebApp.ready() УСПЕШНО вызван.");
        console.log("Telegram WebApp Object:", window.Telegram.WebApp);
        // Пример: Попробуем расширить приложение на весь экран, если это возможно
        if (Telegram.WebApp.isExpanded) {
            // Уже расширено
        } else {
            Telegram.WebApp.expand();
        }
    } catch (e) {
        alert("ОШИБКА при вызове Telegram.WebApp.ready() или expand(): " + e.message);
        console.error("Ошибка при работе с Telegram.WebApp:", e);
    }
} else {
    alert("Telegram WebApp API НЕ доступен. window.Telegram или window.Telegram.WebApp не найдены.");
    console.error("window.Telegram.WebApp не найден! Приложение запущено вне Telegram или API не инициализирован.");
}

document.addEventListener('DOMContentLoaded', function () {
    // Упрощенный логгер для отладки
    const logger = {
        info: (message, ...args) => console.log(`[INFO] МишураApp: ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[WARN] МишураApp: ${message}`, ...args),
        error: (message, ...args) => console.error(`[ERROR] МишураApp: ${message}`, ...args),
        debug: (message, ...args) => console.debug(`[DEBUG] МишураApp: ${message}`, ...args)
    };

    logger.info("DOM полностью загружен. Инициализация основного приложения Мишура...");

    // === ОСНОВНЫЕ ЭЛЕМЕНТЫ DOM ===
    const consultationButton = document.getElementById('consultation-button');
    const tryOnButton = document.getElementById('try-on-button');
    const fabButton = document.getElementById('fab-button');
    const menuButton = document.getElementById('menu-button');
    const searchButton = document.getElementById('search-button');
    const headerTitle = document.getElementById('home-button'); // Изменено на ID для заголовка

    const navItems = document.querySelectorAll('.nav-item');

    const consultationOverlay = document.getElementById('consultation-overlay');
    const resultsOverlay = document.getElementById('results-overlay');
    const tryOnOverlay = document.getElementById('try-on-overlay');
    const loadingOverlay = document.getElementById('loading-overlay');
    const tryOnResultOverlay = document.getElementById('try-on-result-overlay');

    const consultationCancel = document.getElementById('consultation-cancel');
    const resultsClose = document.getElementById('results-close');
    const tryOnCancel = document.getElementById('try-on-cancel');
    const tryOnResultClose = document.getElementById('try-on-result-close');

    const modeButtons = document.querySelectorAll('.mode-button');
    const singleAnalysisMode = document.getElementById('single-analysis-mode');
    const compareAnalysisMode = document.getElementById('compare-analysis-mode');

    const singleUploadInput = document.getElementById('single-upload-input');
    const singleUploadArea = document.getElementById('single-upload-area');
    const compareUploadInputs = document.querySelectorAll('.compare-upload-input');

    const yourPhotoInput = document.getElementById('your-photo-input');
    const yourPhotoUploadArea = document.getElementById('your-photo-upload-area');
    const outfitPhotoInput = document.getElementById('outfit-photo-input');
    const outfitPhotoUploadArea = document.getElementById('outfit-photo-upload-area');

    const singlePreviewContainer = document.getElementById('single-preview-container');
    const singlePreviewImage = document.getElementById('single-preview-image');
    const yourPhotoContainer = document.getElementById('your-photo-container');
    const yourPhotoPreview = document.getElementById('your-photo-preview');
    const outfitPhotoContainer = document.getElementById('outfit-photo-container');
    const outfitPhotoPreview = document.getElementById('outfit-photo-preview');

    const analyzeButton = document.getElementById('analyze-button');
    const tryOnButtonSubmit = document.getElementById('try-on-button-submit');
    const tryOnResultDownload = document.getElementById('try-on-result-download');

    const occasionSelector = document.getElementById('occasion-selector');
    const preferencesInput = document.getElementById('preferences-input');
    const tryOnStyleSelector = document.getElementById('try-on-style-selector');
    const resultsContainer = document.getElementById('results-container');
    const tryOnResultImage = document.getElementById('try-on-result-image');
    const loadingText = document.getElementById('loading-text');
    // const deleteImageButtons = document.querySelectorAll('.delete-image'); // Будут обрабатываться динамически

    const appState = {
        consultationMode: 'single',
        singleImage: null,
        compareImages: [null, null, null, null],
        yourPhoto: null,
        outfitPhoto: null,
        selectedTab: 'home',
        isLoading: false,
        lastApiResponse: null
    };

    function initApp() {
        logger.info("Вызов initApp(): Настройка обработчиков и UI.");
        setupEventListeners();
        refreshUI();
        checkDomElements();
        // showToast("Приложение МИШУРА готово к работе!"); // Можно убрать, если есть alert
    }

    function checkDomElements() {
        const elementsToCheck = {
            consultationButton, tryOnButton, fabButton, menuButton, searchButton, headerTitle,
            consultationOverlay, resultsOverlay, tryOnOverlay, loadingOverlay, tryOnResultOverlay,
            consultationCancel, resultsClose, tryOnCancel, tryOnResultClose,
            singleAnalysisMode, compareAnalysisMode, singleUploadInput, singleUploadArea,
            analyzeButton, occasionSelector, preferencesInput, resultsContainer, loadingText
        };
        let allFound = true;
        for (const key in elementsToCheck) {
            if (!elementsToCheck[key]) {
                logger.error(`Критический DOM элемент не найден: ${key}`);
                allFound = false;
            }
        }
        if (modeButtons.length === 0) logger.error("Кнопки режима (modeButtons) не найдены.");
        // if (deleteImageButtons.length === 0) logger.warn("Кнопки удаления изображений (delete-image) не найдены статически.");
        if (compareUploadInputs.length !== 4) logger.warn(`Найдено ${compareUploadInputs.length} инпутов для сравнения, ожидалось 4.`);
        return allFound;
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function setupDragAndDrop(uploadArea, inputElement, fileHandlerCallback, slotIndex = null) {
        if (!uploadArea || !inputElement) {
             logger.warn("Не удалось настроить Drag-n-Drop: uploadArea или inputElement не найдены.");
             return;
        }
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-over'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-over'), false);
        });
        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                const file = dt.files[0];
                inputElement.files = dt.files; // Для согласованности с обычным выбором
                if (slotIndex !== null) {
                    fileHandlerCallback(file, slotIndex); // Для слотов сравнения
                } else {
                    fileHandlerCallback(file); // Для одиночной загрузки
                }
            } else {
                logger.warn("Drag-n-Drop: Файлы не найдены в dataTransfer.");
            }
        }, false);
    }
    
    function setupEventListeners() {
        logger.debug("Настройка всех обработчиков событий.");

        if (consultationButton) consultationButton.addEventListener('click', openConsultationModal);
        if (tryOnButton) tryOnButton.addEventListener('click', () => {
            showToast("Функция 'Примерить' находится в разработке.");
            // openTryOnModal(); // Функционал будет добавлен позже
        });
        if (fabButton) fabButton.addEventListener('click', handleFabClick);
        if (menuButton) menuButton.addEventListener('click', handleMenuClick);
        if (searchButton) searchButton.addEventListener('click', handleSearchClick);
        if (headerTitle) headerTitle.addEventListener('click', handleHomeClick);

        navItems.forEach(item => item.addEventListener('click', handleNavClick));
        modeButtons.forEach(button => button.addEventListener('click', handleModeSwitch));

        if (singleUploadInput) singleUploadInput.addEventListener('change', handleSingleImageUpload);
        if (singleUploadArea) singleUploadArea.addEventListener('click', () => singleUploadInput && singleUploadInput.click());
        setupDragAndDrop(singleUploadArea, singleUploadInput, handleSingleImageFile);


        compareUploadInputs.forEach(input => {
            input.addEventListener('change', (e) => handleCompareImageUpload(e.target.files[0], parseInt(e.target.dataset.slot)));
            const slotElement = input.closest('.image-slot');
            if (slotElement) {
                slotElement.addEventListener('click', (e) => {
                    if (e.target === slotElement || slotElement.querySelector('.upload-icon').contains(e.target)) {
                        input.click();
                    }
                });
                 setupDragAndDrop(slotElement, input, handleCompareImageUpload, parseInt(input.dataset.slot));
            }
        });
        
        if (yourPhotoInput && yourPhotoUploadArea) {
            yourPhotoInput.addEventListener('change', (e) => handleYourPhotoUpload(e.target.files[0]));
            yourPhotoUploadArea.addEventListener('click', () => yourPhotoInput.click());
            setupDragAndDrop(yourPhotoUploadArea, yourPhotoInput, handleYourPhotoUpload);
        }
        if (outfitPhotoInput && outfitPhotoUploadArea) {
            outfitPhotoInput.addEventListener('change', (e) => handleOutfitPhotoUpload(e.target.files[0]));
            outfitPhotoUploadArea.addEventListener('click', () => outfitPhotoInput.click());
            setupDragAndDrop(outfitPhotoUploadArea, outfitPhotoInput, handleOutfitPhotoUpload);
        }
        
        if (analyzeButton) analyzeButton.addEventListener('click', handleAnalyzeClick);
        if (tryOnButtonSubmit) tryOnButtonSubmit.addEventListener('click', () => {
             showToast("Функция 'Примерить' находится в разработке.");
             // handleTryOnClick();
        });
        if (tryOnResultDownload) tryOnResultDownload.addEventListener('click', handleResultDownload);

        if (consultationCancel) consultationCancel.addEventListener('click', () => closeOverlay(consultationOverlay));
        if (resultsClose) resultsClose.addEventListener('click', () => closeOverlay(resultsOverlay));
        if (tryOnCancel) tryOnCancel.addEventListener('click', () => closeOverlay(tryOnOverlay));
        if (tryOnResultClose) tryOnResultClose.addEventListener('click', () => closeOverlay(tryOnResultOverlay));

        // Делегирование событий для динамически создаваемых кнопок удаления
        document.body.addEventListener('click', function(event) {
            if (event.target && event.target.classList.contains('delete-image')) {
                handleDeleteImage(event.target.dataset.target, event.target.dataset.slot ? parseInt(event.target.dataset.slot) : undefined);
            }
            if (event.target && event.target.classList.contains('remove-image')) { // Для слотов сравнения
                 handleRemoveCompareImageDelegated(event);
            }
        });
    }

    function openConsultationModal() {
        logger.info("Открытие модального окна консультации");
        resetConsultationForm();
        if (consultationOverlay) openOverlay(consultationOverlay);
        else logger.error("Элемент consultationOverlay не найден!");
    }

    function openTryOnModal() { // Пока не используется активно
        logger.info("Открытие модального окна примерки (в разработке)");
        resetTryOnForm();
        if (tryOnOverlay) openOverlay(tryOnOverlay);
        else logger.error("Элемент tryOnOverlay не найден!");
    }

    function handleFabClick() { logger.info("Клик по FAB"); openConsultationModal(); }
    function handleMenuClick() { logger.info("Клик по Меню"); showToast("Меню в разработке"); }
    function handleSearchClick() { logger.info("Клик по Поиску"); showToast("Поиск в разработке"); }
    function handleHomeClick() {
        logger.info("Клик по Заголовку (домой)");
        const homeNavItem = document.querySelector('.nav-item[data-tab="home"]');
        if (homeNavItem && !homeNavItem.classList.contains('active')) {
            handleNavClick({ currentTarget: homeNavItem });
        }
    }

    function handleNavClick(event) {
        const item = event.currentTarget;
        const tabName = item.dataset.tab;
        logger.info(`Переключение на вкладку: ${tabName}`);
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        appState.selectedTab = tabName;
        if (tabName !== 'home') showToast(`Раздел "${item.querySelector('.nav-text').textContent}" в разработке`);
    }

    function handleModeSwitch(event) {
        const mode = event.currentTarget.dataset.mode;
        logger.info(`Переключение режима консультации на: ${mode}`);
        if (!mode) { logger.error("Атрибут data-mode не найден"); return; }
        modeButtons.forEach(b => b.classList.remove('active'));
        event.currentTarget.classList.add('active');
        if (singleAnalysisMode && compareAnalysisMode) {
            singleAnalysisMode.classList.toggle('hidden', mode !== 'single');
            compareAnalysisMode.classList.toggle('hidden', mode !== 'compare');
        }
        appState.consultationMode = mode;
    }
    
    function handleSingleImageFile(file) { // Общий обработчик для выбора и drop
        if (!file) return;
        logger.info("Обработка одиночного изображения:", file.name);
        if (!validateImageFile(file)) {
            if(singleUploadInput) singleUploadInput.value = ''; // Сброс инпута при невалидном файле
            return;
        }
        appState.singleImage = file;
        if (singlePreviewImage && singlePreviewContainer && singleUploadArea) {
            displayImagePreview(file, singlePreviewImage, singlePreviewContainer, singleUploadArea);
        }
        showToast("Изображение загружено");
        if(singleUploadInput) singleUploadInput.value = ''; // Сброс инпута для повторного выбора того же файла
    }
    
    function handleSingleImageUpload(event) { // Вызывается при 'change' инпута
        handleSingleImageFile(event.target.files[0]);
    }

    function handleCompareImageUpload(file, slotIndex) { // Общий обработчик для выбора и drop
        if (!file || isNaN(slotIndex)) {
             logger.warn("handleCompareImageUpload: Файл или индекс слота не предоставлены.");
             return;
        }
        logger.info(`Обработка изображения для сравнения в слот ${slotIndex}:`, file.name);
        if (!validateImageFile(file)) {
            const inputEl = document.querySelector(`.compare-upload-input[data-slot="${slotIndex}"]`);
            if (inputEl) inputEl.value = '';
            return;
        }
        appState.compareImages[slotIndex] = file;
        const slotElement = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (slotElement) {
            updateCompareSlotPreview(slotElement, file, slotIndex);
        }
        const inputEl = document.querySelector(`.compare-upload-input[data-slot="${slotIndex}"]`);
        if (inputEl) inputEl.value = ''; // Сброс инпута
    }

    function updateCompareSlotPreview(slotElement, file, slotIndex) {
        logger.debug(`Обновление превью для слота ${slotIndex}`);
        slotElement.innerHTML = ''; // Очищаем слот полностью
        slotElement.classList.add('filled');

        const slotImage = document.createElement('img');
        slotImage.className = 'slot-image';
        slotImage.alt = `Предпросмотр фото ${slotIndex + 1}`;
        displayImagePreviewOnly(file, slotImage); // Просто отображаем, без скрытия uploadArea
        slotElement.appendChild(slotImage);

        const removeButton = document.createElement('div');
        removeButton.className = 'remove-image'; // Используем этот класс из CSS
        removeButton.textContent = '✕';
        removeButton.dataset.slot = slotIndex; // Сохраняем индекс слота
        // Обработчик будет добавлен делегированием
        slotElement.appendChild(removeButton);
        showToast(`Фото добавлено в слот ${slotIndex + 1}`);
    }
    
    function handleRemoveCompareImageDelegated(event) {
        event.stopPropagation();
        const slotIndex = parseInt(event.target.dataset.slot);
        if (isNaN(slotIndex)) return;
        logger.info(`Удаление изображения из слота ${slotIndex} (делегировано)`);
        appState.compareImages[slotIndex] = null;
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) return;
        slot.classList.remove('filled');
        slot.innerHTML = `
            <div class="upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><use href="#upload-svg-icon"></use></svg></div>
            <input type="file" class="compare-upload-input" accept="image/*" data-slot="${slotIndex}">`;
        const newInput = slot.querySelector('.compare-upload-input');
        if (newInput) newInput.addEventListener('change', (e) => handleCompareImageUpload(e.target.files[0], parseInt(e.target.dataset.slot)));
        // Перенастраиваем Drag-n-Drop для очищенного слота
        const slotInputForDnd = slot.querySelector('.compare-upload-input');
        if (slotInputForDnd) {
            setupDragAndDrop(slot, slotInputForDnd, handleCompareImageUpload, slotIndex);
        }
        showToast(`Фото удалено из слота ${slotIndex + 1}`);
    }


    function handleYourPhotoUpload(file) { // Общий обработчик
        if (!file) return;
        logger.info("Загрузка фото пользователя:", file.name);
        if (!validateImageFile(file)) { if(yourPhotoInput) yourPhotoInput.value = ''; return; }
        appState.yourPhoto = file;
        if (yourPhotoPreview && yourPhotoContainer && yourPhotoUploadArea) {
            displayImagePreview(file, yourPhotoPreview, yourPhotoContainer, yourPhotoUploadArea);
        }
        showToast("Ваше фото загружено");
        if(yourPhotoInput) yourPhotoInput.value = '';
    }

    function handleOutfitPhotoUpload(file) { // Общий обработчик
        if (!file) return;
        logger.info("Загрузка фото образа:", file.name);
        if (!validateImageFile(file)) { if(outfitPhotoInput) outfitPhotoInput.value = ''; return; }
        appState.outfitPhoto = file;
        if (outfitPhotoPreview && outfitPhotoContainer && outfitPhotoUploadArea) {
            displayImagePreview(file, outfitPhotoPreview, outfitPhotoContainer, outfitPhotoUploadArea);
        }
        showToast("Фото образа загружено");
        if(outfitPhotoInput) outfitPhotoInput.value = '';
    }

    function handleDeleteImage(targetType, slotIndex = undefined) {
        logger.info(`Удаление изображения: тип '${targetType}', слот '${slotIndex}'`);
        let uploadAreaElement = null;
        let previewContainerElement = null;
        let imageInputElement = null;

        switch (targetType) {
            case 'single':
                appState.singleImage = null;
                uploadAreaElement = singleUploadArea;
                previewContainerElement = singlePreviewContainer;
                imageInputElement = singleUploadInput;
                break;
            case 'your-photo':
                appState.yourPhoto = null;
                uploadAreaElement = yourPhotoUploadArea;
                previewContainerElement = yourPhotoContainer;
                imageInputElement = yourPhotoInput;
                break;
            case 'outfit-photo':
                appState.outfitPhoto = null;
                uploadAreaElement = outfitPhotoUploadArea;
                previewContainerElement = outfitPhotoContainer;
                imageInputElement = outfitPhotoInput;
                break;
            // Случай для 'compare' обрабатывается в handleRemoveCompareImageDelegated
            default:
                logger.warn(`Неизвестный тип цели для удаления: ${targetType}`);
                return;
        }

        if (imageInputElement) imageInputElement.value = '';
        if (previewContainerElement) previewContainerElement.style.display = 'none';
        if (uploadAreaElement) uploadAreaElement.style.display = 'flex';
        showToast("Изображение удалено");
    }

    function handleAnalyzeClick() {
        logger.info("Клик по 'Проанализировать'");
        if (appState.consultationMode === 'single') {
            if (!appState.singleImage) { showToast("Пожалуйста, загрузите изображение одежды"); return; }
            analyzeSingleOutfit();
        } else {
            const validImages = appState.compareImages.filter(img => img !== null);
            if (validImages.length < 2) { showToast("Загрузите минимум 2 изображения для сравнения"); return; }
            if (validImages.length > 4) { showToast("Максимум 4 изображения для сравнения"); return; } // Соответствует HTML
            compareOutfits(validImages);
        }
    }

    function handleTryOnClick() { // Пока не используется активно
        logger.info("Клик по 'Примерить' (в разработке)");
        if (!appState.yourPhoto) { showToast("Пожалуйста, загрузите ваше фото"); return; }
        if (!appState.outfitPhoto) { showToast("Пожалуйста, загрузите фото образа"); return; }
        // tryOnOutfit(); // Функционал будет добавлен
    }

    function handleResultDownload() { // Пока не используется активно
        logger.info("Клик по 'Скачать результат' (в разработке)");
        if (!tryOnResultImage || !tryOnResultImage.src || tryOnResultImage.src.startsWith('data:image/svg+xml') || tryOnResultImage.src.endsWith('#')) {
            showToast("Нет изображения для скачивания"); return;
        }
        const link = document.createElement('a');
        link.href = tryOnResultImage.src;
        link.download = 'mishura_try_on_result.jpg';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showToast("Изображение сохранено (демо)");
    }

    const API_BASE_URL = ''; // На Render это будет относительный путь к тому же домену

    async function analyzeSingleOutfit() {
        logger.info("Отправка запроса на анализ одного предмета");
        showLoading("Анализируем вашу одежду...");
        const formData = new FormData();
        formData.append('image', appState.singleImage);
        formData.append('occasion', occasionSelector ? occasionSelector.value : 'повседневный');
        if (preferencesInput && preferencesInput.value.trim()) {
            formData.append('preferences', preferencesInput.value.trim());
        }

        try {
            const response = await fetch(`${API_BASE_URL}/analyze-outfit`, { method: 'POST', body: formData });
            hideLoading();
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP ошибка сервера: ${response.status}` }));
                throw new Error(errorData.message || `HTTP ошибка: ${response.status}`);
            }
            const data = await response.json();
            if (data.status === 'success') {
                logger.info("Анализ (одиночный) успешно получен от API.");
                appState.lastApiResponse = data;
                if (consultationOverlay) closeOverlay(consultationOverlay);
                displayResults(data.advice);
            } else {
                throw new Error(data.message || 'Не удалось проанализировать изображение (ответ API).');
            }
        } catch (error) {
            logger.error("Ошибка при analyzeSingleOutfit:", error);
            hideLoading();
            showToast(`Ошибка анализа: ${error.message}. Попробуйте еще раз.`);
        }
    }

    async function compareOutfits(images) {
        logger.info(`Отправка запроса на сравнение ${images.length} предметов`);
        showLoading("Сравниваем предметы одежды...");
        const formData = new FormData();
        images.forEach(image => formData.append('images', image));
        formData.append('occasion', occasionSelector ? occasionSelector.value : 'повседневный');
        if (preferencesInput && preferencesInput.value.trim()) {
            formData.append('preferences', preferencesInput.value.trim());
        }

        try {
            const response = await fetch(`${API_BASE_URL}/compare-outfits`, { method: 'POST', body: formData });
            hideLoading();
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP ошибка сервера: ${response.status}` }));
                throw new Error(errorData.message || `HTTP ошибка: ${response.status}`);
            }
            const data = await response.json();
            if (data.status === 'success') {
                logger.info("Анализ (сравнение) успешно получен от API.");
                appState.lastApiResponse = data;
                if (consultationOverlay) closeOverlay(consultationOverlay);
                displayResults(data.advice);
            } else {
                throw new Error(data.message || 'Не удалось сравнить изображения (ответ API).');
            }
        } catch (error) {
            logger.error("Ошибка при compareOutfits:", error);
            hideLoading();
            showToast(`Ошибка сравнения: ${error.message}. Попробуйте еще раз.`);
        }
    }

    async function tryOnOutfit() { // Заглушка
        logger.info("Отправка запроса на примерку (заглушка).");
        showLoading("Создаем виртуальную примерку...");
        setTimeout(() => {
            hideLoading();
            const reader = new FileReader();
            reader.onload = function (e) {
                if (tryOnResultImage) tryOnResultImage.src = e.target.result;
                if (tryOnOverlay) closeOverlay(tryOnOverlay);
                if (tryOnResultOverlay) openOverlay(tryOnResultOverlay);
            };
            if (appState.outfitPhoto) reader.readAsDataURL(appState.outfitPhoto);
            else { showToast("Ошибка: Фото образа не загружено."); if (tryOnOverlay) closeOverlay(tryOnOverlay); }
            logger.info("Виртуальная примерка (демо) завершена.");
        }, 2000);
    }

    function showToast(message, duration = 3000) {
        // logger.debug(`Показ сообщения: ${message}`); // Можно раскомментировать для более детальных логов
        const toastElement = document.getElementById('toast');
        if (toastElement) {
            toastElement.textContent = message;
            toastElement.classList.add('show');
            setTimeout(() => toastElement.classList.remove('show'), duration);
        } else {
            console.warn("Элемент #toast не найден для показа сообщения:", message);
        }
    }

    function showLoading(message = 'Загрузка...') {
        logger.debug(`Показ индикатора загрузки: ${message}`);
        if (loadingText) loadingText.textContent = message;
        const loOverlay = document.getElementById('loading-overlay');
        if (loOverlay) openOverlay(loOverlay);
        else logger.error("Элемент #loading-overlay не найден.");
        appState.isLoading = true;
    }

    function hideLoading() {
        logger.debug('Скрытие индикатора загрузки');
        const loOverlay = document.getElementById('loading-overlay');
        if (loOverlay) closeOverlay(loOverlay);
        appState.isLoading = false;
    }

    function openOverlay(overlayElement) {
        if (!overlayElement) { logger.error('Попытка открыть несуществующий оверлей'); return; }
        // logger.debug(`Открытие оверлея: ${overlayElement.id}`);
        overlayElement.classList.add('active');
        document.body.style.overflow = 'hidden'; // Предотвращаем прокрутку фона
    }

    function closeOverlay(overlayElement) {
        if (!overlayElement) { logger.error('Попытка закрыть несуществующий оверлей'); return; }
        // logger.debug(`Закрытие оверлея: ${overlayElement.id}`);
        overlayElement.classList.remove('active');
        document.body.style.overflow = ''; // Восстанавливаем прокрутку фона
    }

    function displayImagePreview(file, imgElement, previewContainer, uploadArea) {
        if (!file || !imgElement || !previewContainer || !uploadArea) {
            logger.error('displayImagePreview: Отсутствуют необходимые DOM элементы.'); return;
        }
        const reader = new FileReader();
        reader.onload = function (e) { imgElement.src = e.target.result; };
        reader.readAsDataURL(file);
        previewContainer.style.display = 'block';
        uploadArea.style.display = 'none'; // Скрываем зону загрузки, показываем превью

        // Добавляем кнопку удаления, если ее еще нет (для одиночного превью)
        if (previewContainer.id === "single-preview-container" && !previewContainer.querySelector('.delete-image')) {
            const removeButton = document.createElement('div');
            removeButton.className = 'delete-image';
            removeButton.textContent = '✕';
            removeButton.dataset.target = 'single';
            previewContainer.appendChild(removeButton);
        } else if (previewContainer.id === "your-photo-container" && !previewContainer.querySelector('.delete-image')) {
            const removeButton = document.createElement('div');
            removeButton.className = 'delete-image';
            removeButton.textContent = '✕';
            removeButton.dataset.target = 'your-photo';
            previewContainer.appendChild(removeButton);
        } else if (previewContainer.id === "outfit-photo-container" && !previewContainer.querySelector('.delete-image')) {
            const removeButton = document.createElement('div');
            removeButton.className = 'delete-image';
            removeButton.textContent = '✕';
            removeButton.dataset.target = 'outfit-photo';
            previewContainer.appendChild(removeButton);
        }
    }
    
    function displayImagePreviewOnly(file, imgElement) { // Для слотов сравнения, где структура слота другая
        if (!file || !imgElement) { return; }
        const reader = new FileReader();
        reader.onload = function (e) { imgElement.src = e.target.result; };
        reader.readAsDataURL(file);
    }


    function displayResults(adviceMarkdown) {
        logger.info("Отображение результатов анализа.");
        const resultsContainerEl = document.getElementById('results-container');
        const resultsOverlayEl = document.getElementById('results-overlay');
        if (!resultsContainerEl || !resultsOverlayEl) {
            logger.error('#results-container или #results-overlay не найдены.');
            showToast("Ошибка: не удалось отобразить результаты (отсутствуют элементы).");
            return;
        }
        resultsContainerEl.innerHTML = parseMarkdownToHtml(adviceMarkdown);
        openOverlay(resultsOverlayEl);
    }

    function parseMarkdownToHtml(markdown) {
        if (typeof markdown !== 'string' || !markdown.trim()) {
            return '<p>К сожалению, ИИ-стилист Мишура не смог предоставить ответ. Попробуйте другой запрос или изображение.</p>';
        }
        let html = markdown;
        // Заголовки (### Наименование ### -> <h4>Наименование</h4>)
        html = html.replace(/^###\s*(.*?)\s*###\s*$/gm, '<h4>$1</h4>');
        html = html.replace(/^###\s*(.*?)\s*$/gm, '<div class="result-section-title">$1</div>'); // Для ваших старых промптов

        // Списки (* или - )
        html = html.replace(/^\s*[\*\-]\s+(.*)$/gm, '<li>$1</li>');
        
        // Обертывание блоков <li> в <ul>. Это упрощенный вариант.
        // Для сложных вложенных списков может потребоваться более сложный парсер.
        let inList = false;
        const lines = html.split('\n');
        html = lines.map(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('<li>')) {
                if (!inList) {
                    inList = true;
                    return '<ul>' + line;
                }
                return line;
            } else if (trimmedLine.startsWith('💡')) { // Для подсказок
                 if (inList) {
                    inList = false;
                    return '</ul><p class="ai-tip">' + line + '</p>';
                }
                return '<p class="ai-tip">' + line + '</p>';
            }
            else { // Не элемент списка
                if (inList) { // Если перед этим был список, закрываем его
                    inList = false;
                    // Если строка не пустая после списка, оборачиваем ее в <p>
                    return trimmedLine === '' ? '</ul>' : '</ul><p>' + line + '</p>';
                }
                // Если строка не пустая и не является уже HTML тегом, оборачиваем в <p>
                return (trimmedLine !== '' && !trimmedLine.match(/^<(\w+)\b[^>]*>/)) ? '<p>' + line + '</p>' : line;
            }
        }).join('\n'); // Соединяем строки обратно с \n, CSS позаботится об отступах

        if (inList) { // Если список был последним элементом
            html += '</ul>';
        }
        
        // Заменяем двойные переносы строк (которые могли остаться между абзацами или перед списком) на один,
        // чтобы не было лишних <br> от финальной замены \n на <br>
        html = html.replace(/\n\n+/g, '\n');
        // Заменяем оставшиеся одинарные \n на <br> для сохранения переносов внутри <p> или между элементами
        html = html.replace(/\n/g, '<br>');
        // Убираем <br> внутри <li> если он там лишний (например, <br> сразу после <li>)
        html = html.replace(/<li><br\s*\/?>/gi, '<li>');
        // Убираем <br> перед закрывающим </li>
        html = html.replace(/<br\s*\/?>\s*<\/li>/gi, '</li>');
         // Убираем <p><br></p> или <p></p>
        html = html.replace(/<p>(<br\s*\/?>|\s*)<\/p>/gi, '');


        return html;
    }

    function resetConsultationForm() {
        logger.debug("Сброс формы консультации.");
        appState.consultationMode = 'single';
        if (modeButtons.length > 0) {
            modeButtons.forEach(b => b.classList.remove('active'));
            modeButtons[0].classList.add('active');
        }

        if (singleAnalysisMode) singleAnalysisMode.classList.remove('hidden');
        if (compareAnalysisMode) compareAnalysisMode.classList.add('hidden');

        if (singleUploadInput) singleUploadInput.value = '';
        if (preferencesInput) preferencesInput.value = '';
        if (occasionSelector) occasionSelector.selectedIndex = 0;

        if (singlePreviewContainer) {
            singlePreviewContainer.style.display = 'none';
            if (singlePreviewImage) singlePreviewImage.src = '#';
        }
        if (singleUploadArea) singleUploadArea.style.display = 'flex';

        appState.singleImage = null;
        appState.compareImages = [null, null, null, null];

        document.querySelectorAll('.image-slot').forEach((slot, index) => {
            slot.classList.remove('filled');
            slot.innerHTML = `
                <div class="upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><use href="#upload-svg-icon"></use></svg></div>
                <input type="file" class="compare-upload-input" accept="image/*" data-slot="${index}">`;
            const newInput = slot.querySelector('.compare-upload-input');
            if (newInput) {
                 newInput.addEventListener('change', (e) => handleCompareImageUpload(e.target.files[0], parseInt(e.target.dataset.slot)));
                 // Перенастраиваем Drag-n-Drop для очищенного слота
                setupDragAndDrop(slot, newInput, handleCompareImageUpload, index);
            }
        });
    }

    function resetTryOnForm() { // Пока не используется активно
        logger.debug("Сброс формы примерки.");
        if (yourPhotoInput) yourPhotoInput.value = '';
        if (outfitPhotoInput) outfitPhotoInput.value = '';
        if (tryOnStyleSelector) tryOnStyleSelector.selectedIndex = 0;

        if (yourPhotoContainer) { yourPhotoContainer.style.display = 'none'; if (yourPhotoPreview) yourPhotoPreview.src = '#'; }
        if (yourPhotoUploadArea) yourPhotoUploadArea.style.display = 'flex';
        if (outfitPhotoContainer) { outfitPhotoContainer.style.display = 'none'; if (outfitPhotoPreview) outfitPhotoPreview.src = '#'; }
        if (outfitPhotoUploadArea) outfitPhotoUploadArea.style.display = 'flex';

        appState.yourPhoto = null;
        appState.outfitPhoto = null;
    }

    function refreshUI() {
        // logger.debug("Обновление UI (активный таб).");
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.tab === appState.selectedTab);
        });
    }

    function validateImageFile(file) {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            showToast("Пожалуйста, выберите файл изображения (например, JPEG, PNG).");
            return false;
        }
        const maxSizeMB = 5; // Максимальный размер файла 5MB
        if (file.size > maxSizeMB * 1024 * 1024) {
            showToast(`Размер файла превышает ${maxSizeMB} МБ. Пожалуйста, выберите файл меньшего размера.`);
            return false;
        }
        return true;
    }

    // Первоначальная инициализация приложения
    initApp();
});