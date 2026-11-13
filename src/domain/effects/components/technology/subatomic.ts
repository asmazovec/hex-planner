/**
 * Subatomic Splicer (Crimson Rebellion, faction technology): "When one of your ships is destroyed, you may produce a
 * ship of the same type at a space dock in your home system."
 *
 * Decided: a reminder of combat, where ships are destroyed. The production it gives happens outside the production
 * step of a tactical action, at the moment of a loss, and the plan has no entry for it; the ship is still paid for
 * (Subatomic Splicer note 2) and cannot be produced into a home system under another player's ships in a space combat
 * (note 1), none of which the plan can check without that entry.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:subatomic';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
