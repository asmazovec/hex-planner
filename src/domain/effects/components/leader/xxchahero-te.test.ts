import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './xxchahero-te';

/** The warning of more units than the hero places; pass 2 declares it in src/domain/rules/codes. */
const OVER = 'placementOverLimit' as AnyWarningCode;
/** h1 and h2 are exhausted by paying for production at the home dock. */
const spendHome = () => tactical(HOME, { production: { infantry: 2 }, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
/** The hero's action with its placements, `'<unit>@<planet>': count`. */
const nexus = (choices: Record<string, number>) => componentAction(id, { choices });
const table = (entries: Entry[]) =>
  bench({ faction: 'xxcha', expansions: ['pok', 'te'], start: { leaders: { [id]: 'unlocked' } }, entries, game: { docks: ['h1'] } });

describe('leader:xxchahero-te Xxekir Grom — Planetary Defense Nexus', () => {
  // "ACTION: Place any combination of up to 4 PDS or mechs onto planets you control; ready each planet that you place
  //  a unit on."
  // Checks: two PDS on h1 and a mech on h2 are placed, and both planets, exhausted before, are readied.
  // Why this is the component's own: PDS are placed by Construction (24) and mechs produced (67); the hero places them
  // from the reinforcements by its own text.
  test('leader:xxchahero-te places PDS and mechs on planets of the Xxcha and readies them', () => {
    const xxcha = table([spendHome(), nexus({ 'pds@h1': 2, 'mech@h2': 1 })]);
    quote(xxcha.pack, id, 'Place any combination of up to 4 PDS or mechs onto planets you control');
    const end = endOf(xxcha);
    expect(end.pds.h1).toBe(2);
    expect(end.ground.h2).toMatchObject({ mech: 1 });
    expect(end.exhausted).not.toContain('h1');
    expect(end.exhausted).not.toContain('h2');
  });

  // "... up to 4 ..."
  // Checks: five units are one beyond the hero's four, and are warned of.
  // Why the check is NOT redundant here: the text gives four.
  test('leader:xxchahero-te five units are beyond its four and are warned of', () => {
    const action = nexus({ 'pds@h1': 2, 'mech@h2': 3 });
    expectStanding(warningsOf(table([action]), action), OVER);
  });

  // "... onto planets you control ..." LRR 85 with 24.2.
  // Checks: a PDS on t1, a planet the Xxcha do not control, is warned of.
  // Why the check is NOT redundant here: the hero places on the Xxcha's own planets only.
  test('leader:xxchahero-te a PDS on a planet the Xxcha do not control is warned of', () => {
    const action = nexus({ 'pds@t1': 1 });
    expectStanding(warningsOf(table([action]), action), 'structureNotControlled');
  });

  // LRR 85.5: "A planet can contain a maximum of two PDS units."
  // Checks: three PDS on h1 are one beyond what a planet holds.
  // Why the check is NOT redundant here: the hero places PDS, it does not change how many a planet holds.
  test('leader:xxchahero-te three PDS on one planet are beyond what it holds', () => {
    const action = nexus({ 'pds@h1': 3 });
    expectStanding(warningsOf(table([action]), action), 'structureLimit');
  });

  // "Then, purge this card." LRR 51.12.
  // Checks: the hero is purged by its action; a second one is warned of.
  test('leader:xxchahero-te is purged by its action', () => {
    const again = nexus({ 'pds@h1': 1 });
    expectStanding(warningsOf(table([nexus({ 'mech@h1': 1 }), again]), again), 'componentNotHeld');
  });

  test('leader:xxchahero-te is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
