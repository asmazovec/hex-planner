/** The tactical entry of the old plan as a turn, and back. */
import { describe, expect, test } from 'vitest';
import { FAR, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../domain/rules/kit';
import type { Entry } from '../domain/types';
import { legacyEntry, legacyPlayer, playerOfLegacy, tableOf, turnOf } from './fromLegacy';

const pack = rulesPack();
const game = rulesGame({ game: { opponents: [{ id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 }] } });
const table = tableOf(game);

const entry = tactical(TARGET, {
  moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }, { from: 'h1', units: { infantry: 2 } }, { from: FAR, units: { fighter: 1 }, pickupOf: HOME, structures: { pds: 1 } }],
  landings: [{ planetId: 't1', units: { infantry: 2 }, from: 'h2', structures: { spacedock: 1 } }],
  production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 1 }, losses: { fighter: 1 }, groundLosses: { t1: { infantry: 1 } },
  fleetRemovals: { cruiser: 1 }, productionGround: { h1: { infantry: 1 } }, shipsTo: NEAR, free: true,
  custodiansPayment: { planets: [], tradeGoods: 2 },
});

describe('turnOf', () => {
  test('a source is a planet when the pack says so, else a slot; the losses are the owner\'s side', () => {
    const turn = turnOf(table, entry, pack);
    expect(turn.player).toBe('p1');
    expect(turn.action).toMatchObject({ kind: 'tactical', system: TARGET, free: true });
    if (turn.action.kind !== 'tactical') throw new Error('tactical');
    expect(turn.action.movement.map(f => f.from)).toEqual([{ slot: HOME }, { planet: 'h1' }, { slot: FAR }]);
    expect(turn.action.spaceCombat).toEqual({ p1: { fighter: 1 } });
    expect(turn.action.groundCombat).toEqual({ t1: { p1: { infantry: 1 } } });
    expect(turn.action.production).toMatchObject({ units: { cruiser: 1 }, ground: { h1: { infantry: 1 } }, shipsTo: NEAR });
  });

  test('legacyEntry gives the entry back, whoever the owner is', () => {
    const mine = turnOf(table, entry, pack);
    expect(legacyEntry(table, mine)).toMatchObject({ type: 'tactical', systemId: TARGET, moves: entry.type === 'tactical' ? entry.moves : [], losses: { fighter: 1 }, groundLosses: { t1: { infantry: 1 } }, free: true });
    const theirs = tactical(TARGET, { losses: { cruiser: 1 } }, { owner: 'o1' });
    const turn = turnOf(table, theirs, pack);
    expect(turn.player).toBe(playerOfLegacy(table, 'o1'));
    expect(legacyEntry(table, turn)).toMatchObject({ owner: 'o1', losses: { cruiser: 1 } });
    expect(legacyPlayer(table, turn.player)).toBe('o1');
  });

  test('every kind of entry becomes a turn and comes back as the entry it was', () => {
    const pass: Entry = { id: 'x', phase: 'action', status: 'planned', type: 'pass' };
    expect(turnOf(table, pass, pack).action).toEqual({ kind: 'pass' });
    expect(legacyEntry(table, turnOf(table, pass, pack))).toMatchObject({ type: 'pass', phase: 'action' });
  });
});
