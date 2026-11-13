/**
 * Sarween Tools: "When 1 or more of your units use PRODUCTION, reduce the combined cost of the produced units by 1."
 *
 * Pass 2 makes it a `passive` `modify` of a new point, the combined cost of a production (-1, never below 0), asked
 * where a production that uses PRODUCTION is paid. Not `unitCost`, which is per unit. Ruling: no reduction when no
 * unit uses its Production ability (Integrated Economy). Today a hint.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:st';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  modify: { productionCost: value => Math.max(0, value - 1) },
};
