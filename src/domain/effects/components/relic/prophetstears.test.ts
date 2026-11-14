import { describe, expect, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectStanding, expectWaived, primary, quote, using, warningsOf } from '../kit';
import { id } from './prophetstears';

/**
 * The check pass 2 adds: a technology researched without the prerequisites it asks (90.8), with the number missing in
 * `params.missing`. Written as a string, as the code does not exist yet.
 */
const CODE = 'prerequisitesMissing' as AnyWarningCode;
const TECHNOLOGY = 7;
/** Fleet Logistics asks two propulsion technologies; Antimass Deflectors is one, Gravity Drive another. */
const FLEET_LOGISTICS = 'technology:fl';
const research = (tech = FLEET_LOGISTICS) => primary(TECHNOLOGY, { researched: [tech] });
const table = (entries: Entry[], technologies: string[], relics = [id]) =>
  bench({ faction: 'sol', expansions: ['pok'], start: { relics, technologies }, entries });

describe('relic:prophetstears The Prophet\'s Tears', () => {
  // "When you research a technology, you may exhaust this card to ignore 1 prerequisite"
  // Checks: Fleet Logistics is researched with one propulsion technology of the two it asks, the Tears named in
  // `uses`; the warning of the missing prerequisite is listed and lifted by the relic.
  // Why the check is redundant here: LRR 90.8 asks one technology of the colour for each prerequisite symbol; the
  // Tears ignore one of them, and only one is missing.
  test('relic:prophetstears lifts one missing prerequisite of a technology researched', () => {
    const play = using(research(), id);
    const tears = table([play], ['technology:amd']);
    quote(tears.pack, id, 'you may exhaust this card to ignore 1 prerequisite');
    expectWaived(warningsOf(tears, play), CODE, id);
  });

  // LRR 90.8.1: "A technology card's prerequisites indicate the number and color of technologies a player must own to
  //  research that technology card."
  // Checks: with no propulsion technology at all, two are missing, and the Tears do not lift the warning.
  // Why the check is NOT redundant here: the card ignores 1 prerequisite, not 2.
  test('relic:prophetstears does not lift two missing prerequisites', () => {
    const play = using(research(), id);
    expectStanding(warningsOf(table([play], []), play), CODE);
  });

  // Checks: the same research with one prerequisite missing and the Tears held but not named stands as a breach.
  // Why the check is NOT redundant here: the relic is exhausted to be used; held and not used, it ignores nothing.
  test('relic:prophetstears held but not used, the missing prerequisite stands', () => {
    const play = research();
    expectStanding(warningsOf(table([play], ['technology:amd']), play), CODE);
  });

  // Checks: the Tears are exhausted by their use; the technology is researched all the same, as the plan forbids nothing.
  // Why the check is NOT redundant here: "exhaust this card": a second research in the round has no Tears to use.
  test('relic:prophetstears is exhausted by its use and the technology is researched', () => {
    const tears = table([using(research(), id)], ['technology:amd']);
    const end = endOf(tears);
    expect(end.holdings.exhausted).toContain(id);
    expect(end.holdings.technologies).toContain(FLEET_LOGISTICS);
  });

  test.todo('relic:prophetstears "or draw 1 action card": the card drawn is entered as a gain of the entry, nothing to check');

  test('relic:prophetstears is a play effect that waives one missing prerequisite', () => {
    const { pack } = table([], []);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual([CODE]);
  });
});
