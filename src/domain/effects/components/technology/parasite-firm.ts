/**
 * Neural Parasite (The Firmament, technology): "At the start of the status phase, you may place 1 infantry from your
 * reinforcements on a planet you control in your home system. Flip this card if the Obsidian faction is in play."
 *
 * A hint in the status phase. The infantry is optional and its planet is the player's choice; the status entry has no
 * place for it, so the player enters it by hand (an adjustment of the status phase). Nothing is checked, so nothing is
 * lifted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:parasite-firm';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['status'] };
