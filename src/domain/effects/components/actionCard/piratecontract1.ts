/**
 * Pirate Contract (action card, Thunder's Edge): "Place 1 neutral destroyer in a non-home system that contains no
 * non-neutral ships."
 *
 * A hint: the plan does not count neutral units (no state holds them), so there is nothing to place or to check. The
 * card is played as a component action; its reminder stands in that block (the data's window "Action").
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:piratecontract1';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
