import { initI18n, setLang, t } from './i18n.js';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getOutputUrl(out) {
  if (!out) return '';
  if (out.relPath) {
    return `/${out.relPath.replace(/^\/+/, '')}`;
  }
  const match = (out.path || '').replace(/\\/g, '/').match(/(?:^|\/)(webp|avif|jpg|png|icons|pdf)\/([^/]+)$/i);
  if (match) {
    return `/${match[1].toLowerCase()}/${match[2]}`;
  }
  return `/${(out.path || '').replace(/^output[\\/]/, '').replace(/\\/g, '/')}`;
}

let currentMode = 'image'; // 'image' | 'icon' | 'pdf'
let currentConfig = null;

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const btnBrowse = document.getElementById('btn-browse');
const btnDownloadZip = document.getElementById('btn-download-zip');
const btnClean = document.getElementById('btn-clean');
const btnRefresh = document.getElementById('btn-refresh');
const btnOpenSettings = document.getElementById('btn-open-settings');
const formatsPanel = document.getElementById('formats-panel');
const dropzoneHint = document.getElementById('dropzone-hint');
const processingBanner = document.getElementById('processing-banner');
const processingText = document.getElementById('processing-text');
const tabButtons = document.querySelectorAll('.tab-btn');
const toastEl = document.getElementById('toast');
const footerGithub = document.getElementById('footer-github');
const footerVersion = document.getElementById('footer-version');
const updateBanner = document.getElementById('update-banner');
const updateLink = document.getElementById('update-link');
const updateVersionEl = document.getElementById('update-version');

// Modal Elements
const settingsModal = document.getElementById('settings-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const btnSaveConfig = document.getElementById('btn-save-config');
const btnResetConfig = document.getElementById('btn-reset-config');
const btnReoptimize = document.getElementById('btn-reoptimize');
const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
const tabIncoming = document.getElementById('tab-incoming');
const tabOutgoing = document.getElementById('tab-outgoing');
const tabPaths = document.getElementById('tab-paths');

// Settings Form Inputs & Value Badges
const cfgMaxDim = document.getElementById('cfg-max-dim');
const valMaxDim = document.getElementById('val-max-dim');
const cfgPdfDpi = document.getElementById('cfg-pdf-dpi');
const cfgAutoOrient = document.getElementById('cfg-auto-orient');
const cfgSrgb = document.getElementById('cfg-srgb');

const cfgWebpEnabled = document.getElementById('cfg-webp-enabled');
const cfgWebpQuality = document.getElementById('cfg-webp-quality');
const valWebpQ = document.getElementById('val-webp-q');
const cfgWebpEffort = document.getElementById('cfg-webp-effort');
const valWebpEffort = document.getElementById('val-webp-effort');
const cfgWebpLossless = document.getElementById('cfg-webp-lossless');

const cfgAvifEnabled = document.getElementById('cfg-avif-enabled');
const cfgAvifQuality = document.getElementById('cfg-avif-quality');
const valAvifQ = document.getElementById('val-avif-q');
const cfgAvifEffort = document.getElementById('cfg-avif-effort');
const valAvifEffort = document.getElementById('val-avif-effort');

const cfgJpgEnabled = document.getElementById('cfg-jpg-enabled');
const cfgJpgQuality = document.getElementById('cfg-jpg-quality');
const valJpgQ = document.getElementById('val-jpg-q');
const cfgJpgTrellis = document.getElementById('cfg-jpg-trellis');
const cfgJpgOvershoot = document.getElementById('cfg-jpg-overshoot');
const cfgJpgProgressive = document.getElementById('cfg-jpg-progressive');

const cfgPngEnabled = document.getElementById('cfg-png-enabled');
const cfgPngQuality = document.getElementById('cfg-png-quality');
const valPngQ = document.getElementById('val-png-q');
const cfgPngComp = document.getElementById('cfg-png-comp');
const valPngComp = document.getElementById('val-png-comp');
const cfgPngPalette = document.getElementById('cfg-png-palette');

const FORMAT_TOGGLES = [
  { key: 'webp', checkbox: cfgWebpEnabled },
  { key: 'avif', checkbox: cfgAvifEnabled },
  { key: 'jpg', checkbox: cfgJpgEnabled },
  { key: 'png', checkbox: cfgPngEnabled },
];

function collectEnabledFormats() {
  const enabled = FORMAT_TOGGLES.filter(f => f.checkbox?.checked).map(f => f.key);
  return enabled.length > 0 ? enabled : ['webp'];
}

function applyFormatToggleState(checkbox) {
  if (!checkbox) return;
  const fieldset = checkbox.closest('.fieldset-group');
  if (!fieldset) return;
  fieldset.classList.toggle('fieldset-disabled', !checkbox.checked);
  fieldset.querySelectorAll('input, select').forEach(el => {
    if (el !== checkbox) el.disabled = !checkbox.checked;
  });
}

FORMAT_TOGGLES.forEach(({ checkbox }) => {
  checkbox?.addEventListener('change', () => applyFormatToggleState(checkbox));
});

const cfgPdfScreenDpi = document.getElementById('cfg-pdf-screen-dpi');
const cfgPdfQuality = document.getElementById('cfg-pdf-quality');
const valPdfQ = document.getElementById('val-pdf-q');

const cfgSvgoViewbox = document.getElementById('cfg-svgo-viewbox');
const cfgSvgoMultipass = document.getElementById('cfg-svgo-multipass');

// Path & Server Configuration Inputs
const cfgPathInput = document.getElementById('cfg-path-input');
const cfgPathOutput = document.getElementById('cfg-path-output');
const cfgServerPort = document.getElementById('cfg-server-port');
const portRedirectOverlay = document.getElementById('port-redirect-overlay');
const redirectMsg = document.getElementById('redirect-msg');

// Directory Picker Modal Elements
const dirPickerModal = document.getElementById('dir-picker-modal');
const btnCloseDirPicker = document.getElementById('btn-close-dir-picker');
const btnCancelDirPicker = document.getElementById('btn-cancel-dir-picker');
const btnSelectDir = document.getElementById('btn-select-dir');
const btnDirParent = document.getElementById('btn-dir-parent');
const btnOpenOsDialog = document.getElementById('btn-open-os-dialog');
const dirBreadcrumbs = document.getElementById('dir-breadcrumbs');
const dirQuickLinks = document.getElementById('dir-quick-links');
const dirItemsList = document.getElementById('dir-items-list');
const dirSelectedPath = document.getElementById('dir-selected-path');
let activePathTargetInput = null;
let currentNavSelectedPath = '';

// Paste SVG Modal Elements
const btnPasteSvg = document.getElementById('btn-paste-svg');
const pasteSvgModal = document.getElementById('paste-svg-modal');
const btnClosePasteSvg = document.getElementById('btn-close-paste-svg');
const btnCancelPasteSvg = document.getElementById('btn-cancel-paste-svg');
const btnClearPasteSvg = document.getElementById('btn-clear-paste-svg');
const btnSubmitPasteSvg = document.getElementById('btn-submit-paste-svg');
const pasteSvgFilename = document.getElementById('paste-svg-filename');
const pasteSvgCode = document.getElementById('paste-svg-code');
const svgPreviewBox = document.getElementById('svg-preview-box');
const svgCodeSize = document.getElementById('svg-code-size');

// Metrics
const countEl = document.getElementById('stat-count');
const origEl = document.getElementById('stat-original');
const optEl = document.getElementById('stat-optimized');
const savedEl = document.getElementById('stat-saved');
const tableCountEl = document.getElementById('table-count');
const tbody = document.getElementById('files-tbody');

// Full-Window Drag Overlay Element
const windowDragOverlay = document.getElementById('window-drag-overlay');

// Comparison Modal Elements
const comparisonModal = document.getElementById('comparison-modal');
const btnCloseComparison = document.getElementById('btn-close-comparison');
const compFilename = document.getElementById('comp-filename');
const compFormatChips = document.getElementById('comp-format-chips');
const compImgOrig = document.getElementById('comp-img-orig');
const compImgOpt = document.getElementById('comp-img-opt');
const compOrigSize = document.getElementById('comp-orig-size');
const compOptFormat = document.getElementById('comp-opt-format');
const compOptSize = document.getElementById('comp-opt-size');
const compOptSaving = document.getElementById('comp-opt-saving');
const compStatsSummary = document.getElementById('comp-stats-summary');
const btnCopyComp = document.getElementById('btn-copy-comp');
const btnDownloadComp = document.getElementById('btn-download-comp');
const splitContainer = document.getElementById('split-container');
const layerCompressed = document.getElementById('layer-compressed');
const splitDivider = document.getElementById('split-divider');
const zoomBtns = document.querySelectorAll('.btn-zoom');
const compQualityPanel = document.getElementById('comp-quality-panel');
const compQualitySlider = document.getElementById('comp-quality-slider');
const compQualityValue = document.getElementById('comp-quality-value');
const compQualityLiveSize = document.getElementById('comp-quality-live-size');
const btnQualityReset = document.getElementById('btn-quality-reset');
const btnQualitySave = document.getElementById('btn-quality-save');

let currentStatsFiles = [];
let currentStatsData = { files: [], summary: { totalOriginal: 0, totalOptimized: 0, totalSavings: 0 } };
let activeCompFile = null;
let activeTargetFormat = null;
let isDraggingSplit = false;
let isPanningZoom = false;
let panStartX = 0;
let panStartY = 0;
let panStartScrollLeft = 0;
let panStartScrollTop = 0;
let lastSplitScrollLeft = 0;

function showToast(message, isError = false) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.style.background = isError ? '#ef4444' : '#10b981';
  toastEl.style.display = 'block';
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 3500);
}

// Update Dropzone Mode Hint
function updateModeHint() {
  if (!dropzoneHint) return;
  if (currentMode === 'icon') {
    formatsPanel.style.display = 'none';
    dropzoneHint.innerHTML = t('dropzoneHintIcons');
  } else if (currentMode === 'pdf') {
    formatsPanel.style.display = 'flex';
    dropzoneHint.innerHTML = t('dropzoneHintPdf');
  } else {
    formatsPanel.style.display = 'flex';
    dropzoneHint.innerHTML = t('dropzoneHintImages');
  }
}

// 1. Studio Tab Navigation
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    updateModeHint();
  });
});

// Language Switcher Handlers
document.querySelectorAll('.btn-lang').forEach(btn => {
  btn.addEventListener('click', () => {
    setLang(btn.dataset.lang);
    updateModeHint();
    renderStats(currentStatsData);
  });
});

// 2. Format Selection Helper
function getSelectedFormats() {
  const checkboxes = document.querySelectorAll('input[name="format"]:checked');
  const selected = Array.from(checkboxes).map(cb => cb.value);
  return selected.length > 0 ? selected : ['webp', 'jpg', 'png'];
}

// 3. File Browse & Dropzone Trigger
btnBrowse.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

formatsPanel.addEventListener('click', (e) => {
  e.stopPropagation();
});

dropzone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files?.length) {
    handleFiles(Array.from(e.target.files));
    fileInput.value = '';
  }
});

// 4. Drag & Drop Listeners (Dropzone + Full-Window)
let dragCounter = 0;

['dragenter', 'dragover'].forEach(eventName => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('is-dragover');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('is-dragover');
  });
});

dropzone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  if (dt?.files?.length) {
    handleFiles(Array.from(dt.files));
  }
});

// Full-Window Drag & Drop
window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
    windowDragOverlay?.classList.add('active');
  }
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
});

window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter = Math.max(0, dragCounter - 1);
  if (dragCounter === 0) {
    windowDragOverlay?.classList.remove('active');
  }
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  windowDragOverlay?.classList.remove('active');
  if (e.dataTransfer?.files?.length) {
    handleFiles(Array.from(e.dataTransfer.files));
  }
});

// 5. Upload & Process Files
async function handleFiles(files) {
  if (!files.length) return;

  processingBanner.style.display = 'flex';
  const targetFormats = getSelectedFormats();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    processingText.textContent = `[${i + 1}/${files.length}] ${file.name}...`;

    try {
      const base64 = await readFileAsBase64(file);
      await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mode: currentMode,
          base64,
          targetFormats,
        }),
      });
    } catch (err) {
      console.error(`Upload error for ${file.name}:`, err);
    }
  }

  processingBanner.style.display = 'none';
  await loadStats();
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.substring(result.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 6. Action Buttons
btnDownloadZip?.addEventListener('click', () => {
  window.location.href = '/api/download-zip';
});

btnClean?.addEventListener('click', async () => {
  if (confirm(t('confirmClean'))) {
    try {
      await fetch('/api/clean', { method: 'POST' });
      await loadStats();
      showToast(t('toastCleaned'));
    } catch (err) {
      console.error('Clean error:', err);
    }
  }
});

btnRefresh?.addEventListener('click', loadStats);

// 7. Settings Modal Logic
function openSettings() {
  settingsModal.style.display = 'flex';
  loadSettings();
}

function closeSettings() {
  settingsModal.style.display = 'none';
}

btnOpenSettings?.addEventListener('click', openSettings);
btnCloseModal?.addEventListener('click', closeSettings);
btnCancelModal?.addEventListener('click', closeSettings);

// A `click` event's target resolves to the nearest common ancestor of the
// mousedown and mouseup elements -- so a drag that starts on something
// inside the dialog (a slider, the comparison split-divider, click-drag
// panning) and merely ends up released over the dark backdrop fires a click
// whose target IS the backdrop, closing the modal mid-drag. Only close when
// the gesture both started and ended on the backdrop itself, never a drag.
function bindBackdropClose(modalEl, closeFn) {
  if (!modalEl) return;
  let downOnBackdrop = false;
  modalEl.addEventListener('mousedown', (e) => {
    downOnBackdrop = e.target === modalEl;
  });
  modalEl.addEventListener('click', (e) => {
    if (downOnBackdrop && e.target === modalEl) closeFn();
    downOnBackdrop = false;
  });
}

bindBackdropClose(settingsModal, closeSettings);

modalTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modalTabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.settingsTab;
    if (tabIncoming) tabIncoming.style.display = target === 'incoming' ? 'block' : 'none';
    if (tabOutgoing) tabOutgoing.style.display = target === 'outgoing' ? 'block' : 'none';
    if (tabPaths) tabPaths.style.display = target === 'paths' ? 'block' : 'none';
  });
});

// Slider Value Bindings
function bindSlider(slider, badge, unit = '%') {
  if (!slider || !badge) return;
  slider.addEventListener('input', () => {
    badge.textContent = `${slider.value}${unit}`;
  });
}

bindSlider(cfgMaxDim, valMaxDim, ' px');
bindSlider(cfgWebpQuality, valWebpQ, '%');
bindSlider(cfgWebpEffort, valWebpEffort, '');
bindSlider(cfgAvifQuality, valAvifQ, '%');
bindSlider(cfgAvifEffort, valAvifEffort, '');
bindSlider(cfgJpgQuality, valJpgQ, '%');
bindSlider(cfgPngQuality, valPngQ, '%');
bindSlider(cfgPngComp, valPngComp, '');
bindSlider(cfgPdfQuality, valPdfQ, '%');

async function loadSettings() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    currentConfig = await res.json();
    populateSettingsForm(currentConfig);
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function populateSettingsForm(cfg) {
  if (!cfg) return;

  // Paths & Server
  if (cfg.paths) {
    if (cfgPathInput) cfgPathInput.value = cfg.paths.input || 'input';
    if (cfgPathOutput) cfgPathOutput.value = cfg.paths.output || 'output';
  }
  if (cfg.server && cfgServerPort) {
    cfgServerPort.value = cfg.server.port || 4040;
  }

  // Incoming
  if (cfg.incoming) {
    cfgMaxDim.value = cfg.incoming.maxDimension ?? 2560;
    valMaxDim.textContent = `${cfgMaxDim.value} px`;
    cfgPdfDpi.value = String(cfg.incoming.pdfRenderDpi ?? 150);
    cfgAutoOrient.checked = Boolean(cfg.incoming.autoOrient ?? true);
    cfgSrgb.checked = Boolean(cfg.incoming.convertToSrgb ?? true);
  }

  // Outgoing
  if (cfg.outgoing) {
    // Per-format enable/disable toggles
    const enabledFormats = cfg.outgoing.enabledFormats || ['webp', 'avif', 'jpg', 'png'];
    FORMAT_TOGGLES.forEach(({ key, checkbox }) => {
      if (!checkbox) return;
      checkbox.checked = enabledFormats.includes(key);
      applyFormatToggleState(checkbox);
    });

    // WebP
    cfgWebpQuality.value = cfg.outgoing.webp?.quality ?? 80;
    valWebpQ.textContent = `${cfgWebpQuality.value}%`;
    cfgWebpEffort.value = cfg.outgoing.webp?.effort ?? 4;
    valWebpEffort.textContent = cfgWebpEffort.value;
    cfgWebpLossless.checked = Boolean(cfg.outgoing.webp?.lossless ?? false);

    // AVIF
    cfgAvifQuality.value = cfg.outgoing.avif?.quality ?? 75;
    valAvifQ.textContent = `${cfgAvifQuality.value}%`;
    cfgAvifEffort.value = cfg.outgoing.avif?.effort ?? 4;
    valAvifEffort.textContent = cfgAvifEffort.value;

    // JPG
    cfgJpgQuality.value = cfg.outgoing.jpg?.quality ?? 80;
    valJpgQ.textContent = `${cfgJpgQuality.value}%`;
    cfgJpgTrellis.checked = Boolean(cfg.outgoing.jpg?.trellisQuantisation ?? true);
    cfgJpgOvershoot.checked = Boolean(cfg.outgoing.jpg?.overshootDeringing ?? true);
    cfgJpgProgressive.checked = Boolean(cfg.outgoing.jpg?.progressive ?? true);

    // PNG
    cfgPngQuality.value = cfg.outgoing.png?.quality ?? 85;
    valPngQ.textContent = `${cfgPngQuality.value}%`;
    cfgPngComp.value = cfg.outgoing.png?.compressionLevel ?? 9;
    valPngComp.textContent = cfgPngComp.value;
    cfgPngPalette.checked = Boolean(cfg.outgoing.png?.palette ?? true);

    // PDF
    cfgPdfScreenDpi.value = String(cfg.outgoing.pdf?.screenDpi ?? 150);
    cfgPdfQuality.value = cfg.outgoing.pdf?.imageQuality ?? 80;
    valPdfQ.textContent = `${cfgPdfQuality.value}%`;

    // SVGO
    cfgSvgoViewbox.checked = !cfg.outgoing.icons?.svgo?.removeViewBox;
    cfgSvgoMultipass.checked = Boolean(cfg.outgoing.icons?.svgo?.multipass ?? true);
  }
}

function collectSettingsFromForm() {
  return {
    paths: {
      input: cfgPathInput?.value?.trim() || 'input',
      output: cfgPathOutput?.value?.trim() || 'output',
    },
    server: {
      port: Number(cfgServerPort?.value) || 4040,
    },
    incoming: {
      maxDimension: Number(cfgMaxDim.value),
      autoOrient: cfgAutoOrient.checked,
      convertToSrgb: cfgSrgb.checked,
      pdfRenderDpi: Number(cfgPdfDpi.value),
    },
    outgoing: {
      enabledFormats: collectEnabledFormats(),
      webp: {
        quality: Number(cfgWebpQuality.value),
        effort: Number(cfgWebpEffort.value),
        lossless: cfgWebpLossless.checked,
      },
      avif: {
        quality: Number(cfgAvifQuality.value),
        effort: Number(cfgAvifEffort.value),
        chromaSubsampling: '4:2:0',
      },
      jpg: {
        quality: Number(cfgJpgQuality.value),
        mozjpeg: true,
        progressive: cfgJpgProgressive.checked,
        trellisQuantisation: cfgJpgTrellis.checked,
        overshootDeringing: cfgJpgOvershoot.checked,
        chromaSubsampling: '4:2:0',
      },
      png: {
        quality: Number(cfgPngQuality.value),
        palette: cfgPngPalette.checked,
        compressionLevel: Number(cfgPngComp.value),
        effort: 7,
      },
      icons: {
        svgo: {
          multipass: cfgSvgoMultipass.checked,
          removeViewBox: !cfgSvgoViewbox.checked,
          cleanupIds: true,
          collapseGroups: true,
        },
        pngQuality: Number(cfgPngQuality.value),
        pngPalette: cfgPngPalette.checked,
      },
      pdf: {
        screenDpi: Number(cfgPdfScreenDpi.value),
        imageQuality: Number(cfgPdfQuality.value),
        useObjectStreams: true,
      },
    },
  };
}

function handlePortRedirect(newPort) {
  if (!portRedirectOverlay) {
    window.location.href = `${window.location.protocol}//${window.location.hostname}:${newPort}${window.location.pathname}`;
    return;
  }

  const rawMsg = t('redirectMessage').replace('{port}', newPort);
  if (redirectMsg) redirectMsg.innerHTML = rawMsg;
  portRedirectOverlay.style.display = 'flex';

  let remaining = 3;
  const timer = setInterval(() => {
    remaining -= 1;
    const cd = document.getElementById('redirect-countdown');
    if (cd) cd.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(timer);
      window.location.href = `${window.location.protocol}//${window.location.hostname}:${newPort}${window.location.pathname}`;
    }
  }, 1000);
}

btnSaveConfig?.addEventListener('click', async () => {
  const newConfig = collectSettingsFromForm();
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    if (res.ok) {
      const data = await res.json();
      currentConfig = newConfig;
      showToast(t('toastSaved'));
      closeSettings();

      if (data.portChanged && data.newPort) {
        handlePortRedirect(data.newPort);
      }
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, true);
  }
});

// Presets Handler
const presetBtns = document.querySelectorAll('.btn-preset');

presetBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    const presetKey = btn.dataset.preset;
    presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    try {
      const res = await fetch('/api/config/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: presetKey }),
      });
      if (res.ok) {
        const data = await res.json();
        currentConfig = data.config;
        populateSettingsForm(currentConfig);
        showToast(`${t('toastPresetApplied')}${btn.textContent.trim()}`);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, true);
    }
  });
});

btnResetConfig?.addEventListener('click', async () => {
  if (confirm(t('confirmReset'))) {
    try {
      const res = await fetch('/api/config/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: 'web_standard' }),
      });
      if (res.ok) {
        const data = await res.json();
        currentConfig = data.config;
        populateSettingsForm(currentConfig);
        presetBtns.forEach(b => {
          b.classList.toggle('active', b.dataset.preset === 'web_standard');
        });
        showToast(t('toastReset'));
        if (data.portChanged && data.newPort) {
          closeSettings();
          handlePortRedirect(data.newPort);
        }
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, true);
    }
  }
});

btnReoptimize?.addEventListener('click', async () => {
  closeSettings();
  processingBanner.style.display = 'flex';
  processingText.textContent = 'Re-processing assets...';
  try {
    await fetch('/api/reoptimize', { method: 'POST' });
    await loadStats();
    showToast(t('toastReoptimized'));
  } catch (err) {
    showToast(`Error: ${err.message}`, true);
  } finally {
    processingBanner.style.display = 'none';
  }
});

// 8. Load & Render Stats
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();
    renderStats(data);
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function renderStats(data) {
  const { files = [], summary = { totalOriginal: 0, totalOptimized: 0, totalSavings: 0 } } = data;
  currentStatsFiles = files;
  currentStatsData = { files, summary };

  countEl.textContent = files.length;
  origEl.textContent = formatBytes(summary.totalOriginal);
  optEl.textContent = formatBytes(summary.totalOptimized);

  const totalPct = summary.totalOriginal > 0
    ? Math.round((summary.totalSavings / summary.totalOriginal) * 100)
    : 0;
  savedEl.textContent = `${totalPct}% (${formatBytes(summary.totalSavings)})`;
  tableCountEl.textContent = `${files.length} items`;

  if (files.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          ${t('emptyTable')}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = files.map(file => {
    const isSvg = (file.outputs || []).some(o => o.format === 'svg');
    const svgOut = (file.outputs || []).find(o => o.format === 'svg');
    const svgUrl = svgOut ? getOutputUrl(svgOut) : '';

    const formatButtons = (file.outputs || []).map(out => {
      const url = getOutputUrl(out);
      return `
        <a href="${url}" download="${file.filename.replace(/\.[^/.]+$/, '')}.${out.format}" class="btn-download-format" title="${out.path}">
          ${out.format.toUpperCase()} <strong>${formatBytes(out.size)}</strong> ⬇
        </a>
      `;
    }).join('');

    let thumbHtml;
    const firstImg = (file.outputs || []).find(o => ['webp', 'jpg', 'png', 'svg'].includes(o.format));
    if (firstImg) {
      const thumbUrl = getOutputUrl(firstImg);
      thumbHtml = `<img src="${thumbUrl}" class="file-thumb" alt="${file.filename}" onerror="this.outerHTML='<div class=\\'file-thumb\\'>🖼</div>'">`;
    } else if (file.type === 'pdf') {
      thumbHtml = `<div class="file-thumb" style="color: var(--accent-magenta);">📄</div>`;
    } else {
      thumbHtml = `<div class="file-thumb">🖼</div>`;
    }

    const typeLabel = file.type === 'image' ? t('badgeImage') : (file.type === 'icon' ? t('badgeIcon') : t('badgePdf'));

    const quickActions = `
      <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
        <button type="button" class="btn-action-view" data-filename="${file.filename}" title="${t('btnCompareTitle')}">
          ${t('btnCompare')}
        </button>
        ${isSvg ? `<button type="button" class="btn-copy-svg-quick" data-svg-url="${svgUrl}" title="${t('btnCopySvgTitle')}">${t('btnCopySvg')}</button>` : ''}
      </div>
    `;

    return `
      <tr class="row-clickable" data-filename="${file.filename}">
        <td>${thumbHtml}</td>
        <td><span class="badge ${file.type}">${typeLabel}</span></td>
        <td><strong>${file.filename}</strong></td>
        <td>${file.dimensions || '—'}</td>
        <td>${formatBytes(file.originalSize)}</td>
        <td><strong>${formatBytes(file.bestSize)}</strong></td>
        <td><span class="saving-pill">-${file.savingsPct}%</span></td>
        <td>
          ${quickActions}
          <div class="format-buttons">${formatButtons}</div>
        </td>
      </tr>
    `;
  }).join('');
}

// Table Action Delegation (Row Click & Action Buttons)
tbody?.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.btn-copy-svg-quick');
  if (copyBtn) {
    e.stopPropagation();
    copySvgFromUrl(copyBtn.dataset.svgUrl);
    return;
  }

  const viewBtn = e.target.closest('.btn-action-view');
  if (viewBtn) {
    e.stopPropagation();
    const fname = viewBtn.dataset.filename;
    const file = currentStatsFiles.find(f => f.filename === fname);
    if (file) openComparison(file);
    return;
  }

  const downloadLink = e.target.closest('.btn-download-format');
  if (downloadLink) {
    return;
  }

  const row = e.target.closest('tr.row-clickable');
  if (row) {
    const fname = row.dataset.filename;
    const file = currentStatsFiles.find(f => f.filename === fname);
    if (file) openComparison(file);
  }
});

// ============================================================
// 9. Split Comparison Modal Logic (Squoosh Style)
// ============================================================
// The divider/clip-path position is stored in PIXELS within the container's
// static (unscrolled) local coordinate frame -- NOT a percentage of the
// container's own width. A percentage is clamped to the container's own
// (visible, unscrolled) width, but once zoomed and panned, a screen position
// can correspond to a local coordinate well beyond that width (up to
// scrollWidth) -- percentage-based positioning saturated at 100% there,
// which collapsed the clip-path to a zero-width polygon. clip-path/left
// accept plain px offsets from the reference box's own origin just fine
// even beyond its nominal size, so pixels have no such ceiling.
// The divider's `top`/height (from the stylesheet's `top:0; bottom:0`) is
// subject to the exact same scroll-shift as its `left` -- panning vertically
// drags the whole line up/down with the content, so its top can end up
// above the visible viewport and its bottom short of it, leaving a gap with
// no visible line (unlike the horizontal split point, there's nothing
// "logical" to preserve here -- the line should simply always span the
// current viewport exactly, so this is resynced from scrollTop directly
// rather than accumulated like the horizontal position).
function syncDividerVerticalSpan() {
  if (!splitDivider || !splitContainer) return;
  const rect = splitContainer.getBoundingClientRect();
  splitDivider.style.top = `${splitContainer.scrollTop}px`;
  splitDivider.style.height = `${rect.height}px`;
}

function setSplitPosition(px) {
  if (!splitContainer) return;
  const rect = splitContainer.getBoundingClientRect();
  const maxPx = Math.max(rect.width, splitContainer.scrollWidth || rect.width);
  px = Math.max(0, Math.min(maxPx, px));
  if (splitDivider) splitDivider.style.left = `${px}px`;
  if (layerCompressed) {
    // clip-path is relative to layer-compressed's OWN border box, which --
    // same as the divider's `left` -- shifts with scroll instead of tracking
    // the viewport. `px` (the divider edge) already accounts for that (see
    // updateSplitFromClientX/compensateSplitForScroll), but the "far" edges
    // were hardcoded to the box's static size, so past this element's own
    // origin the clip stopped reaching the actual (scrolled) viewport edge --
    // leaving a scrollLeft/scrollTop-sized strip that always showed the
    // original layer underneath no matter where the divider was. Offsetting
    // every non-divider edge by the current scroll keeps the clip glued to
    // the real, currently-visible viewport instead of this element's
    // unscrolled footprint.
    const top = splitContainer.scrollTop;
    const bottom = splitContainer.scrollTop + rect.height;
    const right = rect.width + splitContainer.scrollLeft;
    layerCompressed.style.clipPath = `polygon(${px}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${px}px ${bottom}px)`;
  }
  syncDividerVerticalSpan();
}

function updateSplitFromClientX(clientX) {
  if (!splitContainer) return;
  const rect = splitContainer.getBoundingClientRect();
  if (rect.width <= 0) return;
  // Screen-space cursor offset shifted into the static local frame by
  // however far the content is currently panned.
  setSplitPosition(clientX - rect.left + splitContainer.scrollLeft);
}

if (splitDivider) {
  splitDivider.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDraggingSplit = true;
    splitDivider.classList.add('is-dragging');
  });

  splitDivider.addEventListener('touchstart', () => {
    isDraggingSplit = true;
    splitDivider.classList.add('is-dragging');
  }, { passive: true });
}

window.addEventListener('mousemove', (e) => {
  if (!isDraggingSplit) return;
  e.preventDefault();
  updateSplitFromClientX(e.clientX);
});

window.addEventListener('touchmove', (e) => {
  if (!isDraggingSplit || !e.touches?.length) return;
  updateSplitFromClientX(e.touches[0].clientX);
}, { passive: true });

window.addEventListener('mouseup', () => {
  if (isDraggingSplit) {
    isDraggingSplit = false;
    splitDivider?.classList.remove('is-dragging');
  }
});

window.addEventListener('touchend', () => {
  if (isDraggingSplit) {
    isDraggingSplit = false;
    splitDivider?.classList.remove('is-dragging');
  }
});

// Click-drag panning of the zoomed image (100%/200%). Grabs anywhere on the
// image itself -- `.split-layer`/`.comp-img` have pointer-events: none, so
// the mousedown target is always the container -- except the split-divider
// handle, which keeps its own drag-to-compare behavior above.
function startPan(clientX, clientY) {
  if (!splitContainer || splitContainer.classList.contains('zoom-fit')) return;
  isPanningZoom = true;
  panStartX = clientX;
  panStartY = clientY;
  panStartScrollLeft = splitContainer.scrollLeft;
  panStartScrollTop = splitContainer.scrollTop;
  splitContainer.classList.add('is-panning');
}

function updatePan(clientX, clientY) {
  if (!isPanningZoom || !splitContainer) return;
  splitContainer.scrollLeft = panStartScrollLeft - (clientX - panStartX);
  splitContainer.scrollTop = panStartScrollTop - (clientY - panStartY);
}

// The split-divider/compare-clip live inside this same scrolling element, so
// ANY horizontal scroll -- click-drag panning, mouse wheel, or dragging the
// native scrollbar thumb -- would otherwise drag the divider along with the
// image. Listening on 'scroll' (rather than only inside updatePan) catches
// every one of those sources uniformly: shift the split percentage by
// whatever scrollLeft actually moved since the last event, so the divider
// stays exactly where the user put it on screen while the image pans
// underneath it.
function compensateSplitForScroll() {
  if (!splitContainer) return;
  const dx = splitContainer.scrollLeft - lastSplitScrollLeft;
  lastSplitScrollLeft = splitContainer.scrollLeft;
  // setSplitPosition() also rebuilds the clip-path's top/bottom/right edges
  // from the current scrollTop/scrollLeft (see its comment) -- those need
  // resyncing on a vertical-only scroll too (dx === 0), not just when the
  // horizontal split point itself needs to shift.
  const rect = splitContainer.getBoundingClientRect();
  const fallbackPx = rect.width / 2;
  const currentPx = parseFloat(splitDivider?.style.left);
  setSplitPosition((Number.isFinite(currentPx) ? currentPx : fallbackPx) + dx);
}

splitContainer?.addEventListener('scroll', compensateSplitForScroll);

function endPan() {
  if (!isPanningZoom) return;
  isPanningZoom = false;
  splitContainer?.classList.remove('is-panning');
}

splitContainer?.addEventListener('mousedown', (e) => {
  if (e.target.closest('.split-divider')) return;
  startPan(e.clientX, e.clientY);
  if (isPanningZoom) e.preventDefault();
});

splitContainer?.addEventListener('touchstart', (e) => {
  if (e.target.closest('.split-divider') || !e.touches?.length) return;
  startPan(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

window.addEventListener('mousemove', (e) => {
  if (!isPanningZoom) return;
  e.preventDefault();
  updatePan(e.clientX, e.clientY);
});

window.addEventListener('touchmove', (e) => {
  if (!isPanningZoom || !e.touches?.length) return;
  updatePan(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

window.addEventListener('mouseup', endPan);
window.addEventListener('touchend', endPan);

// Zoom Controls
function setZoom(mode) {
  if (!splitContainer) return;
  splitContainer.classList.remove('zoom-fit', 'zoom-100', 'zoom-200');
  if (mode === 'fit') {
    splitContainer.classList.add('zoom-fit');
  } else if (mode === '1') {
    splitContainer.classList.add('zoom-100');
  } else if (mode === '2') {
    splitContainer.classList.add('zoom-200');
  }
  zoomBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.zoom === mode);
  });
  // Switching zoom level changes what scrollLeft/scrollTop even mean (the
  // scrollable range is different at 100% vs 200%), so start unpanned and
  // resync the divider's scroll-compensation baseline to match.
  splitContainer.scrollLeft = 0;
  splitContainer.scrollTop = 0;
  lastSplitScrollLeft = 0;
}

zoomBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    setZoom(btn.dataset.zoom);
  });
});

// SVG Clipboard Copy
async function copySvgFromUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Could not fetch SVG');
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    showToast(t('toastSvgCopied'));
  } catch (err) {
    showToast(`Copy error: ${err.message}`, true);
  }
}

// Open Comparison Modal
function openComparison(file, preferredFormat = null) {
  if (!file) return;
  activeCompFile = file;

  const formats = (file.outputs || []).map(o => o.format);
  if (preferredFormat && formats.includes(preferredFormat)) {
    activeTargetFormat = preferredFormat;
  } else {
    const preferredOrder = ['webp', 'avif', 'svg', 'jpg', 'png'];
    activeTargetFormat = preferredOrder.find(f => formats.includes(f)) || formats[0] || 'webp';
  }

  if (compFilename) {
    compFilename.textContent = `${file.filename}${file.dimensions && file.dimensions !== '?' ? ` (${file.dimensions})` : ''}`;
  }

  if (compImgOrig) {
    compImgOrig.onerror = () => {
      const fallback = (file.outputs || []).find(o => ['webp', 'jpg', 'png', 'svg'].includes(o.format));
      if (fallback) compImgOrig.src = getOutputUrl(fallback);
    };
    compImgOrig.src = `/api/original?file=${encodeURIComponent(file.filename)}`;
  }

  if (compOrigSize) {
    compOrigSize.textContent = formatBytes(file.originalSize);
  }

  // Populate format chips
  if (compFormatChips) {
    compFormatChips.innerHTML = (file.outputs || []).map(out => {
      const isSelected = out.format === activeTargetFormat;
      return `
        <button type="button" class="comp-chip ${isSelected ? 'active' : ''}" data-format="${out.format}">
          ${out.format.toUpperCase()} (${formatBytes(out.size)})
        </button>
      `;
    }).join('');

    compFormatChips.querySelectorAll('.comp-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        updateComparisonOutput(chip.dataset.format);
      });
    });
  }

  updateComparisonOutput(activeTargetFormat);

  // Show the modal before measuring/positioning the split-divider -- while
  // hidden (display:none) the container has a zero-size bounding rect, which
  // would set the divider's pixel position (and clip-path) to garbage.
  if (comparisonModal) comparisonModal.style.display = 'flex';
  setZoom('fit');
  const containerRect = splitContainer?.getBoundingClientRect();
  setSplitPosition(containerRect ? containerRect.width / 2 : 0);
}

function updateComparisonOutput(format) {
  if (!activeCompFile) return;
  const out = (activeCompFile.outputs || []).find(o => o.format === format) || activeCompFile.outputs?.[0];
  if (!out) return;

  activeTargetFormat = out.format;
  compFormatChips?.querySelectorAll('.comp-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.format === activeTargetFormat);
  });

  const optUrl = getOutputUrl(out);
  if (compImgOpt) {
    // Non-raster outputs (currently: 'pdf') can't render inside an <img>;
    // fall back to a raster sibling output for the visual preview while
    // format/size/download below still reflect the actually selected output.
    compImgOpt.onerror = () => {
      const fallback = (activeCompFile.outputs || []).find(o => o !== out && ['webp', 'jpg', 'png', 'svg'].includes(o.format));
      if (fallback) compImgOpt.src = getOutputUrl(fallback);
    };
    compImgOpt.src = optUrl;
  }
  if (compOptFormat) compOptFormat.textContent = out.format.toUpperCase();
  if (compOptSize) compOptSize.textContent = formatBytes(out.size);

  const savings = Math.max(0, activeCompFile.originalSize - out.size);
  const pct = activeCompFile.originalSize > 0 ? Math.round((savings / activeCompFile.originalSize) * 100) : 0;
  if (compOptSaving) compOptSaving.textContent = `-${pct}%`;

  if (compStatsSummary) {
    compStatsSummary.innerHTML = `${t('badgeOriginal')}: <strong>${formatBytes(activeCompFile.originalSize)}</strong> → ${out.format.toUpperCase()}: <strong>${formatBytes(out.size)}</strong> (${t('colSavings')}: <strong>${formatBytes(savings)}</strong> / <strong>${pct}%</strong>)`;
  }

  if (btnDownloadComp) {
    btnDownloadComp.href = optUrl;
    btnDownloadComp.setAttribute('download', `${activeCompFile.filename.replace(/\.[^/.]+$/, '')}.${out.format}`);
  }

  if (btnCopyComp) {
    if (out.format === 'svg') {
      btnCopyComp.style.display = 'inline-flex';
      btnCopyComp.onclick = () => copySvgFromUrl(optUrl);
    } else {
      btnCopyComp.style.display = 'none';
    }
  }

  setupQualityPanel(format);
}

// ============================================================
// 9b. Live Quality Slider (Compare modal)
// ============================================================
const LIVE_QUALITY_FORMATS = ['webp', 'avif', 'jpg', 'png'];
let qualityPreviewUrl = null;
let qualityDebounceTimer = null;
let qualityBaseline = null;

function getConfiguredQuality(format) {
  return Number(currentConfig?.outgoing?.[format]?.quality ?? 80);
}

function revokeQualityPreview() {
  if (qualityPreviewUrl) {
    URL.revokeObjectURL(qualityPreviewUrl);
    qualityPreviewUrl = null;
  }
}

function setQualityDirty(dirty) {
  if (!btnQualitySave) return;
  btnQualitySave.disabled = !dirty;
  btnQualitySave.textContent = t('btnSaveQuality');
}

// Only image-type files with a quality-adjustable raster format (not SVG,
// not PDF-derived rasters -- those go through sips/DPI, not sharp quality).
function setupQualityPanel(format) {
  if (!compQualityPanel) return;
  clearTimeout(qualityDebounceTimer);
  revokeQualityPreview();
  const supported = activeCompFile?.type === 'image' && LIVE_QUALITY_FORMATS.includes(format);
  compQualityPanel.style.display = supported ? 'flex' : 'none';
  if (!supported) return;

  const defaultQ = getConfiguredQuality(format);
  qualityBaseline = defaultQ;
  if (compQualitySlider) compQualitySlider.value = String(defaultQ);
  if (compQualityValue) compQualityValue.textContent = `${defaultQ}%`;
  if (compQualityLiveSize) compQualityLiveSize.textContent = '';
  setQualityDirty(false);
}

async function fetchQualityPreview(quality) {
  if (!activeCompFile || !activeTargetFormat) return;
  try {
    const res = await fetch('/api/preview-format-quality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: activeCompFile.filename, format: activeTargetFormat, quality }),
    });
    if (!res.ok) throw new Error('preview request failed');
    const blob = await res.blob();
    revokeQualityPreview();
    qualityPreviewUrl = URL.createObjectURL(blob);
    if (compImgOpt) compImgOpt.src = qualityPreviewUrl;
    if (compQualityLiveSize) compQualityLiveSize.textContent = formatBytes(blob.size);
  } catch {
    showToast(t('toastQualityError'), true);
  }
}

compQualitySlider?.addEventListener('input', () => {
  const q = Number(compQualitySlider.value);
  if (compQualityValue) compQualityValue.textContent = `${q}%`;
  setQualityDirty(q !== qualityBaseline);
  clearTimeout(qualityDebounceTimer);
  qualityDebounceTimer = setTimeout(() => fetchQualityPreview(q), 250);
});

btnQualityReset?.addEventListener('click', () => {
  if (!activeTargetFormat) return;
  // Move the slider back to the standard/global quality and preview it --
  // this never silently touches the saved file; Save re-enables if the
  // standard value differs from what is actually saved on disk.
  const defaultQ = getConfiguredQuality(activeTargetFormat);
  if (compQualitySlider) compQualitySlider.value = String(defaultQ);
  if (compQualityValue) compQualityValue.textContent = `${defaultQ}%`;
  setQualityDirty(defaultQ !== qualityBaseline);
  clearTimeout(qualityDebounceTimer);
  fetchQualityPreview(defaultQ);
});

btnQualitySave?.addEventListener('click', async () => {
  if (!activeCompFile || !activeTargetFormat || btnQualitySave.disabled) return;
  const q = Number(compQualitySlider.value);
  btnQualitySave.disabled = true;
  btnQualitySave.textContent = t('btnSaveQualitySaving');
  try {
    const res = await fetch('/api/save-format-quality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: activeCompFile.filename, format: activeTargetFormat, quality: q }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'save failed');

    qualityBaseline = q;
    activeCompFile = data.file;

    const out = activeCompFile.outputs.find(o => o.format === activeTargetFormat);
    if (out) {
      if (compOptSize) compOptSize.textContent = formatBytes(out.size);
      const savings = Math.max(0, activeCompFile.originalSize - out.size);
      const pct = activeCompFile.originalSize > 0 ? Math.round((savings / activeCompFile.originalSize) * 100) : 0;
      if (compOptSaving) compOptSaving.textContent = `-${pct}%`;
      if (compStatsSummary) {
        compStatsSummary.innerHTML = `${t('badgeOriginal')}: <strong>${formatBytes(activeCompFile.originalSize)}</strong> → ${out.format.toUpperCase()}: <strong>${formatBytes(out.size)}</strong> (${t('colSavings')}: <strong>${formatBytes(savings)}</strong> / <strong>${pct}%</strong>)`;
      }
      const chip = compFormatChips?.querySelector(`.comp-chip[data-format="${activeTargetFormat}"]`);
      if (chip) chip.innerHTML = `${activeTargetFormat.toUpperCase()} (${formatBytes(out.size)})`;
    }

    btnQualitySave.textContent = t('btnSaveQualitySaved');
    showToast(t('toastQualitySaved'));
    setTimeout(() => { if (btnQualitySave) btnQualitySave.textContent = t('btnSaveQuality'); }, 1500);

    if (data.stats) renderStats(data.stats);
  } catch {
    showToast(t('toastQualityError'), true);
    btnQualitySave.disabled = false;
    btnQualitySave.textContent = t('btnSaveQuality');
  }
});

function closeComparison() {
  if (comparisonModal) comparisonModal.style.display = 'none';
  clearTimeout(qualityDebounceTimer);
  revokeQualityPreview();
}

btnCloseComparison?.addEventListener('click', closeComparison);
bindBackdropClose(comparisonModal, closeComparison);

// ============================================================
// 10. Directory Navigator Modal Logic
// ============================================================
function openDirPicker(targetInputId) {
  activePathTargetInput = document.getElementById(targetInputId);
  const initialPath = activePathTargetInput?.value?.trim() || '';
  currentNavSelectedPath = initialPath;
  if (dirPickerModal) dirPickerModal.style.display = 'flex';
  loadDirectory(initialPath);
}

function closeDirPicker() {
  if (dirPickerModal) dirPickerModal.style.display = 'none';
  activePathTargetInput = null;
}

async function loadDirectory(pathStr) {
  try {
    const query = pathStr ? `?path=${encodeURIComponent(pathStr)}` : '';
    const res = await fetch(`/api/fs/browse${query}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.error || 'Failed to read directory', true);
      return;
    }
    const data = await res.json();
    currentNavSelectedPath = data.currentPath;
    renderDirNavigator(data);
  } catch (err) {
    showToast(`Error browsing directory: ${err.message}`, true);
  }
}

function renderDirNavigator(data) {
  if (dirSelectedPath) dirSelectedPath.textContent = data.currentPath;

  if (dirQuickLinks) {
    dirQuickLinks.innerHTML = (data.quickLinks || []).map(link => `
      <button type="button" class="btn-quick-link" data-path="${link.path}">
        ${link.name === 'Project' ? '⚡ ' + t('quickProject') :
          link.name === 'Home' ? '🏠 ' + t('quickHome') :
          link.name === 'Desktop' ? '🖥 ' + t('quickDesktop') :
          link.name === 'Downloads' ? '⬇ ' + t('quickDownloads') :
          link.name === 'Pictures' ? '🖼 ' + t('quickPictures') : link.name}
      </button>
    `).join('');

    dirQuickLinks.querySelectorAll('.btn-quick-link').forEach(btn => {
      btn.addEventListener('click', () => loadDirectory(btn.dataset.path));
    });
  }

  if (btnDirParent) {
    btnDirParent.disabled = !data.parentPath;
    btnDirParent.onclick = () => {
      if (data.parentPath) loadDirectory(data.parentPath);
    };
  }

  if (dirBreadcrumbs) {
    const isWindows = data.currentPath.includes(':\\');
    const separator = isWindows ? '\\' : '/';
    const parts = data.currentPath.split(/[/\\]/).filter(Boolean);
    let accum = isWindows ? '' : '/';

    const breadcrumbHtml = parts.map((part, idx) => {
      if (isWindows && idx === 0) {
        accum = `${part}\\`;
      } else {
        accum = isWindows ? (accum + (accum.endsWith('\\') ? '' : '\\') + part) : (accum + (accum.endsWith('/') ? '' : '/') + part);
      }
      const target = accum;
      return `<span class="breadcrumb-item" data-path="${target}">${part}</span>${idx < parts.length - 1 ? `<span class="breadcrumb-sep">${separator}</span>` : ''}`;
    }).join('');

    dirBreadcrumbs.innerHTML = breadcrumbHtml || `<span class="breadcrumb-item" data-path="/">/</span>`;
    dirBreadcrumbs.querySelectorAll('.breadcrumb-item').forEach(el => {
      el.addEventListener('click', () => loadDirectory(el.dataset.path));
    });
  }

  if (dirItemsList) {
    if (!data.directories || data.directories.length === 0) {
      dirItemsList.innerHTML = `<div class="empty-state" style="padding: 24px;">${t('emptyDir')}</div>`;
    } else {
      dirItemsList.innerHTML = data.directories.map(d => `
        <div class="dir-item ${d.path === currentNavSelectedPath ? 'selected' : ''}" data-path="${d.path}">
          <span class="dir-item-icon">📁</span>
          <span class="dir-item-name">${d.name}</span>
        </div>
      `).join('');

      dirItemsList.querySelectorAll('.dir-item').forEach(item => {
        item.addEventListener('click', () => {
          dirItemsList.querySelectorAll('.dir-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          currentNavSelectedPath = item.dataset.path;
          if (dirSelectedPath) dirSelectedPath.textContent = currentNavSelectedPath;
        });

        item.addEventListener('dblclick', () => {
          loadDirectory(item.dataset.path);
        });
      });
    }
  }
}

btnSelectDir?.addEventListener('click', () => {
  if (activePathTargetInput && currentNavSelectedPath) {
    activePathTargetInput.value = currentNavSelectedPath;
    showToast(`${t('labelSelectedPath')} ${currentNavSelectedPath}`);
  }
  closeDirPicker();
});

btnOpenOsDialog?.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/fs/pick-os-folder', { method: 'POST' });
    const data = await res.json();
    if (data.success && data.path) {
      currentNavSelectedPath = data.path;
      if (activePathTargetInput) {
        activePathTargetInput.value = data.path;
      }
      if (dirSelectedPath) dirSelectedPath.textContent = data.path;
      closeDirPicker();
      showToast(`${t('labelSelectedPath')} ${data.path}`);
    }
  } catch (err) {
    showToast(`OS Picker error: ${err.message}`, true);
  }
});

btnCloseDirPicker?.addEventListener('click', closeDirPicker);
btnCancelDirPicker?.addEventListener('click', closeDirPicker);
bindBackdropClose(dirPickerModal, closeDirPicker);

document.querySelectorAll('.btn-browse-path').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const targetInputId = btn.dataset.target;
    openDirPicker(targetInputId);
  });
});

// ============================================================
// 11. Paste SVG Modal Logic & Live Preview
// ============================================================
function openPasteSvgModal(initialCode = '') {
  if (pasteSvgModal) pasteSvgModal.style.display = 'flex';
  if (initialCode && pasteSvgCode) {
    pasteSvgCode.value = initialCode;
    updateSvgPreview();
  }
}

function closePasteSvgModal() {
  if (pasteSvgModal) pasteSvgModal.style.display = 'none';
}

function updateSvgPreview() {
  const code = pasteSvgCode?.value?.trim() || '';
  if (svgCodeSize) {
    svgCodeSize.textContent = formatBytes(new Blob([code]).size);
  }

  if (!code) {
    if (svgPreviewBox) svgPreviewBox.innerHTML = `<div class="svg-preview-placeholder">${t('previewPlaceholder')}</div>`;
    return;
  }

  if (code.toLowerCase().includes('<svg') && code.toLowerCase().includes('</svg>')) {
    if (pasteSvgFilename && !pasteSvgFilename.value.trim()) {
      const idMatch = code.match(/id=["']([^"']+)["']/i);
      const titleMatch = code.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        pasteSvgFilename.value = `${titleMatch[1].trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.svg`;
      } else if (idMatch && idMatch[1]) {
        pasteSvgFilename.value = `${idMatch[1].trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.svg`;
      } else {
        pasteSvgFilename.value = `icon-${Date.now()}.svg`;
      }
    }

    if (svgPreviewBox) {
      svgPreviewBox.innerHTML = code;
    }
  } else {
    if (svgPreviewBox) {
      svgPreviewBox.innerHTML = `<div class="svg-preview-placeholder" style="color: #ef4444;">${t('toastSvgInvalid')}</div>`;
    }
  }
}

pasteSvgCode?.addEventListener('input', updateSvgPreview);

btnPasteSvg?.addEventListener('click', (e) => {
  e.stopPropagation();
  openPasteSvgModal();
});

btnClearPasteSvg?.addEventListener('click', () => {
  if (pasteSvgCode) pasteSvgCode.value = '';
  if (pasteSvgFilename) pasteSvgFilename.value = '';
  updateSvgPreview();
});

btnClosePasteSvg?.addEventListener('click', closePasteSvgModal);
btnCancelPasteSvg?.addEventListener('click', closePasteSvgModal);
bindBackdropClose(pasteSvgModal, closePasteSvgModal);

btnSubmitPasteSvg?.addEventListener('click', async () => {
  const code = pasteSvgCode?.value?.trim();
  if (!code || !code.toLowerCase().includes('<svg') || !code.toLowerCase().includes('</svg>')) {
    showToast(t('toastSvgInvalid'), true);
    return;
  }

  const filename = pasteSvgFilename?.value?.trim() || `icon-${Date.now()}.svg`;
  btnSubmitPasteSvg.disabled = true;
  btnSubmitPasteSvg.textContent = 'Optimizing with SVGO...';

  try {
    const res = await fetch('/api/paste-svg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ svgCode: code, filename }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast(t('toastSvgOptimized'));
      closePasteSvgModal();
      if (pasteSvgCode) pasteSvgCode.value = '';
      if (pasteSvgFilename) pasteSvgFilename.value = '';
      updateSvgPreview();
      await loadStats();
    } else {
      showToast(data.error || 'Failed to optimize SVG', true);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, true);
  } finally {
    btnSubmitPasteSvg.disabled = false;
    btnSubmitPasteSvg.textContent = t('btnOptimizeSvg');
  }
});

// ============================================================
// 12. Global Clipboard Paste Handler (Cmd+V / Ctrl+V)
// ============================================================
window.addEventListener('paste', async (e) => {
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    return;
  }

  const text = e.clipboardData?.getData('text/plain')?.trim();
  if (text && text.toLowerCase().includes('<svg') && text.toLowerCase().includes('</svg>')) {
    e.preventDefault();
    openPasteSvgModal(text);
    showToast(t('modalPasteSvgTitle'));
    return;
  }

  const items = e.clipboardData?.items;
  if (items?.length) {
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleFiles([file]);
          return;
        }
      }
    }
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (comparisonModal?.style.display === 'flex') closeComparison();
    if (settingsModal?.style.display === 'flex') closeSettings();
    if (dirPickerModal?.style.display === 'flex') closeDirPicker();
    if (pasteSvgModal?.style.display === 'flex') closePasteSvgModal();
  }
});

// ============================================================
// Version display & update check
// ============================================================
function parseSemver(v) {
  return String(v || '').replace(/^v/, '').split('.').map(n => Number(n) || 0);
}

function isNewerVersion(a, b) {
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

async function checkVersion() {
  let current;
  let repo;
  try {
    const res = await fetch('/api/version');
    if (!res.ok) return;
    const data = await res.json();
    current = data.version;
    repo = data.repo;
  } catch {
    return;
  }

  if (footerVersion) footerVersion.textContent = current ? `v${current}` : '';
  if (footerGithub && repo) footerGithub.href = `https://github.com/${repo}`;
  if (!repo || !current) return;

  // Best-effort: a public repo with no releases yet, or GitHub's unauthenticated
  // rate limit, must never break the footer -- just skip the update badge.
  try {
    const ghRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
    if (!ghRes.ok) return;
    const latest = await ghRes.json();
    const latestVersion = String(latest.tag_name || '').replace(/^v/, '');
    if (latestVersion && isNewerVersion(parseSemver(latestVersion), parseSemver(current))) {
      if (updateBanner) updateBanner.style.display = 'block';
      if (updateVersionEl) updateVersionEl.textContent = `v${latestVersion}`;
      if (updateLink) updateLink.href = latest.html_url || `https://github.com/${repo}/releases/latest`;
    }
  } catch {
    // Offline or blocked -- footer already shows the local version, that's enough.
  }
}

// Initial Setup
initI18n();
updateModeHint();
loadStats();
loadSettings();
checkVersion();

// Vite Hot Live Reload
if (import.meta.hot) {
  import.meta.hot.on('assets-updated', () => {
    console.log('[Studio] Assets updated, refreshing dashboard...');
    loadStats();
  });
  import.meta.hot.on('config-updated', (payload) => {
    console.log('[Studio] Config updated:', payload);
    const cfg = payload?.config || payload?.data || payload;
    if (cfg) {
      currentConfig = cfg;
      populateSettingsForm(currentConfig);
    }
  });
}
