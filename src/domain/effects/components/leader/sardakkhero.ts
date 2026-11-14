/**
 * Sh'val, Harbinger (Sardakk N'orr, hero): "After you move ships into the active system: You may skip directly to the
 * "Commit Ground Forces" step. If you do, after you commit ground forces to land on planets, purge this card and return
 * each of your ships in the active system to your reinforcements."
 *
 * Decided: `play`. Named in the `uses` of a tactical action (the replay purges a hero used), after the landing each of
 * the player's ships in the active system goes back to reinforcements. What is skipped (space cannon offense, space
 * combat, bombardment) is combat, which the plan does not simulate; the battle's `losses` should be left empty.

 */
import type { ComponentEffect } from '../../types';
import { removeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'leader:sardakkhero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const entry = ctx.entry;
    if (!ctx.held || entry?.type !== 'tactical' || entry.systemId === null) return [];
    // Every ship of mine in the active system returns to reinforcements; ground forces in the space area stay.
    const here = ctx.my.unitsIn(entry.systemId);
    const ships = Object.fromEntries(Object.entries(here).filter(([unit, count]) => (count ?? 0) > 0 && !ctx.pack.units[unit as keyof typeof ctx.pack.units]?.ground));
    return Object.keys(ships).length > 0 ? [removeUnits(ctx.holder, { slot: entry.systemId }, ships)] : [];
  },
};
