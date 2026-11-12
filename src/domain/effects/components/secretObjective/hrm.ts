/**
 * Hoard Raw Materials (secret objective, Prophecy of Kings): "Control planets that have a combined resource value of at
 * least 12."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: the printed
 * resources of the planets controlled, exhausted or not, trade goods aside (attachments count: objectives notes, Hoard
 * Raw Materials 1). Scoring it while the board does not meet it breaks LRR 61.5 and is warned of with the common code
 * `objectiveUnmet` that pass 2 adds; the warning forbids nothing. Until then the card is the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:hrm';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
