/**
 * Sh'val, Harbinger (Sardakk N'orr, hero): "After you move ships into the active system: You may skip directly to the
 * "Commit Ground Forces" step. If you do, after you commit ground forces to land on planets, purge this card and return
 * each of your ships in the active system to your reinforcements."
 *
 * Decided: `play`. Named in the `uses` of a tactical action (the replay purges a hero used), after the landing each of
 * the player's ships in the active system goes back to reinforcements. What is skipped (space cannon offense, space
 * combat, bombardment) is combat, which the plan does not simulate; the battle's `losses` should be left empty.
 *
 * Pass 1: a hint, as the guide asks; the play is written in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:sardakkhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
