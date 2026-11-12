/**
 * Adjudicator Ba'al, Nova Seed (Embers of Muaat, hero): "After you move a war sun into a non-home system other than
 * Mecatol Rex: You may destroy all other players' units in that system and replace that system tile with the Muaat
 * supernova tile. If you do, purge this card and each planet card that corresponds to the replaced system tile."
 *
 * Decided: `play`, named in the `uses` of the tactical action that moved the war sun (purged as every hero is). What
 * it does to the board, a tile replaced by a supernova and the other players' units destroyed, cannot be replayed:
 * the replay never changes the map. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:muaathero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
