/**
 * Scavenge (Clan of Saar, ability): "After you gain control of a planet: Gain 1 trade good."
 *
 * Decided (pass 2 to build): an automatic gain the plan counts. Every planet the Saar player gains control of brings
 * one trade good, one per planet (Saar, Scavenge note 1); a planet already theirs brings none. Neither a waiver nor a
 * number of an existing point: it needs a point asked where control is gained (see the report). Passive: the ability
 * is on the faction sheet and needs no mark in the entry.
 */
import type { ComponentEffect } from '../../types';
import '../../points/invasion';

export const id = 'ability:scavenge';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // The point is asked once for each planet newly gained (invasion base), so two planets bring two trade goods.
  modify: { tradeGoodsOnControl: value => value + 1 },
};
