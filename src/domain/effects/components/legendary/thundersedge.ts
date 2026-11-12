/**
 * Jupiter Brain (Thunder's Edge, Thunder's Edge): "Gain your breakthrough when you gain this card if you do not
 * already have it. You may exhaust this card at the end of your turn to perform another action."
 *
 * Pass 1: a hint. To become an effect on the change of control: the entry that gains Thunder's Edge gives the player
 * their breakthrough, unless they hold it already. The other action stays a hint: the plan does not count the actions
 * of a turn, so there is nothing to lift; the replay already exhausts the card.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:thundersedge';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
