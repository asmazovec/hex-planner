import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { TokenKind } from '../../domain/hexLayout';
import { BAKE_TIMEOUT_MS, getSprite, PLAYER_COLOURS, prepareSprites, tokenColours, tokenMarkup } from './sprites';
import { UNIT_ART } from './unitArt';
import { UnitToken } from './UnitToken';

const realRevoke = URL.revokeObjectURL;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // test-setup clears createObjectURL again after every test.
  URL.revokeObjectURL = realRevoke;
});

function stubBlobUrls(): void {
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:stub'), revokeObjectURL: vi.fn() });
}

const iconSources = import.meta.glob<string>('/docs/icon-references/*.svg', { query: '?raw', import: 'default', eager: true });

const CIRCLES: TokenKind[] = ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter'];
const SHAPES: [TokenKind, string][] = [
  ...CIRCLES.map((kind): [TokenKind, string] => [kind, 'circle']),
  ['infantry', 'polygon'], ['mech', 'polygon'], ['pds', 'rect'], ['spacedock', 'rect'],
];

const draw = (kind: TokenKind, props: { count?: number; size?: number } = {}) => {
  render(<svg><UnitToken kind={kind} colour={PLAYER_COLOURS[0]} size={props.size ?? 20} count={props.count} label={kind} /></svg>);
  return screen.getByRole('img', { name: kind });
};

test.each(SHAPES)('%s stands on a %s with a rim of the player colour and a dark disc', (kind, shape) => {
  const body = draw(kind).querySelector('g[transform="translate(-50,-50)"]')!.firstElementChild!;
  expect(body.tagName).toBe(shape);
  expect(body).toHaveAttribute('stroke', PLAYER_COLOURS[0]);
  expect(body).toHaveAttribute('stroke-width', '4');
  // #7fb2ff at a fifth of its brightness.
  expect(body).toHaveAttribute('fill', 'rgb(25,36,51)');
});

test.each(SHAPES)('%s has its art twice: the halo under the icon', (kind) => {
  const token = draw(kind);
  expect(token.querySelectorAll('path').length).toBeGreaterThanOrEqual(UNIT_ART[kind].paths.length * 2);
  expect(token.querySelector(`g[fill="${PLAYER_COLOURS[0]}"]`)).not.toBeNull();
  expect(token.querySelector('g[stroke-linejoin="round"]')).not.toBeNull();
});

test('every ship but the fighter has a fleet pool badge; ground units and structures have none', () => {
  const badge = (kind: TokenKind) => tokenMarkup(kind, PLAYER_COLOURS[0]).includes('fill-rule="evenodd"');
  for (const kind of ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer'] as const) expect(badge(kind), kind).toBe(true);
  for (const kind of ['fighter', 'infantry', 'mech', 'pds', 'spacedock'] as const) expect(badge(kind), kind).toBe(false);
});

test('a counter shows above one unit, and keeps its minimum size on a small token', () => {
  expect(draw('carrier').querySelector('.unit-counter')).toBeNull();
  cleanup();
  const small = draw('carrier', { count: 3, size: 6 });
  expect(small).toHaveTextContent('3');
  const onTile = (size: number) => (Number(document.querySelector('.unit-counter')!.getAttribute('r')) * size) / 100;
  const least = onTile(6);
  cleanup();
  draw('carrier', { count: 3, size: 10 });
  expect(onTile(10)).toBeCloseTo(least);
  cleanup();
  draw('carrier', { count: 3, size: 24 });
  expect(onTile(24)).toBeGreaterThan(least);
});

test('the art of each unit stays in the budget, measured ahead of time', () => {
  for (const [kind, art] of Object.entries(UNIT_ART)) {
    expect(art.paths.join('').length, kind).toBeLessThanOrEqual(12_000);
    expect(art.r, kind).toBeGreaterThan(0);
  }
  expect(Object.keys(UNIT_ART).sort()).toEqual(SHAPES.map(([kind]) => kind).sort());
});

test.each(['warsun', 'infantry', 'mech', 'pds', 'spacedock'] as const)('the game-icons path of %s is copied unchanged', kind => {
  expect(iconSources[`/docs/icon-references/${kind}.svg`]).toContain(`d="${UNIT_ART[kind].paths[0]}"`);
});

test('enemy units take the colour of the first opponent', () => {
  expect(tokenColours({ color: 2, opponents: [{ faction: '', vp: 0, seat: 2, color: 5 }, { faction: '', vp: 0, seat: 3, color: 6 }] }))
    .toEqual({ me: PLAYER_COLOURS[1], enemy: PLAYER_COLOURS[4] });
});

test('without a canvas the sprites stay away and the token draws vector art', async () => {
  await prepareSprites([PLAYER_COLOURS[0]]);
  expect(getSprite('carrier', PLAYER_COLOURS[0])).toBeUndefined();
  expect(draw('carrier').querySelector('image')).toBeNull();
});

test('a token is baked once per kind and colour, and the token switches to the bitmap', async () => {
  stubBlobUrls();
  vi.stubGlobal('Image', class {
    onload: () => void = () => undefined;
    set src(_: string) { queueMicrotask(() => this.onload()); }
  });
  const toBlob = vi.fn((done: (blob: Blob) => void) => done(new Blob(['png'])));
  const create = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => (tag === 'canvas'
    ? { getContext: () => ({ drawImage: vi.fn() }), toBlob }
    : create(tag))) as typeof document.createElement);

  const colour = PLAYER_COLOURS[6];
  render(<svg><UnitToken kind="carrier" colour={colour} size={20} label="token" /></svg>);
  expect(screen.getByRole('img', { name: 'token' }).querySelector('image')).toBeNull();

  await act(() => prepareSprites([colour]));
  expect(toBlob).toHaveBeenCalledTimes(Object.keys(UNIT_ART).length);
  expect(getSprite('carrier', colour)).toMatch(/^blob:/);
  expect(screen.getByRole('img', { name: 'token' }).querySelector('image')).toHaveAttribute('href', getSprite('carrier', colour));

  await prepareSprites([colour]);
  expect(toBlob).toHaveBeenCalledTimes(Object.keys(UNIT_ART).length);
});

test('without a 2d context no blank bitmap is stored, and the token stays vector art', async () => {
  stubBlobUrls();
  vi.stubGlobal('Image', class {
    onload: (() => void) | null = null;
    set src(_: string) { queueMicrotask(() => this.onload?.()); }
  });
  const toBlob = vi.fn();
  const create = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => (tag === 'canvas'
    ? { getContext: () => null, toBlob }
    : create(tag))) as typeof document.createElement);
  const colour = PLAYER_COLOURS[3];
  await prepareSprites([colour]);
  expect(toBlob).not.toHaveBeenCalled();
  expect(getSprite('carrier', colour)).toBeUndefined();
});

test('an image that never answers does not hold the promise, and leaves vector art', async () => {
  stubBlobUrls();
  vi.stubGlobal('Image', class { set src(_: string) { /* neither loads nor fails */ } });
  vi.useFakeTimers();
  try {
    const colour = PLAYER_COLOURS[4];
    let done = false;
    const job = prepareSprites([colour]).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(BAKE_TIMEOUT_MS - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await job;
    expect(done).toBe(true);
    expect(getSprite('carrier', colour)).toBeUndefined();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
