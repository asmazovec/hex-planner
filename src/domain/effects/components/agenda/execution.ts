/**
 * Public Execution (agenda): "The elected player discards all of their action cards. If they have the speaker
 * token, they give it to the player on their left. The elected player cannot vote on any agendas during this agenda
 * phase."
 *
 * A hint. A directive of the agenda phase: the action cards discarded and the speaker token passed are entered by
 * the player.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:execution';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
