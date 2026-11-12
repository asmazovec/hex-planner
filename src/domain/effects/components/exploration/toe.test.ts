import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, quote, secondary, TARGET, tactical, warningsOf } from '../kit';
import { id } from './toe';

/** Round 1: a carrier from the next system lands one infantry on Target One (2/1) and gains it; the card explored is in its gains. */
const landing = (gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}, gains.length > 0 ? { gains } : {});
/** Round 2: the secondary of Leadership buys one command token for three influence, paid with the planets given. */
const buy = (planets: string[]) => secondary(CARD.leadership, { boughtTokens: 1, tokens: { tactic: 1 }, payment: { planets, tradeGoods: 0 } });
const table = (gains: string[], pay: ReturnType<typeof buy>) =>
  ({ pay, ...bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[landing(gains)], [pay]] }) });

describe('exploration:toe Tomb of Emphidia', () => {
  // "This planet's influence value is increased by 1." LRR 35.8: an exploration card with an “attach” header is
  //  attached to the planet card of the planet being explored.
  // Checks: the tomb explored with Target One is attached to it.
  // Why the check is redundant here: nothing is lifted; the attachment is a fact of the planet the count must know.
  test('exploration:toe explored with the planet the entry gains is attached to that planet', () => {
    const tomb = table([id], buy(['h1']));
    quote(tomb.pack, id, "This planet's influence value is increased by 1.");
    expect(endOf(tomb).attachments?.t1).toEqual([id]);
  });

  // "This planet's influence value is increased by 1."
  // Checks: the next round Target One (1 + 1) and Home One (1) pay the three influence of a token bought on Leadership.
  // Why the check is redundant here: the shortfall check sums the printed influence; with the card the sum is 3, so
  // no shortInfluence is made at all (a modify, not a waiver).
  test('exploration:toe raises the influence of its planet by one: the payment is full', () => {
    const tomb = table([id], buy(['t1', 'h1']));
    expectNone(warningsOf(tomb, tomb.pay), 'shortInfluence');
  });

  // LRR 64.2: "A planet’s influence is indicated by the value on its planet card".
  // Checks: without the card the same payment is one influence short.
  // Why the check is NOT redundant here: no attachment raises Target One.
  test('exploration:toe not explored, the same payment stays one influence short', () => {
    const plain = table([], buy(['t1', 'h1']));
    expectStanding(warningsOf(plain, plain.pay), 'shortInfluence');
  });

  // Checks: the tomb adds one, not two: Target One alone (2 with the tomb) is still short of three.
  // Why the check is NOT redundant here: the card raises the value by 1, the limit of its own text.
  test('exploration:toe adds one influence only: Target One alone stays short', () => {
    const tomb = table([id], buy(['t1']));
    expectStanding(warningsOf(tomb, tomb.pay), 'shortInfluence');
  });

  test.todo('exploration:toe the victory point of the Crown of Emphidia on this planet is the relic\'s own ability: the relic\'s batch plays it');

  test('exploration:toe is a passive effect that changes the influence of a planet', () => {
    const { pack } = table([], buy([]));
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.planetInfluence).toBeTypeOf('function');
  });
});
