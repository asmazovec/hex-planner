import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, HOME, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './muaathero';

const table = (entries: Entry[]) =>
  bench({ faction: 'muaat', expansions: ['pok'], units: { [HOME]: { warsun: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries });
/** The war sun moves into the target, a non-home system, and the hero is named with the move. */
const nova = () => using(tactical(TARGET, { moves: [{ from: HOME, units: { warsun: 1 }, via: [NEAR] }] }), id);

describe('leader:muaathero Adjudicator Ba\'al — Nova Seed', () => {
  // "If you do, purge this card ..."
  // Checks: the hero named with the move is purged; played again later it is warned of as not held.
  // Why the check is NOT redundant here: a hero is spent by its ability (51.12).
  test('leader:muaathero used with the move of a war sun is purged', () => {
    const move = nova();
    const again = componentAction(id);
    const muaat = table([move, again]);
    quote(muaat.pack, id, 'After you move a war sun into a non-home system other than Mecatol Rex');
    expect(endOf(muaat).holdings.leaders[id]).toBe('purged');
    expectStanding(warningsOf(muaat, again), 'componentNotHeld');
  });

  test.todo('leader:muaathero destroys the other players\' units in that system and replaces its tile with the Muaat supernova: the replay never changes the map');
  test.todo('leader:muaathero purges the planet cards of the replaced system: needs the tile replaced first');
  test.todo('leader:muaathero used without a war sun moved into the system, or in a home system or Mecatol Rex, is warned of: needs a code for the condition of a used component');

  test.fails('leader:muaathero is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
