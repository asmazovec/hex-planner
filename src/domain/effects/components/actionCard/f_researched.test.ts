import { describe, expect, test } from 'vitest';
import { componentById } from '../../../components';
import type { StartHoldings } from '../../../types';
import { adjust, bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './f_researched';

/** Neural Motivator has no prerequisites. */
const NM = 'technology:nm';
const research = (technology = NM) => componentAction(id, { choices: { technology } } as never);
const table = (tradeGoods: number, play = research(), start: StartHoldings = { hand: [id] }) =>
  ({ play, ...bench({ faction: 'sol', start, entries: [adjust({ tradeGoods }), play] }) });

describe('actionCard:f_researched Focused Research', () => {
  // "Spend 4 trade goods to research 1 technology"
  // Checks: with 4 trade goods the card researches the chosen technology and spends them all.
  // Why nothing is waived: research outside the Technology card is the card's own effect (LRR 90.3 lets abilities
  // research); it breaks no rule, it changes the holdings and the trade goods.
  test('actionCard:f_researched researches the chosen technology for 4 trade goods', () => {
    const table1 = table(4);
    quote(table1.pack, id, 'Spend 4 trade goods to research 1 technology');
    const end = endOf(table1);
    expect(end.holdings.technologies).toContain(NM);
    expect(end.tradeGoods).toBe(0);
    expectNone(warningsOf(table1, table1.play), 'shortTradeGoods');
  });

  // Ruling (Focused Research 1): "A player cannot play Focused Research if they have less than four trade goods."
  // Checks: with 3 trade goods the play is warned of; the plan forbids nothing.
  // Why the check is NOT redundant here: the card's own cost is not met.
  test('actionCard:f_researched with fewer than 4 trade goods is warned of', () => {
    const poor = table(3);
    expectStanding(warningsOf(poor, poor.play), 'shortTradeGoods');
  });

  // LRR 90.10: a player cannot research a technology they already own.
  // Checks: researching a technology already held is warned of.
  // Why the check is NOT redundant here: the card researches; it does not lift 90.10.
  test('actionCard:f_researched of a technology already owned is warned of', () => {
    const owned = table(4, research(), { hand: [id], technologies: [NM] });
    expectStanding(warningsOf(owned, owned.play), 'researchOwned');
  });

  // LRR 22.1 / 2.7: an action card is played from the hand.
  // Checks: without the card in hand the play is warned of.
  // Why the check is NOT redundant here: the card is not held.
  test('actionCard:f_researched played without being in hand is warned of', () => {
    const none = table(4, research(), {});
    expectStanding(warningsOf(none, none.play), 'componentNotHeld');
  });

  // Ruling (Focused Research 2): "A player must still meet the prerequisites for the technology they research."
  test.todo('actionCard:f_researched a technology whose prerequisites are not met is warned of: the replay checks prerequisites for no research yet');

  test('actionCard:f_researched is a play effect', () => {
    const { pack } = table(4);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});

// The card researches any technology of the catalogue: with Thunder's Edge on, I.I.H.Q. Modernization is replaced by
// Executive Order, and with it off Executive Order is not in the game; the list must offer neither by a raw id.
describe('actionCard:f_researched the technologies it offers', () => {
  test.each([[['pok', 'te'] as const], [['pok'] as const]])('every one offered with %j is a component of the catalogue', expansions => {
    const { pack } = bench({ faction: 'sol', expansions: [...expansions], start: { hand: [id] }, entries: [] });
    const spec = effect(pack, id).choose![0];
    const offered = spec.options!({ pack } as never);
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.filter(tech => componentById(pack, tech) === undefined)).toEqual([]);
  });
});
