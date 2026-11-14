/**
 * Armed Forces Standardization (agenda):
 * "The elected player place command tokens from their reinforcements so that they have 3 tokens in their tactic
 * pool, 3 tokens in their fleet pool, and 2 tokens in their strategy pool. They return any excess tokens to their
 * reinforcements."
 *
 * A directive of the elected player: their command sheet becomes 3 tactic, 3 fleet and 2 strategy
 * tokens, which the plan counts; a `play` of the agenda entry with `choices.elect`. Pass 1: still a hint.
 */
import { tokens } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:standardization';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // A directive (7.8): the elected player's command sheet becomes 3 tactic, 3 fleet and 2 strategy tokens, once.
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const elected = ctx.playerOf(String(ctx.choices.elect ?? ctx.entry?.owner ?? 'me'));
    if (elected === undefined) return [];
    const have = ctx.of(elected).pools;
    return [tokens(elected, { tactic: 3 - have.tactic, fleet: 3 - have.fleet, strategy: 2 - have.strategy })];
  },
};
