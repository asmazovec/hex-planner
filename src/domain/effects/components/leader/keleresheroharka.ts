/**
 * "ACTION: Reveal cards from the action card deck until you reveal 3 action cards that have component actions.
 * Draw those cards and shuffle the rest back into the action card deck. Then, purge this card."
 *
 * Hint. The three cards drawn are not known in advance: the player enters them as gains of the component action.
 * Its purge is the common rule of heroes (51.12), already replayed.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:keleresheroharka';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['component'] };
