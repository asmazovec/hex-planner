import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../testing/old/domain/newGame';
import { setPlayerFaction } from '../../testing/old/domain/players';
import { tableOf } from '../../testing/old/game/fromLegacy';
import { initialBoard } from '../setup';
import type { Board } from '../types';
import { appliedOn, hintsAtSteps, holderIn, inForce, readerOf, sharedOf, stepPlayers } from './index';

const pack = loadPack(['pok', 'te']);
let game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: 'sol' }, pack);
game = setPlayerFaction(game, 1, 'winnu', pack);
const table = tableOf(game);
const start = initialBoard(table, pack);
const [jord] = pack.tiles['1'].planetIds;
const home = Object.keys(start.systems).find(slot => start.systems[slot].ships.p1)!;

const holding = (board: Board, player: string, cards: Record<string, { state: 'ready' | 'exhausted'; count: number }>): Board =>
  ({ ...board, players: { ...board.players, [player]: { ...board.players[player], cards: { ...board.players[player].cards, ...cards } } } });

describe('the read facade', () => {
  test('`my` and `of` answer in the words of the game, from the board alone', () => {
    const sol = readerOf(table, start, pack, 'p1');
    expect(sol.faction).toBe('sol');
    expect(sol.unitsIn(home)).toEqual({ carrier: 2, destroyer: 1, fighter: 3 });
    expect(sol.unitsOn(jord)).toEqual({ infantry: 5 });
    expect(sol.planets().map(p => p.id)).toContain(jord);
    expect(sol.planets().find(p => p.id === jord)).toMatchObject({ resources: 4, influence: 2, exhausted: false });
    expect(sol.structures()).toEqual([{ planet: jord, structures: { spacedock: 1 } }]);
    expect(sol.standsIn(home, [])).toBe(true);
    expect(readerOf(table, start, pack, 'p3').standsIn(home, [])).toBe(false);
    expect(sol.holds('technology:nonexistent')).toBe(false);
  });

  test('cards come with their state, purged ones are not held', () => {
    const board = holding(start, 'p1', { 'actionCard:decoy': { state: 'ready', count: 1 }, 'relic:shard': { state: 'exhausted', count: 1 } });
    const sol = readerOf(table, board, pack, 'p1');
    expect(sol.card('actionCard:decoy')).toBe('ready');
    expect(sol.card('relic:shard')).toBe('exhausted');
    expect(sol.cards('actionCard').map(c => c.id)).toEqual(['actionCard:decoy']);
    expect(sharedOf(board, pack).laws()).toEqual([]);
  });
});

describe('the registry over the board', () => {
  test('in force: what a player holds and their faction sheet bring, and what another player holds does not count for them', () => {
    const sol = inForce(table, start, pack, 'p1');
    expect(sol.some(id => id.startsWith('ability:'))).toBe(true);
    expect(holderIn(table, start, 'p1').faction).toBe('sol');
    expect(inForce(table, start, pack, 'p3').some(id => id.startsWith('ability:'))).toBe(false);
  });

  test('a point of the count asks the components of one player only', () => {
    // Gravity Drive: +1 to the move value of one ship; a player without it gets the base.
    const board = holding(start, 'p1', { 'technology:gd': { state: 'ready', count: 1 } });
    const ctx = { faction: 'sol', unit: 'carrier' as const };
    expect(appliedOn(table, board, pack, 'p1', 'speed', 1, ctx).value).toBeGreaterThanOrEqual(1);
    expect(appliedOn(table, board, pack, 'p2', 'speed', 1, ctx).value).toBe(1);
  });

  test('who is concerned: the actor, and in a battle or an invasion whoever stands in the system', () => {
    expect(stepPlayers(table, start, 'p3', 'movement', home, [])).toEqual(['p3']);
    expect(stepPlayers(table, start, 'p3', 'combat', null, [])).toEqual(['p3']);
    expect(stepPlayers(table, start, 'p3', 'combat', home, [])).toEqual(['p3', 'p1']);
    expect(stepPlayers(table, start, 'p3', 'invasion', '9,9', [jord])).toEqual(['p3', 'p1']);
  });

  test('a reminder of "when another player ..." shows in the action of another player, not in the holder\'s own', () => {
    const board = holding(start, 'p1', { 'actionCard:decoy': { state: 'ready', count: 1 } });
    const ids = (actor: string): string[] => (hintsAtSteps(table, board, pack, actor, ['activation']).get('activation') ?? []).map(c => c.id);
    expect(ids('p1')).not.toContain('actionCard:decoy');
    expect(ids('p2')).toContain('actionCard:decoy');
    expect(ids('p3')).toContain('actionCard:decoy');
  });

  test('a reminder of one\'s own turn shows in the holder\'s action only, and a note of one\'s own is not offered (69.2)', () => {
    const board = holding(start, 'p1', { 'actionCard:rift': { state: 'ready', count: 1 }, 'promissory:stymie@p1': { state: 'ready', count: 1 } });
    const at = (actor: string, step: 'movement' | 'activation'): string[] => (hintsAtSteps(table, board, pack, actor, [step]).get(step) ?? []).map(c => c.id);
    expect(at('p2', 'movement')).not.toContain('promissory:stymie@p1');
    expect(at('p1', 'movement')).not.toContain('promissory:stymie@p1');
  });
});

describe('what a player has ready to play', () => {
  test('`ready` answers as the old readiness did: cards held and not exhausted, a faction sheet for its own faction, a legendary planet for its controller', () => {
    const ability = `ability:${pack.factions.sol.sheet!.abilities[0].id}`;
    const winnuAbility = `ability:${pack.factions.winnu.sheet!.abilities[0].id}`;
    const sol = readerOf(table, start, pack, 'p1');
    expect(sol.card(ability)).toBeUndefined();
    expect(sol.ready(ability)).toBe(true);
    expect(sol.ready(winnuAbility)).toBe(false);
    expect(readerOf(table, start, pack, 'p2').ready(winnuAbility)).toBe(true);
    const board = holding(start, 'p1', { 'relic:shard': { state: 'exhausted', count: 1 }, 'actionCard:decoy': { state: 'ready', count: 1 } });
    expect(readerOf(table, board, pack, 'p1').ready('relic:shard')).toBe(false);
    expect(readerOf(table, board, pack, 'p1').ready('actionCard:decoy')).toBe(true);
    const legendary = Object.keys(pack.planets).find(id => pack.planets[id].legendary)!;
    const held = { ...start, planets: { ...start.planets, [legendary]: { ...start.planets[jord], owner: 'p1' } } };
    expect(readerOf(table, held, pack, 'p1').ready(`legendary:${legendary}`)).toBe(true);
    expect(readerOf(table, held, pack, 'p2').ready(`legendary:${legendary}`)).toBe(false);
  });
});
