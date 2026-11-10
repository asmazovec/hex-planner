import { expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { factionsByExpansion } from './factionSheet';
import { emptyHoldings } from './holdings';
import { lookUpTile } from './mapBuilder';
import { newEntryBody, tacticalBody, tacticalOwner } from './newEntry';
import { rulesGame, rulesPack, tactical, TARGET } from './rules/kit';
import { enemyChange, holderIn, othersOnPlanet, playerState } from './stacks';
import { afterBattle, availableFor, flightOf, standingAfterBattle, withLanding, withProduction, type TacticalEntry } from './tactical';
import { sliceOwners } from './thundersEdge';
import type { GameState, Opponent, Round } from './types';
import { UNIT_ORDER } from './hexLayout';

const RIVAL: Opponent = { id: 'o1', faction: 'rules-tester', seat: 2, color: 2, vp: 0 };

test('an enemy ground force goes by planet, and one still listed with the system comes off there', () => {
  const game = rulesGame({ game: { opponents: [RIVAL], enemyUnits: { [TARGET]: { o1: { infantry: 2 } } } } });
  expect(enemyChange(game, TARGET, 'o1', 'infantry', 'p1', 1)).toEqual({ planetId: 'p1', units: { infantry: 1 } });
  expect(enemyChange(game, TARGET, 'o1', 'infantry', 'p1', -1)).toEqual({ slot: TARGET, units: { infantry: 1 } });
  expect(enemyChange(game, TARGET, 'o1', 'carrier', null, 1)).toEqual({ slot: TARGET, units: { infantry: 2, carrier: 1 } });
});

test('the holder of a planet is who took it in the plan, else its owner on the map', () => {
  const game = rulesGame({ game: { opponents: [RIVAL] } });
  expect(holderIn(game, { control: { p: 'enemy' }, rivalHolds: {} }, 'p')).toBe('o1');
  expect(holderIn(game, { control: { p: 'me' } }, 'p')).toBeUndefined();
});

test('the others on a planet come from the replay of the opponents when there is one', () => {
  const game = rulesGame({ game: { opponents: [RIVAL], enemyGround: { p: { o1: { infantry: 3 } } } } });
  expect(othersOnPlanet(game, undefined, 'p')).toEqual([{ owner: 'o1', unit: 'infantry', count: 3 }]);
  const board = { ground: {}, rivals: { o1: { ground: { p: { mech: 1 } } } } } as unknown as GameState;
  expect(othersOnPlanet(game, board, 'p')).toEqual([{ owner: 'o1', unit: 'mech', count: 1 }]);
  expect(playerState(board, 'o1')).toBe(board.rivals!.o1);
  expect(playerState(board, undefined)).toBe(board);
});

test('a tile number two sides share is told apart from an unknown one', () => {
  const pok = loadPack(['pok']);
  expect(lookUpTile('83', pok)).toBe('ambiguous');
  expect(lookUpTile('9999', pok)).toBe('unknown');
  expect(lookUpTile('25', pok)).toMatchObject({ id: '25' });
});

test('new entries: a card starts on mine for me and on none for an opponent; a free action is the card owner\'s', () => {
  const round: Round = { number: 1, strategyCard: 5, backupCard: null, entries: [{ id: 'c', phase: 'action', status: 'planned', type: 'strategic', card: 6, owner: 'o1' }] };
  expect(newEntryBody('strategic', round, 6)).toEqual({ type: 'strategic', card: 5 });
  expect(newEntryBody('strategic', round, 6, 'o1')).toEqual({ type: 'strategic' });
  expect(tacticalBody('s', 'c')).toMatchObject({ free: true, fromCard: 'c', systemId: 's' });
  expect(tacticalOwner(round, 'c', undefined)).toBe('o1');
  expect(tacticalOwner(round, undefined, 'o2')).toBe('o2');
});

test('expedition parts held without a plan leave out the unheld ones', () => {
  const game = rulesGame({ game: { expedition: { slices: { res5: 'other', inf5: null }, thundersEdgeSystem: null } } });
  expect(sliceOwners(game)).toEqual({ res5: 'other' });
});

test('factions go by the expansion that brings them', () => {
  const all = Object.values(loadPack(['pok', 'te']).factions);
  const groups = factionsByExpansion(all, loadPack([]).factions, loadPack(['pok']).factions);
  expect(groups.map(g => g.expansion)).toEqual(['base', 'pok', 'te']);
});

test('the tactical entry: the battle leaves what lands, a landing and a production change the entry', () => {
  const pack = rulesPack();
  const before = { systems: { [TARGET]: { infantry: 1 } }, ground: { p: { infantry: 2 } }, holdings: emptyHoldings() } as unknown as GameState;
  const entry = tactical(TARGET, { moves: [{ from: 'x', units: { carrier: 1, infantry: 2 } }], losses: { infantry: 1 } }) as TacticalEntry;
  expect(afterBattle(pack, entry, before, UNIT_ORDER)).toMatchObject({ left: { carrier: 1, infantry: 2 }, landable: ['infantry'] });
  expect(standingAfterBattle(before, 'p', { p: { infantry: 1 } })).toEqual({ infantry: 1 });
  expect(withLanding(entry, 'p', 'infantry', 2).landings).toEqual([{ planetId: 'p', units: { infantry: 2 } }]);
  expect(withProduction(entry, before, 'rules-tester', 'infantry', null, 1, pack, true)).toEqual({ production: { infantry: 1 } });
  expect(availableFor(rulesGame(), pack, before, entry, 'x', TARGET, 'infantry')).toBe(1);
  expect(flightOf(rulesGame(), pack, emptyHoldings(), entry, 'x').stops.size).toBe(0);
});
