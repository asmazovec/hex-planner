import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { before, bench, effect, endOf, expectStanding, expectWaived, HOME, quote, secondary, tactical, using, warningsOf } from '../kit';
import { id } from './keleresagent';

const TRADE = 5;

/** A cruiser built at the home dock, paid with `tradeGoods` trade goods alone. */
const build = (tradeGoods: number): Entry =>
  tactical(HOME, { production: { cruiser: 1 }, payment: { planets: [], tradeGoods } });

/**
 * The Keleres replenish their 2 commodities with the secondary of Trade, then build. Whatever trade goods they hold
 * then (none today, one once Council Patronage is counted), they never hold more than one: two trade goods paid are
 * always beyond the trade goods and within the trade goods and the commodities.
 */
const keleres = (...entries: Entry[]) => ({
  last: entries[entries.length - 1],
  ...bench({ faction: 'keleresm', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [secondary(TRADE), ...entries], game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } } }),
});

describe('leader:keleresagent Xander Alexin Victori III', () => {
  // "At any time: You may exhaust this card to allow any player to spend commodities as if they were trade goods."
  // Checks: named in «Used» of the build, the agent lets the trade goods paid beyond those held come from the
  // commodities: the warning of trade goods missing is listed and lifted by the agent.
  // Why the check is redundant here: LRR 21.7 "A player cannot spend commodities unless otherwise specified"; the
  // agent is that specification, so trade goods paid within trade goods plus commodities are paid.
  test('leader:keleresagent lets commodities pay as trade goods: the warning of trade goods missing is waived', () => {
    const table = keleres(using(build(2), id));
    quote(table.pack, id, 'allow any player to spend commodities as if they were trade goods');
    expectWaived(warningsOf(table, table.last), 'shortTradeGoods', id);
  });

  // Checks: what the trade goods held do not cover is taken from the commodities: trade goods and commodities
  // together fall by the 2 paid.
  // Why the default count does not apply: the commodities are spent as trade goods, so they leave the sheet.
  test('leader:keleresagent spends the commodities for the trade goods missing', () => {
    const table = keleres(using(build(2), id));
    const was = before(table.game, table.pack, table.last);
    const end = endOf(table);
    expect(end.tradeGoods + end.commodities).toBe(was.tradeGoods + was.commodities - 2);
    expect(end.commodities).toBeLessThan(was.commodities);
  });

  // LRR 21.7: "A player cannot spend commodities unless otherwise specified."
  // Checks: the same payment without the agent stands.
  // Why the check is NOT redundant here: the agent was not used ("You may exhaust this card").
  test('leader:keleresagent not used: trade goods paid beyond those held stand', () => {
    const table = keleres(build(2));
    expectStanding(warningsOf(table, table.last), 'shortTradeGoods');
  });

  // Checks: four trade goods paid are beyond the trade goods and the commodities together, and stand.
  // Why the check is NOT redundant here: the agent turns commodities into payment, it does not make goods from nothing.
  test('leader:keleresagent does not cover more than the trade goods and commodities held', () => {
    const table = keleres(using(build(4), id));
    expectStanding(warningsOf(table, table.last), 'shortTradeGoods');
  });

  // Ruling (Keleres, Xander Alexin Victori III 1): it "applies to only a single instance of spending trade goods".
  // LRR 51.4: an agent is exhausted by its ability and readied in the status phase.
  // Checks: the agent used again in the same round is warned of as exhausted, and lifts nothing that time.
  // Why the check is NOT redundant here: the exhausted agent cannot be used again before the status phase.
  test('leader:keleresagent used twice in a round: the second use is warned of and lifts nothing', () => {
    const table = keleres(using(build(0), id), using(build(2), id));
    const warnings = warningsOf(table, table.last);
    expectStanding(warnings, 'componentExhausted');
    expectStanding(warnings, 'shortTradeGoods');
  });

  test('leader:keleresagent is a play effect that waives the trade goods missing', () => {
    const { pack } = keleres();
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['shortTradeGoods']);
  });
});
