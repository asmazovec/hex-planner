/**
 * Watchful Ojz (Ral Nel Consortium, commander): "When you declare a retreat: Immediately retreat up to 2 of your ships
 * from the active system to an adjacent system that does not contain another player's ships. Place a command token
 * from your reinforcements into that system."
 *
 * Decided: a reminder of combat. Retreats are part of a combat the plan does not simulate; the losses of a battle are
 * entered by hand and the ships that leave it are not an entry the plan has.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:ralnelcommander';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
