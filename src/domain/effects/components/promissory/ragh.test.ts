import { describe, expect, test } from 'vitest';
import type { Player } from '../../../players';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './ragh';

const SAAR: Player = { id: 'o1', faction: 'saar', vp: 0, seat: 2, color: 2 };

/** I land an infantry on t1 from a carrier next to it, naming Ragh's Call `note` in the action. */
const invade = (note: string) => using(tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}), note);

describe('promissory:ragh Raghs Call', () => {
  // "After you commit 1 or more units to land on a planet: Remove all of the Saar player's ground forces from that
  //  planet and place them on a planet controlled by the Saar player."
  // Checks: today the note is a reminder of the invasion step.
  // Why nothing is validated here yet: moving the Saar ground forces needs a planet chosen for them and a way to name
  // the card in a landing (see the todo below); no check of the plan is lifted by it.
  test('promissory:ragh is a hint of the invasion', () => {
    const { pack } = bench({ faction: 'sol' });
    quote(pack, id, "Remove all of the Saar player's ground forces from that planet and place them on a planet controlled by the Saar player.");
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
  });

  // LRR 69.2: "A player cannot play their own promissory note."
  // Checks: the Saar naming their own Ragh's Call in an invasion is warned of.
  // Why the check is NOT redundant here: the card is written for the Saar's opponents; nothing lifts 69.2 for its owner.
  test('promissory:ragh played by the Saar themselves is warned of as their own note', () => {
    const note = `${id}@me`;
    const move = invade(note);
    const table = bench({ faction: 'saar', units: { [NEAR]: { carrier: 1, infantry: 1 } }, start: { promissory: [note] }, entries: [move] });
    expectStanding(warningsOf(table, move), 'ownPromissory');
  });

  // "Then, return this card to the Saar player." (LRR 69.3)
  // Checks: played by another player, the note leaves their hand and goes back to the Saar player.
  // Why the check is NOT redundant here: the note is played once and returned; holding it again needs a new transaction.
  test('promissory:ragh played by another player goes back to the Saar player', () => {
    const note = `${id}@${SAAR.id}`;
    const move = invade(note);
    const table = bench({ faction: 'sol', units: { [NEAR]: { carrier: 1, infantry: 1 } }, start: { promissory: [note] }, entries: [move], game: { opponents: [SAAR] } });
    quote(table.pack, id, 'Then, return this card to the Saar player.');
    expectNone(warningsOf(table, move), 'ownPromissory');
    const end = endOf(table);
    expect(end.holdings.promissory).not.toContain(note);
    expect(end.rivals?.[SAAR.id]?.holdings.promissory).toContain(note);
  });

  test.todo('promissory:ragh the Saar ground forces on the planet are moved to a planet the Saar player controls: no choice of their planet in the entry, and no way to name the note in a landing other than «Used»');
});
