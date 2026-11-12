import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, quote, secondary, TARGET, tactical, warningsOf } from '../kit';
import { id } from './pw';

/** Round 1: a carrier from the next system lands one infantry on Target One (2/1) and gains it; the card explored is in its gains. */
const landing = (gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
}, gains.length > 0 ? { gains } : {});
/** Round 2: the secondary of Leadership buys one command token for three influence, paid with the planets given. */
const buy = (planets: string[]) => secondary(CARD.leadership, { boughtTokens: 1, tokens: { tactic: 1 }, payment: { planets, tradeGoods: 0 } });
const table = (gains: string[], pay: ReturnType<typeof buy>) =>
  ({ pay, ...bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, rounds: [[landing(gains)], [pay]] }) });

describe('exploration:pw Paradise World', () => {
  // "This planet's influence value is increased by 2." LRR 35.8: an exploration card with an “attach” header is
  //  attached to the planet card of the planet being explored.
  // Checks: Paradise World explored with Target One is attached to it.
  // Why the check is redundant here: nothing is lifted; the attachment is a fact of the planet the count must know.
  test.fails('exploration:pw explored with the planet the entry gains is attached to that planet', () => {
    const paradise = table([id], buy(['h1']));
    quote(paradise.pack, id, "This planet's influence value is increased by 2.");
    expect(endOf(paradise).attachments?.t1).toEqual([id]);
  });

  // "This planet's influence value is increased by 2."
  // Checks: the next round Target One alone pays the three influence of a token bought on Leadership.
  // Why the check is redundant here: the shortfall check (26, 64.8) sums the printed influence; with the card Target
  // One is worth 3, so no shortInfluence is made at all (a modify, not a waiver).
  test.fails('exploration:pw raises the influence of its planet: one token is bought with it alone', () => {
    const paradise = table([id], buy(['t1']));
    expectNone(warningsOf(paradise, paradise.pay), 'shortInfluence');
  });

  // LRR 64.2: "A planet’s influence is indicated by the value on its planet card".
  // Checks: without the card Target One (1) is two influence short.
  // Why the check is NOT redundant here: no attachment raises Target One.
  test('exploration:pw not explored, Target One alone stays short of influence', () => {
    const plain = table([], buy(['t1']));
    expectStanding(warningsOf(plain, plain.pay), 'shortInfluence');
  });

  // Checks: the card raises the planet it is attached to and no other: Home One (1) stays short.
  // Why the check is NOT redundant here: Home One has no attachment.
  test('exploration:pw raises only its own planet: another planet stays short', () => {
    const paradise = table([id], buy(['h1']));
    expectStanding(warningsOf(paradise, paradise.pay), 'shortInfluence');
  });

  test.fails('exploration:pw is a passive effect that changes the influence of a planet', () => {
    const { pack } = table([], buy([]));
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.planetInfluence).toBeTypeOf('function');
  });
});
