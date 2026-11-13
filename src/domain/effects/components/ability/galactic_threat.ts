/**
 * Galactic Threat (Nekro Virus): "You cannot vote on agendas. Once per agenda phase, after an agenda is revealed: You
 * may predict aloud the outcome of that agenda. If your prediction is correct, gain 1 technology that is owned by a
 * player who voted how you predicted."
 *
 * A hint with no step: the plan holds no votes and no agenda outcome. The technology gained is entered as a gain.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:galactic_threat';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
