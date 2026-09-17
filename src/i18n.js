/**
 * Internationalization (i18n) dictionary and helper for Designer Media Studio
 * Supported languages: English ('en') and Ukrainian ('ua')
 */

export const translations = {
  en: {
    appTitle: 'Designer Media Studio',
    appSubtitle: 'Interactive media compression & conversion: WebP, AVIF, MozJPEG, PNG, SVG, PDF',

    // Header buttons
    btnSettings: '⚙️ Settings',
    btnSettingsTitle: 'Configure compression ratio and storage paths',
    btnDownloadZip: '📦 Download ZIP',
    btnDownloadZipTitle: 'Download all optimized assets in a single ZIP archive',
    btnClean: '🗑 Clean',
    btnCleanTitle: 'Clear generated files from output folder',
    btnRefresh: '🔄 Refresh',
    btnRefreshTitle: 'Refresh dashboard statistics',

    // Metrics cards
    metricProcessed: 'Processed Files',
    metricOriginal: 'Total Original Size',
    metricOptimized: 'Total Optimized Size',
    metricSaved: 'Bandwidth Saved',

    // Studio tabs
    tabImages: '🖼 Images & Photos (Multi-format)',
    tabIcons: '🎨 Icons (Strict SVG / PNG)',
    tabPdf: '📄 PDF Studio (Configurable DPI & Extraction)',

    // Dropzone
    dropzoneTitle: 'Drop files directly here',
    dropzoneHintImages: 'Supported formats: <strong>JPG, PNG, WebP, TIFF</strong>. Files will be compressed and converted into selected formats.',
    dropzoneHintIcons: 'Drop <strong>SVG or PNG icons</strong>. Format <strong>remains unchanged</strong>: SVG cleaned up with viewBox preserved; PNG quantized.',
    dropzoneHintPdf: 'Drop <strong>PDF documents</strong>. PDF will be compressed at the <strong>configured DPI</strong> and pages extracted into target formats.',
    btnBrowse: 'Browse files on computer',
    btnPasteSvg: '📋 Paste SVG Code',
    btnBrowseFolder: '📂 Browse...',
    exportFormatsLabel: 'Target export formats:',

    // Full-window drag overlay
    overlayTitle: 'Drop files here',
    overlaySubtitle: 'They will be instantly optimized according to your configuration rules',

    // Table
    tableTitle: 'Compressed Files & Formats',
    colPreview: 'Preview',
    colType: 'Type',
    colFilename: 'Filename',
    colDimensions: 'Dimensions',
    colOriginal: 'Original',
    colCompressed: 'Compressed',
    colSavings: 'Savings',
    colActions: 'Ready Formats & Actions',
    emptyTable: 'Output directory is empty. Drop files into the upload area above.',

    // Badges & Actions
    badgeImage: 'Image',
    badgeIcon: 'Icon',
    badgePdf: 'PDF',
    btnCompare: '◐ Compare',
    btnCompareTitle: 'Interactive visual quality comparison (Squoosh style)',
    btnCopySvg: '📋 SVG',
    btnCopySvgTitle: 'Copy clean SVG code directly to clipboard',

    // Settings Modal
    modalSettingsTitle: 'Media Studio Configuration',
    modalSettingsSubtitle: 'Settings are stored in config.json and applied to both Web UI and CLI workflows',
    presetsLabel: 'Preset benchmarks:',
    presetWebStandard: '🌟 Web Standard',
    presetWebStandardDesc: 'Recommended by Google web.dev & Core Web Vitals: optimal size & quality',
    presetHighFidelity: '💎 High Fidelity',
    presetHighFidelityDesc: 'Max quality for Retina displays, portfolio showcases and hero banners',
    presetUltraCompact: '⚡ Ultra Compact',
    presetUltraCompactDesc: 'Max compression for email newsletters and ultra-fast mobile loading',

    tabIncoming: '📥 Incoming Rules',
    tabOutgoing: '📤 Outgoing Formats',
    tabPaths: '📁 Storage Paths',

    // Incoming Tab
    labelMaxDim: 'Max dimensions limit (px downscale):',
    hintMaxDim: 'Images larger than this limit are scaled down proportionally (0 = unlimited).',
    labelPdfDpi: 'Base rasterization DPI for incoming PDF:',
    optDpi72: '72 DPI (Draft / Max compression)',
    optDpi96: '96 DPI (Email / E-Book)',
    optDpi150: '150 DPI (Recommended / Web Standard)',
    optDpi300: '300 DPI (High Resolution / Print)',
    checkAutoOrient: 'Auto-orient by EXIF metadata (fixes rotated smartphone photos)',
    checkSrgb: 'Convert color profile to sRGB (prevents CMYK and Display P3 color shifts)',

    // Outgoing Tab
    legendWebp: '🌐 WebP',
    labelQuality: 'Quality:',
    labelEffort: 'Compression Effort:',
    checkLossless: 'Lossless compression',

    legendAvif: '✨ AVIF',
    legendMozjpeg: '📷 MozJPEG',
    labelJpegQuality: 'JPEG Quality:',
    checkTrellis: 'Trellis quantization (reduces size up to 10%)',
    checkOvershoot: 'Overshoot deringing (cleans edges around text and logos)',
    checkProgressive: 'Progressive scan JPEG',

    legendPng: '🖼 PNG (Quantized Palette)',
    labelPngQuality: 'PNG Quality:',
    labelPngComp: 'zlib Compression Level:',
    checkPngPalette: 'Quantize to 8-bit palette (pngquant algorithm, preserves alpha)',

    legendPdf: '📄 PDF Output',
    labelPdfScreenDpi: 'Screen DPI target:',
    labelPdfQuality: 'Raster image quality inside PDF:',

    legendIcons: '🎨 Icons & Vector',
    checkSvgoViewbox: 'Preserve viewBox attribute (critical for CSS scaling & responsive SVG)',
    checkSvgoMultipass: 'Multipass SVG optimization',

    // Paths & Server Tab
    labelInputPath: 'Input Folder Path:',
    hintInputPath: 'Path on system disk (e.g. <code>input</code>, <code>~/Pictures/Input</code>, <code>/var/data/input</code>, or <code>C:\\Assets\\Input</code>). Automatically creates <code>images/</code>, <code>icons/</code>, <code>pdf/</code>.',
    labelOutputPath: 'Output Folder Path:',
    hintOutputPath: 'Path on system disk (e.g. <code>output</code>, <code>~/Desktop/Output</code>, <code>/var/data/output</code>, or <code>D:\\Exports</code>). Subfolders (<code>webp/</code>, <code>avif/</code>, etc.) are created inside.',
    labelServerPort: 'Local Server Port:',
    hintServerPort: 'Vite HTTP server listening port. Changing the port restarts the server automatically.',
    notePaths: 'Note: Changing storage paths or server port automatically updates folders, restarts watchers, and binds to the new port.',

    // Redirect Overlay
    redirectTitle: 'Server Port Changed',
    redirectMessage: 'Studio server is restarting on port <strong>{port}</strong>.<br>Redirecting you automatically in <span id="redirect-countdown">3</span>s...',

    // Modal Footer
    btnResetConfig: '🔄 Reset to Default',
    btnReoptimize: '⚡ Re-process All',
    btnCancel: 'Cancel',
    btnSaveConfig: '💾 Save to config.json',

    // Comparison Modal
    compModalTitle: 'Quality Comparison',
    badgeOriginal: 'Original',
    badgeOptimized: 'Optimized',
    zoomFit: 'Fit',
    zoom100: '100%',
    zoom200: '200%',
    btnDownloadCurrent: '⬇ Download this file',
    btnCopyCurrentSvg: '📋 Copy SVG Code',
    labelLiveQuality: 'Live Quality:',
    btnResetQuality: '🔄 Reset',
    btnSaveQuality: '💾 Save this compression',
    btnSaveQualitySaving: '💾 Saving…',
    btnSaveQualitySaved: '✔ Saved',
    toastQualitySaved: 'Custom compression saved for this file',
    toastQualityError: 'Could not apply this quality',

    // Footer
    footerEngine: 'Engine: Sharp (MozJPEG / WebP / AVIF) + SVGO (viewBox preserved) + pdf-lib (PDF, configurable DPI).',
    footerAuthor: 'Designer Media Studio • Crafted by <strong>unS0uL</strong>',
    updateAvailable: 'New version available:',

    // Toasts
    toastSaved: 'Configuration saved to config.json',
    toastReset: 'Settings reset to Web Standard benchmark',
    toastCleaned: 'Output directory cleaned successfully',
    toastSvgCopied: '✨ SVG code copied to clipboard!',
    toastPresetApplied: 'Preset applied: ',
    toastReoptimized: 'All assets re-processed with new settings',
    confirmClean: 'Clean all generated files from the output folder?',
    confirmReset: 'Reset all settings to the Web Standard (Google web.dev) benchmark?',

    // Directory Navigator Modal
    modalDirPickerTitle: '📂 Select Folder',
    modalDirPickerSubtitle: 'Navigate to folder on disk or use the system dialog',
    btnOpenOsDialog: '🖥 Open System Dialog',
    btnSelectFolder: '✔ Select This Folder',
    labelSelectedPath: 'Selected:',
    quickProject: 'Project',
    quickHome: 'Home',
    quickDesktop: 'Desktop',
    quickDownloads: 'Downloads',
    quickPictures: 'Pictures',
    emptyDir: 'This directory contains no subfolders',

    // Paste SVG Modal
    modalPasteSvgTitle: '📋 Paste SVG Vector Code',
    modalPasteSvgSubtitle: 'Paste vector markup copied from Figma or code editor. Will be cleaned with SVGO preserving viewBox.',
    labelSvgFilename: 'Icon filename:',
    labelSvgCode: 'SVG Code (<svg>...</svg>):',
    previewLive: 'Live Preview:',
    previewPlaceholder: 'Paste SVG code to see live preview',
    btnClearCode: 'Clear',
    btnOptimizeSvg: '⚡ Optimize & Add Icon',
    toastSvgOptimized: '✨ SVG icon successfully optimized and added!',
    toastSvgInvalid: 'Please provide valid SVG code containing <svg> and </svg> tags',
  },

  ua: {
    appTitle: 'Designer Media Studio',
    appSubtitle: 'Інтерактивна компресія та конвертація: WebP, AVIF, MozJPEG, PNG, SVG, PDF',

    // Header buttons
    btnSettings: '⚙️ Налаштування',
    btnSettingsTitle: 'Налаштувати параметри стиснення та шляхи до папок',
    btnDownloadZip: '📦 Завантажити ZIP',
    btnDownloadZipTitle: 'Завантажити всі оптимізовані файли єдиним ZIP-архівом',
    btnClean: '🗑 Очистити',
    btnCleanTitle: 'Видалити згенеровані файли з вихідної папки',
    btnRefresh: '🔄 Оновити',
    btnRefreshTitle: 'Оновити статистику дашборду',

    // Metrics cards
    metricProcessed: 'Оброблено файлів',
    metricOriginal: 'Загальний початковий розмір',
    metricOptimized: 'Оптимізований розмір',
    metricSaved: 'Заощаджено трафіку',

    // Studio tabs
    tabImages: '🖼 Картинки та фото (Multi-format)',
    tabIcons: '🎨 Іконки (Strict SVG / PNG)',
    tabPdf: '📄 PDF Студія (DPI, що налаштовується, та конвертація)',

    // Dropzone
    dropzoneTitle: 'Перетягніть файли прямо сюди',
    dropzoneHintImages: 'Підтримуються: <strong>JPG, PNG, WebP, TIFF</strong>. Файли буде стиснуто та сконвертовано у вибрані формати.',
    dropzoneHintIcons: 'Перетягніть <strong>SVG або PNG іконки</strong>. Формат <strong>не змінюється</strong>: SVG очищується зі збереженням viewBox; PNG квантується палітрою.',
    dropzoneHintPdf: 'Перетягніть <strong>PDF документи</strong>. PDF буде стиснуто з <strong>налаштованим DPI</strong>, а сторінки витягнуто у цільові формати.',
    btnBrowse: 'Вибрати файли на комп’ютері',
    btnPasteSvg: '📋 Вставити SVG код',
    btnBrowseFolder: '📂 Вибрати...',
    exportFormatsLabel: 'Цільові формати на експорт:',

    // Full-window drag overlay
    overlayTitle: 'Відпустіть файли тут',
    overlaySubtitle: 'Вони почнуть оптимізуватися миттєво за вашими налаштуваннями',

    // Table
    tableTitle: 'Стиснуті файли та формати',
    colPreview: 'Прев’ю',
    colType: 'Тип',
    colFilename: 'Ім’я файлу',
    colDimensions: 'Розміри',
    colOriginal: 'Початковий',
    colCompressed: 'Стиснутий',
    colSavings: 'Економія',
    colActions: 'Готові формати та дії',
    emptyTable: 'Вихідна папка порожня. Перетягніть файли у область вище.',

    // Badges & Actions
    badgeImage: 'Зображення',
    badgeIcon: 'Іконка',
    badgePdf: 'PDF',
    btnCompare: '◐ Порівняти',
    btnCompareTitle: 'Інтерактивне візуальне порівняння якості (стиль Squoosh)',
    btnCopySvg: '📋 SVG',
    btnCopySvgTitle: 'Скопіювати чистий SVG-код у буфер обміну',

    // Settings Modal
    modalSettingsTitle: 'Налаштування медіа-студії',
    modalSettingsSubtitle: 'Параметри зберігаються у config.json та діють для Web UI і консольного скрипту',
    presetsLabel: 'Готові пресети:',
    presetWebStandard: '🌟 Web Standard',
    presetWebStandardDesc: 'Рекомендований Google web.dev: оптимальний баланс розміру та якості',
    presetHighFidelity: '💎 High Fidelity',
    presetHighFidelityDesc: 'Максимальна чіткість для Retina-екранів, портфоліо та головних банерів',
    presetUltraCompact: '⚡ Ultra Compact',
    presetUltraCompactDesc: 'Максимальне стиснення для email-розсилок та надшвидкого мобільного інтернету',

    tabIncoming: '📥 Вхідні правила',
    tabOutgoing: '📤 Вихідні формати',
    tabPaths: '📁 Шляхи збереження',

    // Incoming Tab
    labelMaxDim: 'Максимальний розмір сторін (px downscale limit):',
    hintMaxDim: 'Зображення, більші за вказане значення, будуть пропорційно зменшені (0 = без обмежень).',
    labelPdfDpi: 'Базовий DPI для растеризації вхідних PDF:',
    optDpi72: '72 DPI (Чернетка / Максимальне стиснення)',
    optDpi96: '96 DPI (Email / E-Book)',
    optDpi150: '150 DPI (Рекомендовано / Web Standard)',
    optDpi300: '300 DPI (Висока роздільність / Друк)',
    checkAutoOrient: 'Авто-поворот за EXIF метаданими (виправляє перевернуті фото з телефонів)',
    checkSrgb: 'Примусово конвертувати у sRGB (захист від спотворень CMYK та Display P3)',

    // Outgoing Tab
    legendWebp: '🌐 WebP',
    labelQuality: 'Якість:',
    labelEffort: 'Зусилля стиснення (Effort):',
    checkLossless: 'Стиснення без втрат (Lossless)',

    legendAvif: '✨ AVIF',
    legendMozjpeg: '📷 MozJPEG',
    labelJpegQuality: 'Якість JPEG:',
    checkTrellis: 'Квантування Trellis (економить до 10% ваги)',
    checkOvershoot: 'Overshoot deringing (очищає контури тексту та логотипів)',
    checkProgressive: 'Прогресивний скан JPEG',

    legendPng: '🖼 PNG (Квантована палітра)',
    labelPngQuality: 'Якість PNG:',
    labelPngComp: 'Рівень компресії zlib:',
    checkPngPalette: 'Квантувати до 8-бітної палітри (алгоритм pngquant, зберігає прозорість)',

    legendPdf: '📄 Вихідний PDF',
    labelPdfScreenDpi: 'Цільовий екранний DPI:',
    labelPdfQuality: 'Якість растрових ілюстрацій у PDF:',

    legendIcons: '🎨 Іконки та вектор',
    checkSvgoViewbox: 'Зберігати атрибут viewBox (критично для масштабування в CSS та адаптивності)',
    checkSvgoMultipass: 'Багаторазова оптимізація SVGO',

    // Paths & Server Tab
    labelInputPath: 'Шлях до папки вхідних файлів (Input):',
    hintInputPath: 'Шлях на системному диску (наприклад <code>input</code>, <code>~/Pictures/Input</code>, <code>/var/data/input</code> або <code>C:\\Assets\\Input</code>). Автоматично створює <code>images/</code>, <code>icons/</code>, <code>pdf/</code>.',
    labelOutputPath: 'Шлях до папки результатів (Output):',
    hintOutputPath: 'Шлях на системному диску (наприклад <code>output</code>, <code>~/Desktop/Output</code>, <code>/var/data/output</code> або <code>D:\\Exports</code>). Створює підпапки (<code>webp/</code>, <code>avif/</code> тощо).',
    labelServerPort: 'Порт локального сервера:',
    hintServerPort: 'Порт HTTP-сервера Vite. Зміна порту автоматично перезапустить сервер та перенаправить браузер.',
    notePaths: 'Примітка: При зміні шляхів або порту автоматично оновлюються папки, спостерігачі та адреса сервера.',

    // Redirect Overlay
    redirectTitle: 'Порт сервера змінено',
    redirectMessage: 'Сервер студії перезапускається на порті <strong>{port}</strong>.<br>Автоматичне перенаправлення через <span id="redirect-countdown">3</span>с...',

    // Modal Footer
    btnResetConfig: '🔄 Скинути за замовчуванням',
    btnReoptimize: '⚡ Перестиснути все',
    btnCancel: 'Скасувати',
    btnSaveConfig: '💾 Зберегти у config.json',

    // Comparison Modal
    compModalTitle: 'Порівняння якості',
    badgeOriginal: 'Оригінал',
    badgeOptimized: 'Оптимізовано',
    zoomFit: 'Вписати',
    zoom100: '100%',
    zoom200: '200%',
    btnDownloadCurrent: '⬇ Завантажити цей файл',
    btnCopyCurrentSvg: '📋 Скопіювати SVG код',
    labelLiveQuality: 'Якість наживо:',
    btnResetQuality: '🔄 Скинути',
    btnSaveQuality: '💾 Зберегти це стиснення',
    btnSaveQualitySaving: '💾 Збереження…',
    btnSaveQualitySaved: '✔ Збережено',
    toastQualitySaved: 'Персональне стиснення збережено для цього файлу',
    toastQualityError: 'Не вдалося застосувати цю якість',

    // Footer
    footerEngine: 'Двигун: Sharp (MozJPEG / WebP / AVIF) + SVGO (збереження viewBox) + pdf-lib (PDF, DPI налаштовується).',
    footerAuthor: 'Designer Media Studio • Розроблено <strong>unS0uL</strong>',
    updateAvailable: 'Доступна нова версія:',

    // Toasts
    toastSaved: 'Налаштування успішно збережено у config.json',
    toastReset: 'Параметри скинуто до еталону Web Standard',
    toastCleaned: 'Вихідна папка успішно очищена',
    toastSvgCopied: '✨ SVG-код скопійовано у буфер обміну!',
    toastPresetApplied: 'Застосовано пресет: ',
    toastReoptimized: 'Всі файли перестиснуто за оновленою конфігурацією',
    confirmClean: 'Очистити всі згенеровані файли з вихідної папки?',
    confirmReset: 'Скинути всі налаштування до стандарту Web Standard (Google web.dev)?',

    // Directory Navigator Modal
    modalDirPickerTitle: '📂 Вибір папки',
    modalDirPickerSubtitle: 'Переглядайте каталоги на диску або скористайтеся системним діалогом',
    btnOpenOsDialog: '🖥 Системний діалог',
    btnSelectFolder: '✔ Вибрати цю папку',
    labelSelectedPath: 'Вибрано:',
    quickProject: 'Проєкт',
    quickHome: 'Дім',
    quickDesktop: 'Робочий стіл',
    quickDownloads: 'Завантаження',
    quickPictures: 'Зображення',
    emptyDir: 'У цій папці немає підпапок',

    // Paste SVG Modal
    modalPasteSvgTitle: '📋 Вставка векторного SVG коду',
    modalPasteSvgSubtitle: 'Вставте векторну розмітку, скопійовану з Figma або редактора. SVGO оптимізує її зі збереженням viewBox.',
    labelSvgFilename: 'Ім’я файлу іконки:',
    labelSvgCode: 'Код SVG (<svg>...</svg>):',
    previewLive: 'Живий перегляд:',
    previewPlaceholder: 'Вставте SVG код для живого перегляду',
    btnClearCode: 'Очистити',
    btnOptimizeSvg: '⚡ Оптимізувати та додати',
    toastSvgOptimized: '✨ SVG іконку успішно оптимізовано та додано!',
    toastSvgInvalid: 'Будь ласка, вкажіть коректний SVG код з тегами <svg> та </svg>',
  },
};

let currentLang = 'en';

export function getLang() {
  return currentLang;
}

export function t(key) {
  return translations[currentLang]?.[key] ?? translations.en?.[key] ?? key;
}

export function setLang(lang) {
  if (lang !== 'en' && lang !== 'ua') lang = 'en';
  currentLang = lang;
  try {
    localStorage.setItem('designer_studio_lang', lang);
  } catch {}
  updateDomTranslations();
}

export function initI18n() {
  let saved = 'en';
  try {
    saved = localStorage.getItem('designer_studio_lang') || (navigator.language?.startsWith('uk') ? 'ua' : 'en');
  } catch {}
  setLang(saved);
}

export function updateDomTranslations() {
  // Update data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const translation = t(key);
    if (translation) el.innerHTML = translation;
  });

  // Update data-i18n-title elements
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    const translation = t(key);
    if (translation) el.title = translation;
  });

  // Update data-i18n-placeholder elements
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const translation = t(key);
    if (translation) el.placeholder = translation;
  });

  // Update language button state
  document.querySelectorAll('.btn-lang').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}
