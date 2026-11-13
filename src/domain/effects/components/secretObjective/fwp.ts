/**
 * Fight with Precision (secret objective, Prophecy of Kings): "Destroy the last of a player's fighters in the active
 * system during the anti-fighter barrage step."
 *
 * A hint: the requirement is met by dice in a combat, which the plan does not simulate; the card is scored in the
 * Anti-Fighter Barrage step (objectives notes, Fight with Precision 2), so it stands in the combat block.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'secretObjective:fwp';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
