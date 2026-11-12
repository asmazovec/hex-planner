/**
 * Unrelenting (Sardakk N'orr, faction ability): "Apply +1 to the result of each of your unit's combat rolls."
 *
 * A hint in the blocks of the battle in space and of the invasion. The ability changes combat rolls only, and the plan
 * rolls no dice. (A `hintAt` on an ability is kept by the registry but not shown yet: a known limit of the foundation.)
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:unrelenting';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
