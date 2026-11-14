import { describe, expect, test } from 'vitest';
import { MECATOL_PLANET, MECATOL_TILE } from '../../../mecatol';
import { CARD } from '../../../replay/cards/ids';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, effect, endOf, expectStanding, FAR, FARTHER, HOME, NEAR, primary, quote, secondary, TARGET, using, warningsOf } from '../kit';
import { id } from './peace_accords';

/** The target planets t1 and t2 next to home, Mecatol Rex on its other side. */
const MECATOL = '0,-1';
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-target', [TARGET]: 'r-empty', [FAR]: 'r-empty', [FARTHER]: 'r-empty', [MECATOL]: MECATOL_TILE };
/** The warning that the planet chosen is not one the text allows; pass 2 declares it in src/domain/rules/codes. */
const NOT_GAINABLE = 'planetNotGainable' as AnyWarningCode;

/**
 * A Diplomacy entry that uses Peace Accords on `planet`. The planet chosen for a used component goes in the entry's
 * `useChoices` by component id: pass 2 adds that field to the common part of an entry.
 */
const accords = (planet: string, card: Entry = primary(CARD.diplomacy, { systemId: HOME })): Entry =>
  ({ ...using(card, id), useChoices: { [id]: { planet } } }) as unknown as Entry;
const table = (faction: string, entries: Entry[]) => bench({ faction, entries, game: { map: MAP } });

describe('ability:peace_accords Peace Accords', () => {
  // "After you resolve the primary or secondary ability of the "Diplomacy" strategy card: You may gain control of 1
  //  planet other than Mecatol Rex that does not contain any units and is in a system that is adjacent to a planet you
  //  control."
  // Checks: after Diplomacy's primary the Xxcha gain t2, empty, in the system beside their home; it is theirs and
  // exhausted (ruling 3).
  // Why this is the component's own: a planet is gained by landing ground forces on it (49.5) and in no other way the
  // rules give; the ability gives one without a landing.
  test('ability:peace_accords gains an empty planet next to the Xxcha after Diplomacy\'s primary', () => {
    const xxcha = table('xxcha', [accords('t2')]);
    quote(xxcha.pack, id, 'You may gain control of 1 planet other than Mecatol Rex that does not contain any units');
    const end = endOf(xxcha);
    expect(end.control.t2).toBe('me');
    expect(end.exhausted).toContain('t2');
  });

  // "... the primary or secondary ability ..."
  // Checks: after Diplomacy's secondary it gains the planet too.
  test('ability:peace_accords gains the planet after Diplomacy\'s secondary too', () => {
    expect(endOf(table('xxcha', [accords('t1', secondary(CARD.diplomacy))])).control.t1).toBe('me');
  });

  // "... other than Mecatol Rex ..."
  // Checks: Mecatol Rex, beside the home system and empty, is warned of when chosen.
  // Why the check is NOT redundant here: the text leaves Mecatol Rex out.
  test('ability:peace_accords Mecatol Rex chosen is warned of', () => {
    const use = accords(MECATOL_PLANET);
    expectStanding(warningsOf(table('xxcha', [use]), use), NOT_GAINABLE);
  });

  // Checks: Diplomacy without the ability gains no planet.
  // Why the check is NOT redundant here: the ability is used, and named, or there is no gain.
  test('ability:peace_accords not used, Diplomacy gains no planet', () => {
    expect(endOf(table('xxcha', [primary(CARD.diplomacy, { systemId: HOME })])).control.t2).toBeUndefined();
  });

  test.todo('ability:peace_accords an uncontrolled planet gained is explored (ruling 2): exploration is not planned');

  test('ability:peace_accords is a play effect', () => {
    const { pack } = table('xxcha', []);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
