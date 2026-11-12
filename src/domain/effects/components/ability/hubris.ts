/**
 * Hubris (Mahact, ability):
 * During setup, purge your "Alliance" promissory note. Other players cannot give you their 'Alliance" promissory
 * note.
 *
 * Mixed, red in pass 1: the Mahact player begins without their own Alliance (setup), and receiving another player's
 * Alliance in a transaction is warned of. Both are restrictions, not waivers.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:hubris';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
