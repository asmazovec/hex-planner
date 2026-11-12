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

export const id = 'leader:keleresherokuuasi';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  playAt: 'combat',
  play: ({ entry, state }) => {
    if (entry.type !== 'tactical' || entry.systemId === null) return;
    const here = (state.systems[entry.systemId] ??= {});
    here.flagship = (here.flagship ?? 0) + 1;
  },
};
