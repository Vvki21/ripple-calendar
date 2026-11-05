import { normalizeHex, readableOn } from './color.js';

// The Ripple palette, shared by the prototype and the design system page.
export const DEFAULT_PALETTE = {
  primary: '#8178DC',
  secondary: '#A8D8C4',
  accent: '#F2A98E',
  background: '#F8F8FC',
  text: '#24243A',
};

// Same key the /design-system page writes to, so palette edits there carry into the prototype.
export const PALETTE_STORAGE_KEY = 'ripple-palette-v1';

export function loadPalette() {
  try {
    const saved = JSON.parse(localStorage.getItem(PALETTE_STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      return Object.fromEntries(
        Object.entries(DEFAULT_PALETTE).map(([k, v]) => [k, normalizeHex(saved[k]) || v]),
      );
    }
  } catch { /* storage unavailable */ }
  return { ...DEFAULT_PALETTE };
}

export function paletteVars(p) {
  return {
    '--primary': p.primary,
    '--secondary': p.secondary,
    '--accent': p.accent,
    '--bg': p.background,
    '--text': p.text,
    '--on-primary': readableOn(p.primary, p.text),
    '--on-secondary': readableOn(p.secondary, p.text),
    '--on-accent': readableOn(p.accent, p.text),
    '--on-text': readableOn(p.text, p.text, p.background),
  };
}
