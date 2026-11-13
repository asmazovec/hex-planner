import { describe, expect, test } from 'vitest';
import structureAboard from '../../../rules/codes/structureAboard';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, expectWaived, HOME, quote, TARGET, NEAR, tactical, warningsOf } from '../kit';
import { id } from './miniaturization';

const CODE = structureAboard.code;

/** A cruiser leaves the home system for the target and takes a PDS from the home planet h1 on board. */
const carry = (extra: Partial<Extract<Entry, { type: 'tactical' }>> = {}) => tactical(TARGET, {
  moves: [{ from: HOME, units: { cruiser: 1, infantry: 1 }, via: [NEAR] }, { from: 'h1', units: {}, structures: { pds: 1 } }], ...extra,
});
const table = (faction: string, move: Entry) =>
  ({ move, ...bench({ faction, expansions: ['te'], units: { [HOME]: { cruiser: 1, infantry: 1 } }, entries: [move], game: { pds: { h1: 1 }, docks: ['h1'] } }) });

describe('ability:miniaturization Miniaturization', () => {
  // "Your structures can be transported by any ship; this does not require or count against capacity."
  // Checks: a Ral Nel cruiser takes a PDS on board; the warning that structures are not transported is listed and
  // lifted by the ability.
  // Why the check is redundant here: LRR 85.3 says "Structures cannot move or be transported", and the ability says
  // the Ral Nel's structures can be, by any ship.
  test('ability:miniaturization lets a ship take a structure on board: the warning is waived', () => {
    const ralnel = table('ralnel', carry());
    quote(ralnel.pack, id, 'Your structures can be transported by any ship');
    expectWaived(warningsOf(ralnel, ralnel.move), CODE, id);
  });

  // LRR 85.3: "Structures cannot move or be transported."
  // Checks: the same flight of another faction is warned of, and the structure flies all the same, as the plan
  // forbids nothing.
  // Why the check is NOT redundant here: no component of this player speaks of transporting structures.
  test('ability:miniaturization is the Ral Nel\'s own: another faction is warned, and the structure still flies', () => {
    const sol = table('sol', carry());
    expectStanding(warningsOf(sol, sol.move), CODE);
    const end = endOf(sol);
    expect(end.pds.h1 ?? 0).toBe(0);
    expect(end.afloat?.[TARGET]).toEqual({ pds: 1 });
  });

  // "... this does not require or count against capacity."
  // Checks: the cruiser has no capacity value and carries one infantry beyond it; the PDS adds nothing to the load.
  // Why the check is redundant here: the capacity check (16.1) counts fighters and ground forces only; a structure
  // on board is neither, and the ability says so itself.
  test('ability:miniaturization a structure on board takes no place: the load is the infantry alone', () => {
    const ralnel = table('ralnel', carry());
    expect(warningsOf(ralnel, ralnel.move).find(w => w.code === 'capacityGroup')?.params).toMatchObject({ load: 1, capacity: 0 });
  });

  // "At the end of your tactical actions: you may place your structures that are in space areas onto planets you
  //  control in their respective systems."
  // Checks: the infantry lands on t1 and takes it; the PDS is put on t1 at the end of the action.
  // Why the check is redundant here: structures are otherwise placed by Construction only (85.2); the ability names
  // its own moment and its own condition, a planet I control in that system.
  test('ability:miniaturization puts the carried structure on a planet it controls at the end of the action', () => {
    const ralnel = table('ralnel', carry({ landings: [{ planetId: 't1', units: { infantry: 1 }, structures: { pds: 1 } }] }));
    expectNone(warningsOf(ralnel, ralnel.move), 'structureNotControlled');
    const end = endOf(ralnel);
    expect(end.pds.t1).toBe(1);
    expect(end.afloat?.[TARGET]).toBeUndefined();
  });

  // "... onto planets you control in their respective systems."
  // Checks: a structure put on a planet nobody of mine holds is warned of.
  // Why the check is NOT redundant here: the ability places only on planets the player controls.
  test('ability:miniaturization a structure put on a planet I do not control is warned of', () => {
    const ralnel = table('ralnel', carry({ landings: [{ planetId: 't2', units: {}, structures: { pds: 1 } }] }));
    expectStanding(warningsOf(ralnel, ralnel.move), 'structureNotControlled');
  });

  // "While your structures are in the space area, they cannot use their unit abilities."
  // Checks: a space dock carried into the target and left in its space area produces nothing there.
  // Why nothing is waived here: production asks for a dock on a planet of the system (67.1); a dock in space is none.
  test('ability:miniaturization a space dock in the space area does not produce', () => {
    const move = tactical(TARGET, {
      moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }, { from: 'h1', units: {}, structures: { spacedock: 1 } }], production: { infantry: 1 },
    });
    const ralnel = table('ralnel', move);
    expectStanding(warningsOf(ralnel, move), 'noProduction');
    expect(endOf(ralnel).docks).not.toContain('h1');
  });

  // Checks: a structure that is not there is reported as any missing unit is.
  test('ability:miniaturization a structure taken from a planet that has none is missing', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }, { from: 'h2', units: {}, structures: { pds: 1 } }] });
    const ralnel = table('ralnel', move);
    expect(warningsOf(ralnel, move).find(w => w.code === 'unitsMissing')?.params).toMatchObject({ where: 'h2', unit: 'pds', missing: 1 });
  });

  test('ability:miniaturization is a passive effect that waives the transport of structures', () => {
    const { pack } = table('ralnel', carry());
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual([CODE]);
  });
});
