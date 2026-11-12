/**
 * Quantum Entanglement (Ghosts of Creuss, ability): "You treat all systems that contain either an alpha or beta
 * wormhole as adjacent to each other. Game effects cannot prevent you from using this ability."
 *
 * Pass 1: a hint. Decided: a change of the route graph for the Creuss player (alpha and beta systems adjacent): the reach
 * the plan lights. No warning changes: a step between systems that are not joined is a jump the plan already allows.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:quantum_entanglement';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
