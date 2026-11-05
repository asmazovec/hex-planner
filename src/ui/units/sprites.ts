import type { TokenKind } from '../../domain/hexLayout';
import type { Game } from '../../domain/types';
import { UNIT_ART } from './unitArt';

/** The values of `--player-1` to `--player-8` in the theme. A token needs real numbers to mix its dark disc. */
export const PLAYER_COLOURS = ['#7fb2ff', '#e8c56a', '#ea7f76', '#74d09a', '#b89bf5', '#f0a463', '#62cdd3', '#d98bc2'];

export const playerColour = (color: number): string => PLAYER_COLOURS[(color - 1 + PLAYER_COLOURS.length) % PLAYER_COLOURS.length];

/** My colour and the colour enemy units are drawn in: the first opponent's. */
export const tokenColours = (game: Pick<Game, 'color' | 'opponents'>): { me: string; enemy: string } => ({
  me: playerColour(game.color),
  enemy: playerColour(game.opponents[0]?.color ?? game.color + 1),
});

const DISC_SHADE = 0.2;
const RIM = 4;
const HALO = 7;
const BADGE_STROKE = 9;
const BADGE_SCALE = 0.42;
const BADGE_AT = -68;
const TRIANGLE_DROP = 10;
/** How far the art reaches from the centre of a token 100 across. Ships stick out of their disc. */
const ART_RADIUS: Record<TokenKind, number> = {
  flagship: 74, dreadnought: 74, carrier: 74, cruiser: 74, destroyer: 74, warsun: 59, fighter: 50, infantry: 36, mech: 42, pds: 40, spacedock: 50,
};
/** The shape that says a unit takes a fleet pool slot, in a box of 100. Fighters and ground units have none. */
const BADGES: Partial<Record<TokenKind, string>> = {
  warsun: '<path d="M50 2a48 48 0 1 0 .01 0Z M50 30a20 20 0 1 1 -.01 0Z"/>',
  flagship: '<polygon points="50,0 63,34 100,36 71,58 81,96 50,75 19,96 29,58 0,36 37,34"/>',
  dreadnought: '<polygon points="50,1 92,50 50,99 8,50"/>',
  carrier: '<polygon points="50,2 94,26 94,74 50,98 6,74 6,26"/>',
  cruiser: '<polygon points="50,0 72,26 72,100 28,100 28,26"/>',
  destroyer: '<polygon points="50,4 98,92 62,92 50,70 38,92 2,92"/>',
};

function shade(colour: string, amount: number): string {
  const n = parseInt(colour.slice(1), 16);
  const part = (value: number) => Math.round(value * amount);
  return `rgb(${part((n >> 16) & 255)},${part((n >> 8) & 255)},${part(n & 255)})`;
}

function bodyShape(kind: TokenKind, fill: string, colour: string): string {
  const paint = `fill="${fill}" stroke="${colour}" stroke-width="${RIM}"`;
  if (kind === 'infantry' || kind === 'mech') return `<polygon points="50,6 96,86 4,86" ${paint}/>`;
  if (kind === 'pds' || kind === 'spacedock') return `<rect x="14" y="14" width="72" height="72" rx="3" ${paint}/>`;
  return `<circle cx="50" cy="50" r="48" ${paint}/>`;
}

/** The token as SVG markup, 100 across and centred on the origin: the disc, the art with its halo, the badge. */
export function tokenMarkup(kind: TokenKind, colour: string): string {
  const art = UNIT_ART[kind];
  const fill = shade(colour, DISC_SHADE);
  const scale = ART_RADIUS[kind] / art.r;
  const drop = kind === 'infantry' || kind === 'mech' ? TRIANGLE_DROP : 0;
  const paths = art.paths.map(d => `<path d="${d}"/>`).join('');
  const badge = BADGES[kind];
  return `<g transform="translate(-50,-50)">${bodyShape(kind, fill, colour)}</g>`
    + `<g transform="translate(0,${drop}) scale(${scale}) translate(${-art.cx},${-art.cy})">`
    + `<g fill="${fill}" stroke="${fill}" stroke-width="${HALO / scale}" stroke-linejoin="round">${paths}</g>`
    + `<g fill="${colour}">${paths}</g>`
    + '</g>'
    + (badge ? `<g transform="translate(${BADGE_AT},${BADGE_AT}) scale(${BADGE_SCALE})" fill="${fill}" fill-rule="evenodd" stroke="${colour}" stroke-width="${BADGE_STROKE}" stroke-linejoin="round">${badge}</g>` : '');
}

const SPRITE_PX = 384;
/** A sprite covers this much around the centre of a token 100 across, for the art and the badge that stick out. */
export const SPRITE_REACH = 100;

const sprites = new Map<string, string>();
const baking = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
const spriteKey = (kind: TokenKind, colour: string) => `${kind}${colour}`;

/** The finished bitmap of a token, or undefined before `prepareSprites` has finished; then draw the vector art. */
export const getSprite = (kind: TokenKind, colour: string): string | undefined => sprites.get(spriteKey(kind, colour));

export function subscribeSprites(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Longer than any real bake; an image that neither loads nor fails must not hold the map back. */
export const BAKE_TIMEOUT_MS = 5000;

/** Draws a token once to a bitmap. On any failure no sprite is stored, and the token simply stays vector art. */
function bake(kind: TokenKind, colour: string): Promise<void> {
  return new Promise(resolve => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-SPRITE_REACH} ${-SPRITE_REACH} ${2 * SPRITE_REACH} ${2 * SPRITE_REACH}" width="${SPRITE_PX}" height="${SPRITE_PX}">${tokenMarkup(kind, colour)}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const image = new Image();
    const finish = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      image.onload = null;
      image.onerror = null;
      resolve();
    };
    const timer = setTimeout(finish, BAKE_TIMEOUT_MS);
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = SPRITE_PX;
      canvas.height = SPRITE_PX;
      const context = canvas.getContext('2d');
      if (!context) { finish(); return; }
      context.drawImage(image, 0, 0);
      canvas.toBlob(blob => {
        if (blob) sprites.set(spriteKey(kind, colour), URL.createObjectURL(blob));
        finish();
      });
    };
    image.onerror = finish;
    image.src = url;
  });
}

const ALL_KINDS = Object.keys(UNIT_ART) as TokenKind[];

/** Bakes every token in the given colours. After it resolves `getSprite` answers at once for them. */
export async function prepareSprites(colours: string[]): Promise<void> {
  // jsdom has no canvas: tests stay on the vector art.
  if (typeof URL.createObjectURL !== 'function') return;
  const jobs = colours.flatMap(colour => ALL_KINDS.map(kind => {
    const key = spriteKey(kind, colour);
    let job = baking.get(key);
    if (!job) {
      // A failed bake may be tried again by the next call.
      job = bake(kind, colour).then(() => { if (!sprites.has(key)) baking.delete(key); });
      baking.set(key, job);
    }
    return job;
  }));
  await Promise.all(jobs);
  for (const listener of listeners) listener();
}
