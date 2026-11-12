/**
 * Negotiate Trade Routes (public objective, stage I): "Spend 5 trade goods."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * spend 5 trade goods. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'publicObjective:trade_routes';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
