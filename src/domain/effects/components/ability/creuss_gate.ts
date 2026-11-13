/**
 * Creuss Gate (Ghosts of Creuss, ability): "When you create the game board, place the Creuss Gate (tile 17) where
 * your home system would normally be placed. The Creuss Gate system is not a home system. Then, place your home
 * system (tile 51) in your play area."
 *
 * A hint: the setup is the map's own: the map builder places the gate, and the off-map home is a system joined by its
 * wormhole alone (`offMapHomes`). Nothing is left to count when a plan is replayed.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:creuss_gate';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
