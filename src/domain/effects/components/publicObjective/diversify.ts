/**
 * Diversify Research (public objective, stage I): "Own 2 technologies in each of 2 colors."
 *
 * Decided: play with a new check. A status entry that scores it is checked against its requirement (61.5, 81.1):
 * own 2 technologies in each of 2 colours. Scoring it without the requirement is warned of (a new code, objectiveUnmet). Pass 1 keeps it a hint; the
 * tests mark what it must do.
 */
import type { TechType } from '../../../types';
import '../../points/status';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:diversify';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  // Unit upgrades are of no colour (LRR 90.7.2): only coloured technologies count; "2 in each of 2 colors" is two colours with two each.
requirement: ({ pack, my }) => {
    const counts: Partial<Record<TechType, number>> = {};
    for (const held of my.cards('technology')) {
      const tech = pack.technologies[held.id.replace(/^technology:/, '')];
      if (tech?.type && !tech.upgrade) counts[tech.type] = (counts[tech.type] ?? 0) + 1;
    }
    return { have: Object.values(counts).filter(count => count >= 2).length, need: 2 };
  },
  holder: 'self',
};
