/**
 * Agnlan Oln (Universities of Jol-Nar, commander, Thunder's Edge): "After you roll dice for a unit ability: You may
 * reroll any of those dice."
 *
 * A hint in the blocks of the battle in space and of the invasion: unit abilities that roll dice are space cannon,
 * anti-fighter barrage and bombardment. The plan rolls no dice, so a reroll changes nothing it counts.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:jolnarcommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
