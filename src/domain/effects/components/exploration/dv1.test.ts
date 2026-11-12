import { describe, expect, test } from 'vitest';
import { componentsOf } from '../../../components';
import { adjust, bench, effect, endOf, quote } from '../kit';
import { id } from './dv1';

const table = () => bench({ faction: 'letnev', expansions: ['pok'] });

describe('exploration:dv1 Derelict Vessel', () => {
  // "Draw 1 secret objective."
  // Checks: the card is a hint with nothing to compute: no step, no waiver, no change of a number, nothing played.
  // Why nothing is validated here: which secret is drawn only the player knows; it is entered in the gains, and the
  // frontier token the card comes from (LRR 35.4, 35.5) is not on the plan's map.
  test('exploration:dv1 is a hint that computes nothing', () => {
    const { pack } = table();
    quote(pack, id, 'Draw 1 secret objective.');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.waive).toBeUndefined();
    expect(found.modify).toBeUndefined();
    expect(found.play).toBeUndefined();
  });

  // "Draw 1 secret objective."
  // Checks: the secret drawn with the card, entered in the gains, is held after the entry.
  // Why nothing is validated here: the gains already carry what the card gives.
  test('exploration:dv1 the secret objective drawn is entered in the gains and held', () => {
    const { pack } = table();
    const secret = componentsOf(pack).find(component => component.kind === 'secretObjective')!.id;
    const draw = { ...adjust({}), gains: [id, secret] };
    expect(endOf(bench({ faction: 'letnev', expansions: ['pok'], entries: [draw] })).holdings.secrets).toContain(secret);
  });
});
