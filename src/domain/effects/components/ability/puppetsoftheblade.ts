/**
 * Puppets of the Blade (The Firmament, ability): "If you have at least 1 plot card in your play area, gain the following
 * ability: ACTION: Purge The Firmament's faction sheet, leaders, planet cards, and promissory note. Then, gain all of the
 * faction components for The Obsidian."
 *
 * A hint for the component action. Plot cards are not tracked, and the plan cannot turn the faction of a game into
 * another one mid-plan (the faction is fixed when the game starts, its home system and sheet with it), so nothing is
 * counted or checked; the player enters the change of components by hand.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:puppetsoftheblade';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['component'] };
