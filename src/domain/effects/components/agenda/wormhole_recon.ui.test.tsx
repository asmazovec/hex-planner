import { test } from 'vitest';
import { expectNotShown, expectShownStanding, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { Act, DataPack } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import type { Player } from '../../../players';
import { adjust, bench, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './wormhole_recon';

uiBench();

const resolved = (outcome: 'for' | 'against'): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { outcome } } as Entry);
const RIVAL: Player = { id: 'o1', faction: 'rules-rival', vp: 0, seat: 2, color: 2 };
const withRival = (pack: DataPack) => {
  pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
};
/** My carrier in the alpha system, the rival's in the beta one; round 2 trades a trade good with them. */
const table = (law: Entry | null) => {
  const turn = tactical(HOME, { acts: [{ kind: 'transaction', with: 'o1', give: { tradeGoods: 1 }, get: {} } satisfies Act] });
  const map = { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-empty', [FAR]: 'r-empty', [FARTHER]: 'r-beta' };
  return {
    turn, ...bench({
      faction: 'sol', edit: withRival, units: { [NEAR]: { carrier: 1 } },
      game: { map, opponents: [RIVAL], enemyUnits: { [FARTHER]: { o1: { carrier: 1 } } } },
      rounds: [[adjust({ tradeGoods: 1 }, 'strategy'), ...(law ? [law] : [])], [turn]],
    }),
  };
};

// "For: All systems that contain either an alpha or beta wormhole are adjacent to each other."
// Checks: the transaction with a rival in the beta system shows no warning about neighbours.
// Why the check is redundant here: the law makes the two systems adjacent, so the players are neighbours (60.2).
test('agenda:wormhole_recon a transaction across the alpha and beta systems is shown with no neighbour warning', () => {
  const t = table(resolved('for'));
  quote(t.pack, id, 'All systems that contain either an alpha or beta wormhole are adjacent to each other.');
  showWarnings(t, t.turn);
  expectNotShown('notNeighbor');
});

// LRR 94.1 with 60.2. Checks: without the law the same transaction is shown with its warning, standing.
// Why the check is NOT redundant here: no law is in play.
test('agenda:wormhole_recon without the law the transaction is shown with its neighbour warning', () => {
  const t = table(null);
  showWarnings(t, t.turn);
  expectShownStanding('notNeighbor');
});
