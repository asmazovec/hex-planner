/**
 * Sai Seravus (Ghosts of Creuss, commander): "After your ships move: For each ship that has a capacity value and
 * moved through 1 or more wormholes, you may place 1 fighter from your reinforcements with that ship if you have
 * unused capacity in the active system."
 *
 * Pass 1: a hint. Decided: `play`, named in `uses` of a tactical action: 1 fighter from reinforcements with each ship that
 * has capacity and moved through a wormhole, while the active system has unused capacity.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:ghostcommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
