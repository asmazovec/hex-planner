/**
 * Harrugh Gefhara, Galactic Securities Net (Emirates of Hacan, hero): "When 1 or more of your units use PRODUCTION:
 * You may reduce the cost of each of your units to 0 during this use of PRODUCTION. If you do, purge this card."
 *
 * Decided: `play`, named in the `uses` of the entry that produces (purged as every hero is): the units of that entry's
 * production cost 0, so no payment is owed and `shortResources` is not made. The production limit still stands
 * (Hacan note 1). It changes a number for one entry, which a `play` effect cannot do yet (`modify` is passive only).
 * Pass 1: still the hint it is today.
 */
import '../../points/production';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:hacanhero';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  // For the entry that names the hero: every unit of its production costs 0 (a hero is purged by the play, as every hero).
  modify: { unitCost: () => 0 },
  holder: 'self',
};
