import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './letnev_mech';

describe('mech:letnev_mech Dunlain Reaper', () => {
  // "DEPLOY: At the start of a round of ground combat, you may spend 2 resources to replace 1 of your infantry in that
  //  combat with 1 mech."
  // Checks: today the mech is a reminder of the invasion step.
  // Why nothing is validated here: the deploy happens inside a round of ground combat, which the plan does not
  // replay, and an entry has no field to say it was used (see the todo below).
  test('mech:letnev_mech is a hint of the invasion', () => {
    const { pack } = bench({ faction: 'letnev', expansions: ['pok'] });
    quote(pack, id, 'you may spend 2 resources to replace 1 of your infantry in that combat with 1 mech');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
  });

  test.todo('mech:letnev_mech the deploy turns 1 infantry on the invaded planet into 1 mech and costs 2 resources: an entry has no field for a deploy, and the plan replays no rounds of ground combat (Letnev note: once per round, only from reinforcements)');
});
