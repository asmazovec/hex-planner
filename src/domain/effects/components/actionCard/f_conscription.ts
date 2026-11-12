/**
 * Fighter Conscription (action card, Action): "Place 1 fighter from your reinforcements in each system that contains
 * 1 or more of your space docks or units that have capacity. They cannot be placed in systems that contain other
 * players' ships."
 *
 * A `play` of a component action without choices: one fighter in each system with my space dock or my unit that has
 * capacity, none where other players have ships. A fighter may be placed beyond the capacity (note 2): the capacity
 * warning of the system is made and stands, since the player must then remove one.
 */
import type { ComponentEffect } from '../../types';
import { unitIds } from '../../../replay/state';
import { carries, othersShipsIn, place, slotOfPlanet } from '../../helpers/cardPlay';

export const id = 'actionCard:f_conscription';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => {
    const slots = new Set<string>();
    for (const [slot, units] of Object.entries(turn.state.systems)) {
      if (unitIds(units).some(unit => carries(turn, turn.state, unit))) slots.add(slot);
    }
    for (const planetId of turn.state.docks) {
      const slot = slotOfPlanet(turn, planetId);
      if (slot !== undefined) slots.add(slot);
    }
    for (const slot of slots) {
      if (!othersShipsIn(turn, slot)) place(turn, slot, { fighter: 1 });
    }
  },
};
