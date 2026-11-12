/**
 * I48S (L1Z1X Mindnet, agent): "After a player activates a system: You may exhaust this card to allow that player to
 * replace 1 of their infantry in the active system with 1 mech from their reinforcements."
 *
 * Decided: a `play`. Named in the `uses` of a tactical action, the agent is exhausted (the replay does it) and one
 * infantry in the active system becomes a mech from reinforcements. Faction note 1: only an infantry that stood in
 * the system when it was activated. Pass 2 writes the replacement.
 *
 * Pass 2: `play` at `playAt: 'activation'` (right after the command token, before the move: an infantry that arrives
 * later is not eligible). The infantry of the active system's space area goes first, else one on a planet of it; none
 * there is `unitsMissing`. Reinforcements of mechs are not counted.
 */
import { planetsOf } from '../../../replay/board';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'leader:l1z1xagent';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  playAt: 'activation',
  play: ({ entry, game, pack, state, held, warnings }) => {
    if (!held || entry.type !== 'tactical' || entry.systemId === null) return;
    const swap = (units: Record<string, number | undefined>): boolean => {
      if ((units.infantry ?? 0) <= 0) return false;
      units.infantry = (units.infantry ?? 0) - 1;
      if (units.infantry === 0) delete units.infantry;
      units.mech = (units.mech ?? 0) + 1;
      return true;
    };
    const here = state.systems[entry.systemId] ??= {};
    if (swap(here)) return;
    for (const planetId of planetsOf(game, entry.systemId, pack)) if (swap(state.ground[planetId] ??= {})) return;
    warnings.push(violation('unitsMissing', { where: entry.systemId, unit: 'infantry', missing: 1 }));
  },
};
