/**
 * The Acropolis (Emelpar, Thunder's Edge): "You may exhaust this card at the end of your turn to ready another
 * component that isn't a strategy card."
 *
 * Pass 1: a hint. To become a `play`: named in the `uses` of an entry with the choice of the component to ready
 * (`ready`), it readies that component at the end of the entry (an agent unlocked, a card taken off `exhausted`, a
 * breakthrough held), never itself. The replay already exhausts the card ("exhaust this card").
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:emelpar';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
