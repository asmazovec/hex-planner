/**
 * Mechanize the Military (secret objective, Prophecy of Kings): "Have 1 mech on each of 4 planets."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: four planets
 * with a mech of the player on each (`ground`). Scoring it while the board does not meet it breaks LRR 61.5 and is
 * warned of with the common code `objectiveUnmet` that pass 2 adds; the warning forbids nothing. Until then the card is
 * the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:mtm';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
