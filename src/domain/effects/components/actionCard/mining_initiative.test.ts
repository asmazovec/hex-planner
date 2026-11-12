import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './mining_initiative';

/** LRR 2.6.1 in a file of its own (pass 2): a component action whose ability cannot be resolved completely. */
const UNRESOLVED = 'componentUnresolved' as AnyWarningCode;

/** h1 is my home planet of 3 resources; t1 (2 resources) is not mine. */
const play = (planet?: string) => componentAction(id, planet === undefined ? {} : { choices: { planet } });
const table = (entries: Entry[], hand: string[] = [id]) => bench({ faction: 'sol', start: { hand }, entries });

describe('actionCard:mining_initiative Mining Initiative', () => {
  // "Gain trade goods equal to the resource value of 1 planet you control."
  // Checks: played with the choice of h1 (3 resources), the card gains 3 trade goods.
  // Why no check is lifted: the card adds trade goods, it breaks no rule.
  test('actionCard:mining_initiative gains trade goods equal to the resources of the planet chosen', () => {
    const mine = play('h1');
    const card = table([mine]);
    quote(card.pack, id, 'Gain trade goods equal to the resource value of 1 planet you control');
    expect(endOf(card).tradeGoods).toBe(3);
    expectNone(warningsOf(card, mine), UNRESOLVED);
  });

  // tirules2, Mining Initiative 2: "Mining Initiative does not exhaust the chosen planet."
  // Checks: h1 stays ready and pays a later entry.
  // Why the planet is NOT exhausted: the card reads the planet's value; it does not spend it (LRR 71.2 is spending).
  test('actionCard:mining_initiative leaves the chosen planet ready', () => {
    const end = endOf(table([play('h1')]));
    expect(end.tradeGoods).toBe(3);
    expect(end.exhausted).not.toContain('h1');
  });

  // "... 1 planet you control." LRR 2.6.1: "A player cannot resolve a component action if they cannot completely
  //  resolve its ability."
  // Checks: t1, which I do not control, is chosen: the play is warned of and gains nothing.
  // Why the check is NOT redundant here: the card names a planet the player controls; any other cannot be chosen.
  test('actionCard:mining_initiative on a planet I do not control is warned of and gains nothing', () => {
    const theirs = play('t1');
    const card = table([theirs]);
    expectStanding(warningsOf(card, theirs), UNRESOLVED);
    expect(endOf(card).tradeGoods).toBe(0);
  });

  // Checks: the card played without a planet chosen gains nothing yet.
  // Why nothing is gained: the amount is the value of the planet chosen; there is none.
  test('actionCard:mining_initiative without a planet chosen gains nothing', () => {
    const end = endOf(table([play()]));
    expect(end.tradeGoods).toBe(0);
    expect(end.holdings.hand).not.toContain(id);
  });

  test('actionCard:mining_initiative is a play effect that waives nothing', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
