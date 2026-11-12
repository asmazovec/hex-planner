/**
 * Seize an Icon (secret objective, Prophecy of Kings): "Control a legendary planet."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: a planet with
 * a legendary ability (`PlanetDef.legendary`) the player controls. Scoring it while the board does not meet it breaks
 * LRR 61.5 and is warned of with the common code `objectiveUnmet` that pass 2 adds; the warning forbids nothing. Until
 * then the card is the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:sai';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
