/**
 * N'orr Supremacy (Sardakk N'orr, breakthrough, Thunder's Edge): "After you win a combat, either gain 1 command token or
 * research a unit upgrade technology."
 *
 * A hint in the blocks of the battle in space and of the invasion. Who wins a combat is not known to the plan (it
 * simulates no combat), so the choice cannot be made for the player: they enter the command token as an adjustment
 * and the unit upgrade in the `gains` of the entry. Nothing is lifted: the research must meet the prerequisites of the
 * unit upgrade (tirules2, Sardakk N'orr, N'orr Supremacy 1), a check the plan does not make yet for any research.
 * (A `hintAt` on a breakthrough is kept by the registry but not shown yet: a known limit of the foundation.)
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:sardakkbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
