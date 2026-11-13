/**
 * Minister of Antiquities (directive): "The elected player gains 1 relic."
 *
 * Decided: hint. The relic is drawn at random; the player enters it among what the agenda entry gains, which the
 * plan already counts. Nothing is validated.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:minister_antiquities';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
