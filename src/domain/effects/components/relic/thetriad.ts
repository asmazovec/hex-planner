/**
 * The Triad (relic, Thunder's Edge): "This card can be readied and spent as if it were a planet card. Its resource and
 * influence values are equal to 3 plus the number of different types of relic fragments you own."
 *
 * Decided: a waiver with a changed number. A payment names the planets it exhausts; one that is not a planet I control
 * is warned of (`planetNotControlled`, 34 note 2). The Triad held may stand in a payment as a planet card: the warning
 * is lifted for it, it pays 3 plus the types of relic fragments owned (the replay holds no fragments yet, so 3), it is
 * exhausted by paying and readied with the planets (81.6). Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:thetriad';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
