/**
 * Magen Defense Grid (technology, base game): "You may exhaust this card at the start of a round of ground combat on a
 * planet that contains 1 or more of your units that have PLANETARY SHIELD; your opponent cannot make combat rolls
 * this combat round."
 *
 * A hint: it takes away the opponent's combat rolls, and the plan rolls no dice; ground combat is fought in the
 * invasion step, so the reminder stands there.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:md_base';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
