/**
 * Elder Qanoj (Xxcha, commander): "When you vote: Each planet you exhaust to cast votes provides 1 additional vote.
 * TableFacts effects cannot prevent you from voting on an agenda."
 *
 * Decided: a hint with no step. Votes are not planned, so nothing is counted or validated.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:xxchacommander';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
