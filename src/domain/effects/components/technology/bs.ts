/**
 * Bio-Stims: "You may exhaust this card at the end of your turn to ready 1 of your planets that has a technology
 * specialty or 1 of your other technologies."
 *
 * A hint today. Named in an entry's `uses` the card is already exhausted by the replay. Readying the planet or the
 * technology is a board change with a choice: a `play` once an entry can carry the choices of a component it uses
 * (see the test.todo).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:bs';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['round'] };
