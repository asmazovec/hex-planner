/**
 * Vortex (Vuil'raith Cabal): "ACTION: Exhaust this card to choose another player's non-structure unit in a system that
 * is adjacent to 1 or more of your space docks. Capture 1 unit of that type from that player's reinforcements."
 *
 * Decided: hint. Captured units and other players' reinforcements are not counted; the replay already exhausts the
 * card when its action is played.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:vtx';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['component'] };
