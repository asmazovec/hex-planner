/**
 * Pirate Fleet (action card, Thunder's Edge): "ACTION: Spend 3 resources to place 1 neutral carrier, 1 neutral
 * cruiser, 1 neutral destroyer, and 2 neutral fighters in a non-home system that contains no non-neutral ships."
 *
 * A hint: the text is shown in the block of its step (component, from the card's window), and nothing is counted or
 * lifted. Neutral units are not modelled (no neutral player on the board), and a component action has no payment of
 * resources yet, so neither the cost nor the ships can be counted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:piratefleet';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
