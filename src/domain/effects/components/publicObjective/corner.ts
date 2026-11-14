/**
 * Corner the Market (public objective, stage I): "Control 4 planets that each have the same planet trait."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * control 4 planets that share a trait. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import '../../points/status';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:corner';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ pack, my }) => {
    const traits: Record<string, number> = {};
    for (const planet of my.planets()) for (const trait of pack.planets[planet.id]?.traits ?? []) traits[trait] = (traits[trait] ?? 0) + 1;
    return { have: Math.max(0, ...Object.values(traits)), need: 4 };
  },
  holder: 'self',
};
