import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import { tech } from '../../../rules/kit';
import type { Entry, EntryBody, ExpansionId, TechType } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, planned, quote, secondary, TARGET, tactical, warningsOf } from '../kit';
import { id } from './cybernetic';

/** Round 1: a carrier from the next system lands one infantry on Target One (2/1) and gains it; the card explored is in its gains. */
const landing = (gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}, gains.length > 0 ? { gains } : {});
/** Round 2: the technology part of a Thunder's Edge expedition, paid by exhausting Target One. */
const expedition = () => planned({ type: 'component', note: '', acts: [{ kind: 'expedition', sliceId: 'tech', payment: { planets: ['t1'], tradeGoods: 0 } }] } as EntryBody);
/** Round 2: the secondary of Technology, four resources. */
const research = (planets: string[]) => secondary(CARD.technology, { researched: [tech('cruiser')], payment: { planets, tradeGoods: 0 } });
/** Target One with a specialty of its own, or none as the test board has it. */
const table = (gains: string[], pay: Entry, specialty?: TechType, expansions: ExpansionId[] = ['pok', 'te']) => ({
  pay,
  ...bench({
    faction: 'letnev', expansions, units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[landing(gains)], [pay]],
    edit: pack => { if (specialty) pack.planets.t1 = { ...pack.planets.t1, tech: [specialty] }; },
  }),
});

describe('exploration:cybernetic Cybernetic Research Facility', () => {
  // "This planet has a yellow technology specialty." LRR 35.8: an exploration card with an “attach” header is attached to the planet card of the planet
  //  being explored.
  // Checks: the card explored with Target One is attached to it.
  // Why the check is redundant here: nothing is lifted; the attachment is a fact of the planet the count must know.
  test.fails('exploration:cybernetic explored with the planet the entry gains is attached to that planet', () => {
    const facility = table([id], expedition());
    quote(facility.pack, id, 'This planet has a yellow technology specialty.');
    expect(endOf(facility).attachments?.t1).toEqual([id]);
  });

  // "This planet has a yellow technology specialty." Expedition 4.5: the technology part is paid by exhausting a planet with a technology specialty.
  // Checks: the next round Target One, which has no specialty of its own, pays the technology part of an expedition.
  // Why the check is redundant here: the expeditionUnpaid check asks for a planet with a specialty, and the card gives
  // Target One one; nothing is lifted, the planet simply qualifies.
  test.fails('exploration:cybernetic gives its planet a specialty: the technology part of an expedition is paid with it', () => {
    const facility = table([id], expedition());
    expectNone(warningsOf(facility, facility.pay), 'expeditionUnpaid');
  });

  // Expedition 4.5: only a planet with a technology specialty pays the technology part.
  // Checks: without the card Target One cannot pay it.
  // Why the check is NOT redundant here: Target One has no specialty.
  test('exploration:cybernetic not explored, a planet without a specialty leaves the technology part unpaid', () => {
    const plain = table([], expedition());
    expectStanding(warningsOf(plain, plain.pay), 'expeditionUnpaid');
  });

  // "If this planet already has a technology specialty, this planet's resource and influence values are each increased
  //  by 1 instead."
  // Checks: on a Target One that has a biotic specialty the card adds a resource: Target One (3) and Home Two (1) pay
  // the four resources of the secondary of Technology.
  // Why the check is redundant here: the shortfall check sums the resources, which the card raises (a modify).
  test.fails('exploration:cybernetic on a planet that has a specialty raises its resources by one instead', () => {
    const facility = table([id], research(['t1', 'h2']), 'biotic', ['pok']);
    quote(facility.pack, id, 'this planet\'s resource and influence values are each increased by 1 instead');
    expectNone(warningsOf(facility, facility.pay), 'shortResources');
  });

  // Checks: on a planet without a specialty the card gives the specialty and no resource: the same payment stays short.
  // Why the check is NOT redundant here: the "instead" applies only to a planet that already has a specialty.
  test('exploration:cybernetic on a planet without a specialty adds no resource: the payment stays short', () => {
    const facility = table([id], research(['t1', 'h2']), undefined, ['pok']);
    expectStanding(warningsOf(facility, facility.pay), 'shortResources');
  });

  test.fails('exploration:cybernetic is a passive effect that changes its planet', () => {
    const { pack } = table([], research([]));
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.planetResources).toBeTypeOf('function');
    expect(effect(pack, id).modify?.planetInfluence).toBeTypeOf('function');
  });
});
