/**
 * Rearmament Agreement (directive): "For: Each player places 1 mech from their reinforcements on a planet they
 * control in their home system. Against: Each player replaces each of their mechs with 1 infantry from their
 * reinforcements."
 *
 * Decided: play. "For" places 1 mech on a planet of the home system the player controls; "Against" replaces each mech
 * with an infantry: both change the board the plan counts.
 */
import { placeUnits, removeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/events';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:rearmament';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (ctx.choices.outcome === 'for') {
      const planet = String(ctx.choices.planet ?? '');
      return planet ? [placeUnits(ctx.holder, { planet }, { mech: 1 })] : [];
    }
    if (ctx.choices.outcome !== 'against') return [];
    // Each mech of the holder, on a planet or in space, is replaced by an infantry.
    const events: GameEvent[] = [];
    const swap = (at: { planet: string } | { slot: string }, mech: number): void => {
      if (mech > 0) events.push(removeUnits(ctx.holder, at, { mech }), placeUnits(ctx.holder, at, { infantry: mech }));
    };
    for (const planet of Object.keys(ctx.board.planets)) swap({ planet }, ctx.my.unitsOn(planet).mech ?? 0);
    for (const slot of Object.keys(ctx.board.systems)) swap({ slot }, ctx.my.unitsIn(slot).mech ?? 0);
    return events;
  },
};
