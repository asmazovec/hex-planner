/**
 * Psychoarchaeology: "You can use technology specialties on planets you control without exhausting them, even if those
 * planets are exhausted. During the action phase, you can exhaust planets you control that have technology specialties
 * to gain 1 trade good."
 *
 * A hint today. The first sentence speaks of prerequisites, which research does not check (the point `prerequisites`
 * is not asked anywhere), so there is nothing to lift. The second is a board change (a planet exhausted, a trade good
 * gained) done outside any action, with a choice of planets: a `play` once an entry can carry the choices of a
 * component it uses (see the test.todo).
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:pa';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['card', 'round'] };
