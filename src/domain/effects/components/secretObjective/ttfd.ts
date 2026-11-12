/**
 * Turn Their Fleets to Dust (secret objective, action phase): "Destroy the last of a player's non-fighter ships in the active system during the space cannon offense step."
 *
 * Decided: a hint of the combat step. The card lifts no rule and changes no number of the count: it is the
 * condition of one victory point (LRR 61.4), it is scored during the action phase around a battle in space (LRR
 * 61.5.2, 61.7; the space cannon steps belong to the block of the battle as the action card windows have them), so
 * its reminder stands in the block of the battle. Nothing is validated: the plan rolls no Space Cannon and does not
 * know which ships its dice destroy. Scoring stays the player's choice in the status entry (`scored`).
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:ttfd';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
