import { describe, expect, test } from 'vitest';
import { MECATOL_PLANET, MECATOL_PLANET_TE, MECATOL_TILE, MECATOL_TILE_TE } from '../../../mecatol';
import type { Entry, Game, StructureCounts } from '../../../types';
import { bench, type Bench, effect, endOf, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './reclamation';

const MECATOL = '0,-1';
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', [MECATOL]: MECATOL_TILE };

/** A carrier brings an infantry to Mecatol Rex, lands it, and the landing puts structures from the reinforcements there. */
const reclaim = (structures: StructureCounts, planetId = MECATOL_PLANET) =>
  tactical(MECATOL, { moves: [{ from: HOME, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId, units: { infantry: 1 }, structures }] });
const table = (faction: string, move: Entry, game: Partial<Game> = {}) =>
  ({ move, ...bench({ faction, units: { [HOME]: { carrier: 1, infantry: 1 } }, entries: [move], game: { map: MAP, ...game } }) });
/** The warnings that a structure of the landing is not in the space area. */
const missingStructures = (table: Bench & { move: Entry }) =>
  warningsOf(table, table.move).filter(w => w.code === 'unitsMissing' && (w.params.unit === 'pds' || w.params.unit === 'spacedock'));

describe('ability:reclamation Reclamation', () => {
  // "After you resolve a tactical action during which you gained control of Mecatol Rex: You may place 1 PDS and 1
  //  space dock from your reinforcements on Mecatol Rex."
  // Checks: the Winnu take Mecatol Rex and put a PDS and a space dock on it that no ship brought; the warnings that
  // they are missing from the space area are listed and lifted by the ability, and both structures stand on Mecatol Rex.
  // Why the check is redundant here: a structure is placed by Construction or carried by an ability (85.2), and the
  // landing finds none in the space area; Reclamation takes them from the reinforcements instead.
  test('ability:reclamation puts a PDS and a space dock from the reinforcements on Mecatol Rex just taken', () => {
    const winnu = table('winnu', reclaim({ pds: 1, spacedock: 1 }));
    quote(winnu.pack, id, 'You may place 1 PDS and 1 space dock from your reinforcements on Mecatol Rex');
    expect(missingStructures(winnu)).toHaveLength(2);
    expectWaived(missingStructures(winnu), 'unitsMissing', id);
    const end = endOf(winnu);
    expect(end.pds[MECATOL_PLANET]).toBe(1);
    expect(end.docks).toContain(MECATOL_PLANET);
  });

  // LRR 85.2 with the landing's structures: what no flight brought is missing from the space area.
  // Checks: another faction doing the same is warned of both structures, and they are placed all the same.
  // Why the check is NOT redundant here: the ability is the Winnu's own.
  test('ability:reclamation is the Winnu\'s own: another faction is warned that the structures are missing', () => {
    const sol = table('sol', reclaim({ pds: 1, spacedock: 1 }));
    expectStanding(missingStructures(sol), 'unitsMissing');
    expect(endOf(sol).pds[MECATOL_PLANET]).toBe(1);
  });

  // Thunder's Edge: the centre tile 112 holds the planet `mrte`, which is Mecatol Rex all the same.
  test('ability:reclamation works on the Thunder\'s Edge Mecatol Rex (planet mrte)', () => {
    const move = tactical(MECATOL, { moves: [{ from: HOME, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: MECATOL_PLANET_TE, units: { infantry: 1 }, structures: { pds: 1, spacedock: 1 } }] });
    const winnu = { move, ...bench({ faction: 'winnu', expansions: ['pok', 'te'], units: { [HOME]: { carrier: 1, infantry: 1 } }, entries: [move], game: { map: { ...MAP, [MECATOL]: MECATOL_TILE_TE } } }) };
    expectWaived(missingStructures(winnu), 'unitsMissing', id);
  });

  // "... during which you gained control of Mecatol Rex"
  // Checks: Mecatol Rex already held before the action is not gained by it, so the structures stay warned of.
  // Why the check is NOT redundant here: the ability is triggered by gaining control in that action.
  test('ability:reclamation on a Mecatol Rex held before the action the structures stand as missing', () => {
    const held = table('winnu', reclaim({ pds: 1 }), { planetControl: { [MECATOL_PLANET]: 'me' } });
    expectStanding(missingStructures(held), 'unitsMissing');
  });

  // "... 1 PDS and 1 space dock ..."
  // Checks: two PDS are one more than the ability places, so they stand.
  // Why the check is NOT redundant here: the text gives one PDS.
  test('ability:reclamation two PDS are beyond the one it places and stand', () => {
    const winnu = table('winnu', reclaim({ pds: 2 }));
    expectStanding(missingStructures(winnu), 'unitsMissing');
  });

  // "... on Mecatol Rex."
  // Checks: a structure put on another planet the Winnu take is warned of.
  // Why the check is NOT redundant here: the ability speaks of Mecatol Rex only.
  test('ability:reclamation a structure on another planet taken stands as missing', () => {
    const move = tactical(TARGET, {
      moves: [{ from: HOME, units: { carrier: 1, infantry: 1 }, via: [NEAR] }],
      landings: [{ planetId: 't1', units: { infantry: 1 }, structures: { pds: 1 } }],
    });
    expectStanding(missingStructures(table('winnu', move)), 'unitsMissing');
  });

  test('ability:reclamation is a passive effect that waives the structures missing from the space area', () => {
    const { pack } = table('winnu', reclaim({}));
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['unitsMissing']);
  });
});
