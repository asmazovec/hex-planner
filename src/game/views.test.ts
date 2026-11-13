import { describe, expect, test } from 'vitest';
import { rulesGame, rulesPack } from '../domain/rules/kit';
import { applyAll } from './apply';
import { emptyBoard } from './board';
import { tableOf } from './fromLegacy';
import { seenBy, tableView } from './views';

const pack = rulesPack();
const game = rulesGame({ game: { opponents: [{ id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 }] } });
const table = tableOf(game);
const [me, rival] = table.players.map(p => p.id);

describe('the read model of the table', () => {
  const board = applyAll(emptyBoard(table), [
    { type: 'TokensChanged', player: me, delta: { tactic: 3 } },
    { type: 'PlanetGained', player: me, planet: 'h1' },
    { type: 'PlanetExhausted', player: me, planet: 'h1' },
    { type: 'StructurePlaced', player: me, at: { planet: 'h1' }, structures: { spacedock: 1 } },
    { type: 'UnitsPlaced', player: me, at: { slot: '0,0' }, units: { cruiser: 2 } },
    { type: 'PointsChanged', player: rival, delta: 2 },
    { type: 'CardGained', player: me, card: 'actionCard:sabotage1', count: 2 },
  ]);

  test('a player: pools, planets with their printed values and ready state, ships, structures, cards by kind', () => {
    const view = seenBy(table, board, pack, me);
    expect(view.me.pools.tactic).toBe(3);
    expect(view.me.planets.map(p => [p.id, p.ready, p.structures])).toEqual([['h1', false, { spacedock: 1 }]]);
    expect(view.me.ships).toEqual({ '0,0': { cruiser: 2 } });
    expect(view.me.cards.actionCard?.[0]).toMatchObject({ id: 'actionCard:sabotage1', count: 2 });
    expect(view.others.map(p => [p.id, p.vp])).toEqual([[rival, 2]]);
  });

  test('the table: round, speaker, laws and the players', () => {
    const view = tableView(table, board, pack);
    expect(view).toMatchObject({ round: 1, speaker: me, viewer: table.viewer, laws: [] });
    expect(view.players).toHaveLength(2);
  });
});
