/**
 * Tactical Bombardment (action card, Action): "Choose 1 system that contains 1 or more of your units that have
 * BOMBARDMENT. Exhaust each planet controlled by other players in that system."
 *
 * A `play` of a component action with the choice `systemId`: every planet of other players in that system is
 * exhausted. The card's own condition (a unit of mine with BOMBARDMENT in the system) is warned of when it is not met.
 */
import { planet } from '../../../../game/abilities/emit';
import type { GameEvent, Hooked } from '../../../../game/abilities/types';
import { unitIds } from '../../../replay/state';
import { bombardsBy, unmetBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:tactical';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'systemId', kind: 'system' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (ctx.choices.systemId === undefined) return [];
    const slot = String(ctx.choices.systemId);
    if (!unitIds(ctx.my.unitsIn(slot)).some(unit => bombardsBy(ctx, unit))) unmetBy(ctx);
    const events: GameEvent[] = [];
    for (const planetId of ctx.planetsIn(slot)) {
      const held = ctx.board.planets[planetId];
      if (held?.owner !== undefined && held.owner !== ctx.holder && !held.exhausted) events.push(planet.exhaust(held.owner, planetId));
    }
    return events;
  },
};
