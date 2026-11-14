/**
 * Discover Lost Outposts (public objective, stage I): "Control 2 planets that have attachments."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the controlled planets that have at least one attachment
 * (`shared.attachments`, the number of them is irrelevant); unmet is the warning objectiveUnmet (61.5.1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:lost_outposts';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ my }) => ({
    have: my.planets().filter(planet => planet.attached.length > 0).length,
    need: 2,
  }),
  holder: 'self',
};
