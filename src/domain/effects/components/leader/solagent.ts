/**
 * Evelyn DeLouis (Federation of Sol, agent): "At the start of a ground combat round: You may exhaust this card to
 * choose 1 ground force in the active system: that ground force rolls 1 additional die during this combat round."
 *
 * A hint: one more die in a ground combat round. The plan rolls no dice, so nothing is counted or validated; the reminder
 * stands in the block of the invasion, where ground combat is fought.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:solagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
