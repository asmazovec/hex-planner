/**
 * Carth of Golden Sands (Emirates of Hacan, agent): "During the action phase: You may exhaust this card to gain 2
 * commodities or replenish another player's commodities."
 *
 * Decided: `play`, named in the `uses` of an entry of the action phase (exhausted as every agent is): the Hacan gains
 * 2 commodities, never beyond the faction's commodity value (Hacan note 2). Replenishing another player's commodities
 * needs a choice of that player, which `uses` does not carry. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:hacanagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
