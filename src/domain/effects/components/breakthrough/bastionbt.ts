/**
 * The Icon (Last Bastion, breakthrough): "When you produce ships, you may exhaust this card to place those ships in a
 * system that contains 1 of your command tokens, at least 1 of your ground forces, and no other player's ships."
 *
 * Decided: a `play` with a waiver. LRR 68.2: "When a player produces ships by using Production that player must place
 * them in the active system." A tactical action that builds ships may name another system for them; the replay warns
 * of it for everyone (a new code, 68.2, step production). The Icon, named in «Used» of that action (and so exhausted),
 * lifts the warning when the system named holds my command token, at least one of my ground forces (on a planet or in
 * its space area) and no other player's ships. The ships stand there whether or not the warning is lifted.
 *
 * Pass 1: a hint as it is today; the field of the entry, the check and the placement are pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:bastionbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
