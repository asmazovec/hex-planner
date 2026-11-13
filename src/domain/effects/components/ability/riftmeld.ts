/**
 * Riftmeld (Vuil'raith Cabal): "When you research a unit upgrade technology: You may return 1 captured unit of that
 * type to ignore all of the technology's prerequisites."
 *
 * Decided: hint. The plan keeps no captured units and does not check prerequisites yet.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:riftmeld';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['card'] };
