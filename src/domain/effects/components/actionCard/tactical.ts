/**
 * Tactical Bombardment (action card, Action): "Choose 1 system that contains 1 or more of your units that have
 * BOMBARDMENT. Exhaust each planet controlled by other players in that system."
 *
 * A `play` of a component action with the choice `systemId`: every planet of other players in that system is
 * exhausted. The card's own condition (a unit of mine with BOMBARDMENT in the system) is warned of when it is not met.
 */
import type { ComponentEffect } from '../../types';
import { planetsOf } from '../../../replay/board';
import { unitIds } from '../../../replay/state';
import { exhaust, hasBombardment, rivalStateOf, unmet } from '../../helpers/cardPlay';

export const id = 'actionCard:tactical';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'systemId', kind: 'system' }],
  play: turn => {
    if (turn.choices.systemId === undefined) return;
    const slot = String(turn.choices.systemId);
    if (!unitIds(turn.state.systems[slot] ?? {}).some(unit => hasBombardment(turn, turn.state, unit))) unmet(turn);
    for (const planetId of planetsOf(turn.game, slot, turn.pack)) {
      const owner = rivalStateOf(turn, planetId);
      if (owner) exhaust(owner, planetId);
    }
  },
};
