/**
 * Amalgamation (Vuil'raith Cabal): "When you produce a unit: You may return 1 captured unit of that type to produce
 * that unit without spending resources."
 *
 * Decided: hint. The plan keeps no captured units, so it cannot tell what may be returned; a production paid this way
 * is short of resources and the player sees why in the reminder.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:amalgamation';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['production'] };
