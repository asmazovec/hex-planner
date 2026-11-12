import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './saar_mech';

describe('mech:saar_mech Scavenger Zeta', () => {
  // "DEPLOY: After you gain control of a planet, you may spend 1 trade good to place 1 mech on that planet"
  // Checks: today the mech is a reminder of the invasion step.
  // Why nothing is validated here yet: an entry has no field for a deploy, so the plan cannot know it was used (see
  // the todo below); no check of the plan is lifted by it.
  test('mech:saar_mech is a hint of the invasion', () => {
    const { pack } = bench({ faction: 'saar', expansions: ['pok'] });
    quote(pack, id, 'After you gain control of a planet, you may spend 1 trade good to place 1 mech on that planet');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['invasion'] });
  });

  test.todo('mech:saar_mech the deploy puts 1 mech from reinforcements on the planet just taken and spends 1 trade good (one per planet gained; Scavenge may pay for it, Saar note 1): an entry has no field for a deploy');
});
