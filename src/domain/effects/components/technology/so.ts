/**
 * Salvage Operations (Mentak Coalition, faction technology): "After you win or lose a space combat, gain 1 trade
 * good; if you won the combat, you may also produce 1 ship in that system of any ship type that was destroyed during
 * the combat."
 *
 * Decided: a hint at the space combat: who wins and what was destroyed are outcomes the plan does not simulate; the
 * trade good and the ship are entered by hand.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:so';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
