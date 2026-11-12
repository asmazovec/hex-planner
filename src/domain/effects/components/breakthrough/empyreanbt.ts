/**
 * Void Tether (Empyrean, breakthrough):
 * When you activate a system that contains or is adjacent to a unit or planet you control, you may place or move
 * 1 of your Void Tether tokens onto a border that system shares with another system; other players do not treat
 * those systems as adjacent to each other unless you allow it.
 *
 * A hint: Void Tether tokens are not tracked, and the adjacency they cut is other players', on their routes.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:empyreanbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['activation'] };
