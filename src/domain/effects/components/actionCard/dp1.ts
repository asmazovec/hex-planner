/**
 * Diplomatic Pressure (action card, agenda phase, 4 copies). "When an agenda is revealed: Choose another player. That
 * player must give you 1 promissory note from their hand."
 *
 * Decided: a hint with no step. The target chooses the note (ruling 1), so the plan cannot know it; the player enters
 * the note received in «Взято» of an agenda-phase entry. The gift is not a transaction (ruling 2), so no transaction
 * check (neighbours, once per player) is involved and none needs lifting.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:dp1';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
