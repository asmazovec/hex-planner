import { describe, expect, test } from 'vitest';
import type { AnyWarningCode } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './nanoforge';

/** The check pass 2 adds for a target the card does not allow; written as a string, as the code does not exist yet. */
const CODE = 'attachTarget' as AnyWarningCode;
const attach = (planetId: string) => componentAction(id, { choices: { planetId } });
/** A dreadnought (cost 4) built at the dock of t1 and paid with t1 alone (2 resources printed). */
const build = () => tactical(TARGET, { production: { dreadnought: 1 }, payment: { planets: ['t1'], tradeGoods: 0 } });
const table = (entries: Entry[]) => bench({
  faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries,
  game: { planetControl: { h1: 'me', h2: 'me', t1: 'me' }, docks: ['t1'] },
});

describe('relic:nanoforge Nano-Forge', () => {
  // "Attach this card to a non-legendary, non-home planet you control, its resource and influence values are
  //  increased by 2"
  // Checks: attached to t1, the relic lies among the attachments of t1, and t1 then pays 4 resources for a dreadnought.
  // Why the default value does not apply: the payment counts a planet's printed resources (26.1); the attachment
  // raises them, a modify of `planetResources`, so the cost is met and nothing is waived.
  test('relic:nanoforge attached to a planet raises its resources by 2', () => {
    const pay = build();
    const forge = table([attach('t1'), pay]);
    quote(forge.pack, id, 'its resource and influence values are increased by 2');
    expect(endOf(forge).attachments?.t1 ?? []).toContain(id);
    expectNone(warningsOf(forge, pay), 'shortResources');
  });

  // LRR 26.1: a planet is exhausted to spend resources equal to its resource value.
  // Checks: without the attachment t1 pays 2 of the dreadnought's 4.
  // Why the check is NOT redundant here: the relic was not attached, so the printed value stands.
  test('relic:nanoforge not attached, the planet pays its printed resources', () => {
    const pay = build();
    expectStanding(warningsOf(table([pay]), pay), 'shortResources');
  });

  // "... a non-legendary, non-home planet you control"
  // Checks: attaching it to h1, a planet of my home system, is warned of.
  // Why the check is NOT redundant here: the card excludes home planets.
  test('relic:nanoforge attached to a home planet is warned of', () => {
    const play = attach('h1');
    expectStanding(warningsOf(table([play]), play), CODE);
  });

  // Checks: attaching it to t2, which I do not control, is warned of.
  test('relic:nanoforge attached to a planet I do not control is warned of', () => {
    const play = attach('t2');
    expectStanding(warningsOf(table([play]), play), CODE);
  });

  // "This action cannot be performed once attached."
  // Checks: a second action of the relic is warned of.
  test('relic:nanoforge cannot be played again once attached', () => {
    const again = attach('t2');
    const warnings = warningsOf(table([attach('t1'), again]), again);
    expect(warnings.some(w => w.code === 'componentExhausted' || w.code === 'componentNotHeld' || w.code === CODE)).toBe(true);
  });

  test.todo('relic:nanoforge "it is a legendary planet": no count of the plan asks whether a planet is legendary yet');

  // Checks: the relic is no longer a mere reminder. Play or passive is pass 2's choice: the contract gives `play` only
  // to a play effect and `modify` only to a passive one, and the card needs both (see the effect file).
  test('relic:nanoforge is counted, not only shown', () => {
    expect(effect(table([]).pack, id).tier).not.toBe('hint');
  });
});
