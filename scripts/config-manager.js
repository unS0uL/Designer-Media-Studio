import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
export const CONFIG_FILE = path.resolve(rootDir, 'config.json');

/**
 * Industry-standard benchmark presets researched from:
 * - Google Chrome / web.dev Core Web Vitals
 * - Sharp / libvips benchmark suite
 * - Mozilla MozJPEG Rate-Distortion recommendations
 * - SVGO Figma responsiveness guidelines
 */
export const PRESETS = {
  // 1. Web Standard (Golden Ratio / Default)
  web_standard: {
    name: 'Web Standard (Recommended / Google web.dev)',
    description: 'Optimal balance of visual fidelity and size for web and mobile devices',
    paths: {
      input: 'input',
      output: 'output',
    },
    server: {
      port: 4040,
    },
    incoming: {
      maxDimension: 2560,
      autoOrient: true,
      convertToSrgb: true,
      pdfRenderDpi: 150,
    },
    outgoing: {
      enabledFormats: ['webp', 'avif', 'jpg', 'png'],
      webp: {
        quality: 80,
        effort: 4,
        lossless: false,
      },
      avif: {
        quality: 75,
        effort: 4,
        chromaSubsampling: '4:2:0',
      },
      jpg: {
        quality: 80,
        mozjpeg: true,
        progressive: true,
        trellisQuantisation: true,
        overshootDeringing: true,
        chromaSubsampling: '4:2:0',
      },
      png: {
        quality: 80,
        palette: true,
        compressionLevel: 9,
        effort: 7,
      },
      icons: {
        svgo: {
          multipass: true,
          removeViewBox: false, // Critical for CSS scaling
          cleanupIds: true,
          collapseGroups: true,
        },
        pngQuality: 90,
        pngPalette: true,
      },
      pdf: {
        screenDpi: 150,
        imageQuality: 80,
        useObjectStreams: true,
      },
    },
  },

  // 2. High Fidelity (Retina / Portfolio / Hero)
  high_fidelity: {
    name: 'High Fidelity (Max Quality / Retina Display)',
    description: 'For hero banners, high-resolution portfolios, and ultra-crisp displays',
    paths: {
      input: 'input',
      output: 'output',
    },
    server: {
      port: 4040,
    },
    incoming: {
      maxDimension: 3840,
      autoOrient: true,
      convertToSrgb: true,
      pdfRenderDpi: 200,
    },
    outgoing: {
      enabledFormats: ['webp', 'avif', 'jpg', 'png'],
      webp: {
        quality: 88,
        effort: 5,
        lossless: false,
      },
      avif: {
        quality: 82,
        effort: 5,
        chromaSubsampling: '4:2:0',
      },
      jpg: {
        quality: 88,
        mozjpeg: true,
        progressive: true,
        trellisQuantisation: true,
        overshootDeringing: true,
        chromaSubsampling: '4:2:0',
      },
      png: {
        quality: 90,
        palette: true,
        compressionLevel: 9,
        effort: 8,
      },
      icons: {
        svgo: {
          multipass: true,
          removeViewBox: false,
          cleanupIds: true,
          collapseGroups: true,
        },
        pngQuality: 95,
        pngPalette: true,
      },
      pdf: {
        screenDpi: 200,
        imageQuality: 88,
        useObjectStreams: true,
      },
    },
  },

  // 3. Ultra Compact (Email / Mobile / Max Savings)
  ultra_compact: {
    name: 'Ultra Compact (Maximum Compression / Email)',
    description: 'For newsletter campaigns, low-bandwidth mobile views, and maximum savings',
    paths: {
      input: 'input',
      output: 'output',
    },
    server: {
      port: 4040,
    },
    incoming: {
      maxDimension: 1920,
      autoOrient: true,
      convertToSrgb: true,
      pdfRenderDpi: 96,
    },
    outgoing: {
      enabledFormats: ['webp', 'avif', 'jpg', 'png'],
      webp: {
        quality: 70,
        effort: 4,
        lossless: false,
      },
      avif: {
        quality: 65,
        effort: 4,
        chromaSubsampling: '4:2:0',
      },
      jpg: {
        quality: 70,
        mozjpeg: true,
        progressive: true,
        trellisQuantisation: true,
        overshootDeringing: true,
        chromaSubsampling: '4:2:0',
      },
      png: {
        quality: 70,
        palette: true,
        compressionLevel: 9,
        effort: 7,
      },
      icons: {
        svgo: {
          multipass: true,
          removeViewBox: false,
          cleanupIds: true,
          collapseGroups: true,
        },
        pngQuality: 80,
        pngPalette: true,
      },
      pdf: {
        screenDpi: 96,
        imageQuality: 70,
        useObjectStreams: true,
      },
    },
  },
};

export const DEFAULT_CONFIG = PRESETS.web_standard;

function deepMerge(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return deepMerge(DEFAULT_CONFIG, parsed);
    }
  } catch (err) {
    console.warn('[Config] Failed to load config.json, using defaults:', err.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

export function saveConfig(newConfig) {
  try {
    const merged = deepMerge(loadConfig(), newConfig);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  } catch (err) {
    console.error('[Config] Failed to save config.json:', err.message);
    throw err;
  }
}

export function resetConfig(presetKey = 'web_standard') {
  try {
    const selectedPreset = PRESETS[presetKey] || DEFAULT_CONFIG;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(selectedPreset, null, 2), 'utf8');
    return selectedPreset;
  } catch (err) {
    console.error('[Config] Failed to reset config.json:', err.message);
    throw err;
  }
}
