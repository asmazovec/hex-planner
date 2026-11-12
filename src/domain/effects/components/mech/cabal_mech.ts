/**
 * Reanimator (Vuil'raith Cabal, mech): "When your infantry on this planet are destroyed, place them on your faction
 * sheet; those units are captured."
 *
 * Decided: hint. Ground combat losses are not rolled and captured units are not kept.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:cabal_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
