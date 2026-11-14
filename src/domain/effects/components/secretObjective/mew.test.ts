import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import type { StartHoldings } from '../../../types';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './mew';

const table = (start: StartHoldings) => bench({ faction: 'sol', start });

describe('secretObjective:mew Make an Example of Their World', () => {
  // "Destroy the last of a player's ground forces on a planet during the bombardment step."
  // Checks: the objective is a reminder in the block of the invasion step, and nothing else: no waiver, no change of a number, nothing played.
  // Why no check is redundant here: the card lifts no rule of the Rules Reference; it is the condition of a victory
  //  point (LRR 61.4), and the plan rolls no Bombardment and does not know which ground forces its dice destroy.
  test('secretObjective:mew is a hint of the invasion step, with no waiver and no change of the count', () => {
    const { pack } = table({});
    quote(pack, id, 'during the bombardment step');
    const found = effect(pack, id);
    expect(found.tier).toBe('hint');
    expect(found.hintAt).toEqual(['invasion']);
    expect(found.waive).toBeUndefined();
    expect(found.modify).toBeUndefined();
    expect(found.nativePlay).toBeUndefined();
  });

  // LRR 61.17: "A secret objective is an objective that is controlled by one player and is hidden from all other players
  //  until it is scored."
  // Checks: held in hand and not scored, the card stands among the reminders of the invasion step for its holder. Today
  // the reminders ask only the cards a player holds ready (`readyComponents`), which leaves the secrets in hand out.
  // Why no check is redundant here: none is made; the reminder only keeps the condition in view where it is met,
  //  and the plan rolls no Bombardment and does not know which ground forces its dice destroy.
  test('secretObjective:mew reminds its holder of itself at the invasion step while it is in hand', () => {
    const held = table({ secrets: [id] });
    expect(hintsAt(held.pack, endOf(held), 'invasion', ['me']).map(c => c.id)).toContain(id);
  });

  // LRR 61.18: "When scoring a secret objective, a player reveals the objective by placing it faceup in their play area."
  // Checks: once scored the card is no longer something to aim for and reminds of nothing; nor at another step.
  // Why the reminder is NOT kept here: a scored objective cannot be scored again, and the other steps are not where its
  // condition is met.
  test('secretObjective:mew reminds of nothing once scored, nor at a step that is not its own', () => {
    const scored = table({ scored: [id] });
    expect(hintsAt(scored.pack, endOf(scored), 'invasion', ['me']).map(c => c.id)).not.toContain(id);
    const held = table({ secrets: [id] });
    expect(hintsAt(held.pack, endOf(held), 'production', ['me']).map(c => c.id)).not.toContain(id);
  });
});
