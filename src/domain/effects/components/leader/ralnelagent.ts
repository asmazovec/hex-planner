/**
 * Kan Kip Rel (Ral Nel Consortium, agent): "ACTION: Exhaust this card and draw 2 action cards; give 1 of those cards to
 * another player."
 *
 * Decided: a reminder of the component action. The replay already exhausts an agent its action plays (51.4); the two
 * cards drawn are unknown until drawn, so the player enters the one kept in «Taken and discarded»; the one given away
 * (it must be one of the two drawn, Kan Kip Rel note 1) never reaches the player's hand, and the plan does not check it.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:ralnelagent';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['component'] };
