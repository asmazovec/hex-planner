/**
 * Acamar (Empyrean, agent):
 * After a player moves ships into a system that does not contain any planets: You may exhaust this card: that
 * player gains 1 command token.
 *
 * A play, red in pass 1: named in `uses` of a tactical action that moves ships into a system without planets, the
 * agent is exhausted (already) and the mover gains 1 command token (pass 2, with the pool chosen).
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:empyreanagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['movement'] };
