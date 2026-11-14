import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../../../testing/old/domain/effects/registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './jolnarcommander';

describe('leader:jolnarcommander Agnlan Oln', () => {
  // "After you roll dice for a unit ability: You may reroll any of those dice."
  // Checks: the commander is a reminder of the battle in space and of the invasion, where space cannon, anti-fighter
  // barrage and bombardment are rolled.
  // Why nothing is validated here: a reroll is dice, which the plan does not roll; the ruling on Ta Zern, whose text
  // this is (tirules2, Jol-Nar, Ta Zern / Agnlan Oln 1), even keeps combat rolls out of it.
  test('leader:jolnarcommander is a reminder of the dice of unit abilities', () => {
    const { pack } = bench({ faction: 'jolnar', expansions: ['pok', 'te'] });
    quote(pack, id, 'After you roll dice for a unit ability: You may reroll any of those dice.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat', 'invasion'] });
  });

  // Checks: unlocked, the commander stands among the reminders of the battle in space; locked, it does not.
  // Why nothing is validated here: as above; only the reminder depends on the commander being unlocked.
  test('leader:jolnarcommander unlocked stands among the reminders of combat, locked it does not', () => {
    const unlocked = bench({ faction: 'jolnar', expansions: ['pok', 'te'], start: { leaders: { [id]: 'unlocked' } } });
    expect(hintsAt(unlocked.pack, endOf(unlocked), 'combat', ['me']).map(component => component.id)).toContain(id);
    const locked = bench({ faction: 'jolnar', expansions: ['pok', 'te'] });
    expect(hintsAt(locked.pack, endOf(locked), 'combat', ['me']).map(component => component.id)).not.toContain(id);
  });
});
