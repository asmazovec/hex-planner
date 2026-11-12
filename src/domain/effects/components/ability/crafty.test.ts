import { describe, expect, test } from 'vitest';
import type { Entry, ExtensionCode } from '../../../types';
import { bench, effect, expectNone, expectStanding, expectWaived, NEAR, quote, tactical, warningsOf } from '../kit';
import { id } from './crafty';

/** The check pass 2 adds for everyone (LRR 2.4): more than seven action cards in hand. Named as the extension code it will be. */
const HAND_LIMIT = 'handOverLimit' as ExtensionCode;
const SEVEN = ['actionCard:abs', 'actionCard:assassin', 'actionCard:bribery', 'actionCard:bunker', 'actionCard:confusing', 'actionCard:courageous', 'actionCard:cripple'];
/** A turn that draws one more action card. */
const draw = (): Entry => tactical(NEAR, {}, { gains: ['actionCard:disable'] });
const table = (faction: string, hand: string[] = SEVEN) => {
  const entry = draw();
  return { entry, ...bench({ faction, start: { hand }, entries: [entry] }) };
};

describe('ability:crafty Crafty', () => {
  // "You can have any number of action cards in your hand."
  // Checks: the Yssaril draw an eighth action card; the warning of the hand limit is listed and lifted by Crafty.
  // Why the check is redundant here: 2.4 limits a hand to seven cards and lets a game effect change that (2.4.1);
  // Crafty removes the limit altogether, so it is a waiver, not a new number.
  test.fails('ability:crafty an eighth action card is kept: the warning of the hand limit is waived', () => {
    const t = table('yssaril');
    quote(t.pack, id, 'You can have any number of action cards in your hand.');
    expectWaived(warningsOf(t, t.entry), HAND_LIMIT, id);
  });

  // LRR 2.4: "Each player's hand can have a maximum of seven action cards."
  // Checks: another faction drawing the eighth card is warned of.
  // Why the check is NOT redundant here: the ability is the Yssaril's own.
  test.fails('ability:crafty is the Yssaril\'s own: another faction with eight cards is warned of', () => {
    const t = table('sol');
    expectStanding(warningsOf(t, t.entry), HAND_LIMIT);
  });

  // Checks: seven cards are within the limit, so there is nothing to warn of and nothing to waive.
  test('ability:crafty seven cards make no warning at all', () => {
    const t = table('sol', SEVEN.slice(1));
    expectNone(warningsOf(t, t.entry), HAND_LIMIT);
  });

  // "Game effects cannot prevent you from using this ability."
  // Checks: the ability is passive: it waives whatever the player holds, with no entry naming it.
  test.fails('ability:crafty is a passive effect that waives the hand limit', () => {
    const { pack } = table('yssaril');
    quote(pack, id, 'Game effects cannot prevent you from using this ability.');
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual([HAND_LIMIT]);
  });
});
