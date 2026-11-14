import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import { tech } from '../../../rules/kit';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, quote, secondary, TARGET, tactical, warningsOf } from '../kit';
import { id } from './ls';

/** Round 1: a carrier from the next system lands one infantry on Target One (2/1) and gains it; the card explored is in its gains. */
const landing = (gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}, gains.length > 0 ? { gains } : {});
/** Round 2: the secondary of Technology, four resources. */
const research = (planets: string[]) => secondary(CARD.technology, { researched: [tech('cruiser')], payment: { planets, tradeGoods: 0 } });
/** Round 2: the secondary of Leadership, one token for three influence. */
const buy = (planets: string[]) => secondary(CARD.leadership, { boughtTokens: 1, tokens: { tactic: 1 }, payment: { planets, tradeGoods: 0 } });
const table = (gains: string[], pay: Entry) =>
  ({ pay, ...bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[landing(gains)], [pay]] }) });

describe('exploration:ls Lazax Survivors', () => {
  // "This planet's resource value is increased by 1 and its influence value is increased by 2." LRR 35.8.
  // Checks: the card explored with Target One is attached to it.
  // Why the check is redundant here: nothing is lifted; the attachment is a fact of the planet the count must know.
  test('exploration:ls explored with the planet the entry gains is attached to that planet', () => {
    const lazax = table([id], research(['h1']));
    quote(lazax.pack, id, "This planet's resource value is increased by 1 and its influence value is increased by 2.");
    expect(endOf(lazax).attachments?.t1).toEqual([id]);
  });

  // "This planet's resource value is increased by 1"
  // Checks: Target One (2 + 1) and Home Two (1) pay the four resources of the secondary of Technology.
  // Why the check is redundant here: with the card the payment is full; no shortResources is made (a modify).
  test('exploration:ls raises the resources of its planet by one: the research is paid', () => {
    const lazax = table([id], research(['t1', 'h2']));
    expectNone(warningsOf(lazax, lazax.pay), 'shortResources');
  });

  // "... and its influence value is increased by 2."
  // Checks: Target One alone (1 + 2) pays a token bought on Leadership.
  // Why the check is redundant here: with the card the payment is full; no shortInfluence is made (a modify).
  test('exploration:ls raises the influence of its planet by two: the token is bought with it alone', () => {
    const lazax = table([id], buy(['t1']));
    expectNone(warningsOf(lazax, lazax.pay), 'shortInfluence');
  });

  // LRR 64.1, 64.2: the values of a planet are those of its card.
  // Checks: without the card both payments stay short.
  // Why the check is NOT redundant here: no attachment raises Target One.
  test('exploration:ls not explored, both payments stay short', () => {
    const resources = table([], research(['t1', 'h2']));
    expectStanding(warningsOf(resources, resources.pay), 'shortResources');
    const influence = table([], buy(['t1']));
    expectStanding(warningsOf(influence, influence.pay), 'shortInfluence');
  });

  // Checks: one resource more, not two: Target One alone (3 with the card) is still short of four.
  // Why the check is NOT redundant here: the text raises the resources by 1 only.
  test('exploration:ls adds one resource only: Target One alone stays short of the research', () => {
    const lazax = table([id], research(['t1']));
    expectStanding(warningsOf(lazax, lazax.pay), 'shortResources');
  });

  test('exploration:ls is a passive effect that changes the resources and the influence of a planet', () => {
    const { pack } = table([], research([]));
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.planetResources).toBeTypeOf('function');
    expect(effect(pack, id).modify?.planetInfluence).toBeTypeOf('function');
  });
});
