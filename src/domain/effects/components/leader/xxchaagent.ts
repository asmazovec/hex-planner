/**
 * Ggrocuto Rinn (Xxcha, agent): "ACTION: Exhaust this card to ready any planet; if that planet is in a system that is
 * adjacent to a planet you control, you may remove 1 infantry from that planet and return it to its reinforcements."
 *
 * Decided: `play` with a waiver. Its component action names the planet (`choices.planet`) and readies it; "any planet"
 * lifts the rule that an effect readies only the player's own planets (`readyNotControlled`, 71 note 3). The infantry
 * removed belongs to another player and is not modelled.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:xxchaagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
