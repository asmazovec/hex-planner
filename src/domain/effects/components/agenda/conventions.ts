/**
 * Conventions of War (agenda, law): "For: Players cannot use BOMBARDMENT against units that are on cultural planets.
 * Against: Each player that voted "Against" discards all of their action cards."
 *
 * A hint: Bombardment is a roll of dice in the invasion, which the plan does not simulate; the reminder stands in the
 * block of the landing. "Against" depends on the votes, which the plan does not count.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:conventions';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
