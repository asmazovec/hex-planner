/**
 * Upgrade (action card, After you activate a system that contains 1 or more of your ships): "Replace 1 of your
 * cruisers in that system with 1 dreadnought from your reinforcements."
 *
 * A `play` of a card used beside my tactical action (`uses`), run at the activation (`playAt`), before any movement:
 * one of my cruisers in the active system, there when it was activated, is replaced by a dreadnought. A missing
 * cruiser is reported as any missing unit (`unitsMissing`). The dreadnought is placed, not produced.
 */
import { placeUnits, removeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { missingUnits } from '../../../replay/state';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:upgrade';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  playAt: 'activation',
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (ctx.entry?.type !== 'tactical' || ctx.entry.systemId === null) return [];
    const slot = ctx.entry.systemId;
    const here = ctx.my.unitsIn(slot);
    missingUnits({ [slot]: here }, slot, { cruiser: 1 }, 'activation').forEach(ctx.warn);
    return (here.cruiser ?? 0) > 0 ? [removeUnits(ctx.holder, { slot }, { cruiser: 1 }), placeUnits(ctx.holder, { slot }, { dreadnought: 1 })] : [];
  },
};
