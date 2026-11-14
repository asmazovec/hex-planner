/**
 * ZS Thunderbolt M2 (Federation of Sol, mech): "DEPLOY: After you use your Orbital Drop faction ability, you may
 * spend 3 resources to place 1 mech on that planet."
 *
 * Pass 1: a hint. Decided: `play`, named in `uses` of the Orbital Drop entry: 1 mech from reinforcements on the planet of
 * the drop (choices.planet); the reinforcements of mechs are limited (30.2). The 3 resources are not paid by a component
 * entry, which has no payment yet.
 */
import { placeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'mech:sol_mech';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // The 3 resources are the cost of this use, paid with the payment of the Orbital Drop entry.
  useCost: entry => (entry.type === 'component' && entry.componentId === 'ability:orbital_drop' ? { kind: 'resources', amount: 3 } : undefined),
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    // The deploy follows the use of Orbital Drop: the entry is that component action, and the planet is its choice.
    const entry = ctx.entry;
    if (ctx.my.faction !== 'sol' || entry?.type !== 'component' || entry.componentId !== 'ability:orbital_drop') return [];
    const planet = entry.choices?.planet;
    if (typeof planet !== 'string') return [];
    ctx.unitLimit({ mech: 1 }, 'component').forEach(ctx.warn);
    // Orbital Drop warned already if the planet is not the player's; the mech stands there all the same.
    return [placeUnits(ctx.holder, { planet }, { mech: 1 })];
  },
};
