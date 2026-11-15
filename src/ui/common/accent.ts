/**
 * The accent of the interface: the colour of what is selected. It is the colour of the shown player, and every shade
 * the theme paints with (`--accent-solid`, `--accent-soft` and the rest) is derived from that one colour here: the same
 * hue at the lightness and the saturation the theme's own blue has for that shade. The text on a solid fill is white
 * or dark, whichever reads on it. With no game open nothing is set and the theme's blue stands.
 */

/** A shade as the theme's blue has it: how saturated it is against the accent itself, and how light. */
interface Shade { saturation: number; lightness: number }

/** The shades of #7fb2ff in the theme: #2f6fd0, #3a7ade, #233454, #2a3e63, #1c2636, #141c2a. */
const SHADES: Record<string, Shade> = {
  '--accent-solid': { saturation: 0.63, lightness: 0.5 },
  '--accent-solid-hover': { saturation: 0.71, lightness: 0.55 },
  '--accent-soft': { saturation: 0.41, lightness: 0.23 },
  '--accent-soft-hover': { saturation: 0.4, lightness: 0.28 },
  '--accent-faint': { saturation: 0.32, lightness: 0.16 },
  '--accent-deep': { saturation: 0.35, lightness: 0.12 },
};

/** The contrast text needs against what it stands on (WCAG AA). */
const READABLE = 4.5;
const WHITE = '#ffffff';
/** The page's own background: the dark text of a light fill. */
const DARK = '#0d1016';

const channels = (hex: string): [number, number, number] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];

function hsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = channels(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function hex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

const luminance = (colour: string): number => {
  const [r, g, b] = channels(colour).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** The contrast of two colours as WCAG counts it, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** The accent variables of the theme for a colour (`#rrggbb`): the colour itself and its shades. */
export function accentOf(colour: string): Record<string, string> {
  const { h, s } = hsl(colour);
  const made: Record<string, string> = { '--accent': colour };
  const shadeOf = (name: string, lightness = SHADES[name].lightness): string => hex(h, Math.min(1, s * SHADES[name].saturation), lightness);
  for (const name of Object.keys(SHADES)) made[name] = shadeOf(name);
  // One ink for the fill and its hover: the one that reads on the harder of the two.
  const fills = ['--accent-solid', '--accent-solid-hover'];
  const reads = (ink: string): number => Math.min(...fills.map(fill => contrast(ink, made[fill])));
  const ink = reads(WHITE) >= reads(DARK) ? WHITE : DARK;
  made['--accent-text'] = ink;
  // A fill the ink does not read on moves away from it, a step of lightness at a time, until it does.
  for (const fill of fills) {
    let lightness = SHADES[fill].lightness;
    while (contrast(ink, made[fill]) < READABLE && lightness > 0.05 && lightness < 0.95) {
      lightness += ink === WHITE ? -0.01 : 0.01;
      made[fill] = shadeOf(fill, lightness);
    }
  }
  return made;
}

const NAMES = ['--accent', '--accent-text', ...Object.keys(SHADES)];

/** Paints the page with the accent of a colour, or with the theme's own when there is none. */
export function applyAccent(colour: string | null): void {
  const { style } = document.documentElement;
  if (colour === null) {
    for (const name of NAMES) style.removeProperty(name);
    return;
  }
  for (const [name, value] of Object.entries(accentOf(colour))) style.setProperty(name, value);
}
