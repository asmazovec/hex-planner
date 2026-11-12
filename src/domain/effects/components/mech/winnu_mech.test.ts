import { describe, expect, test } from 'vitest';
import type { Entry, Game, StructureCounts, UnitCounts } from '../../../types';
import { bench, type Bench, effect, endOf, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './winnu_mech';

/** The target planets t1 and t2 stand next to home, so a carrier reaches them in one step. */
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-target', [TARGET]: 'r-empty', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

/** A carrier brings an infantry and a mech to t1 and t2; the landing on `planetId` puts structures from the reinforcements there. */
const reclaim = (landings: { planetId: string; units: UnitCounts; structures?: StructureCounts }[]) =>
  tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1, infantry: 1, mech: 1 } }], landings });
const table = (faction: string, move: Entry, game: Partial<Game> = {}) =>
  ({ move, ...bench({ faction, expansions: ['pok'], units: { [HOME]: { carrier: 1, infantry: 1, mech: 1 } }, entries: [move], game: { map: MAP, ...game } }) });
const missingStructures = (table: Bench & { move: Entry }) =>
  warningsOf(table, table.move).filter(w => w.code === 'unitsMissing' && (w.params.unit === 'pds' || w.params.unit === 'spacedock'));

describe('mech:winnu_mech Reclaimer', () => {
  // "After you resolve a tactical action where you gained control of this planet, you may place 1 PDS or 1 Space Dock
  //  from your reinforcements on this planet."
  // Checks: the Winnu land an infantry and a Reclaimer on t1, take it, and put a PDS there that no ship brought; the
  // warning that it is missing from the space area is listed and lifted by the mech, and the PDS stands on t1.
  // Why the check is redundant here: the landing places only structures a flight brought (85.2), and the Reclaimer
  // takes one from the reinforcements.
  test('mech:winnu_mech places a PDS from the reinforcements on the planet it took: the warning is waived', () => {
    const winnu = table('winnu', reclaim([{ planetId: 't1', units: { infantry: 1, mech: 1 }, structures: { pds: 1 } }]));
    quote(winnu.pack, id, 'you may place 1 PDS or 1 Space Dock from your reinforcements on this planet');
    expectWaived(missingStructures(winnu), 'unitsMissing', id);
    expect(endOf(winnu).pds.t1).toBe(1);
  });

  // Checks: another faction's mech landing the same way leaves the structure warned of.
  // Why the check is NOT redundant here: the ability is printed on the Winnu mech.
  test('mech:winnu_mech is the Winnu\'s own: another faction\'s mech leaves the structure missing', () => {
    const sol = table('sol', reclaim([{ planetId: 't1', units: { infantry: 1, mech: 1 }, structures: { pds: 1 } }]));
    expectStanding(missingStructures(sol), 'unitsMissing');
  });

  // "... on this planet." Ruling (Reclaimer 4): the Reclaimer need only be on the planet at the end of the action.
  // Checks: the mech lands on t2 and the structure goes on t1, where no Reclaimer stands.
  // Why the check is NOT redundant here: the structure goes on the Reclaimer's own planet only.
  test('mech:winnu_mech a structure on a planet without a Reclaimer stands as missing', () => {
    const winnu = table('winnu', reclaim([
      { planetId: 't1', units: { infantry: 1 }, structures: { pds: 1 } },
      { planetId: 't2', units: { mech: 1 } },
    ]));
    expectStanding(missingStructures(winnu), 'unitsMissing');
  });

  // "... where you gained control of this planet ..."
  // Checks: t1 held before the action is not gained by it.
  // Why the check is NOT redundant here: the ability is triggered by gaining control in that action.
  test('mech:winnu_mech on a planet held before the action the structure stands as missing', () => {
    const winnu = table('winnu', reclaim([{ planetId: 't1', units: { infantry: 1, mech: 1 }, structures: { pds: 1 } }]), { planetControl: { t1: 'me' } });
    expectStanding(missingStructures(winnu), 'unitsMissing');
  });

  // "... 1 PDS or 1 Space Dock ..."
  // Checks: two PDS by one Reclaimer are one beyond what it places.
  // Why the check is NOT redundant here: one structure a Reclaimer (ruling 3).
  test('mech:winnu_mech two PDS by one Reclaimer stand', () => {
    const winnu = table('winnu', reclaim([{ planetId: 't1', units: { infantry: 1, mech: 1 }, structures: { pds: 2 } }]));
    expectStanding(missingStructures(winnu), 'unitsMissing');
  });

  test('mech:winnu_mech is a passive effect that waives the structure missing from the space area', () => {
    const { pack } = table('winnu', reclaim([]));
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['unitsMissing']);
  });
});
