import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './phoenixstandard';

describe('ability:phoenixstandard Phoenix Standard', () => {
  // "At the end of combat: you may galvanize 1 of your units that participated."
  // Checks: the ability is a reminder at the end of a battle in space and of a ground combat.
  // Why nothing is validated here: galvanizing changes only dice (Galvanize), and the plan simulates no combat; no
  // check of the replay is touched, so nothing is lifted.
  test('ability:phoenixstandard is a hint of the combat and the invasion steps, with no waiver', () => {
    const { pack } = bench({ faction: 'bastion', expansions: ['pok', 'te'] });
    quote(pack, id, 'At the end of combat: you may galvanize 1 of your units that participated.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat', 'invasion']);
  });
});
