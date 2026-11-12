import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import { bench, componentAction, effect, endOf, FARTHER, NEAR, quote, TARGET } from '../kit';
import { id } from './muaat_mech';

const STAR_FORGE = 'ability:star_forge';
/** Star Forge places a destroyer in the target, where the war sun is; the mechs stand where `units` says. */
const forged = (faction: string, units: Record<string, UnitCounts>) =>
  bench({ faction, expansions: ['pok'], units, entries: [componentAction(STAR_FORGE, { choices: { systemId: TARGET, unit: 'destroyer' } })] });

describe('mech:muaat_mech Ember Colossus', () => {
  // "When you use your Star Forge faction ability in this system or an adjacent system, you may place 1 infantry from
  //  your reinforcements with this unit."
  // Checks: an Ember Colossus in the space area next to the system Star Forge places in gets an infantry beside it.
  // Why the check is redundant here: infantry otherwise reaches the board by production (67); the mech places it for
  // free when Star Forge is used near it.
  test.fails('mech:muaat_mech gets one infantry when Star Forge is used in an adjacent system', () => {
    const muaat = forged('muaat', { [TARGET]: { warsun: 1 }, [NEAR]: { carrier: 1, mech: 1 } });
    quote(muaat.pack, id, 'you may place 1 infantry from your reinforcements with this unit');
    expect(endOf(muaat).systems[NEAR]).toEqual({ carrier: 1, mech: 1, infantry: 1 });
  });

  // Checks: in the same system as Star Forge, the infantry is placed with the mech there.
  test.fails('mech:muaat_mech gets one infantry when Star Forge is used in its own system', () => {
    const muaat = forged('muaat', { [TARGET]: { warsun: 1, mech: 1 } });
    expect(endOf(muaat).systems[TARGET]).toMatchObject({ mech: 1, infantry: 1 });
  });

  // "... in this system or an adjacent system ..."
  // Checks: a mech two systems away gets nothing.
  // Why the check is NOT redundant here: the mech's reach is the system and its neighbours only.
  test('mech:muaat_mech two systems away gets no infantry', () => {
    const muaat = forged('muaat', { [TARGET]: { warsun: 1 }, [FARTHER]: { carrier: 1, mech: 1 } });
    expect(endOf(muaat).systems[FARTHER]).toEqual({ carrier: 1, mech: 1 });
  });

  test('mech:muaat_mech is a hint: Star Forge applies it', () => {
    expect(effect(forged('muaat', {}).pack, id).tier).toBe('hint');
  });
});
