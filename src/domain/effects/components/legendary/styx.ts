/**
 * A Song Like Marrow (Styx, Thunder's Edge): "When you gain this card, gain 1 victory point. When you lose this card,
 * lose 1 victory point."
 *
 * Pass 1: a hint. To become an effect on the change of control: the entry that gains Styx gives 1 victory point, the
 * one that loses it takes 1 away. Not a `modify` of `vp`: a game that begins with Styx already counts its point in the
 * score entered by hand, so only a gain or a loss within the plan may change the score.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:styx';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
