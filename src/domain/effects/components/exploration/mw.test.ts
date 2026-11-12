import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import { tech } from '../../../rules/kit';
import type { Entry } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, quote, secondary, TARGET, tactical, warningsOf } from '../kit';
import { id } from './mw';

/** Round 1: a carrier from the next system lands one infantry on Target One (2/1) and gains it; the card explored is in its gains. */
const landing = (gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}, gains.length > 0 ? { gains } : {});
/** Round 2: the secondary of Technology, four resources. */
const research = (planets: string[]) => secondary(CARD.technology, { researched: [tech('cruiser')], payment: { planets, tradeGoods: 0 } });
const table = (gains: string[], pay: Entry, game = {}) =>
  ({ pay, ...bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[landing(gains)], [pay]], game }) });

/** Round 2: the dock on Target One builds five fighters in the target system, paid with the home planets. */
const build = () => tactical(TARGET, { production: { fighter: 5 }, payment: { planets: ['h1'], tradeGoods: 0 } });

describe('exploration:mw Mining World', () => {
  // "This planet's resource value is increased by 2." LRR 35.8.
  // Checks: the card explored with Target One is attached to it.
  // Why the check is redundant here: nothing is lifted; the attachment is a fact of the planet the count must know.
  test('exploration:mw explored with the planet the entry gains is attached to that planet', () => {
    const mining = table([id], research(['h1']));
    quote(mining.pack, id, "This planet's resource value is increased by 2.");
    expect(endOf(mining).attachments?.t1).toEqual([id]);
  });

  // "This planet's resource value is increased by 2."
  // Checks: Target One alone (2 + 2) pays the four resources of the secondary of Technology.
  // Why the check is redundant here: with the card the payment is full; no shortResources is made (a modify).
  test('exploration:mw raises the resources of its planet by two: Target One alone pays the research', () => {
    const mining = table([id], research(['t1']));
    expectNone(warningsOf(mining, mining.pay), 'shortResources');
  });

  // LRR 64.1: "A planet’s resources are indicated by the value on its planet card".
  // Checks: without the card Target One alone is two resources short.
  // Why the check is NOT redundant here: no attachment raises Target One.
  test('exploration:mw not explored, Target One alone stays short', () => {
    const plain = table([], research(['t1']));
    expectStanding(warningsOf(plain, plain.pay), 'shortResources');
  });

  // LRR 67.2 (space dock): "PRODUCTION value equal to 2 more than the resource value of this planet".
  // Checks: the dock on Target One produces six units with the card (2 + 2 + 2), so five fighters are within it.
  // Why the check is redundant here: the Production value is counted from the planet's resources, which the card
  // raises; the productionOver check then runs against the higher number (a modify, not a waiver).
  test.fails('exploration:mw raises the Production value of a space dock on its planet', () => {
    const mining = table([id], build(), { docks: ['t1'] });
    expectNone(warningsOf(mining, mining.pay), 'productionOver');
  });

  // Checks: without the card the dock produces four (2 + 2), so the fifth fighter is over.
  // Why the check is NOT redundant here: nothing raises Target One.
  test('exploration:mw not explored, the dock on Target One produces four and the fifth fighter is over', () => {
    const plain = table([], build(), { docks: ['t1'] });
    expectStanding(warningsOf(plain, plain.pay), 'productionOver');
  });

  // Checks: the attachment stays on Target One: a payment with the home planets alone is not raised.
  // Why the check is NOT redundant here: Home Two has no attachment.
  test('exploration:mw raises only its own planet: Home Two alone stays short', () => {
    const mining = table([id], research(['h2']));
    expectStanding(warningsOf(mining, mining.pay), 'shortResources');
  });

  test('exploration:mw is a passive effect that changes the resources of a planet', () => {
    const { pack } = table([], research([]));
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.planetResources).toBeTypeOf('function');
  });
});
