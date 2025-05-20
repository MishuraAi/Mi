/*
ПРОЕКТ: МИШУРА - ИИ СТИЛИСТ
ВЕРСИЯ: 0.3.3
ФАЙЛ: script.js
НАЗНАЧЕНИЕ: Основной JS-файл для восстановления функциональности
МЕТОДОЛОГИЯ ОБНОВЛЕНИЯ КОДА:
При внесении любых изменений в этот файл необходимо предоставлять полный код файла целиком,
а не только изменившиеся части. Это обеспечивает целостность кода и исключает ошибки интеграции.
ДАТА ОБНОВЛЕНИЯ: 2025-05-19 (восстановлена версия 0.3.3)
*/

document.addEventListener('DOMContentLoaded', function () {
    // Упрощенный логгер для отладки
    const logger = {
        info: (message, ...args) => console.log(`[INFO] МишураApp: ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[WARN] МишураApp: ${message}`, ...args),
        error: (message, ...args) => console.error(`[ERROR] МишураApp: ${message}`, ...args),
        debug: (message, ...args) => console.debug(`[DEBUG] МишураApp: ${message}`, ...args)
    };

    logger.info("DOM полностью загружен. Инициализация приложения...");

    // === ОСНОВНЫЕ ЭЛЕМЕНТЫ DOM ===

    // Основные кнопки
    const consultationButton = document.getElementById('consultation-button');
    const tryOnButton = document.getElementById('try-on-button');
    const fabButton = document.getElementById('fab-button');
    const menuButton = document.getElementById('menu-button');
    const searchButton = document.getElementById('search-button');
    const headerTitle = document.querySelector('.header-title-container');

    // Навигационное меню
    const navItems = document.querySelectorAll('.nav-item');

    // Оверлеи и диалоги
    const consultationOverlay = document.getElementById('consultation-overlay');
    const resultsOverlay = document.getElementById('results-overlay'); // Предполагается, что такой ID будет в HTML для результатов
    const tryOnOverlay = document.getElementById('try-on-overlay'); // Предполагается, что такой ID будет для примерки
    const loadingOverlay = document.getElementById('loading-overlay'); // Предполагается, что такой ID будет для загрузки
    const tryOnResultOverlay = document.getElementById('try-on-result-overlay'); // Для результатов примерки

    // Кнопки закрытия и отмены
    const consultationCancel = document.getElementById('consultation-cancel');
    const resultsClose = document.getElementById('results-close'); // Для закрытия результатов
    const tryOnCancel = document.getElementById('try-on-cancel'); // Для отмены в окне примерки
    const tryOnResultClose = document.getElementById('try-on-result-close'); // Для закрытия результатов примерки

    // Переключатели режимов
    const modeButtons = document.querySelectorAll('.mode-button');
    const singleAnalysisMode = document.getElementById('single-analysis-mode');
    const compareAnalysisMode = document.getElementById('compare-analysis-mode');

    // Элементы загрузки фото
    const singleUploadInput = document.getElementById('single-upload-input');
    const compareUploadInputs = document.querySelectorAll('.compare-upload-input'); // Их должно быть 4 по HTML
    const yourPhotoInput = document.getElementById('your-photo-input'); // Для фото пользователя в примерке
    const outfitPhotoInput = document.getElementById('outfit-photo-input'); // Для фото одежды в примерке

    // Контейнеры для превью
    const singlePreviewContainer = document.getElementById('single-preview-container');
    const singlePreviewImage = document.getElementById('single-preview-image');
    const yourPhotoContainer = document.getElementById('your-photo-container'); // Для фото пользователя в примерке
    const yourPhotoPreview = document.getElementById('your-photo-preview'); // Для фото пользователя в примерке
    const outfitPhotoContainer = document.getElementById('outfit-photo-container'); // Для фото одежды в примерке
    const outfitPhotoPreview = document.getElementById('outfit-photo-preview'); // Для фото одежды в примерке


    // Кнопки действий
    const analyzeButton = document.getElementById('analyze-button');
    const tryOnButtonSubmit = document.getElementById('try-on-button-submit'); // Для запуска примерки
    const tryOnResultDownload = document.getElementById('try-on-result-download'); // Для скачивания результата примерки

    // Другие элементы
    const occasionSelector = document.getElementById('occasion-selector');
    const preferencesInput = document.getElementById('preferences-input');
    const tryOnStyleSelector = document.getElementById('try-on-style-selector'); // Для выбора стиля в примерке
    const resultsContainer = document.getElementById('results-container'); // Для отображения результатов анализа
    const tryOnResultContainer = document.getElementById('try-on-result-container'); // Для отображения результата примерки
    const tryOnResultImage = document.getElementById('try-on-result-image'); // img для результата примерки
    const loadingText = document.getElementById('loading-text'); // Текст в индикаторе загрузки
    const deleteImageButtons = document.querySelectorAll('.delete-image');


    // Проверка на мобильное устройство
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // === СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===
    const appState = {
        // Данные для анализа одежды
        consultationMode: 'single', // 'single' или 'compare'
        singleImage: null,
        compareImages: [null, null, null, null], // Array for up to 4 images

        // Данные для примерки
        yourPhoto: null,
        outfitPhoto: null,

        // Метаданные
        selectedTab: 'home',
        isLoading: false,
        lastApiResponse: null
    };

    // === ИНИЦИАЛИЗАЦИЯ ===
    function initApp() {
        logger.info("Инициализация приложения");

        // Установка обработчиков событий
        setupEventListeners();

        // Настройка состояния интерфейса
        refreshUI();

        // Проверяем наличие DOM элементов
        checkDomElements();

        // Показываем уведомление о готовности
        showToast("Приложение МИШУРА готово к работе");
    }

    // Проверка наличия всех нужных DOM элементов
    function checkDomElements() {
        const criticalElements = [
            { name: 'consultationButton', element: consultationButton },
            { name: 'tryOnButton', element: tryOnButton },
            { name: 'consultationOverlay', element: consultationOverlay },
            { name: 'singleAnalysisMode', element: singleAnalysisMode },
            { name: 'compareAnalysisMode', element: compareAnalysisMode },
            { name: 'singleUploadInput', element: singleUploadInput }
            // Добавьте другие критические элементы сюда для проверки
        ];

        for (const item of criticalElements) {
            if (!item.element) {
                logger.error(`Критический элемент не найден: ${item.name}`);
            }
        }
    }

    // === УСТАНОВКА ОБРАБОТЧИКОВ СОБЫТИЙ ===
    function setupEventListeners() {
        logger.debug("Настройка обработчиков событий");

        // Основные кнопки
        if (consultationButton) {
            consultationButton.addEventListener('click', openConsultationModal);
        }
        if (tryOnButton) {
            tryOnButton.addEventListener('click', () => {
                 showToast("Функция 'Примерить' находится в разработке.");
                 // openTryOnModal(); // Закомментировано, так как функционал не готов
            });
        }
        if (fabButton) {
            fabButton.addEventListener('click', handleFabClick);
        }
        if (menuButton) {
            menuButton.addEventListener('click', handleMenuClick);
        }
        if (searchButton) {
            searchButton.addEventListener('click', handleSearchClick);
        }
        if (headerTitle) {
            headerTitle.addEventListener('click', handleHomeClick);
        }

        // Навигация
        navItems.forEach(item => {
            item.addEventListener('click', handleNavClick);
        });

        // Переключатели режимов консультации
        modeButtons.forEach(button => {
            button.addEventListener('click', handleModeSwitch);
        });

        // Загрузка файлов
        if (singleUploadInput) {
            singleUploadInput.addEventListener('change', handleSingleImageUpload);
        }

        compareUploadInputs.forEach(input => {
            input.addEventListener('change', handleCompareImageUpload);
        });

        if (yourPhotoInput) { // Предполагается, что эти ID будут в HTML для примерки
            yourPhotoInput.addEventListener('change', handleYourPhotoUpload);
        }

        if (outfitPhotoInput) { // Предполагается, что эти ID будут в HTML для примерки
            outfitPhotoInput.addEventListener('change', handleOutfitPhotoUpload);
        }

        // Кнопки действий
        if (analyzeButton) {
            analyzeButton.addEventListener('click', handleAnalyzeClick);
        }

        if (tryOnButtonSubmit) { // Для кнопки "Примерить" в модальном окне
             tryOnButtonSubmit.addEventListener('click', () => {
                 showToast("Функция 'Примерить' находится в разработке.");
                 // handleTryOnClick(); // Закомментировано
             });
        }

        if (tryOnResultDownload) { // Для скачивания результата примерки
            tryOnResultDownload.addEventListener('click', handleResultDownload);
        }

        // Кнопки закрытия диалогов
        if (consultationCancel) {
            consultationCancel.addEventListener('click', () => closeOverlay(consultationOverlay));
        }

        if (resultsClose) { // Для закрытия окна результатов
            resultsClose.addEventListener('click', () => closeOverlay(resultsOverlay));
        }

        if (tryOnCancel) { // Для отмены в окне примерки
             tryOnCancel.addEventListener('click', () => closeOverlay(tryOnOverlay));
        }

        if (tryOnResultClose) { // Для закрытия результатов примерки
            tryOnResultClose.addEventListener('click', () => closeOverlay(tryOnResultOverlay));
        }


        // Кнопки удаления изображений
        deleteImageButtons.forEach(button => {
            button.addEventListener('click', handleDeleteImage);
        });
         // Также обработчики для drag-n-drop если они есть в HTML
        const singleUploadArea = document.getElementById('single-upload-area');
        if (singleUploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                singleUploadArea.addEventListener(eventName, preventDefaults, false);
                document.body.addEventListener(eventName, preventDefaults, false); // Для всего body, если перетаскивание вне зоны
            });
            ['dragenter', 'dragover'].forEach(eventName => {
                singleUploadArea.addEventListener(eventName, () => singleUploadArea.classList.add('drag-over'), false);
            });
            ['dragleave', 'drop'].forEach(eventName => {
                singleUploadArea.addEventListener(eventName, () => singleUploadArea.classList.remove('drag-over'), false);
            });
            singleUploadArea.addEventListener('drop', handleSingleImageDrop, false);
        }

        document.querySelectorAll('.image-slot').forEach(slot => {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                slot.addEventListener(eventName, preventDefaults, false);
            });
            ['dragenter', 'dragover'].forEach(eventName => {
                slot.addEventListener(eventName, () => slot.classList.add('drag-over'), false);
            });
            ['dragleave', 'drop'].forEach(eventName => {
                slot.addEventListener(eventName, () => slot.classList.remove('drag-over'), false);
            });
            slot.addEventListener('drop', handleCompareImageDrop, false);
        });
    }
     function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleSingleImageDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) {
            logger.info("Одиночное изображение перетащено (drop):", file.name);
            if (!validateImageFile(file)) return;
            appState.singleImage = file;
            if (singlePreviewImage && singlePreviewContainer) {
                displayImagePreview(file, singlePreviewImage);
                singlePreviewContainer.style.display = 'block';
                if (document.getElementById('single-upload-area')) {
                    document.getElementById('single-upload-area').style.display = 'none';
                }
            }
            showToast("Изображение загружено");
            if(singleUploadInput) singleUploadInput.files = dt.files; // Связываем с инпутом
        }
    }

    function handleCompareImageDrop(e) {
        const slotIndex = parseInt(e.currentTarget.getAttribute('data-slot'));
        if (isNaN(slotIndex)) return;

        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) {
            logger.info(`Изображение для сравнения перетащено (drop) в слот ${slotIndex}:`, file.name);
            if (!validateImageFile(file)) return;

            appState.compareImages[slotIndex] = file;
            const slotElement = e.currentTarget; // Это и есть image-slot
            updateCompareSlotPreview(slotElement, file, slotIndex);

            const inputElement = slotElement.querySelector('.compare-upload-input');
            if(inputElement) inputElement.files = dt.files; // Связываем с инпутом
        }
    }


    // === ОБРАБОТЧИКИ КЛИКОВ ПО ОСНОВНЫМ КНОПКАМ ===

    // Открыть модальное окно консультации
    function openConsultationModal() {
        logger.info("Открытие модального окна консультации");
        resetConsultationForm();
        if (consultationOverlay) openOverlay(consultationOverlay);
        else logger.error("Элемент consultationOverlay не найден!");
    }

    // Открыть модальное окно примерки (пока не используется)
    function openTryOnModal() {
        logger.info("Открытие модального окна примерки");
        resetTryOnForm();
        if (tryOnOverlay) openOverlay(tryOnOverlay);
        else logger.error("Элемент tryOnOverlay не найден!");
    }

    // Обработка клика по кнопке FAB
    function handleFabClick() {
        logger.info("Клик по FAB кнопке");
        openConsultationModal();
    }

    // Обработка клика по кнопке меню
    function handleMenuClick() {
        logger.info("Клик по кнопке меню");
        showToast("Меню в разработке");
    }

    // Обработка клика по кнопке поиска
    function handleSearchClick() {
        logger.info("Клик по кнопке поиска");
        showToast("Поиск в разработке");
    }

    // Обработка клика по заголовку (возврат на главную)
    function handleHomeClick() {
        logger.info("Клик по заголовку (возврат на главную)");
        navItems.forEach(item => {
            if (item.getAttribute('data-tab') === 'home') {
                if (item.classList.contains('active')) return; // Уже на главной
                handleNavClick({ currentTarget: item });
            }
        });
    }

    // === НАВИГАЦИЯ ===

    // Обработка клика по пункту нижнего меню
    function handleNavClick(event) {
        const item = event.currentTarget;
        const tabName = item.getAttribute('data-tab');

        logger.info(`Переключение на вкладку: ${tabName}`);

        // Обновляем активный класс
        navItems.forEach(navItem => {
            navItem.classList.remove('active');
        });
        item.classList.add('active');

        // Обновляем состояние приложения
        appState.selectedTab = tabName;

        // Временное уведомление для неготовых разделов
        if (tabName !== 'home') {
            const tabText = item.querySelector('.nav-text').textContent;
            showToast(`Раздел "${tabText}" в разработке`);
            // Здесь можно будет скрывать/показывать соответствующий контент для вкладок, когда он появится
            // Например, document.getElementById('home-content').style.display = (tabName === 'home') ? 'flex' : 'none';
        }
    }

    // === ОБРАБОТКА РЕЖИМОВ КОНСУЛЬТАЦИИ ===

    // Переключение между режимами одиночного анализа и сравнения
    function handleModeSwitch(event) {
        const mode = event.currentTarget.getAttribute('data-mode');
        logger.info(`Переключение режима консультации на: ${mode}`);

        if (!mode) {
            logger.error("Атрибут data-mode не найден в элементе переключения режима");
            return;
        }

        // Обновляем активный класс
        modeButtons.forEach(button => {
            button.classList.remove('active');
        });
        event.currentTarget.classList.add('active');

        // Показываем соответствующий интерфейс
        if (mode === 'single') {
            if (singleAnalysisMode) singleAnalysisMode.classList.remove('hidden');
            if (compareAnalysisMode) compareAnalysisMode.classList.add('hidden');
            appState.consultationMode = 'single';
        } else {
            if (singleAnalysisMode) singleAnalysisMode.classList.add('hidden');
            if (compareAnalysisMode) compareAnalysisMode.classList.remove('hidden');
            appState.consultationMode = 'compare';
        }
    }

    // === ЗАГРУЗКА ИЗОБРАЖЕНИЙ ===

    // Обработка загрузки одиночного изображения
    function handleSingleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        logger.info("Загрузка одиночного изображения:", file.name);

        if (!validateImageFile(file)) {
            event.target.value = '';
            return;
        }

        appState.singleImage = file;

        if (singlePreviewImage && singlePreviewContainer) {
            displayImagePreview(file, singlePreviewImage);
            singlePreviewContainer.style.display = 'block';
            if (document.getElementById('single-upload-area')) {
                 document.getElementById('single-upload-area').style.display = 'none';
            }
        } else {
            logger.error("singlePreviewImage или singlePreviewContainer не найдены");
        }
        showToast("Изображение загружено");
        event.target.value = ''; // Сброс для возможности повторной загрузки того же файла
    }

    // Обработка загрузки изображения для сравнения
    function handleCompareImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const slotInput = event.currentTarget;
        const slotIndex = parseInt(slotInput.getAttribute('data-slot'));

        if (isNaN(slotIndex)) {
            logger.error("Не удалось определить индекс слота для сравнения изображений");
            slotInput.value = '';
            return;
        }

        logger.info(`Загрузка изображения для сравнения в слот ${slotIndex}:`, file.name);

        if (!validateImageFile(file)) {
            slotInput.value = '';
            return;
        }

        appState.compareImages[slotIndex] = file;

        const slotElement = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (slotElement) {
            updateCompareSlotPreview(slotElement, file, slotIndex);
        } else {
            logger.error(`Слот .image-slot[data-slot="${slotIndex}"] не найден.`);
        }
        slotInput.value = ''; // Сброс для возможности повторной загрузки того же файла
    }

    function updateCompareSlotPreview(slotElement, file, slotIndex) {
        const existingImage = slotElement.querySelector('.slot-image');
        if (existingImage) existingImage.remove(); // Удаляем старое превью если есть

        const existingRemoveBtn = slotElement.querySelector('.remove-image');
         if (existingRemoveBtn) existingRemoveBtn.remove();

        const uploadIcon = slotElement.querySelector('.upload-icon');
        if (uploadIcon) uploadIcon.style.display = 'none';


        const slotImage = document.createElement('img');
        slotImage.className = 'slot-image'; // Убедимся, что класс правильный для CSS
        slotElement.appendChild(slotImage);
        displayImagePreview(file, slotImage);


        const removeButton = document.createElement('div');
        removeButton.className = 'remove-image';
        removeButton.textContent = '✕';
        removeButton.setAttribute('data-slot', slotIndex);
        removeButton.addEventListener('click', handleRemoveCompareImage);
        slotElement.appendChild(removeButton);

        slotElement.classList.add('filled');
        showToast("Изображение добавлено в слот " + (slotIndex + 1));
    }


    // Обработка удаления изображения для сравнения
    function handleRemoveCompareImage(event) {
        event.stopPropagation(); // Предотвращаем срабатывание загрузки файла по клику на слот

        const slotIndex = parseInt(event.currentTarget.getAttribute('data-slot'));
        if (isNaN(slotIndex)) {
            logger.error("Не удалось определить индекс слота для удаления изображения");
            return;
        }

        logger.info(`Удаление изображения из слота ${slotIndex}`);

        appState.compareImages[slotIndex] = null;

        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) {
            logger.error(`Слот с индексом ${slotIndex} не найден`);
            return;
        }

        slot.classList.remove('filled');
        slot.innerHTML = `
            <div class="upload-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
            </div>
            <input type="file" class="compare-upload-input" accept="image/*" data-slot="${slotIndex}">
        `;

        const newInput = slot.querySelector('.compare-upload-input');
        if (newInput) {
            newInput.addEventListener('change', handleCompareImageUpload);
        } else {
            logger.error("Не удалось найти новый input в слоте " + slotIndex);
        }

        showToast("Изображение удалено из слота " + (slotIndex + 1));
    }


    // Обработка загрузки фото пользователя для примерки (пока не используется)
    function handleYourPhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        logger.info("Загрузка фото пользователя:", file.name);
        if (!validateImageFile(file)) { event.target.value = ''; return; }
        appState.yourPhoto = file;
        if (yourPhotoPreview && yourPhotoContainer) {
            displayImagePreview(file, yourPhotoPreview);
            yourPhotoContainer.style.display = 'block';
             if (document.getElementById('your-photo-upload-area')) {
                 document.getElementById('your-photo-upload-area').style.display = 'none';
            }
        }
        showToast("Ваше фото загружено");
        event.target.value = '';
    }

    // Обработка загрузки фото образа для примерки (пока не используется)
    function handleOutfitPhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        logger.info("Загрузка фото образа:", file.name);
        if (!validateImageFile(file)) { event.target.value = ''; return; }
        appState.outfitPhoto = file;
        if (outfitPhotoPreview && outfitPhotoContainer) {
            displayImagePreview(file, outfitPhotoPreview);
            outfitPhotoContainer.style.display = 'block';
            if (document.getElementById('outfit-photo-upload-area')) {
                 document.getElementById('outfit-photo-upload-area').style.display = 'none';
            }
        }
        showToast("Фото образа загружено");
        event.target.value = '';
    }

    // Обработка удаления изображения
    function handleDeleteImage(event) {
        const target = event.currentTarget.getAttribute('data-target');
        if (!target) {
            logger.error("Не удалось определить цель удаления изображения");
            return;
        }

        logger.info(`Удаление изображения: ${target}`);

        switch (target) {
            case 'single':
                appState.singleImage = null;
                if (singleUploadInput) singleUploadInput.value = '';
                if (singlePreviewContainer) singlePreviewContainer.style.display = 'none';
                if (document.getElementById('single-upload-area')) {
                     document.getElementById('single-upload-area').style.display = 'flex'; // Показываем обратно зону загрузки
                }
                break;

            case 'your-photo': // Для примерки
                appState.yourPhoto = null;
                if (yourPhotoInput) yourPhotoInput.value = '';
                if (yourPhotoContainer) yourPhotoContainer.style.display = 'none';
                 if (document.getElementById('your-photo-upload-area')) {
                     document.getElementById('your-photo-upload-area').style.display = 'flex';
                }
                break;

            case 'outfit-photo': // Для примерки
                appState.outfitPhoto = null;
                if (outfitPhotoInput) outfitPhotoInput.value = '';
                if (outfitPhotoContainer) outfitPhotoContainer.style.display = 'none';
                 if (document.getElementById('outfit-photo-upload-area')) {
                     document.getElementById('outfit-photo-upload-area').style.display = 'flex';
                }
                break;

            default:
                logger.warn(`Неизвестный тип цели удаления: ${target}`);
                return;
        }
        showToast("Изображение удалено");
    }

    // === ОСНОВНЫЕ ДЕЙСТВИЯ ===

    // Обработка клика по кнопке "Проанализировать"
    function handleAnalyzeClick() {
        logger.info("Клик по кнопке Проанализировать");

        if (appState.consultationMode === 'single') {
            if (!appState.singleImage) {
                showToast("Пожалуйста, загрузите изображение одежды");
                return;
            }
            analyzeSingleOutfit();
        } else { // 'compare'
            const validImages = appState.compareImages.filter(img => img !== null);
            if (validImages.length < 2) {
                showToast("Пожалуйста, загрузите минимум 2 изображения для сравнения");
                return;
            }
            if (validImages.length > 4) { // В HTML 4 слота
                showToast("Максимальное количество изображений для сравнения - 4");
                return;
            }
            compareOutfits(validImages);
        }
    }

    // Обработка клика по кнопке "Примерить" (пока не используется)
    function handleTryOnClick() {
        logger.info("Клик по кнопке Примерить");
        if (!appState.yourPhoto) { showToast("Пожалуйста, загрузите ваше фото"); return; }
        if (!appState.outfitPhoto) { showToast("Пожалуйста, загрузите фото образа"); return; }
        tryOnOutfit();
    }

    // Обработка клика по кнопке "Скачать результат" (пока не используется)
    function handleResultDownload() {
        logger.info("Клик по кнопке Скачать результат");
        if (!tryOnResultImage || !tryOnResultImage.src || tryOnResultImage.src.startsWith('data:image/svg+xml')) { // Проверка, что это не placeholder
            showToast("Нет изображения для скачивания");
            return;
        }
        const link = document.createElement('a');
        link.href = tryOnResultImage.src;
        link.download = 'mishura-virtual-tryon.jpg'; // Имя файла для скачивания
        document.body.appendChild(link); // Необходимо для Firefox
        link.click();
        document.body.removeChild(link);
        showToast("Изображение сохранено");
    }

    // === API ЗАПРОСЫ ===
    const API_BASE_URL = ''; // Если запускается локально FastAPI на том же порту, или настроен прокси

    async function analyzeSingleOutfit() {
        logger.info("Отправка запроса на анализ одежды");
        showLoading("Анализируем вашу одежду...");

        const formData = new FormData();
        formData.append('image', appState.singleImage);
        formData.append('occasion', occasionSelector ? occasionSelector.value : 'повседневный');
        if (preferencesInput && preferencesInput.value.trim()) {
            formData.append('preferences', preferencesInput.value.trim());
        }

        try {
            const response = await fetch(`${API_BASE_URL}/analyze-outfit`, {
                method: 'POST',
                body: formData
            });
            hideLoading(); // Скрываем лоадер после получения ответа

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP ошибка: ${response.status}` }));
                throw new Error(errorData.message || `HTTP ошибка: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'success') {
                logger.info("Анализ успешно получен");
                appState.lastApiResponse = data;
                if (consultationOverlay) closeOverlay(consultationOverlay);
                displayResults(data.advice);
            } else {
                throw new Error(data.message || 'Не удалось проанализировать изображение');
            }
        } catch (error) {
            logger.error("Ошибка при анализе (single):", error);
            hideLoading(); // Убедимся, что лоадер скрыт при ошибке
            showToast(`Ошибка: ${error.message}. Попробуйте позже.`);
            // Можно добавить имитацию ответа для тестирования UI, если нужно
            // simulateAnalysisResponse();
        }
    }

    async function compareOutfits(images) {
        logger.info(`Отправка запроса на сравнение ${images.length} предметов одежды`);
        showLoading("Сравниваем предметы одежды...");

        const formData = new FormData();
        images.forEach((image) => {
            formData.append('images', image);
        });
        formData.append('occasion', occasionSelector ? occasionSelector.value : 'повседневный');
        if (preferencesInput && preferencesInput.value.trim()) {
            formData.append('preferences', preferencesInput.value.trim());
        }

        try {
            const response = await fetch(`${API_BASE_URL}/compare-outfits`, {
                method: 'POST',
                body: formData
            });
            hideLoading();

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP ошибка: ${response.status}` }));
                throw new Error(errorData.message || `HTTP ошибка: ${response.status}`);
            }
            const data = await response.json();

            if (data.status === 'success') {
                logger.info("Сравнение успешно получено");
                appState.lastApiResponse = data;
                if (consultationOverlay) closeOverlay(consultationOverlay);
                displayResults(data.advice);
            } else {
                throw new Error(data.message || 'Не удалось сравнить изображения');
            }
        } catch (error) {
            logger.error("Ошибка при сравнении (compare):", error);
            hideLoading();
            showToast(`Ошибка: ${error.message}. Попробуйте позже.`);
            // simulateComparisonResponse(images.length);
        }
    }
    // Виртуальная примерка (пока заглушка)
    async function tryOnOutfit() {
        logger.info("Отправка запроса на виртуальную примерку (заглушка)");
        showLoading("Создаем виртуальную примерку...");

        setTimeout(() => { // Имитация задержки API
            hideLoading();
            const reader = new FileReader();
            reader.onload = function (e) {
                if (tryOnResultImage) {
                    tryOnResultImage.src = e.target.result; // Показываем фото одежды как "результат"
                }
                if (tryOnOverlay) closeOverlay(tryOnOverlay);
                if (tryOnResultOverlay) openOverlay(tryOnResultOverlay);
            };
            if(appState.outfitPhoto) { // Убедимся, что фото есть
                 reader.readAsDataURL(appState.outfitPhoto);
            } else {
                 showToast("Ошибка: Фото образа не загружено для примерки.");
                 if (tryOnOverlay) closeOverlay(tryOnOverlay); // Закрываем, если нет фото
            }
            logger.info("Виртуальная примерка создана (демо)");
        }, 2000);
    }


    // === УТИЛИТЫ ИНТЕРФЕЙСА ===

    function showToast(message, duration = 3000) { // Увеличил длительность по умолчанию
        logger.debug(`Показ сообщения: ${message}`);
        const toastElement = document.getElementById('toast') || createToastElement();
        toastElement.textContent = message;
        toastElement.classList.add('show');
        setTimeout(() => {
            toastElement.classList.remove('show');
        }, duration);
    }

    function createToastElement() {
        const toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast'; // Убедитесь, что класс соответствует CSS
        document.body.appendChild(toast);
        return toast;
    }

    function showLoading(message = 'Загрузка...') {
        logger.debug(`Показ индикатора загрузки: ${message}`);
        if (loadingText) loadingText.textContent = message;
        // Предполагается, что loadingOverlay - это ID оверлея для загрузки
        const loOverlay = document.getElementById('loading-overlay') || createLoadingOverlay();
        if (loOverlay) openOverlay(loOverlay);
        appState.isLoading = true;
    }
    function createLoadingOverlay() {
        // Эта функция нужна, если loadingOverlay не всегда есть в DOM заранее
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'overlay'; // Используем тот же класс, что и другие оверлеи
        overlay.innerHTML = `
            <div class="dialog"> <div class="loading-indicator">
                    <div class="loading-spinner"></div>
                    <p id="loading-text-dynamic">Загрузка...</p>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        // Переназначаем loadingText на динамически созданный элемент
        // loadingText = document.getElementById('loading-text-dynamic'); // Не нужно, если loadingText уже есть
        return overlay;
    }


    function hideLoading() {
        logger.debug('Скрытие индикатора загрузки');
        const loOverlay = document.getElementById('loading-overlay');
        if (loOverlay) closeOverlay(loOverlay);
        appState.isLoading = false;
    }

    function openOverlay(overlayElement) {
        if (!overlayElement) { logger.error('Попытка открыть несуществующий оверлей'); return; }
        logger.debug(`Открытие оверлея: ${overlayElement.id}`);
        overlayElement.classList.add('active');
    }

    function closeOverlay(overlayElement) {
        if (!overlayElement) { logger.error('Попытка закрыть несуществующий оверлей'); return; }
        logger.debug(`Закрытие оверлея: ${overlayElement.id}`);
        overlayElement.classList.remove('active');
    }

    function displayImagePreview(file, imgElement) {
        if (!file || !imgElement) { logger.error('Невозможно отобразить превью - отсутствует файл или элемент img'); return; }
        const reader = new FileReader();
        reader.onload = function (e) { imgElement.src = e.target.result; };
        reader.readAsDataURL(file);
    }

    function displayResults(adviceMarkdown) {
        logger.info("Отображение результатов анализа");
        const resultsContainerEl = document.getElementById('results-container'); // Убедимся, что ID правильный
        const resultsOverlayEl = document.getElementById('results-overlay'); // ID для оверлея результатов

        if (!resultsContainerEl) { logger.error('Контейнер #results-container не найден'); return; }
        if (!resultsOverlayEl) { logger.error('Оверлей #results-overlay не найден'); return; }

        resultsContainerEl.innerHTML = parseMarkdownToHtml(adviceMarkdown); // Используем новую функцию
        openOverlay(resultsOverlayEl);
    }

    function parseMarkdownToHtml(markdown) {
        if (!markdown) return '<p>Нет данных для отображения.</p>';
        let html = markdown;

        // Заголовки (###, ##, #)
        html = html.replace(/^### (.*$)/gm, '<div class="result-section-title">$1</div>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>'); // Если нужны H2
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');   // Если нужны H1

        // Списки (* или -)
        html = html.replace(/^\*\s(.*)$/gm, '<li>$1</li>');
        html = html.replace(/^- \s(.*)$/gm, '<li>$1</li>'); // Также для дефисов

        // Обертывание списков в <ul>
        // Простой способ: если есть <li>, но нет <ul>, обернуть все блоки <li>
        if (html.includes('<li>') && !html.includes('<ul>')) {
            html = html.replace(/^(<li>.*<\/li>\s*)+/gm, (match) => `<ul>${match}</ul>`);
        }
         // Более надежный способ для нескольких списков:
        let inList = false;
        html = html.split('\n').map(line => {
            if (line.startsWith('<li>')) {
                if (!inList) {
                    inList = true;
                    return '<ul>' + line;
                }
                return line;
            } else {
                if (inList) {
                    inList = false;
                    return '</ul>' + line;
                }
                return line;
            }
        }).join('\n');
        if (inList) html += '</ul>'; // Закрыть список, если он последний

        // Замена символов новой строки на <br> внутри абзацев, но не для списков и заголовков
        // Сначала обернем в <p> то, что не является заголовком или списком
        html = html.split('\n').map(line => {
            if (line.match(/^<(div|ul|li|h[1-3])/)) return line; // Не трогаем существующие теги
            if (line.trim() === "") return ""; // Пустые строки пропускаем
            return `<p>${line}</p>`;
        }).join(''); // Соединяем без \n, т.к. <p> уже блочные

        // Удаляем <p> вокруг <ul> и <div>
        html = html.replace(/<p><(ul|div class="result-section-title")>/g, '<$1>');
        html = html.replace(/<\/(ul|div)><\/p>/g, '</$1>');
        html = html.replace(/<\/li><\/ul><p>💡/g, '</li></ul><p class="ai-tip">💡'); // Для подсказок

        return html;
    }


    // Сброс формы консультации
    function resetConsultationForm() {
        logger.debug("Сброс формы консультации");
        appState.consultationMode = 'single';
        if(modeButtons.length > 0) {
            modeButtons.forEach(b => b.classList.remove('active'));
            modeButtons[0].classList.add('active'); // Первый режим (single) по умолчанию
        }

        if (singleAnalysisMode) singleAnalysisMode.classList.remove('hidden');
        if (compareAnalysisMode) compareAnalysisMode.classList.add('hidden');

        if (singleUploadInput) singleUploadInput.value = '';
        if (preferencesInput) preferencesInput.value = '';
        if (occasionSelector) occasionSelector.selectedIndex = 0;

        if (singlePreviewContainer) {
            singlePreviewContainer.style.display = 'none';
            if(singlePreviewImage) singlePreviewImage.src = '#'; // Сброс src
        }
         if (document.getElementById('single-upload-area')) {
             document.getElementById('single-upload-area').style.display = 'flex';
        }


        appState.singleImage = null;
        appState.compareImages = [null, null, null, null];

        document.querySelectorAll('.image-slot').forEach((slot, index) => {
            slot.classList.remove('filled');
            slot.innerHTML = `
                <div class="upload-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </div>
                <input type="file" class="compare-upload-input" accept="image/*" data-slot="${index}">
            `;
            const newInput = slot.querySelector('.compare-upload-input');
            if (newInput) newInput.addEventListener('change', handleCompareImageUpload);
        });
    }

    // Сброс формы примерки (пока не используется)
    function resetTryOnForm() {
        logger.debug("Сброс формы примерки");
        if (yourPhotoInput) yourPhotoInput.value = '';
        if (outfitPhotoInput) outfitPhotoInput.value = '';
        if (tryOnStyleSelector) tryOnStyleSelector.selectedIndex = 0; // Если есть селектор стиля

        if (yourPhotoContainer) {
            yourPhotoContainer.style.display = 'none';
            if(yourPhotoPreview) yourPhotoPreview.src = '#';
        }
        if (document.getElementById('your-photo-upload-area')) {
             document.getElementById('your-photo-upload-area').style.display = 'flex';
        }

        if (outfitPhotoContainer) {
            outfitPhotoContainer.style.display = 'none';
            if(outfitPhotoPreview) outfitPhotoPreview.src = '#';
        }
         if (document.getElementById('outfit-photo-upload-area')) {
             document.getElementById('outfit-photo-upload-area').style.display = 'flex';
        }


        appState.yourPhoto = null;
        appState.outfitPhoto = null;
    }

    // Обновление интерфейса (пока только активный таб)
    function refreshUI() {
        navItems.forEach(item => {
            const tabName = item.getAttribute('data-tab');
            item.classList.toggle('active', tabName === appState.selectedTab);
        });
    }

    // Валидация файла изображения
    function validateImageFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast("Пожалуйста, выберите файл изображения (JPEG, PNG, GIF и т.д.)");
            return false;
        }
        const maxSizeMB = 5;
        if (file.size > maxSizeMB * 1024 * 1024) {
            showToast(`Размер файла превышает ${maxSizeMB} МБ`);
            return false;
        }
        return true;
    }

    // Запускаем инициализацию
    initApp();
});