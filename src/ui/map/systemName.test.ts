import { beforeEach, describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { systemNameOf } from '../../domain/systemName';
import i18n, { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { systemName, systemTitle } from './systemName';
import { gameNow } from '../../testing/store';

const pack = loadPack(['pok']);
const t = i18n.t.bind(i18n);

/** One slot for each kind of system: 5 is the Sol home, 25 has a wormhole and a planet, 26 one planet, 39 a wormhole only. */
const SLOTS = { home: '1,0', quann: '0,1', lodor: '1,1', alpha: '2,0', nebula: '2,1', rift: '0,2', empty: '1,2', three: '2,2', lane: '3,0' };

beforeEach(() => {
  setLanguage('en');
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  const { setTile } = useGame.getState();
  setTile(SLOTS.home, '1');
  setTile(SLOTS.quann, '25');
  setTile(SLOTS.lodor, '26');
  setTile(SLOTS.alpha, '39');
  setTile(SLOTS.nebula, '42');
  setTile(SLOTS.rift, '41');
  setTile(SLOTS.empty, '46');
  setTile(SLOTS.three, '76');
  setTile(SLOTS.lane, '83A');
});

const game = () => gameNow()!;

describe('what a system is called, as data', () => {
  test('a system with planets holds their names and its tile number', () => {
    expect(systemNameOf(game(), pack, SLOTS.quann)).toMatchObject({ planets: ['Quann'], number: '25', kind: 'system', wormholes: ['beta'], anomalies: [] });
    expect(systemNameOf(game(), pack, SLOTS.home)).toMatchObject({ planets: ['Jord'], number: '1', kind: 'home' });
  });

  test('a system without planets holds what marks it', () => {
    expect(systemNameOf(game(), pack, SLOTS.alpha)).toMatchObject({ planets: [], number: '39', wormholes: ['alpha'] });
    expect(systemNameOf(game(), pack, SLOTS.nebula)).toMatchObject({ planets: [], number: '42', anomalies: ['nebula'] });
    expect(systemNameOf(game(), pack, SLOTS.empty)).toMatchObject({ planets: [], number: '46', anomalies: [], wormholes: [] });
  });

  test('a slot with no known tile has only its own key', () => {
    expect(systemNameOf(game(), pack, '9,9')).toEqual({ planets: [], number: '9,9', kind: null, anomalies: [], wormholes: [] });
  });
});

describe('the name of a system the player reads', () => {
  const title = (slot: string) => systemTitle(game(), pack, slot, t);

  test('planets name their system, joined by a slash', () => {
    expect(title(SLOTS.quann)).toBe('Quann');
    expect(title(SLOTS.home)).toBe('Jord');
    expect(title(SLOTS.three)).toBe('Rigel I / Rigel II / Rigel III');
  });

  test('a system without planets is named as the map labels it, with its tile number', () => {
    expect(title(SLOTS.empty)).toBe('Empty (46)');
    expect(title(SLOTS.alpha)).toBe('Wormhole α (39)');
    expect(title(SLOTS.nebula)).toBe('Nebula (42)');
    expect(title(SLOTS.rift)).toBe('Gravity rift (41)');
    expect(title(SLOTS.lane)).toBe('Hyperlane (83)');
  });

  test('in Russian the label is the Russian one of the map', () => {
    setLanguage('ru');
    expect(title(SLOTS.empty)).toBe('Пусто (46)');
    expect(title(SLOTS.alpha)).toBe('Червоточина α (39)');
  });

  test('a slot with no known tile keeps its key, and the tile number stays where a number is asked for', () => {
    expect(title('9,9')).toBe('9,9');
    expect(systemName(game(), pack, SLOTS.quann)).toBe('25');
  });
});
