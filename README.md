# 🎨 Designer Media Studio

> Interactive media compression & conversion studio for designers -- WebP/AVIF/MozJPEG/PNG image optimization, strict-format SVG/PNG icon processing, and PDF compression with page extraction. Live before/after comparison, per-format enable toggles, and EN/UA localization.
>
> **Crafted by unS0uL** • Powered by **Vite 7**, **Sharp**, **SVGO**, and **pdf-lib**.

<!--
  Screenshots live on the orphan `screenshots` branch (not on main) so they
  never bloat the source history. GitHub can still embed them on any branch
  via the raw.githubusercontent.com CDN.
-->
<p align="center">
  <img src="https://raw.githubusercontent.com/unS0uL/Designer-Media-Studio/screenshots/dashboard.png" alt="Designer Media Studio -- main dashboard" width="820"><br>
  <img src="https://raw.githubusercontent.com/unS0uL/Designer-Media-Studio/screenshots/compare.png" alt="Before/after split comparison" width="410">
  <img src="https://raw.githubusercontent.com/unS0uL/Designer-Media-Studio/screenshots/settings.png" alt="Per-format settings with enable/disable toggles" width="410">
</p>

---

## ✨ Features

- **Image optimization** -- WebP, AVIF, MozJPEG and quantized 8-bit PNG, each individually enabled/disabled and quality-tuned.
- **Strict-format icon processing** -- SVG is cleaned via SVGO (viewBox always preserved) and PNG icons are palette-quantized; neither is ever converted to a different format.
- **PDF Studio** -- compress a PDF at a configurable rasterization DPI, or extract its page as WebP/AVIF/JPG/PNG.
- **Live before/after comparison** -- Squoosh-style split-slider view with Fit/100%/200% zoom, per-file format switching, and original-size vs. optimized-size stats. For WebP/AVIF/MozJPEG/PNG, a live quality slider re-encodes and previews in real time (no disk write until you explicitly save), with one click to reset to the standard quality or save that exact quality as the file's output, bypassing global settings for just that one file.
- **Three benchmark presets** -- Web Standard (Google web.dev), High Fidelity (Retina/print), Ultra Compact (email/mobile) -- or hand-tune every slider yourself.
- **Web UI + CLI**, same `config.json` -- drag-and-drop in the browser, or batch-process everything with one command for CI/scripts.
- **Configurable, cross-platform paths** -- point input/output at any folder on disk (`~/Desktop/Assets`, `D:\Exports`, ...), browsable via a built-in folder picker.
- **EN / UA localization**, no other language in the UI or source.

## 📋 Requirements

- **Node.js 20+** and npm.
- **macOS**, for full PDF functionality. `sips` (bundled with macOS) is used for DPI-controlled PDF page rasterization and PDF→image extraction. Without it, PDF *page extraction* is unavailable and PDF *compression* falls back to object-stream-only compression (no rasterization, no DPI control). Everything else (image/icon processing) is fully cross-platform.

## 📦 Installation

```bash
git clone https://github.com/unS0uL/Designer-Media-Studio.git
cd Designer-Media-Studio
npm install
```

### Dependencies (installed automatically by `npm install`)

| Package | Used for |
|---|---|
| [`sharp`](https://sharp.pixelplumbing.com/) | Image decoding/encoding -- WebP, AVIF, MozJPEG, PNG |
| [`svgo`](https://github.com/svg/svgo) | SVG cleanup/optimization (icons) |
| [`pdf-lib`](https://pdf-lib.js.org/) | PDF reading, compression, metadata |
| [`vite`](https://vitejs.dev/) | Dev server (`npm run dev`) + production build of the Web UI |
| [`chokidar`](https://github.com/paulmillr/chokidar) | Watches `input/` so the Web UI reacts to files added outside the browser |
| [`jszip`](https://stuk.github.io/jszip/) | Bundles processed files into the "Download ZIP" archive |
| [`picocolors`](https://github.com/alexeyraspopov/picocolors) | Colored CLI output for `npm run optimize` |

Dev-only tooling: `typescript` + `tsx` (the core engine is TypeScript, run directly without a build step), `eslint` + `typescript-eslint` (`npm run lint`), `@types/node`.

## 🚀 Usage

```bash
npm run dev        # Launch the Web Studio at http://localhost:4040
npm run optimize   # CLI batch mode: process everything in input/ once
npm run clean       # Empty the output/ folder
npm test            # Run the test suite (engine, cross-platform paths, PDF DPI, SVG paste)
npm run lint         # ESLint
npm run typecheck    # TypeScript --noEmit
npm run build         # Production build of the Web UI into dist/
```

Drop images into `input/images/`, icons into `input/icons/`, PDFs into `input/pdf/` (or just drag-and-drop into the browser window) -- results land in the matching `output/<format>/` subfolder.

## ⚙️ Configuration (`config.json`)

- **Web UI:** open **⚙️ Settings** -- choose a preset (**Web Standard**, **High Fidelity**, **Ultra Compact**), tune sliders per format, toggle a format off entirely via the **Enabled** checkbox in its section header, and set custom input/output paths or server port under **Storage Paths**. **💾 Save to config.json** persists it for both the Web UI and the CLI.
- **Manual:** edit `config.json` directly -- it's the single source of truth read by both `npm run dev` and `npm run optimize`.

### 📷 Why is MozJPEG sometimes bigger than PNG?

For flat-color graphics (logos, banners, UI screenshots, text-heavy images), JPEG's block-based DCT compression is fundamentally worse than PNG's palette/predictive compression or WebP -- it produces visible ringing artifacts around sharp edges and has to spend bits it can't recover elsewhere. This is a property of the source image, not a misconfiguration: a low-color-count graphic (e.g. a dark banner with a logo and text) can legitimately compress smaller as an 8-bit PNG or WebP than as a JPEG, even at aggressive JPEG quality settings. JPEG remains the better choice for genuine photographs with continuous tone and noise.

## 🗂️ Project structure

```
Designer-Media-Studio/
├── src/              # Web UI (index.html, main.js, i18n.js, styles.css)
├── scripts/          # engine.ts (core), pdf-engine.js, config-manager.js, clean.js
├── tests/            # Node --test-free assert() suites (no external test runner)
├── input/            # Drop zone for images/, icons/, pdf/
├── output/            # Generated results, one subfolder per format
├── config.json         # Active compression/paths/server configuration
└── vite.config.js       # Dev server + Web UI API middleware
```

## 🧪 Testing

`npm test` runs plain-Node `assert()`-based suites covering: alpha-channel/transparency preservation across formats, cross-platform path resolution (POSIX/`~`/Windows drive letters) including processing on an external disk path, PDF render-DPI regression (page raster actually scales with the configured DPI), and the directory browser / paste-SVG-from-clipboard flow.

## 📄 License

[MIT](./LICENSE) © unS0uL

---

## Українська

### ✨ Можливості

- **Оптимізація зображень** -- WebP, AVIF, MozJPEG та квантований 8-бітний PNG, кожен окремо вмикається/вимикається та налаштовується.
- **Строга обробка іконок** -- SVG очищується через SVGO (viewBox завжди зберігається), PNG-іконки квантуються палітрою; жодна не конвертується в інший формат.
- **PDF Студія** -- стиснення PDF з налаштовуваним DPI растеризації, або витяг сторінки як WebP/AVIF/JPG/PNG.
- **Живе порівняння До/Після** -- спліт-слайдер у стилі Squoosh із зумом Fit/100%/200%, перемиканням формату для кожного файлу та статистикою розмірів. Для WebP/AVIF/MozJPEG/PNG повзунок якості перекодовує та показує результат у реальному часі (без запису на диск, доки не збережете явно), з кнопкою скидання до стандартної якості або збереження саме цієї якості для файлу, в обхід глобальних налаштувань.
- **Три еталонні пресети** -- Web Standard (Google web.dev), High Fidelity (Retina/друк), Ultra Compact (email/мобільні) -- або власноруч налаштуйте кожен повзунок.
- **Web UI + CLI** на одному `config.json` -- перетягування у браузері, або пакетна обробка однією командою для CI/скриптів.
- **Налаштовувані кросплатформенні шляхи** -- вказуйте вхід/вихід у будь-яку папку на диску, з вбудованим провідником папок.
- **Локалізація EN / UA**, жодної іншої мови в інтерфейсі чи коді.

### 📋 Вимоги

- **Node.js 20+** та npm.
- **macOS** -- для повноцінної роботи з PDF. `sips` (вбудований у macOS) використовується для растеризації PDF-сторінок із заданим DPI та витягу сторінки як зображення. Без нього витяг сторінок недоступний, а стиснення PDF працює лише через стиснення об'єктних потоків (без растеризації та DPI). Все інше (зображення/іконки) повністю кросплатформенне.

### 📦 Встановлення

```bash
git clone https://github.com/unS0uL/Designer-Media-Studio.git
cd Designer-Media-Studio
npm install
```

### 🚀 Використання

```bash
npm run dev        # Запуск веб-студії на http://localhost:4040
npm run optimize   # CLI пакетний режим: обробити все в input/ один раз
npm run clean       # Очистити папку output/
npm test            # Запустити тести (рушій, кросплатформенні шляхи, PDF DPI, вставка SVG)
```

Перетягніть зображення в `input/images/`, іконки в `input/icons/`, PDF у `input/pdf/` (або прямо у вікно браузера) -- результат з'явиться у відповідній підпапці `output/<формат>/`.

### 📄 Ліцензія

[MIT](./LICENSE) © unS0uL
