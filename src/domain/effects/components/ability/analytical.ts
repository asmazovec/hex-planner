/**
 * Analytical (Universities of Jol-Nar, faction ability): "When you research a technology that is not a unit upgrade
 * technology: You may ignore 1 prerequisite."
 *
 * Decided: a passive `modify` of the point `prerequisites` (the prerequisites a technology still lacks): one fewer for a
 * technology that is not a unit upgrade. The plan checks no prerequisites yet (LRR 90.12, todo in the rules tests):
 * pass 2 adds the check for everyone (`prerequisitesMissing`, 90.12 / 90.8.1, step card) and asks the point there.
 * A technology that lacks two is still warned of, and so is a unit upgrade that lacks one.
 *
 * Pass 1: a hint, as the guide asks; the modify is written in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:analytical';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
