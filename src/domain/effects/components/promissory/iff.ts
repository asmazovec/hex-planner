/**
 * Creuss IFF (Ghosts of Creuss, promissory note): "At the start of your turn during the action phase: Place or move a
 * Creuss wormhole token into either a system that contains a planet you control or a non-home system that does not
 * contain another player's ships. Then, return this card to the Creuss player."
 *
 * Pass 1: a hint. Decided: `play`. The holder plays it as a component entry (choices.token alpha or beta, choices.systemId):
 * the Creuss wormhole token is placed or moved there (a new part of the shared state), into a system with a planet the
 * holder controls or a non-home system without other players' ships, else warned of. The card goes back to the Creuss
 * player by the generic rule (69.3).
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:iff';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
