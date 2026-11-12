import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import type { Entry, EntryBody } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, expectWaived, planned, quote, warningsOf } from '../kit';
import { id } from './crisis';

/** The agenda resolved with the strategy card elected; `choices` is not a field of an adjustment yet (pass 2). */
const crisis = (card: number): Entry =>
  planned({ type: 'adjustment', label: '', delta: {}, choices: { card } } as EntryBody, 'agenda', { gains: [id] });
const secondaryOf = (card: number, phase: Entry['phase']): Entry => planned({ type: 'secondary', card, effects: {} } as EntryBody, phase);
const table = (entries: Entry[]) => bench({ faction: 'sol', expansions: ['pok'], entries });

describe('agenda:crisis Galactic Crisis Pact', () => {
  // "Each player may perform the secondary ability of the elected strategy card without spending a command token"
  // Checks: Politics elected; my secondary of Politics in the agenda phase leaves the strategy pool at its 2 tokens.
  // Why the check is redundant here: a secondary costs a strategy token (20.5.1, 83.4) only when it is resolved by the
  // card's own rule; the agenda resolves it without one, so there is nothing to spend and nothing short.
  test.fails('agenda:crisis the secondary of the elected card spends no strategy token', () => {
    const politics = secondaryOf(CARD.politics, 'agenda');
    const t = table([crisis(CARD.politics), politics]);
    quote(t.pack, id, 'perform the secondary ability of the elected strategy card without spending a command token');
    expect(endOf(t).strategy).toBe(2);
    expectNone(warningsOf(t, politics), 'shortStrategy');
  });

  // LRR 83.4 (a player may resolve the secondary of each other card once), with the agenda's "Each player may perform".
  // Checks: I resolved the secondary of Politics in the action phase; its second time, by the agenda, is warned of as
  // repeated and the warning is lifted by the agenda.
  // Why the check is redundant here: the agenda gives every player a fresh resolution of the elected card's secondary,
  // apart from the one of the action phase (rulings: it is resolved immediately, during the agenda phase).
  test.fails('agenda:crisis lifts the repeated secondary of the elected card', () => {
    const again = secondaryOf(CARD.politics, 'agenda');
    const t = table([secondaryOf(CARD.politics, 'action'), crisis(CARD.politics), again]);
    expectWaived(warningsOf(t, again), 'secondaryRepeated', id);
  });

  // LRR 83.4: "each other player, beginning with the player to the left of the active player and proceeding
  //  clockwise, may perform the secondary ability of that strategy card."
  // Checks: I hold Politics this round; the agenda's "Each player" includes me, so my secondary of it is lifted.
  // Why the check is redundant here: the secondary is the agenda's to give, to each player, the holder among them.
  test.fails('agenda:crisis lifts the secondary of the card I hold myself', () => {
    const own = secondaryOf(CARD.politics, 'agenda');
    const t = table([crisis(CARD.politics), own]);
    t.game.plans[0].rounds[0].strategyCard = CARD.politics;
    expectWaived(warningsOf(t, own), 'ownSecondary', id);
  });

  // Checks: the same repeat without the agenda stands.
  // Why the check is NOT redundant here: without the agenda, the second resolution of the round is the rule's own.
  test('agenda:crisis without the agenda, a second secondary of the round stands', () => {
    const again = secondaryOf(CARD.politics, 'agenda');
    const t = table([secondaryOf(CARD.politics, 'action'), again]);
    expectStanding(warningsOf(t, again), 'secondaryRepeated');
  });

  // "... of the elected strategy card ..."
  // Checks: Politics elected, a secondary of Diplomacy in the agenda phase still costs its token: 2 becomes 1.
  // Why the check is NOT redundant here: the agenda speaks of the elected card only.
  test('agenda:crisis the secondary of another card still spends its token', () => {
    const t = table([crisis(CARD.politics), secondaryOf(CARD.diplomacy, 'agenda')]);
    expect(endOf(t).strategy).toBe(1);
  });

  // Checks: the agenda is played by its entry and lifts the two checks for the rest of that round.
  test.fails('agenda:crisis is a play effect that waives the repeated and the own secondary for the round', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => [w.code, w.lasts])).toEqual([['secondaryRepeated', 'round'], ['ownSecondary', 'round']]);
  });
});
