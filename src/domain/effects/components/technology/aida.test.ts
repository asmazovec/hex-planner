import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, effect, expectStanding, expectWaived, HOME, primary, quote, tactical, using, warningsOf } from '../kit';
import { id } from './aida';

/**
 * The prerequisite check pass 2 adds for everyone (LRR 90.9, note 1): a technology researched without one technology
 * of the matching colour per symbol is warned of. Its file will be src/domain/rules/codes/prerequisitesMissing.ts.
 */
const CODE = 'prerequisitesMissing' as AnyWarningCode;
const TECHNOLOGY = 7;

/** The primary of Technology researches `researched`; I hold AIDA (a red technology) and whatever else `held` says. */
const research = (researched: string, uses: boolean, held: string[] = []) => {
  const plain = primary(TECHNOLOGY, { researched: [researched] });
  const entry = uses ? using(plain, id) : plain;
  return {
    entry,
    ...bench({
      faction: 'hacan', expansions: ['pok'], start: { technologies: [id, ...held] }, entries: [entry],
      // The base pack keeps no prerequisites for Gravity Drive; the test gives it its printed one blue.
      edit: pack => { pack.technologies.gd = { ...pack.technologies.gd, requires: { propulsion: 1 } }; },
    }),
  };
};

/** Two cruisers (2 each) built at the dock on h1 and paid with h1 alone (3 resources). */
const production = (extra: Partial<Entry> = {}) => tactical(HOME, { production: { cruiser: 2 }, payment: { planets: ['h1'], tradeGoods: 0 } }, extra);
const factory = (entries: Entry[], held: string[]) =>
  bench({ faction: 'hacan', expansions: ['pok'], start: { technologies: [id, ...held] }, entries, game: { docks: ['h1'] } });

describe('technology:aida AI Development Algorithm', () => {
  // "When you research a unit upgrade technology, you may exhaust this card to ignore any 1 prerequisite."
  // Ruling (AI Development Algorithm 1): "AI Development Algorithm alone may be used to research the Destroyer II unit
  //  upgrade."
  // Checks: Destroyer II needs two red; AIDA is one, and AIDA named in the research entry ignores the other: the
  // prerequisite warning is listed and lifted by AIDA.
  // Why the check is redundant here: 90.9 asks one technology per symbol; the card lets one symbol go unmet.
  test('technology:aida used, a unit upgrade one prerequisite short is researched: the warning is waived', () => {
    const table = research('technology:dd2', true);
    quote(table.pack, id, 'When you research a unit upgrade technology, you may exhaust this card to ignore any 1 prerequisite.');
    expectWaived(warningsOf(table, table.entry), CODE, id);
  });

  // LRR 90.9: "To satisfy a technology's prerequisites, that player must own one technology of the matching color for
  //  each prerequisite symbol on the technology card they wish to research."
  // Checks: the same research without AIDA named leaves the warning standing.
  // Why the check is NOT redundant here: the card is used by exhausting it; held and not used, it ignores nothing.
  test('technology:aida held but not used, the missing prerequisite stands', () => {
    const table = research('technology:dd2', false);
    expectStanding(warningsOf(table, table.entry), CODE);
  });

  // "... ignore any 1 prerequisite."
  // Checks: Carrier II needs two blue and I own none: two are missing, and AIDA ignores only one.
  // Why the check is NOT redundant here: one symbol is ignored, the second still has to be met.
  test('technology:aida ignores one prerequisite, not two', () => {
    const table = research('technology:cv2', true);
    expectStanding(warningsOf(table, table.entry), CODE);
  });

  // "When you research a unit upgrade technology ..."
  // Checks: Gravity Drive (one blue) is not a unit upgrade: AIDA used does not lift its missing prerequisite.
  // Why the check is NOT redundant here: the card speaks of unit upgrades only.
  test('technology:aida does not lift the prerequisite of a technology that is not a unit upgrade', () => {
    const table = research('technology:gd', true);
    expectStanding(warningsOf(table, table.entry), CODE);
  });

  // "When 1 or more of your units use PRODUCTION, you may exhaust this card to reduce the combined cost of the produced
  //  units by the number of unit upgrade technologies that you own."
  // Checks: two cruisers cost 4; I own one unit upgrade (Destroyer II), so with AIDA used they cost 3, which h1 pays.
  // Why the shortfall is not made here: the payment check (26, 75) compares the cost with the resources spent, and the
  // card lowers the cost of this production.
  test('technology:aida used in a production takes one off the cost per unit upgrade owned', () => {
    const entry = using(production(), id);
    const table = factory([entry], ['technology:dd2']);
    expect(warningsOf(table, entry).filter(w => w.code === 'shortResources')).toEqual([]);
  });

  // Checks: the same production without AIDA named costs 4 against 3 paid.
  // Why the check is NOT redundant here: the card is used by exhausting it, and it was not used.
  test('technology:aida not used in a production, the full cost is paid', () => {
    const entry = production();
    const table = factory([entry], ['technology:dd2']);
    expect(warningsOf(table, entry).find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 4, paid: 3 });
  });

  // "... by the number of unit upgrade technologies that you own."
  // Checks: owning no unit upgrade, AIDA used takes nothing off.
  // Why the check is NOT redundant here: the reduction is the number of unit upgrades, here zero.
  test('technology:aida used with no unit upgrade owned takes nothing off', () => {
    const entry = using(production(), id);
    const table = factory([entry], []);
    expect(warningsOf(table, entry).find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 4, paid: 3 });
  });

  // "you may exhaust this card": LRR 34.2, an exhausted card cannot be used until it is readied.
  // Checks: used in two productions of one round, the second use is warned of as exhausted.
  test('technology:aida is exhausted by its use: a second use in the round is warned of', () => {
    const first = using(production(), id);
    const second = using(production(), id);
    const table = factory([first, second], ['technology:dd2']);
    expectStanding(warningsOf(table, second), 'componentExhausted');
  });

  test('technology:aida is a play effect that waives the missing prerequisite', () => {
    const { pack } = research('technology:dd2', true);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual([CODE]);
  });
});
