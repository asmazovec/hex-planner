/**
 * Volatile Fuel Source, a hazardous exploration card: "If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet, gain 1 command token."
 *
 * Decided: `play`, resolved when the planet is explored (LRR 35.2): one command token into the pool the player chooses (`choices[id]`: tactic, fleet or strategy; LRR 20). Its condition is a fact of the board
 * the plan knows: with a mech of the player on the planet nothing is removed; without one, one infantry is removed from
 * the planet. With neither the card does nothing and is warned of with a new code (explorationCondition, LRR 35.2 and
 * the card's text, step invasion). Nothing is waived.
 *
 * Pass 1: still the hint it is today; the resolution in the entry that gains the planet comes in pass 2.
 */
import type { ComponentEffect } from '../../types';
import { exploredCondition } from './batch33/attach';

export const id = 'exploration:vfs1';

const POOLS = ['tactic', 'fleet', 'strategy'] as const;

export const effect: ComponentEffect = {
  tier: 'play', rule: id,
  choose: [{
    key: id, kind: 'option', options: () => [...POOLS], label: { ru: 'Жетон в', en: 'Token to' },
    names: {
      tactic: { ru: 'Тактический резерв', en: 'Tactic pool' },
      fleet: { ru: 'Резерв флота', en: 'Fleet pool' },
      strategy: { ru: 'Стратегический резерв', en: 'Strategy pool' },
    },
  }],
  gained: turn => {
    if (!exploredCondition(turn)) return;
    const chosen = turn.choices[id];
    const pool = POOLS.find(each => each === chosen) ?? 'tactic';
    turn.state[pool] += 1;
  },
};
