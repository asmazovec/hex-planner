import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, expectStanding, expectWaived, primary, quote, secondary, using, warningsOf } from '../kit';
import { id } from './naalubt';

/** The secondary of Technology: one technology for four resources, paid with both home planets. */
const research = () => secondary(CARD.technology, { researched: ['technology:st'], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
const naalu = (entries: Entry[], faction = 'naalu') =>
  bench({ faction, expansions: ['pok', 'te'], start: { breakthrough: 'held' }, entries });
/** The strategy pool emptied first: two tokens out of the starting two. */
const empty = () => adjust({ strategy: -2 });

describe('breakthrough:naalubt Mindsieve', () => {
  // "When you would resolve the secondary ability of another player's strategy card, you may give them a promissory
  //  note to resolve it without spending a command token."
  // Checks: the secondary of Technology named with Mindsieve leaves the strategy pool as it was (2).
  // Why the check is redundant here: LRR 20.5 makes a secondary cost a strategy token; the card resolves it without one.
  test.fails('breakthrough:naalubt resolves a secondary without spending a strategy token', () => {
    const play = using(research(), id);
    const table = naalu([play]);
    quote(table.pack, id, 'to resolve it without spending a command token');
    expect(endOf(table).strategy).toBe(2);
  });

  // Checks: with the strategy pool empty, the warning that there is no token for the secondary is still listed, and
  // lifted by Mindsieve.
  // Why the check is redundant here: no token is spent, so an empty strategy pool does not stand in the way.
  test.fails('breakthrough:naalubt with an empty strategy pool: the warning is waived by Mindsieve', () => {
    const play = using(research(), id);
    expectWaived(warningsOf(naalu([empty(), play]), play), 'shortStrategy', id);
  });

  // LRR 20.5: "... resolve the secondary ability of that strategy card by spending a command token from their strategy pool."
  // Checks: the same secondary without Mindsieve spends the token, and with an empty pool its warning stands.
  // Why the check is NOT redundant here: the breakthrough is held but not named for this secondary.
  test('breakthrough:naalubt not named: the secondary spends its token and an empty pool is warned of', () => {
    const play = research();
    expect(endOf(naalu([play])).strategy).toBe(1);
    const short = research();
    expectStanding(warningsOf(naalu([empty(), short]), short), 'shortStrategy');
  });

  // Checks: another faction naming Mindsieve without holding it is warned of as not holding it, and its token stands.
  // Why the check is NOT redundant here: Mindsieve lifts the cost only for the player who holds it.
  test('breakthrough:naalubt not held: naming it is warned of', () => {
    const play = using(research(), id);
    const table = bench({ faction: 'sol', expansions: ['pok', 'te'], entries: [play] });
    expectStanding(warningsOf(table, play), 'componentNotHeld');
  });

  // LRR 20.5.1 (Leadership's secondary is free) with the card's "without spending a command token".
  // Checks: on a secondary that costs nothing anyway Mindsieve gives no token back.
  // Why the check is NOT redundant here: the card spares a token that would be spent; it never adds one.
  test('breakthrough:naalubt on Leadership\'s free secondary gives no token back', () => {
    const play = using(secondary(CARD.leadership, {}), id);
    expect(endOf(naalu([play])).strategy).toBe(2);
  });

  // "... the secondary ability of another player's strategy card ..."
  // Checks: a primary played for a token still spends it with Mindsieve named.
  // Why the check is NOT redundant here: the card speaks of secondaries only.
  test('breakthrough:naalubt does not spare the token of a primary played for a token', () => {
    const play = using(primary(CARD.technology, { researched: ['technology:st'] }, { forToken: true }), id);
    expect(endOf(naalu([play])).strategy).toBe(1);
  });

  test.todo('breakthrough:naalubt the promissory note given to the card\'s owner leaves my hand: giving it is not a transaction (Naalu, Mindsieve 2) and the plan has no field for it yet');

  test.fails('breakthrough:naalubt is a play effect that waives the empty strategy pool for its entry', () => {
    const { pack } = naalu([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => [w.code, w.lasts])).toEqual([['shortStrategy', undefined]]);
  });
});
