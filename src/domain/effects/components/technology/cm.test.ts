import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './cm';

describe('technology:cm Chaos Mapping', () => {
  // "Other players cannot activate asteroid fields that contain 1 or more of your ships. At the start of your turn
  //  during the action phase, you may produce 1 unit in a system that contains at least 1 of your units that has
  //  PRODUCTION."
  // Checks: today the technology is a reminder of the production step.
  // Why nothing is validated here yet: the first sentence adds a prohibition to other players' entries, which the
  // foundation cannot do (a component only lifts checks); the second is a production outside a tactical action, for
  // which no entry has a field (see the todos below).
  test('technology:cm is a hint of the production', () => {
    const { pack } = bench({ faction: 'saar' });
    quote(pack, id, 'Other players cannot activate asteroid fields that contain 1 or more of your ships.');
    quote(pack, id, 'you may produce 1 unit in a system that contains at least 1 of your units that has PRODUCTION');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['production'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });

  test.todo('technology:cm an opponent\'s entry that activates an asteroid field holding my ships is warned of: a component of one player cannot add a check to another player\'s entry yet (and only ships count, Saar note 5)');
  test.todo('technology:cm one unit produced at the start of my turn, paid, in a system with my unit with PRODUCTION, once per turn, also on the turn I pass (Saar notes 1-3): no entry carries a production outside a tactical action');
});
