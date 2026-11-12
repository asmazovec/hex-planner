/**
 * Political Secret (promissory note): "When an agenda is revealed: The <color> player cannot vote, play action cards,
 * or use faction abilities until after that agenda has been resolved. Then, return this card to the <color> player."
 *
 * A hint with no step: the agenda phase has no step in the plan, which counts no votes. Nothing is validated.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:<color>_ps';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
