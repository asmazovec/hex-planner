/**
 * "At the start of a round of of space combat in a system that contains a planet you control: Place your flagship
 * and up to a total of 2 cruisers and/or destroyers from your reinforcements in the active system. Then, purge
 * this card."
 *
 * Play, named in `uses` of a tactical action, run at the combat of the action (`playAt: 'combat'`): the flagship
 * comes from the reinforcements into the active system and counts against the fleet pool like any ship (the final
 * check of the action warns of it). The up to 2 cruisers and/or destroyers wait for a way to carry choices of a
 * component used beside the action (the test is a todo).
 */
import type { ComponentEffect } from '../../types';
import { placeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'leader:keleresherokuuasi';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  playAt: 'combat',
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => (ctx.entry?.type !== 'tactical' || ctx.entry.systemId === null ? [] : [placeUnits(ctx.holder, { slot: ctx.entry.systemId }, { flagship: 1 })]),
};
