/**
 * Sever (Crimson Rebellion, promissory note): "ACTION: place this card face up in your play area, and place the sever
 * token in a system that contains your units, wormholes in that system have no effect during movement. Remove the
 * sever token and return this card to the Rebellion player at end of the status phase."
 *
 * Decided: a reminder of movement. The note lifts no check: it adds a restriction to the movement of every player
 * (a wormhole of the severed system joins nothing), and the foundation of effects only lifts checks or changes the
 * numbers of a player's own count. Besides, a step between two systems that are not joined is entered today as a jump
 * and not warned of (src/domain/movement.ts), so a severed wormhole would have no check to fall under. The note is not
 * returned by the replay either: its text returns it at the end of the status phase, not "Then" after it is resolved.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:sever';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['movement'] };
