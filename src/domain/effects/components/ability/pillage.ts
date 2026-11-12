/**
 * Pillage (Mentak Coalition, faction ability): "After 1 of your neighbors gains trade goods or resolves a
 * transaction: If they have 3 or more trade goods, you may take 1 of their trade goods or commodities."
 *
 * Decided: a hint at the transactions. Whether a neighbour has 3 trade goods and whether the Mentak take one is
 * another player's state and a choice; a trade good taken is entered by hand as a gain.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:pillage';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['transaction'] };
