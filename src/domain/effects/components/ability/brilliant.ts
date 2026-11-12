/**
 * Brilliant (Universities of Jol-Nar, faction ability): "When you spend a command token to resolve the secondary ability
 * of the "Technology" strategy card: You may resolve the primary ability instead."
 *
 * Decided: a passive `modify` of the Technology card's numbers. The secondary (91: one technology for 4 resources) is
 * resolved as the primary (one technology free, a second for 6), so the limit of the research becomes 2 and its cost
 * that of the primary; the strategy token of the secondary is still spent. The primary is never worse, so the plan
 * takes it whenever Brilliant is in force. Nothing is listed as waived: a third technology is warned of against the
 * limit of 2. The point is `researchAsPrimary` of the research base.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:brilliant';

export const effect: ComponentEffect = { tier: 'passive', rule: id, modify: { researchAsPrimary: () => 1 } };
