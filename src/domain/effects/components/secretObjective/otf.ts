/**
 * Occupy the Fringe (secret objective, Prophecy of Kings): "Have 9 or more ground forces on a planet that does not
 * contain 1 of your space docks."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: nine ground
 * forces (infantry and mechs) on one planet without a space dock of the player. Scoring it while the board does not meet
 * it breaks LRR 61.5 and is warned of with the common code `objectiveUnmet` that pass 2 adds; the warning forbids
 * nothing. Until then the card is the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:otf';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
