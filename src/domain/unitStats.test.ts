import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from './newGame';
import { entryUpgradeRounds, hasLevelTwo, isUniqueShip, toggleUpgrade, unitStats } from './unitStats';
import type { Entry, Plan, UnitId } from './types';

const pack = loadPack(['pok', 'te']);

describe('unitStats', () => {
  test('the base table has level I and level II', () => {
    expect(unitStats('arborec', 'carrier', false, pack)).toMatchObject({ cost: 3, capacity: 4, combat: 9, dice: 1, move: 1 });
    expect(unitStats('arborec', 'carrier', true, pack)).toMatchObject({ cost: 3, capacity: 6, combat: 9, dice: 1, move: 2 });
    expect(unitStats('arborec', 'fighter', false, pack)).toMatchObject({ cost: 0.5, capacity: 0, combat: 9, move: null });
    expect(unitStats('arborec', 'fighter', true, pack)).toMatchObject({ cost: 0.5, combat: 8, move: 2 });
  });

  test('a faction override replaces the base entry, level by level', () => {
    expect(unitStats('sol', 'carrier', false, pack)).toMatchObject({ name: 'Advanced Carrier I', capacity: 6, move: 1 });
    expect(unitStats('sol', 'carrier', true, pack)).toMatchObject({ name: 'Advanced Carrier II', capacity: 8, move: 2 });
    expect(unitStats('argent', 'destroyer', false, pack)).toMatchObject({ name: 'Strike Wing Alpha I', capacity: 1, combat: 8 });
    expect(unitStats('l1z1x', 'dreadnought', false, pack)).toMatchObject({ capacity: 2, combat: 5 });
    expect(unitStats('l1z1x', 'dreadnought', true, pack)).toMatchObject({ capacity: 2, combat: 4, move: 2 });
  });

  test('an upgrade with no level II returns level I', () => {
    expect(unitStats('arborec', 'warsun', true, pack)).toEqual(unitStats('arborec', 'warsun', false, pack));
    expect(unitStats('arborec', 'flagship', true, pack)).toEqual(unitStats('arborec', 'flagship', false, pack));
    expect(unitStats('arborec', 'flagship', false, pack)).toMatchObject({ name: 'Duha Menaimon', capacity: 5, dice: 2 });
  });

  test('a faction not chosen yet falls back to the base table', () => {
    expect(unitStats('', 'carrier', false, pack)).toMatchObject({ capacity: 4 });
  });

  test('which ships have a level II, and which are unique', () => {
    expect(hasLevelTwo('arborec', 'carrier', pack)).toBe(true);
    expect(hasLevelTwo('arborec', 'warsun', pack)).toBe(false);
    expect(hasLevelTwo('muaat', 'warsun', pack)).toBe(true);
    expect(hasLevelTwo('arborec', 'flagship', pack)).toBe(false);
    expect(hasLevelTwo('nomad', 'flagship', pack)).toBe(true);
    expect(isUniqueShip('sol', 'carrier', pack)).toBe(true);
    expect(isUniqueShip('arborec', 'carrier', pack)).toBe(false);
  });
});

describe('toggleUpgrade', () => {
  const game = createGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, loadPack(['pok']));
  const opponent = game.opponents[0].id;

  test('on and off for me', () => {
    const on = toggleUpgrade(game, 'me', 'carrier');
    expect(on.upgrades.me).toEqual(['carrier']);
    expect(toggleUpgrade(on, 'me', 'carrier').upgrades.me).toEqual([]);
  });

  test('on and off for one opponent; nothing is left behind', () => {
    const on = toggleUpgrade(game, opponent, 'cruiser');
    expect(on.upgrades.opponents).toEqual({ [opponent]: ['cruiser'] });
    expect(on.upgrades.me).toEqual([]);
    expect(toggleUpgrade(on, opponent, 'cruiser').upgrades.opponents).toEqual({});
  });
});

describe('entryUpgradeRounds', () => {
  const upgrade = (id: string, status: Entry['status'], upgrades: UnitId[]): Entry =>
    ({ id, phase: 'action', status, type: 'strategic', upgrades });
  const plan: Plan = {
    id: 'p', name: 'p', rounds: [
      { number: 2, strategyCard: null, backupCard: null, entries: [upgrade('b', 'planned', ['carrier']), upgrade('c', 'cancelled', ['fighter'])] },
      { number: 1, strategyCard: null, backupCard: null, entries: [] },
      { number: 3, strategyCard: null, backupCard: null, entries: [upgrade('d', 'done', ['carrier'])] },
    ],
  };

  test('the first round that gives each upgrade, by filter', () => {
    expect(entryUpgradeRounds(plan, 'forecast')).toEqual({ carrier: 2 });
    expect(entryUpgradeRounds(plan, 'now')).toEqual({ carrier: 3 });
  });
});
