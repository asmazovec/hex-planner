/**
 * Rin, the Master's Legacy (Universities of Jol-Nar, hero): "ACTION: For each non-unit upgrade technology you own, you
 * may replace that technology with any technology of the same color from the deck. Then, purge this card."
 *
 * A hint of the component action. The swap is entered on the hero's component action as it is for any component: the
 * technologies returned in `spends`, those taken from the deck in `gains`; the replay purges a hero when its action is
 * played. The new technologies need not meet prerequisites (tirules2, Jol-Nar, Genetic Memory 1), and the plan checks
 * none, so there is nothing to lift. "Of the same color" is the card's own limit on the player's choice, not a rule
 * the plan validates.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:jolnarhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
