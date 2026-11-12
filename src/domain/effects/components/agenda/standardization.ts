/**
 * Armed Forces Standardization (agenda):
 * "The elected player place command tokens from their reinforcements so that they have 3 tokens in their tactic
 * pool, 3 tokens in their fleet pool, and 2 tokens in their strategy pool. They return any excess tokens to their
 * reinforcements."
 *
 * A directive of the elected player: their command sheet becomes 3 tactic, 3 fleet and 2 strategy
 * tokens, which the plan counts; a `play` of the agenda entry with `choices.elect`. Pass 1: still a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:standardization';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // A directive (7.8): the elected player's command sheet becomes 3 tactic, 3 fleet and 2 strategy tokens, once.
  play: ({ choices, entry, states, shared }) => {
    const elected = String(choices.elect ?? entry.owner ?? 'me');
    const who = states[elected] ?? (elected === 'me' ? shared : shared.rivals?.[elected]);
    if (!who) return;
    who.tactic = 3;
    who.fleet = 3;
    who.strategy = 2;
  },
};
