import { describe, expect, test } from 'vitest';
import { bench, effect, endOf, quote, tactical, TARGET } from '../kit';
import { id } from './technological_singularity';

describe('ability:technological_singularity Technological Singularity', () => {
  // "Once per combat, after 1 of your opponent's units is destroyed: You may gain 1 technology that is owned by that player."
  // Checks: the ability is a reminder of the combat step.
  // Why nothing is validated: the plan rolls no dice and destroys nothing by itself, so it cannot tell when the
  // ability fires or which technology the opponent owns.
  test('ability:technological_singularity is a hint of the combat', () => {
    const { pack } = bench({ faction: 'nekro' });
    quote(pack, id, 'You may gain 1 technology that is owned by that player');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['combat']);
  });

  // Ruling (Nekro Virus, Propagation 1): an ability that says "gain" a technology gives that technology, not command tokens.
  // Checks: the technology taken with the ability is entered as a gain of the tactical action and is held after it.
  // Why the check is NOT redundant here: Propagation replaces research only; the gain stands as entered.
  test('ability:technological_singularity a technology gained in the battle is held', () => {
    const fight = tactical(TARGET, { gains: ['technology:ps'] });
    const table = bench({ faction: 'nekro', entries: [fight] });
    expect(endOf(table).holdings.technologies).toContain('technology:ps');
  });
});
