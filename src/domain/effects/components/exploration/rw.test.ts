import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import { tech } from '../../../rules/kit';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, quote, secondary, TARGET, tactical, warningsOf } from '../kit';
import { id } from './rw';

/** Round 1: a carrier from the next system lands one infantry on Target One (2/1) and gains it; the card explored is in its gains. */
const landing = (gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}, gains.length > 0 ? { gains } : {});
/** Round 2: the secondary of Technology, four resources, paid with the planets given (Home One 3, Home Two 1, Target One 2, Target Two 1). */
const research = (planets: string[]) => secondary(CARD.technology, { researched: [tech('cruiser')], payment: { planets, tradeGoods: 0 } });
const table = (gains: string[], pay: ReturnType<typeof research>) =>
  ({ pay, ...bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[landing(gains)], [pay]] }) });

describe('exploration:rw Rich World', () => {
  // "This planet's resource value is increased by 1." LRR 35.8: "If a player resolves an exploration card that has an
  //  “attach” header, they attach that card to the planet card of the planet being explored."
  // Checks: Rich World explored with Target One is attached to it.
  // Why the check is redundant here: nothing is lifted; the attachment is a fact of the planet the count must know.
  test.fails('exploration:rw explored with the planet the entry gains is attached to that planet', () => {
    const rich = table([id], research(['h1']));
    quote(rich.pack, id, "This planet's resource value is increased by 1.");
    expect(endOf(rich).attachments?.t1).toEqual([id]);
  });

  // "This planet's resource value is increased by 1."
  // Checks: the next round Target One (2) and Home Two (1) pay the four resources of the secondary of Technology.
  // Why the check is redundant here: the shortfall check (26, 64.8) sums the printed resources; with the card Target
  // One is worth 3, so the payment is full and no shortResources is made at all (a modify, not a waiver).
  test.fails('exploration:rw raises the resources of its planet: the payment is full', () => {
    const rich = table([id], research(['t1', 'h2']));
    expectNone(warningsOf(rich, rich.pay), 'shortResources');
  });

  // LRR 64.1: "A planet’s resources are indicated by the value on its planet card".
  // Checks: without the card the same payment is one resource short.
  // Why the check is NOT redundant here: no attachment raises Target One.
  test('exploration:rw not explored, the same payment stays one resource short', () => {
    const plain = table([], research(['t1', 'h2']));
    expectStanding(warningsOf(plain, plain.pay), 'shortResources');
  });

  // "This planet's resource value is increased by 1."
  // Checks: the card raises the planet it is attached to and no other: Target Two and Home Two stay short.
  // Why the check is NOT redundant here: Target Two has no attachment.
  test('exploration:rw raises only its own planet: a payment without it stays short', () => {
    const rich = table([id], research(['t2', 'h2']));
    expectStanding(warningsOf(rich, rich.pay), 'shortResources');
  });

  test.todo('exploration:rw stays with the planet when another player takes it (12.2): the rivals\' payments are not checked against attachments yet');

  test.fails('exploration:rw is a passive effect that changes the resources of a planet', () => {
    const { pack } = table([], research([]));
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.planetResources).toBeTypeOf('function');
  });
});
