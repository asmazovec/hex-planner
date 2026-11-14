/**
 * Clandestine Operations (directive): "For: Each player removes 2 command tokens from their command sheet and returns
 * those tokens to their reinforcements. Against: Each player removes 1 command token from their fleet pool and
 * returns that token to their reinforcements."
 *
 * Decided: play. The outcome changes the command sheet, which the plan counts: "For" takes 2 tokens from the pools the
 * player chooses, "Against" takes 1 from the fleet pool, after which a system may hold more ships than the pool allows
 * (37.3).
 */
import { tokens } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:cladenstine';

const count = (value: string | number | undefined): number => Math.max(0, Math.floor(Number(value) || 0));

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const { outcome } = ctx.choices;
    if (outcome === 'against') return [tokens(ctx.holder, { fleet: -1 }, 'component')];
    if (outcome === 'for') return [tokens(ctx.holder, { tactic: -count(ctx.choices.tactic), fleet: -count(ctx.choices.fleet), strategy: -count(ctx.choices.strategy) }, 'component')];
    return [];
  },
};
