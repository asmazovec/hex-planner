import { describe, expect, test } from 'vitest';
import type { Act, StartHoldings } from '../../../types';
import type { Player } from '../../../players';
import { bench, effect, endOf, expectStanding, expectWaived, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './arbiters';

const RIVAL: Player = { id: 'o1', faction: 'letnev', vp: 0, seat: 2, color: 2 };
const CARD_IN_HAND = 'actionCard:sabo1';
/** My carrier flies next to home, beside the rival's at the target (neighbours), and I give them a component. */
const table = (faction: string, component: string, me: StartHoldings) => {
  const acts: Act[] = [{ kind: 'transaction', with: 'o1', give: { components: [component] }, get: {} }];
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }], acts });
  return { move, ...bench({ faction, units: { [HOME]: { carrier: 1 } }, start: me, entries: [move], game: { opponents: [RIVAL], enemyUnits: { [TARGET]: { o1: { carrier: 1 } } } } }) };
};

describe('ability:arbiters Arbiters', () => {
  // "When you are negotiating a transaction, action cards can be exchanged as part of that transaction."
  // Checks: the Hacan gives an action card to a neighbour; the warning that this kind does not change hands is listed
  // and lifted by the ability, and the card moves.
  // Why the check is redundant here: 94.3 lets only commodities, trade goods, promissory notes and relic fragments
  // change hands, and 94.3.1 adds action cards for the Hacan, which is this ability.
  test('ability:arbiters lets the Hacan trade an action card: the warning is waived', () => {
    const hacan = table('hacan', CARD_IN_HAND, { hand: [CARD_IN_HAND] });
    quote(hacan.pack, id, 'action cards can be exchanged as part of that transaction');
    expectWaived(warningsOf(hacan, hacan.move), 'transactionKind', id);
    expect(endOf(hacan).rivals?.o1.holdings.hand).toEqual([CARD_IN_HAND]);
  });

  // LRR 94.3: players "cannot exchange other types of cards or tokens".
  // Checks: another faction trading an action card is warned of, and the card moves all the same.
  // Why the check is NOT redundant here: only the Hacan may trade action cards. Today the replay lets everyone do it
  // without a warning; pass 2 makes the check, and the rules test 94.3.1 changes with it.
  test('ability:arbiters is the Hacan\'s own: another faction trading an action card is warned of', () => {
    const sol = table('sol', CARD_IN_HAND, { hand: [CARD_IN_HAND] });
    expectStanding(warningsOf(sol, sol.move), 'transactionKind');
    expect(endOf(sol).rivals?.o1.holdings.hand).toEqual([CARD_IN_HAND]);
  });

  // Checks: a technology given by the Hacan is still warned of.
  // Why the check is NOT redundant here: the ability adds action cards, no other kind.
  test('ability:arbiters does not let the Hacan trade a technology', () => {
    const hacan = table('hacan', 'technology:pm', { technologies: ['technology:pm'] });
    expectStanding(warningsOf(hacan, hacan.move), 'transactionKind');
  });

  test('ability:arbiters is a passive effect that waives the kind of a transaction', () => {
    const { pack } = table('hacan', CARD_IN_HAND, {});
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['transactionKind']);
  });
});
