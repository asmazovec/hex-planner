/**
 * Ggrocuto Rinn (Xxcha, agent): "ACTION: Exhaust this card to ready any planet; if that planet is in a system that is
 * adjacent to a planet you control, you may remove 1 infantry from that planet and return it to its reinforcements."
 *
 * Decided: `play` with a waiver. Its component action names the planet (`choices.planet`) and readies it; "any planet"
 * lifts the rule that an effect readies only the player's own planets (`readyNotControlled`, 71 note 3). The infantry
 * removed belongs to another player and is not modelled.
 */
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';
import { planet } from '../../../../game/abilities/emit';
import { violation } from '../../../rules/registry';

export const id = 'leader:xxchaagent';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const planetId = ctx.choices.planet;
    if (!ctx.held || ctx.my.faction !== 'xxcha' || typeof planetId !== 'string') return [];
    const mine = ctx.my.planets().find(each => each.id === planetId);
    // Only a planet I control is readied (71 note 3).
    if (mine === undefined) ctx.warn(violation('readyNotControlled', { planetId }, 'component'));
    return mine?.exhausted ? [planet.ready(ctx.holder, planetId)] : [];
  },
  permit: [{ code: 'readyNotControlled', rule: 'Exhaust this card to ready any planet' }],
};
