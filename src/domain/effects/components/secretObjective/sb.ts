/**
 * Strengthen Bonds (secret objective, Prophecy of Kings): "Have another player's promissory note in your play area."
 *
 * Decided: played when a status entry scores it (`scored`). The requirement is something the plan counts: a note of
 * another player held (`holdings.promissory`, its address not the player's own) whose text puts it in the play area
 * ("place it faceup in your play area": Support for the Throne, Alliance, Trade Convoys, ...; objectives notes,
 * Strengthen Bonds 1). A note kept in hand does not count. Scoring it while the board does not meet it breaks LRR 61.5
 * and is warned of with the common code `objectiveUnmet` that pass 2 adds; the warning forbids nothing. Until then the
 * card is the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'secretObjective:sb';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
