import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './da';

describe('technology:da Duranium Armor', () => {
  // "During each combat round, after you assign hits to your units, repair 1 of your damaged units that did not use
  //  SUSTAIN DAMAGE during this combat round."
  // Checks: the technology is a reminder of the battle in space and of the ground combat of the invasion.
  // Why nothing is validated here: damage and repair live inside a combat round; the plan keeps no damaged units and
  // fights no combat.
  test('technology:da is a hint of the combat and the invasion', () => {
    const table = bench({ faction: 'hacan', start: { technologies: [id] } });
    quote(table.pack, id, 'repair 1 of your damaged units that did not use SUSTAIN DAMAGE');
    expect(effect(table.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat', 'invasion'] });
    expect(effect(table.pack, id).waive).toBeUndefined();
    expect(hintsAt(table.pack, endOf(table), 'combat', ['me']).map(c => c.id)).toContain(id);
  });
});
