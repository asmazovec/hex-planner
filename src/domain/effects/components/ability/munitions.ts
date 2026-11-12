/**
 * Munitions Reserves (Barony of Letnev, ability): "At the start of each round of space combat: You may spend 2 trade
 * goods to re-roll any number of your dice during that combat round."
 *
 * A hint of the combat: the plan simulates no combat rounds and rolls no dice. The two trade goods are spent inside a
 * round of combat the plan does not replay; the player enters them as any other change of trade goods.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:munitions';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
