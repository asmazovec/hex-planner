import { describe, expect, test } from 'vitest';
import type { ExtensionCode } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, planned, quote, warningsOf } from '../kit';
import { id } from './censure';

/**
 * The check the law brings: the elected player plays an action card. A new code of its own, made by the replay of a
 * played action card (src/domain/rules/codes/actionCardBarred.ts in pass 2).
 */
const CODE = 'actionCardBarred' as ExtensionCode;
const CARD = 'actionCard:cripple';

/** The law resolved, its owner the elected player. */
const elected = (extra: Partial<Entry> = {}): Entry =>
  planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'agenda', { gains: [id], ...extra });
const table = (rounds: Entry[][]) => bench({
  faction: 'sol', expansions: ['pok'], start: { hand: [CARD] }, rounds,
  game: { opponents: [{ id: 'r1', faction: 'hacan', vp: 0, seat: 2, color: 2 }] },
});

describe('agenda:censure Political Censure', () => {
  // "The elected player gains this card and 1 victory point."
  // Checks: I am elected (my agenda entry gains the law): my points go from 0 to 1 by themselves.
  // Why the check is redundant here: nothing is lifted; the law changes the points the plan counts.
  test('agenda:censure the elected player gains 1 victory point', () => {
    const t = table([[elected()]]);
    quote(t.pack, id, 'The elected player gains this card and 1 victory point.');
    expect(endOf(t).vp).toBe(1);
  });

  // "The elected player cannot play action cards."
  // Checks: elected in round 1, I play an action card in round 2: the play is warned of, and nothing lifts it.
  // Why the check is NOT redundant here: the law forbids; it is a new check, not a waiver, and the plan forbids nothing.
  test('agenda:censure the elected player playing an action card is warned of', () => {
    const play = componentAction(CARD);
    const t = table([[elected()], [play]]);
    quote(t.pack, id, 'The elected player cannot play action cards.');
    expectStanding(warningsOf(t, play), CODE);
  });

  // Checks: an action card discarded with any entry is a card played, so it is warned of too.
  // Why the check is NOT redundant here: the law speaks of every action card, in any window.
  test('agenda:censure an action card spent with another entry is warned of as well', () => {
    const spent = planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'action', { spends: [CARD] });
    const t = table([[elected()], [spent]]);
    expectStanding(warningsOf(t, spent), CODE);
  });

  // Checks: another player elected (the rival's agenda entry gains the law): my action card is not warned of.
  // Why the check is NOT redundant here: the law binds the elected player only; it is in play for the whole game, so
  // being in play is not enough.
  test('agenda:censure another player elected: my action card is not warned of', () => {
    const play = componentAction(CARD);
    const t = table([[elected({ owner: 'r1' })], [play]]);
    expectNone(warningsOf(t, play), CODE);
  });

  // "If the owner of this card loses this card, they lose 1 victory point."
  // Checks: elected in round 1 and losing the card in round 2 costs the point again: one point fewer than keeping it.
  test('agenda:censure losing the card loses the victory point', () => {
    const kept = table([[elected()]]);
    const lost = table([[elected()], [planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'agenda', { spends: [id] })]]);
    expect(endOf(kept).vp - endOf(lost).vp).toBe(1);
  });

  // Checks: the law is played by the entry that resolves it.
  test('agenda:censure is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
