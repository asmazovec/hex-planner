/**
 * Letani Warrior II (Arborec, infantry upgrade): "Cost 1(x2), Combat 7. PRODUCTION 2. After this unit is destroyed, roll
 * 1 die. If the result is 6 or greater, place the unit on this card. At the start of your next turn, place each unit
 * that is on this card on a planet you control in your home system."
 *
 * A unit upgrade: cost and combat are generated (`unitUpgrades.ts`). Pass 2: the Arborec infantry has PRODUCTION (1 at
 * level I, printed on the unit, 2 with this card), so a system with Letani Warriors on planets I control produces
 * without a space dock; the production check knows space docks only, so the infantry must become a producer with a
 * value (a `productionValue` asked for the infantry, which this file then raises from 1 to 2). The revival rests on a
 * die and is not counted.
 */
import '../../points/production';
import type { ComponentEffect } from '../../types';

export const id = 'technology:lw2';

/** The infantry's PRODUCTION: 1 printed on the Arborec sheet (the replay), 2 with this card; only the Arborec infantry has one. */
export const effect: ComponentEffect = {
  tier: 'passive',
  rule: '97.4',
  modify: { unitProduction: (value, ctx) => (ctx.unit === 'infantry' && value > 0 ? value + 1 : value) },
};
