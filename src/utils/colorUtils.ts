const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_COLOR_REGEX = /^rgba?\(([^)]+)\)$/i;
const HSL_COLOR_REGEX = /^hsla?\(([^)]+)\)$/i;

const COLOR_ALIASES: Record<string, string> = {
  black: 'black',
  negro: 'black',
  white: 'white',
  blanco: 'white',
  offwhite: 'off-white',
  offwhitee: 'off-white',
  offwhites: 'off-white',
  'off white': 'off-white',
  'blanco roto': 'off-white',
  ivory: 'off-white',
  marfil: 'off-white',
  gray: 'gray',
  grey: 'gray',
  gris: 'gray',
  'gris claro': 'light-gray',
  'gris oscuro': 'dark-gray',
  silver: 'silver',
  plateado: 'silver',
  red: 'red',
  rojo: 'red',
  burgundy: 'burgundy',
  bordo: 'burgundy',
  granate: 'burgundy',
  wine: 'burgundy',
  azul: 'blue',
  blue: 'blue',
  navy: 'navy',
  'azul marino': 'navy',
  'dark blue': 'navy',
  celeste: 'sky',
  sky: 'sky',
  turquoise: 'turquoise',
  turquesa: 'turquoise',
  aqua: 'turquoise',
  cyan: 'turquoise',
  verde: 'green',
  green: 'green',
  olive: 'olive',
  oliva: 'olive',
  mint: 'mint',
  menta: 'mint',
  emerald: 'emerald',
  esmeralda: 'emerald',
  yellow: 'yellow',
  amarillo: 'yellow',
  mustard: 'mustard',
  mostaza: 'mustard',
  orange: 'orange',
  naranja: 'orange',
  coral: 'coral',
  rosa: 'pink',
  pink: 'pink',
  fucsia: 'fuchsia',
  fuchsia: 'fuchsia',
  magenta: 'fuchsia',
  purple: 'purple',
  violeta: 'purple',
  morado: 'purple',
  lila: 'lavender',
  lavender: 'lavender',
  marron: 'brown',
  maroon: 'brown',
  brown: 'brown',
  cafe: 'brown',
  chocolate: 'brown',
  beige: 'beige',
  camel: 'camel',
  crema: 'cream',
  cream: 'cream',
  gold: 'gold',
  dorado: 'gold',
  multicolor: 'multicolor',
  estampado: 'multicolor',
  print: 'multicolor',
};

const COLOR_HEX_MAP: Record<string, string> = {
  black: '#111827',
  white: '#f8fafc',
  'off-white': '#f1f5f9',
  gray: '#6b7280',
  'light-gray': '#d1d5db',
  'dark-gray': '#374151',
  silver: '#9ca3af',
  red: '#ef4444',
  burgundy: '#7f1d1d',
  blue: '#3b82f6',
  navy: '#1e3a8a',
  sky: '#38bdf8',
  turquoise: '#14b8a6',
  green: '#22c55e',
  olive: '#4d7c0f',
  mint: '#6ee7b7',
  emerald: '#10b981',
  yellow: '#facc15',
  mustard: '#ca8a04',
  orange: '#f97316',
  coral: '#fb7185',
  pink: '#ec4899',
  fuchsia: '#d946ef',
  purple: '#8b5cf6',
  lavender: '#a78bfa',
  brown: '#7c4a24',
  beige: '#d6c6a8',
  camel: '#b08968',
  cream: '#f5e6cc',
  gold: '#d4af37',
  multicolor: '#8b5cf6',
};

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeHexColor(value: string): string {
  const hex = value.toLowerCase();
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = chroma;
    g = x;
  } else if (h < 120) {
    r = x;
    g = chroma;
  } else if (h < 180) {
    g = chroma;
    b = x;
  } else if (h < 240) {
    g = x;
    b = chroma;
  } else if (h < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  const toHex = (channel: number) => {
    const val = Math.round((channel + m) * 255);
    return val.toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hashToHexColor(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 55 + (Math.abs(hash >> 8) % 20);
  const lightness = 42 + (Math.abs(hash >> 16) % 18);
  return hslToHex(hue, saturation, lightness);
}

function parseRgbLuminance(color: string): number | null {
  const match = color.match(RGB_COLOR_REGEX);
  if (!match) return null;

  const values = match[1]
    .split(',')
    .map((part) => Number.parseFloat(part.trim()))
    .filter((part) => !Number.isNaN(part));

  if (values.length < 3) return null;

  const [r, g, b] = values;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function parseHslLuminance(color: string): number | null {
  const match = color.match(HSL_COLOR_REGEX);
  if (!match) return null;

  const values = match[1]
    .split(',')
    .map((part) => part.trim().replace('%', ''))
    .map((part) => Number.parseFloat(part))
    .filter((part) => !Number.isNaN(part));

  if (values.length < 3) return null;
  return values[2] / 100;
}

function luminanceFromHex(hex: string): number {
  const normalized = normalizeHexColor(hex);
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function colorFromToken(token: string): string {
  if (token in COLOR_HEX_MAP) return COLOR_HEX_MAP[token];

  if (token.includes('blue') || token.includes('azul')) return COLOR_HEX_MAP.blue;
  if (token.includes('green') || token.includes('verde')) return COLOR_HEX_MAP.green;
  if (token.includes('red') || token.includes('rojo')) return COLOR_HEX_MAP.red;
  if (token.includes('pink') || token.includes('rosa')) return COLOR_HEX_MAP.pink;
  if (token.includes('purple') || token.includes('violet') || token.includes('morado')) return COLOR_HEX_MAP.purple;
  if (token.includes('yellow') || token.includes('amarillo')) return COLOR_HEX_MAP.yellow;
  if (token.includes('orange') || token.includes('naranja')) return COLOR_HEX_MAP.orange;
  if (token.includes('gray') || token.includes('gris')) return COLOR_HEX_MAP.gray;
  if (token.includes('brown') || token.includes('marron') || token.includes('cafe')) return COLOR_HEX_MAP.brown;
  if (token.includes('beige') || token.includes('camel') || token.includes('cream')) return COLOR_HEX_MAP.beige;

  return hashToHexColor(token);
}

export function normalizeColorValue(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';

  if (HEX_COLOR_REGEX.test(trimmed)) {
    return normalizeHexColor(trimmed);
  }

  if (RGB_COLOR_REGEX.test(trimmed) || HSL_COLOR_REGEX.test(trimmed)) {
    return trimmed.replace(/\s+/g, '');
  }

  const normalizedToken = stripDiacritics(trimmed)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  return COLOR_ALIASES[normalizedToken] ?? normalizedToken;
}

export function colorEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  const first = normalizeColorValue(a);
  const second = normalizeColorValue(b);
  if (!first || !second) return false;
  return first === second;
}

export interface ColorSwatchData {
  key: string;
  label: string;
  cssColor: string;
  borderColor: string;
  checkColor: string;
}

export function resolveColorSwatch(value: string | null | undefined): ColorSwatchData {
  const label = value?.trim() || 'Sin color';
  const key = normalizeColorValue(label);

  let cssColor = '#cbd5e1';
  let luminance = 0.75;

  if (key) {
    if (HEX_COLOR_REGEX.test(key)) {
      cssColor = key;
      luminance = luminanceFromHex(key);
    } else if (RGB_COLOR_REGEX.test(key)) {
      cssColor = key;
      luminance = parseRgbLuminance(key) ?? 0.5;
    } else if (HSL_COLOR_REGEX.test(key)) {
      cssColor = key;
      luminance = parseHslLuminance(key) ?? 0.5;
    } else {
      cssColor = colorFromToken(key);
      luminance = luminanceFromHex(cssColor);
    }
  }

  const isLight = luminance >= 0.64;

  return {
    key,
    label,
    cssColor,
    borderColor: isLight ? 'rgba(17,24,39,0.22)' : 'rgba(255,255,255,0.35)',
    checkColor: isLight ? '#111827' : '#ffffff',
  };
}
