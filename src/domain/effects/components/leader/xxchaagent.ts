/**
 * Ggrocuto Rinn (Xxcha, agent): "ACTION: Exhaust this card to ready any planet; if that planet is in a system that is
 * adjacent to a planet you control, you may remove 1 infantry from that planet and return it to its reinforcements."
 *
 * Decided: `play` with a waiver. Its component action names the planet (`choices.planet`) and readies it; "any planet"
 * lifts the rule that an effect readies only the player's own planets (`readyNotControlled`, 71 note 3). The infantry
 * removed belongs to another player and is not modelled.
 */
import { readyPlanets } from '../../../replay/payment';
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'leader:xxchaagent';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  play: ({ held, game, state, choices, warnings }) => {
    if (!held || game.faction !== 'xxcha' || typeof choices.planet !== 'string') return;
    readyPlanets(state, [choices.planet], warnings, 'component');
  },
};

export const ability: Hooked = {
  holder: 'self',
  permit: [{ code: 'readyNotControlled', rule: 'Exhaust this card to ready any planet' }],
};
