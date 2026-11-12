/**
 * Devour (Vuil'raith Cabal): "Capture your opponent's non-structure units that are destroyed during combat."
 *
 * Decided: hint. Captured units are not counted by the plan and the losses of other players are not in an action.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:devour';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
