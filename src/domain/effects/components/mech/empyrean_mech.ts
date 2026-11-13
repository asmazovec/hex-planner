/**
 * Watcher (Empyrean, mech):
 * You may remove this unit from a system that contains or is adjacent to another player's units to cancel an
 * action card played by that player.
 *
 * A hint: cancelling another player's action card is not planned; the mech removed for it is taken off by hand.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:empyrean_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['component'] };
