/**
 * Clandestine Operations (directive): "For: Each player removes 2 command tokens from their command sheet and returns
 * those tokens to their reinforcements. Against: Each player removes 1 command token from their fleet pool and
 * returns that token to their reinforcements."
 *
 * Decided: play. The outcome changes the command sheet, which the plan counts: "For" takes 2 tokens from the pools the
 * player chooses, "Against" takes 1 from the fleet pool, after which a system may hold more ships than the pool allows
 * (37.3).
 */
import { gainTokens } from '../../../replay/status';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:cladenstine';

const count = (value: string | number | undefined): number => Math.max(0, Math.floor(Number(value) || 0));

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => {
    const { outcome } = turn.choices;
    if (outcome === 'against') gainTokens(turn, { fleet: -1 });
    else if (outcome === 'for') {
      gainTokens(turn, { tactic: -count(turn.choices.tactic), fleet: -count(turn.choices.fleet), strategy: -count(turn.choices.strategy) });
    }
  },
};
