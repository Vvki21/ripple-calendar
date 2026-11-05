// Small, dependency-free color helpers used across the palette page.

export function normalizeHex(input) {
  if (typeof input !== 'string') return null;
  let h = input.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return '#' + h.toUpperCase();
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHsv({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h: Math.round(h) % 360, s: Math.round(s * 100), v: Math.round(max * 100) };
}

export const rgbString = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`;
export const hsvString = ({ h, s, v }) => `hsv(${h}°, ${s}%, ${v}%)`;

function channel(c) {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function wcagLabel(ratio) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fill only';
}

// Pick whichever of two inks reads better on a given surface.
export function readableOn(surface, dark, light = '#FFFFFF') {
  return contrast(surface, dark) >= contrast(surface, light) ? dark : light;
}

export function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Classify the relationship between the three chromatic hues.
export function describeHarmony(hues) {
  const sorted = [...hues].sort((a, b) => a - b);
  const gaps = sorted.map((h, i) => {
    const next = sorted[(i + 1) % sorted.length];
    return (next - h + 360) % 360 || 360;
  });
  const span = 360 - Math.max(...gaps);
  const pairs = [
    hueDistance(hues[0], hues[1]),
    hueDistance(hues[1], hues[2]),
    hueDistance(hues[0], hues[2]),
  ];
  if (span <= 75) return { name: 'Analogous', note: 'All three hues sit within a narrow arc of the wheel — calm, low-tension.' };
  if (gaps.every((g) => g >= 85 && g <= 155))
    return { name: 'Soft Triadic', note: 'Three hues spaced roughly a third of the wheel apart, softened by low saturation so none dominates.' };
  if (pairs.some((p) => p >= 150))
    return { name: 'Split Complementary', note: 'One hue is balanced by two neighbours of its complement — contrast with restraint.' };
  return { name: 'Custom', note: 'An intentional, non-canonical spacing. Lean on saturation and value to keep hierarchy clear.' };
}
