/**
 * Sharsiss Hollow (The Obsidian, hero): "ACTION: Ready all of your planets. Then, purge this card."
 *
 * Decided: a `play` effect. The component action readies every planet the player controls (`readyPlanets` of the
 * payment step, LRR 71 note 3: only planets they control), so a planet spent earlier in the round pays again without
 * the `planetExhausted` warning. Nothing is waived: the planets are ready, so no warning is made. The purge is what
 * the replay already does when a hero is played.
 *
 */
import { readyPlanets } from '../../../replay/payment';
import type { ComponentEffect } from '../../types';

export const id = 'leader:obsidianhero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ state, warnings }) => readyPlanets(state, state.exhausted.filter(planet => state.control[planet] === 'me'), warnings, 'component'),
};
