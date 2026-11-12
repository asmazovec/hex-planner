/**
 * Wormhole Generator (Ghosts of Creuss, technology): "ACTION: Exhaust this card to place or move a Creuss wormhole
 * token into either a system that contains a planet you control or a non-home system that does not contain another
 * player's ships."
 *
 * Pass 1: a hint. Decided: `play`. A component action (choices.token, choices.systemId) places or moves a Creuss wormhole
 * token, into a system with a planet the player controls or a non-home system without other players' ships, else warned
 * of; the replay already exhausts the card ("Exhaust this card").
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:wg';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
