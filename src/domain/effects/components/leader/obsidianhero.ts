/**
 * Sharsiss Hollow (The Obsidian, hero): "ACTION: Ready all of your planets. Then, purge this card."
 *
 * Decided: a `play` effect. The component action readies every planet the player controls (`readyPlanets` of the
 * payment step, LRR 71 note 3: only planets they control), so a planet spent earlier in the round pays again without
 * the `planetExhausted` warning. Nothing is waived: the planets are ready, so no warning is made. The purge is what
 * the replay already does when a hero is played.
 *
 */
import { planet } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:obsidianhero';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => ctx.my.planets().filter(each => each.exhausted).map(each => planet.ready(ctx.holder, each.id)),
};
