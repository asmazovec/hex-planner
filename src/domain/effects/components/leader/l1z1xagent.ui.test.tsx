import { expect, test } from 'vitest';
import { expectNotShown, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, endOf, HOME, NEAR, quote, tactical } from '../kit';
import { id } from './l1z1xagent';

uiBench();

// "After a player activates a system: You may exhaust this card to allow that player to replace 1 of their infantry in
//  the active system with 1 mech from their reinforcements."
// Checks: in «Used» of a tactical action into NEAR, where my carrier holds an infantry, I choose I48S; it is written
// into the entry with no warning, and the replay replaces the infantry with a mech.
// Why nothing is waived: the agent is played; its effect is a change of the board.
test('leader:l1z1xagent chosen in «Used» of a tactical action, the infantry of the active system becomes a mech', async () => {
  const move = tactical(NEAR);
  const table = bench({ faction: 'l1z1x', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 }, [HOME]: { carrier: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [move] });
  quote(table.pack, id, 'replace 1 of their infantry in the active system with 1 mech');
  const live = showUses(table, move);
  await use('I48S');
  expect(live.entry().uses).toEqual([id]);
  expectNotShown('componentNotHeld');
  expect(endOf({ pack: table.pack, game: live.game() }).systems[NEAR]).toEqual({ carrier: 1, mech: 1 });
});
