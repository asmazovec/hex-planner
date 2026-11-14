import { describe, expect, test } from 'vitest';
import type { Entry, Payment } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './impersonation';

/**
 * The component action that plays the card, paid with `payment`. The component action has no payment field yet; pass 2
 * adds one (the same `Payment` as a tactical action's), and these tests name it as it will be.
 */
const play = (payment?: Payment, extra: Partial<Entry> = {}) => ({ ...componentAction(id, extra), ...(payment ? { payment } : {}) } as Entry);
const table = (entry: Entry) => bench({ faction: 'sol', expansions: ['pok'], start: { hand: [id] }, entries: [entry] });
const of = (entry: Entry, code: string) => warningsOf(table(entry), entry).filter(w => w.code === code);

describe('actionCard:impersonation Impersonation', () => {
  // "Spend 3 influence to draw 1 secret objective."
  // Checks: the action is paid with Home One (influence 1) and Home Two (influence 2): no shortfall, and both planets
  // are exhausted at the end.
  // Why the check holds and is met here: the card's cost is 3 influence, spent as any influence is (LRR 47.2, 26.1).
  test('actionCard:impersonation is paid with 3 influence: the planets spent are exhausted', () => {
    const entry = play({ planets: ['h1', 'h2'], tradeGoods: 0 });
    quote(table(entry).pack, id, 'Spend 3 influence to draw 1 secret objective.');
    expectNone(warningsOf(table(entry), entry), 'shortInfluence');
    expect(endOf(table(entry)).exhausted).toEqual(expect.arrayContaining(['h1', 'h2']));
  });

  // Ruling 1: "A player cannot play Impersonation if they have less than three influence available."
  // Checks: paid with Home Two alone (influence 2), the action is one influence short.
  // Why the check is NOT redundant here: the card asks for 3 influence and nothing lifts that.
  test('actionCard:impersonation paid with 2 influence is one short', () => {
    const entry = play({ planets: ['h2'], tradeGoods: 0 });
    expectStanding(warningsOf(table(entry), entry), 'shortInfluence');
    expect(of(entry, 'shortInfluence')[0].params).toMatchObject({ needed: 3, paid: 2 });
  });

  // Checks: with no payment at all the action is short by the whole cost.
  // Why the check is NOT redundant here: the card cannot be resolved for free (2.6.1: it must be resolved completely).
  test('actionCard:impersonation with no payment is short by 3 influence', () => {
    const entry = play();
    expect(of(entry, 'shortInfluence')[0]?.params).toMatchObject({ needed: 3, paid: 0 });
  });

  // "... to draw 1 secret objective."
  // Checks: the objective drawn, entered as a gain of the action, joins the secrets in hand, and the card leaves it.
  // Why nothing more is counted: which objective is drawn is chance; the player enters it.
  test('actionCard:impersonation the objective drawn is entered as a gain and joins the secrets', () => {
    const entry = play(undefined, { gains: ['secretObjective:ans'] });
    const end = endOf(table(entry));
    expect(end.holdings.secrets).toContain('secretObjective:ans');
    expect(end.holdings.hand).not.toContain(id);
  });

  test('actionCard:impersonation is a play effect that lifts no check', () => {
    const { pack } = table(play());
    expect(effect(pack, id).tier).toBe('play');
  });
});
