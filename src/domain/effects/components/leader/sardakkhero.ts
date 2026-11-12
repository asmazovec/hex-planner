/**
 * Sh'val, Harbinger (Sardakk N'orr, hero): "After you move ships into the active system: You may skip directly to the
 * "Commit Ground Forces" step. If you do, after you commit ground forces to land on planets, purge this card and return
 * each of your ships in the active system to your reinforcements."
 *
 * Decided: `play`. Named in the `uses` of a tactical action (the replay purges a hero used), after the landing each of
 * the player's ships in the active system goes back to reinforcements. What is skipped (space cannon offense, space
 * combat, bombardment) is combat, which the plan does not simulate; the battle's `losses` should be left empty.

 */
import type { UnitId } from '../../../types';
import type { ComponentEffect } from '../../types';

export const id = 'leader:sardakkhero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ state, entry, held, pack }) => {
    if (!held || entry.type !== 'tactical' || entry.systemId === null) return;
    const here = state.systems[entry.systemId];
    if (!here) return;
    // Every ship of mine in the active system returns to reinforcements; ground forces in the space area stay.
    for (const unit of Object.keys(here) as UnitId[]) if (!pack.units[unit]?.ground) delete here[unit];
  },
};
