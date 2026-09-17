# Changelog

All notable changes to Designer Media Studio are documented here.

## [1.4.0] - 2026-09-17

### Fixed
- **Compare zoom pan (100%/200%) couldn't reach the image's edges.** Plain
  flexbox `center` alignment clips overflow asymmetrically once content is
  bigger than its box -- you could scroll toward the center from one side
  but never reach the far edge. Switched to `align-items/justify-content:
  safe center`, which centers while content fits and falls back to full
  scrollability once it overflows.
- **Click-drag panning of the zoomed image.** Added grab/grabbing-cursor
  drag-to-pan on the split-viewer (mouse + touch), independent of the
  existing split-divider drag.
- **The split-divider drifted or "ran away" while panning**, and dragging it
  after panning could jump to the wrong position or collapse the compare
  clip to zero width. Root cause: the divider's position and the compare
  clip-path were expressed as a **percentage of the container's own
  (unscrolled) width**, which only covers `[0, 100%]` -- but a panned/zoomed
  view legitimately needs local coordinates beyond that range. Rewrote the
  whole system to pixel coordinates in the container's static frame (no
  ceiling), with the divider's `left`/`top`/height and the clip-path's every
  edge (not just the divider edge) explicitly resynced against the current
  `scrollLeft`/`scrollTop` on every scroll event, from any source (wheel,
  scrollbar, or the new click-drag pan). Previously only the divider's own
  edge was scroll-compensated; the clip's *far* edge stayed pinned to the
  container's unscrolled width, so a scrolled-in strip at the trailing edge
  of the viewport always showed the original layer no matter where the
  divider sat.
- **Dragging the split-divider (or panning) past the dialog's edge closed
  the whole Compare modal.** A `mousedown`/`mouseup` pair on different
  elements resolves the browser's synthesized `click`'s target to their
  nearest common ancestor -- so a drag that started inside the dialog and
  ended over the dark backdrop fired a click whose target was the backdrop,
  triggering "click outside closes the modal" mid-drag. Added a
  `bindBackdropClose()` helper that only closes on a click gesture that
  *both started and ended* on the backdrop itself, applied to all four
  modals in the app (Compare, Settings, folder picker, paste-SVG), since all
  four shared the same latent bug.
- **The before/after size badges ("Original" / format+savings) could drift
  or get clipped away.** They lived as absolutely-positioned overlays inside
  the same pannable/zoomable/clipped layer as the image itself. Moved them
  into a dedicated static strip below the viewer (left = Original, right =
  compressed format), unaffected by zoom, pan, or the compare clip.

### Changed
- Compare modal header reorganized into three explicit rows: title + close
  button; format chips + zoom controls (both never wrap to a second line);
  live-quality slider + Reset + Save (single row, right-aligned under the
  zoom controls).

## [1.3.0] - 2026-09-17

### Added
- **Live quality slider in the Compare modal.** With an image-type file's
  WebP/AVIF/MozJPEG/PNG chip selected, a slider lets you re-encode that one
  format at any quality in real time (debounced preview, no disk write) to
  spot compression artifacts before committing to a setting. **Reset**
  returns the slider to the format's standard/global quality; **Save this
  compression** persists that exact quality as the file's saved output --
  bypassing global settings for just this one file/format -- and updates
  the dashboard table in place. Two new endpoints:
  `/api/preview-format-quality` (in-memory only) and
  `/api/save-format-quality` (writes + updates `output/stats.json`).
  `scripts/engine.ts` gained `reencodeFormatWithQuality()`, sharing its
  decode/preprocessing step with `processImage()` via a new
  `decodeAndPreprocess()` helper. Scoped to the Images tab's four raster
  formats -- PDF-derived rasters (sips/DPI) and icon PNGs (separate
  `icons.pngQuality` setting) are out of scope for a single quality knob.
- **Footer: version + GitHub link + update check.** The footer now shows
  the running app version (served via a new `/api/version` endpoint reading
  `package.json`), a link to the GitHub repo, and -- best-effort, silently
  skipped if offline or the repo has no releases yet -- a banner when
  `GET https://api.github.com/repos/<owner>/<repo>/releases/latest` reports
  a newer tag than the running version.

### Changed
- **Removed the header's "by unS0uL" badge.** Attribution now lives only in
  the footer, alongside the new version/GitHub/update-check line.
- **Replaced the bundled demo assets.** `input/images/OG.jpg` and
  `input/pdf/sample-presentation.pdf` were the project's own real brand
  banner (logo + name baked into the raster, and into the PDF's XMP
  metadata) -- not appropriate for a public demo repo under an unrelated
  license. Replaced with `sample-banner.jpg` and a regenerated
  `sample-presentation.pdf`, both entirely synthetic (SVG gradient +
  shapes, rendered via this project's own `sharp`/`pdf-lib` dependencies) --
  no third-party or brand assets, freely reusable. Prior git history
  containing the old files was rewritten; see the repository's initial
  commit for the clean baseline.

## [1.2.0] - 2026-09-17

### Removed
- **BMP support dropped entirely** -- output generation, incoming `.bmp`
  decoding, the `bmp-js` dependency, all UI copy/checkboxes, config presets,
  and tests. It was an uncompressed legacy format that never actually
  served the tool's "compression" purpose and only confused the size
  comparison; simplest fix was removing it rather than continuing to
  explain it away.

### Added
- **Per-format enable/disable toggles** in Settings -> Outgoing Formats.
  Each format (WebP/AVIF/MozJPEG/PNG) now has its own "Enabled" checkbox in
  its fieldset legend; unchecking it dims the fieldset, disables its
  controls, and excludes that format from `config.outgoing.enabledFormats`
  on save -- respected by both the Web UI and `npm run optimize`. Previously
  `enabledFormats` could only be changed by hand-editing `config.json`; the
  Settings form silently echoed back whatever was already loaded and could
  never actually change it.
- README section explaining why MozJPEG can legitimately end up larger than
  PNG/WebP for flat-color graphics (DCT block compression vs.
  palette/predictive compression) -- this is a source-content property, not
  a misconfiguration.

### Fixed
- **Stats reset to 0 B / 0% on every language switch.** The `EN`/`UA`
  toggle re-rendered the stats cards with `renderStats({ files:
  currentStatsFiles })`, omitting `summary` entirely; `renderStats()`'s
  default parameter then silently substituted an all-zero summary,
  regardless of the real totals. Found via live Playwright verification
  after a mobile/UA screenshot showed "152.5 KB" become "0 B" purely from
  clicking the language switcher. Fixed by caching the full last-rendered
  `{ files, summary }` and replaying that on language switch instead of
  reconstructing a partial object.
- Compare button used the 👁 eye emoji, which read as an unfamiliar/foreign
  glyph on some systems; replaced with ◐ (half-circle), which also better
  matches the feature's actual before/after split-view design.

## [1.1.0] - 2026-09-17

### Fixed
- **PDF render DPI was never applied.** `config.incoming.pdfRenderDpi` /
  `config.outgoing.pdf.screenDpi` were read into a variable but never passed
  to the `sips` rasterization step, so every preset (96 / 150 / 200 DPI)
  produced an identically-sized page raster -- this is what made PDF/JPG
  "compression" look broken regardless of preset. `sips` is now invoked with
  `-z <height> <width>` computed from the PDF page size (via `pdf-lib`) and
  the configured DPI, in both `compressPdf()` and `convertPdfToImages()`.
- Ukrainian `footerEngine` string used the Russian word "Движок" instead of
  "Двигун".
- Static PDF-related UI copy hardcoded "150 DPI" regardless of the active
  preset; now reads "configurable DPI" / "DPI, що налаштовується".
- `ensureDirs()` swallowed the original filesystem error when re-throwing;
  it is now attached via `Error(..., { cause })`.
- `vite.config.js` did not set `build.outDir`, so with `root: 'src'` Vite's
  default `dist` resolved to `src/dist/` -- a location `.gitignore` never
  covered. `outDir` is now anchored explicitly to the project root.

### Added
- BMP output is now labeled as an uncompressed legacy format in the Web UI
  (dashed badge + tooltip) whenever it is larger than the source file, plus
  a README note. BMP being larger than the source is expected (it is an
  uncompressed format) and was previously indistinguishable from a bug.
- `tests/test-pdf-dpi.js`: regression coverage asserting output size and
  raster width actually scale with the configured DPI.
- ESLint (`eslint.config.js`, flat config) with separate Node/browser
  globals for `scripts/`+`tests/` vs `src/`. `npm run lint`.

### Changed
- Removed dead code found by ESLint: unused `currentNavPath` state,
  unused `getLang`/`updateDomTranslations` imports, unused BMP pixel
  channel variables in the transparency test, a useless initial
  assignment, a redundant `Boolean()` call.

## [1.0.0] - 2026-09-17

Initial internal release. Built iteratively from a single-purpose CLI/Vite
image compressor into a full Web Studio: WebP/AVIF/MozJPEG/PNG/BMP image
conversion, strict-format SVG/PNG icon optimization, PDF compression and
page extraction, per-format compression settings with three presets (Web
Standard / High Fidelity / Ultra Compact), Squoosh-style before/after
comparison, drag-and-drop (including full-window and direct SVG paste from
clipboard), configurable/cross-platform input-output paths with a folder
browser, configurable server port, and EN/UA localization.
