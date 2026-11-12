import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './aetherpassage';

uiBench();

const table = () => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
  return {
    move,
    table: bench({
      faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, entries: [move],
      game: { opponents: [{ id: 'emp', faction: 'empyrean', vp: 0, seat: 2, color: 2 }], enemyUnits: { [NEAR]: { emp: { destroyer: 1 } } } },
    }),
  };
};

// "After a player activates a system: You may allow that player to move their ships through systems that contain
//  your ships."
// Checks: my route passes an Empyrean destroyer; I name Aetherpassage in «Used», it is written into the entry, and the
// warning that the route is blocked reads as allowed by Aetherpassage.
// Why the check is redundant here: LRR 58.3.2 forbids passing another player's ships, and their owner allows it.
test('ability:aetherpassage named in Used, the route through Empyrean ships reads as allowed by Aetherpassage', async () => {
  const passage = table();
  quote(passage.table.pack, id, 'You may allow that player to move their ships through systems that contain your ships.');
  const live = showUses(passage.table, passage.move);
  expectShownStanding('routeBlocked');
  await use('Aetherpassage');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('routeBlocked', 'Aetherpassage');
});
