/**
 * Scanlink Drone Network: "When you activate a system, you may explore 1 planet in that system which contains 1 or more
 * of your units."
 *
 * A hint at the activation: the plan holds no exploration decks; what an exploration brings is entered by hand.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:sdn';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['activation'] };
