/**
 * The Nucleus (Avernus, Thunder's Edge): "ACTION: Exhaust this card to use the Embers of Muaat's **STAR FORGE** faction
 * ability without spending a command token."
 *
 * Pass 1: a hint. To become a `play` of its component action with the choices `unit` (`destroyer`, or `fighter` for
 * two) and `system`: it places them in a system with a war sun of the player and spends no strategy token; a system
 * without one is warned of (Muaat notes, Avernus 3: another player may use it only with a war sun on the board).
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:avernus';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
