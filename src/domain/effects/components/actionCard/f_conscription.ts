/**
 * Fighter Conscription (action card, Action): "Place 1 fighter from your reinforcements in each system that contains
 * 1 or more of your space docks or units that have capacity. They cannot be placed in systems that contain other
 * players' ships."
 *
 * A `play` of a component action without choices: one fighter in each system with my space dock or my unit that has
 * capacity, none where other players have ships. A fighter may be placed beyond the capacity (note 2): the capacity
 * warning of the system is made and stands, since the player must then remove one.
 */
import type { GameEvent, Ability } from '../../../../game/abilities/types';
import { unitIds } from '../../../replay/state';
import { carriesBy, othersHaveShips, placeIn } from '../../helpers/cardPlay';

export const id = 'actionCard:f_conscription';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    const slots = new Set<string>();
    for (const slot of Object.keys(ctx.board.systems)) {
      if (unitIds(ctx.my.unitsIn(slot)).some(unit => carriesBy(ctx, unit))) slots.add(slot);
    }
    for (const { planet, structures } of ctx.my.structures()) {
      const slot = ctx.systemOf(planet);
      if ((structures.spacedock ?? 0) > 0 && slot !== undefined) slots.add(slot);
    }
    const events: GameEvent[] = [];
    for (const slot of slots) {
      if (!othersHaveShips(ctx, slot)) placeIn(ctx, events, slot, { fighter: 1 });
    }
    return events;
  },
};
