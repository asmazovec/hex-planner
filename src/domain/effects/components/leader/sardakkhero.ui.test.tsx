import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { componentById } from '../../../components';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, endOf, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './sardakkhero';

uiBench();

const invade = (): Entry => tactical(TARGET, {
  moves: [{ from: HOME, units: { cruiser: 2, infantry: 2 }, via: [NEAR] }], landings: [{ planetId: 't1', units: { infantry: 2 } }],
});

// "If you do, after you commit ground forces to land on planets, purge this card and return each of your ships in the
//  active system to your reinforcements."
// Checks: in «Used» of my tactical action I choose the hero; the entry names it, the infantry stay on Target One and
// no cruiser is left in the target.
// Why nothing is waived here: the hero changes the board, which the plan counts; the steps it skips are combat.
test('leader:sardakkhero chosen in «Used» returns the ships of the active system after the landing', async () => {
  const move = invade();
  const table = bench({ faction: 'sardakk', expansions: ['pok'], units: { [HOME]: { cruiser: 2, infantry: 2 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [move] });
  quote(table.pack, id, 'return each of your ships in the active system to your reinforcements');
  const live = showUses(table, move);
  await use(componentById(table.pack, id)!.name);
  expect(live.entry().uses).toEqual([id]);
  const end = endOf({ pack: table.pack, game: live.game() });
  expect(end.ground.t1).toEqual({ infantry: 2 });
  expect(end.systems[TARGET]?.cruiser ?? 0).toBe(0);
});
