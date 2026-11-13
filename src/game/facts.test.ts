/** The facts a board holds beyond the map and the pools: what stands on a component's card, wormhole and anomaly tokens, the Thunder's Edge slot. */
import { describe, expect, test } from 'vitest';
import { apply, applyAll, applyChecked } from './apply';
import { bareBoard } from './testTable';

describe('a component\'s own card', () => {
  const held = applyAll(bareBoard(), [{ type: 'CardGained', player: 'p1', card: 'leader:mech' }]);

  test('units and a technology are put on it and taken off it', () => {
    const loaded = applyAll(held, [
      { type: 'CardLoaded', player: 'p1', card: 'leader:mech', units: { mech: 2 } },
      { type: 'CardLoaded', player: 'p1', card: 'leader:mech', technology: 'technology:x' },
      { type: 'CardUnloaded', player: 'p1', card: 'leader:mech', units: { mech: 1 } },
    ]);
    expect(loaded.players.p1.cards['leader:mech'].onCard).toEqual({ units: { mech: 1 }, technologies: ['technology:x'] });
  });

  test('more taken than stands there is reported, and the card is left empty of it', () => {
    const { board, shortfall } = applyChecked(held, { type: 'CardUnloaded', player: 'p1', card: 'leader:mech', units: { mech: 1 } });
    expect(shortfall).toEqual([{ what: 'units', player: 'p1', where: 'leader:mech', key: 'mech', missing: 1 }]);
    expect(board.players.p1.cards['leader:mech'].onCard?.units).toEqual({});
  });
});

describe('tokens of the map', () => {
  test('a wormhole token moves from one system to another', () => {
    const board = applyAll(bareBoard(), [
      { type: 'WormholeTokenPlaced', system: '1,0', wormhole: 'alpha' },
      { type: 'WormholeTokenMoved', from: '1,0', to: '2,0', wormhole: 'alpha' },
    ]);
    expect(board.common.wormholeTokens).toEqual({ '2,0': ['alpha'] });
  });

  test('moving a token that is not there is reported', () => {
    expect(applyChecked(bareBoard(), { type: 'WormholeTokenMoved', from: '1,0', to: '2,0', wormhole: 'beta' }).shortfall).toHaveLength(1);
  });

  test('an anomaly token is placed once; the Thunder\'s Edge slot is set', () => {
    const board = applyAll(bareBoard(), [
      { type: 'AnomalyTokenPlaced', system: '3,0', anomaly: 'scar' },
      { type: 'AnomalyTokenPlaced', system: '3,0', anomaly: 'scar' },
      { type: 'ThundersEdgeSlotSet', system: '4,0' },
    ]);
    expect(board.common.anomalyTokens).toEqual({ '3,0': ['scar'] });
    expect(board.common.thundersEdge).toBe('4,0');
    expect(apply(board, { type: 'ThundersEdgeSlotSet', system: '4,0' })).toBe(board);
  });

  test('another player\'s note held in play is a card in play', () => {
    const board = applyAll(bareBoard(), [{ type: 'CardGained', player: 'p1', card: 'promissory:ceasefire@p2', state: 'inPlay' }]);
    expect(board.players.p1.cards['promissory:ceasefire@p2']).toEqual({ state: 'inPlay', count: 1 });
  });
});
