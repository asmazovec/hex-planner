/**
 * Malevolency (The Obsidian, promissory note): "At the end of one of your tactical actions: Spend 1 influence to give
 * this card to one of your neighbors; you can use this ability even if you are the Obsidian player. At the end of the
 * status phase, if you are not the Obsidian player, you must remove 1 command token from your fleet pool and return it
 * to your reinforcements."
 *
 * Decided: `passive` while held, a change of the count: at the end of the status phase the holder who is not the
 * Obsidian loses one token of the fleet pool, so the next round's fleet pool check (37.1) runs against one ship fewer.
 * The giving away is a reminder: the note moves by a transaction of the turn and the influence is entered by hand.
 *
 * Still the hint it is today: the base has no hook at the end of the status phase for a component held (finishStatus in timeline.ts asks none), so its tests stay test.fails.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:malevolency';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
