/**
 * Gravleash Maneuvers (Barony of Letnev, breakthrough, Thunder's Edge): "Before you roll dice during space combat,
 * apply +X to the results of 1 of your ship's rolls, where X is the number of ship types you have in the combat.
 * During movement, your non-fighter ships' move values are equal to the highest move value amongst moving ships in
 * the system they started in."
 *
 * Decided (pass 2 to build): a `modify` of the move value. The second sentence changes the number the route check
 * (`speedShort`, 58.2) compares the route with, so a slow ship moving with a fast one from the same system is not
 * warned of at all; the warning would name another number with the breakthrough in force, which makes it a modify
 * and not a waiver. The `speed` point does not know the companions of a ship yet (see the report). The first
 * sentence is a roll of dice: a hint of the combat.
 *
 */
import type { Ability } from '../../../../game/abilities/types';
import { fastestOfGroup } from '../../helpers/movement';

export const id = 'breakthrough:letnevbt';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  // Non-fighter ships only: a fighter has no move value of its own to lift and a unit of 0 does not fly.
  modify: { speed: (value, ctx) => (value > 0 && ctx.unit !== 'fighter' ? Math.max(value, fastestOfGroup(ctx)) : value) },
};
