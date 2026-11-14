import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, DataPack, Entry } from '../../../types';
import { adjust, bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './insub';

/** LRR 2.6.1 in a file of its own (pass 2): a component action whose ability cannot be resolved completely. */
const UNRESOLVED = 'componentUnresolved' as AnyWarningCode;
const RIVAL = 'o1';
const seatRival = (pack: DataPack) => {
  pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
};
const table = (entries: Entry[], hand: string[] = [id]) => bench({
  faction: 'sol', start: { hand }, entries, edit: seatRival,
  game: { opponents: [{ id: RIVAL, faction: 'rules-rival', vp: 0, seat: 2, color: 2 }] },
});
const insub = (player?: string) => componentAction(id, player === undefined ? {} : { choices: { player } });

describe('actionCard:insub Insubordination', () => {
  // "Remove 1 token from another player's tactic pool and return it to their reinforcements."
  // Checks: played on the opponent, their tactic pool goes from 3 to 2; mine stays.
  // Why no check is lifted: the card changes another player's tokens; it breaks no rule.
  test('actionCard:insub removes 1 token from the chosen opponent\'s tactic pool', () => {
    const play = insub(RIVAL);
    const card = table([play]);
    quote(card.pack, id, 'Remove 1 token from another player\'s tactic pool');
    const end = endOf(card);
    expect(end.rivals?.[RIVAL].tactic).toBe(2);
    expect(end.tactic).toBe(3);
    expectNone(warningsOf(card, play), UNRESOLVED);
  });

  // tirules2, Insubordination 1: "Insubordination cannot target a player with zero command tokens in their tactic pool."
  // Checks: the opponent spent all three tactic tokens; the play is warned of.
  // Why the check is NOT redundant here: LRR 2.6.1, a component action that cannot be resolved completely is not
  // resolved, and the card names a token that is not there.
  test('actionCard:insub on an opponent with an empty tactic pool is warned of', () => {
    const play = insub(RIVAL);
    const card = table([{ ...adjust({ tactic: -3 }), owner: RIVAL }, play]);
    expectStanding(warningsOf(card, play), UNRESOLVED);
    expect(endOf(card).rivals?.[RIVAL].tactic).toBe(0);
  });

  // "... another player's tactic pool."
  // Checks: the card played without a player chosen changes nobody's tokens.
  // Why nothing is removed: the card names one other player; none was chosen.
  test('actionCard:insub without a player chosen removes nothing', () => {
    const end = endOf(table([insub()]));
    expect(end.rivals?.[RIVAL].tactic).toBe(3);
    expect(end.holdings.hand).not.toContain(id);
  });

  test('actionCard:insub is a play effect that waives nothing', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
