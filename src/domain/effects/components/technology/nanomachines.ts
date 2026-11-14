/**
 * Nanomachines (Ral Nel Consortium, faction technology): "ACTION: Exhaust this card to place 1 PDS on a planet you
 * control. ACTION: Exhaust this card to repair all of your damaged units. ACTION: Exhaust this card and discard 1 action
 * card to draw 1 action card."
 *
 * Decided: `play` for the first ability, a reminder for the other two. The component action names the technology and,
 * for the first ability, the planet in `choices.pds`; its `play` places the PDS there with the checks every placement of
 * a structure has (a planet the player controls, 24.2; two PDS on a planet, 85.5; the PDS in the reinforcements, 24.4).
 * Only one of the three is performed per exhaust (Ral Nel, Nanomachines note 1); the replay exhausts the card, since its
 * text says so. Damage is not counted by the plan, so the repair is a reminder; the discard and the draw are what the
 * player enters in «Taken and discarded».

 */
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'technology:nanomachines';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'pds', kind: 'planet', label: { ru: 'Планета для PDS', en: 'Planet for the PDS' } }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const planetId = ctx.choices.pds;
    return typeof planetId !== 'string' || planetId === '' ? [] : ctx.buildStructures([{ kind: 'pds', planetId }]);
  },
};
