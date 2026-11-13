/**
 * Ancient Burial Sites (action card, base game; agenda phase, "At the start of the agenda phase"): "Choose 1 player.
 * Exhaust each cultural planet owned by that player."
 *
 * A hint: the planets it exhausts are those a player would vote with, and the agenda phase readies every planet at its
 * end (LRR 8.4), so nothing the plan counts in the next round changes. The agenda phase has no step of its own, so the
 * card keeps the steps of its data: none.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:abs';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
