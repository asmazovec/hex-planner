/**
 * Develop Weaponry (public objective, stage I): "Own 2 unit upgrade technologies."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * own 2 unit upgrade technologies. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import '../../points/status';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:develop';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  // Two upgrades of the same unit count once (rulings).
  requirement: ({ pack, state }) => {
    const units = new Set<string>();
    for (const held of state.holdings.technologies) {
      const upgrade = pack.technologies[held.replace(/^technology:/, '')]?.upgrade;
      if (upgrade) units.add(upgrade);
    }
    return { have: units.size, need: 2 };
  },
  holder: 'self',
};
