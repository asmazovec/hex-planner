import { describe, expect, test } from 'vitest';
import type { Act, DataPack } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import type { Player } from '../../../players';
import { adjust, bench, effect, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './wormhole_recon';

/** The agenda resolved in the agenda phase of round 1, with the outcome that received the most votes. */
const resolved = (outcome: 'for' | 'against'): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { outcome } } as Entry);

/** A rival whose faction has an empty home off this row: they are only where their carrier stands. */
const RIVAL: Player = { id: 'o1', faction: 'rules-rival', vp: 0, seat: 2, color: 2 };
const withRival = (pack: DataPack) => {
  pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
};

/** My carrier in the alpha system next to home; the rival's carrier in `rivalAt`, the far end holding `farTile`. */
const table = (law: Entry | null, { rivalAt = FARTHER, farTile = 'r-beta' } = {}) => {
  const deal: Act = { kind: 'transaction', with: 'o1', give: { tradeGoods: 1 }, get: {} };
  const turn = tactical(HOME, { acts: [deal] });
  const map = { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-empty', [FAR]: 'r-empty', [FARTHER]: farTile };
  return {
    turn, ...bench({
      faction: 'sol', edit: withRival, units: { [NEAR]: { carrier: 1 } },
      game: { map, opponents: [RIVAL], enemyUnits: { [rivalAt]: { o1: { carrier: 1 } } } },
      rounds: [[adjust({ tradeGoods: 1 }, 'strategy'), ...(law ? [law] : [])], [turn]],
    }),
  };
};

describe('agenda:wormhole_recon Wormhole Reconstruction', () => {
  // "For: All systems that contain either an alpha or beta wormhole are adjacent to each other."
  // Checks: my carrier stands in the alpha system, the rival's in the beta one; under the law they are neighbours and
  // a transaction with them is not warned of.
  // Why the check is redundant here: a transaction needs a neighbour (94.1), and systems adjacent through wormholes
  // make neighbours (60.2); the law makes the alpha and the beta systems adjacent, so no warning is made at all.
  test('agenda:wormhole_recon makes the alpha and beta systems adjacent: players there are neighbours', () => {
    const t = table(resolved('for'));
    quote(t.pack, id, 'All systems that contain either an alpha or beta wormhole are adjacent to each other.');
    expectNone(warningsOf(t, t.turn), 'notNeighbor');
  });

  // LRR 60.2 / 94.1.
  // Checks: without the law an alpha and a beta system are not adjacent; the transaction is warned of.
  // Why the check is NOT redundant here: no law is in play.
  test('agenda:wormhole_recon without the law an alpha and a beta system are not adjacent', () => {
    const t = table(null);
    expectStanding(warningsOf(t, t.turn), 'notNeighbor');
  });

  // Checks: the far end is an empty system; the law joins it to nothing and the transaction is still warned of.
  // Why the check is NOT redundant here: the law speaks of systems with an alpha or a beta wormhole only.
  test('agenda:wormhole_recon joins no system without a wormhole', () => {
    const t = table(resolved('for'), { farTile: 'r-empty' });
    expectStanding(warningsOf(t, t.turn), 'notNeighbor');
  });

  // LRR 7.6: "If an "Against" outcome of a law received the most votes, players resolve the outcome and discard the agenda."
  // Checks: resolved Against, the law is not in play and joins nothing.
  // Why the check is NOT redundant here: only the "For" outcome of a law stays in play (8.20).
  test('agenda:wormhole_recon resolved Against is discarded: nothing is joined', () => {
    const t = table(resolved('against'));
    expect(endOf(t).laws ?? []).not.toContain(id);
    expectStanding(warningsOf(t, t.turn), 'notNeighbor');
  });

  test('agenda:wormhole_recon is a passive effect', () => {
    expect(effect(table(null).pack, id).tier).toBe('passive');
  });

  test.todo('agenda:wormhole_recon the reach of a route counts the new adjacency (alpha to beta in one step, drawn as a step, not as a jump): `routeGraph` is to be given the laws in pass 2');
  test.todo('agenda:wormhole_recon Against places a command token in each wormhole system with my ships: a one-time change of the outcome, entered by hand until the outcome plays');
});
