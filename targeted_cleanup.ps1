# targeted_cleanup.ps1 - Целевая очистка больших файлов
Write-Host "🎯 ЦЕЛЕВАЯ ОЧИСТКА БОЛЬШИХ ФАЙЛОВ МИШУРА" -ForegroundColor Green
Write-Host "=========================================="

# Backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups/targeted_cleanup_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item "webapp" "$backupDir/webapp_backup" -Recurse
Write-Host "✅ Backup создан: $backupDir"

# Исходные размеры
$beforeSizes = @{}
@("webapp/index.html", "webapp/app.js", "webapp/css/styles.css", "webapp/js/config.js") | ForEach-Object {
    if (Test-Path $_) {
        $beforeSizes[$_] = (Get-Content $_).Count
    }
}

Write-Host ""
Write-Host "🧹 НАЧИНАЕМ ЦЕЛЕВУЮ ОЧИСТКУ:" -ForegroundColor Cyan

# 1. ОЧИСТКА index.html (ПРИОРИТЕТ #1)
Write-Host "📄 Очистка index.html (2047 строк)..." -ForegroundColor Yellow
if (Test-Path "webapp/index.html") {
    $htmlContent = Get-Content "webapp/index.html"
    
    # Удаляем встроенные стили (перенесены в CSS)
    $inlineStylesRemoved = $false
    $cleanedHtml = @()
    $skipLines = $false
    
    foreach ($line in $htmlContent) {
        # Пропускаем большие блоки встроенных стилей
        if ($line -match "<style[^>]*>") {
            $skipLines = $true
            continue
        }
        if ($line -match "</style>") {
            $skipLines = $false
            $inlineStylesRemoved = $true
            continue
        }
        if (-not $skipLines) {
            # Удаляем избыточные комментарии
            if ($line -notmatch "<!--.*ИСПРАВЛЕНИЕ.*-->" -and
                $line -notmatch "<!--.*TODO.*-->" -and
                $line -notmatch "<!--.*DEBUG.*-->" -and
                $line -notmatch "<!--.*КРИТИЧНО.*-->") {
                $cleanedHtml += $line
            }
        }
    }
    
    # Убираем множественные пустые строки
    $finalHtml = ($cleanedHtml -join "`n") -replace "`n\s*`n\s*`n+", "`n`n"
    $finalHtml | Set-Content "webapp/index.html"
    
    if ($inlineStylesRemoved) {
        Write-Host "   ✅ Удалены встроенные стили" -ForegroundColor Green
    }
    Write-Host "   ✅ index.html очищен"
}

# 2. ГЛУБОКАЯ ОЧИСТКА app.js
Write-Host "⚡ Глубокая очистка app.js (2466 строк)..." -ForegroundColor Yellow
if (Test-Path "webapp/app.js") {
    $appContent = Get-Content "webapp/app.js"
    
    $cleanedApp = $appContent | Where-Object {
        # Удаляем все виды debug комментариев
        $_ -notmatch "^\s*//.*[🚨🆕❌✅🔧🎯]" -and
        $_ -notmatch "^\s*//\s*(ИСПРАВЛЕНИЕ|КРИТИЧНО|TODO|FIXME|DEBUG)" -and
        $_ -notmatch "console\.log.*debug" -and
        $_ -notmatch "console\.log.*ИСПРАВЛЕНИЕ" -and
        $_ -notmatch "console\.log.*КРИТИЧНО" -and
        $_ -notmatch "^\s*//.*остальной код метода.*" -and
        $_ -notmatch "^\s*//.*ДОБАВИТЬ В САМОЕ НАЧАЛО.*" -and
        $_ -notmatch "^\s*//.*ЗАПУСК ПРОВЕРКИ ОТЗЫВА.*" -and
        # Удаляем пустые блоки комментариев
        $_ -ne "        // ... остальной код ..." -and
        $_ -ne "        // ..." -and
        $_ -ne "    // ..."
    }
    
    # Убираем избыточные пустые строки
    $finalApp = ($cleanedApp -join "`n") -replace "`n\s*`n\s*`n+", "`n`n"
    $finalApp | Set-Content "webapp/app.js"
    Write-Host "   ✅ app.js глубоко очищен"
}

# 3. РАДИКАЛЬНАЯ ОЧИСТКА styles.css
Write-Host "🎨 Радикальная очистка styles.css (1689 строк)..." -ForegroundColor Yellow
if (Test-Path "webapp/css/styles.css") {
    $cssContent = Get-Content "webapp/css/styles.css"
    
    # Находим и удаляем ВСЕ блоки исправлений
    $cleanedCss = @()
    $skipBlock = $false
    
    foreach ($line in $cssContent) {
        # Начало блока для пропуска
        if ($line -match "/\*.*ИСПРАВЛЕНИЕ|/\*.*КРИТИЧНО|/\*.*ПРИНЦИП|/\*.*КЛЮЧЕВОЕ|/\*.*МАКСИМАЛЬНЫЙ") {
            $skipBlock = $true
            continue
        }
        
        # Конец блока
        if ($skipBlock -and $line -match "\*/") {
            $skipBlock = $false
            continue
        }
        
        # Пропускаем строки в блоке
        if ($skipBlock) {
            continue
        }
        
        # Удаляем отдельные проблемные строки
        if ($line -notmatch "\.debug" -and
            $line -notmatch "/\*.*ИСПРАВЛЕНИЕ.*\*/" -and
            $line -notmatch "!/important.*ПРИНУДИТЕЛЬНО" -and
            $line -notmatch "z-index:\s*214748364") {
            $cleanedCss += $line
        }
    }
    
    $cleanedCss | Set-Content "webapp/css/styles.css"
    
    # Добавляем только необходимое
    $essentialStyles = @"

/* ===== ОКОНЧАТЕЛЬНЫЕ СТИЛИ DROPDOWN ===== */
.occasion-options,
#occasion-options {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
}

.final-dropdown::-webkit-scrollbar {
    width: 6px;
}

.final-dropdown::-webkit-scrollbar-track {
    background: rgba(42, 42, 42, 0.8);
    border-radius: 3px;
}

.final-dropdown::-webkit-scrollbar-thumb {
    background: #d4af37;
    border-radius: 3px;
}

@media (max-width: 768px) {
    .final-dropdown {
        max-height: 250px;
        font-size: 18px;
    }
    .final-dropdown-option {
        min-height: 52px;
        padding: 16px;
        font-size: 18px;
    }
}
"@
    
    Add-Content "webapp/css/styles.css" $essentialStyles
    Write-Host "   ✅ styles.css радикально очищен"
}

# 4. ОЧИСТКА config.js
Write-Host "⚙️ Очистка config.js (938 строк)..." -ForegroundColor Yellow
if (Test-Path "webapp/js/config.js") {
    $configContent = Get-Content "webapp/js/config.js"
    
    $cleanedConfig = $configContent | Where-Object {
        $_ -notmatch "^\s*//.*TODO" -and
        $_ -notmatch "^\s*//.*FIXME" -and
        $_ -notmatch "console\.log.*debug"
    }
    
    $cleanedConfig | Set-Content "webapp/js/config.js"
    Write-Host "   ✅ config.js очищен"
}

# 5. РЕЗУЛЬТАТЫ
Write-Host ""
Write-Host "📊 РЕЗУЛЬТАТЫ ЦЕЛЕВОЙ ОЧИСТКИ:" -ForegroundColor Green
Write-Host "==============================="

$totalBefore = 0
$totalAfter = 0

foreach ($file in $beforeSizes.Keys) {
    $before = $beforeSizes[$file]
    $after = (Get-Content $file).Count
    $saved = $before - $after
    $percent = [math]::Round(($saved / $before) * 100, 1)
    
    Write-Host "   $(Split-Path $file -Leaf): $before → $after строк (-$saved, -$percent%)"
    
    $totalBefore += $before
    $totalAfter += $after
}

$totalSaved = $totalBefore - $totalAfter
$totalPercent = [math]::Round(($totalSaved / $totalBefore) * 100, 1)

Write-Host ""
Write-Host "🎉 ОБЩИЙ РЕЗУЛЬТАТ:" -ForegroundColor Magenta
Write-Host "   Основные файлы: $totalBefore → $totalAfter строк"
Write-Host "   Сэкономлено: $totalSaved строк ($totalPercent%)"

# Проверяем новый общий размер проекта
$newTotalLines = 0
Get-ChildItem "webapp" -Recurse -Include "*.html", "*.css", "*.js" | ForEach-Object {
    $newTotalLines += (Get-Content $_.FullName).Count
}

Write-Host "   Весь проект: 11285 → $newTotalLines строк"
Write-Host "   Общая экономия проекта: $(11285 - $newTotalLines) строк"
Write-Host ""
Write-Host "📂 Backup: $backupDir" -ForegroundColor Yellow

Write-Host ""
Write-Host "🧪 СЛЕДУЮЩИЙ ШАГ:" -ForegroundColor Cyan
Write-Host "Запустите: python webapp/server.py"
Write-Host "Откройте: http://localhost:8001"
Write-Host "Протестируйте dropdown функциональность"
