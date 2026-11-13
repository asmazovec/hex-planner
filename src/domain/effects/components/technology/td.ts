/**
 * Transit Diodes: "You may exhaust this card at the start of your turn during the action phase; remove up to 4 of your
 * ground forces from the game board and place them on 1 or more planets you control."
 *
 * A hint today. Named in an entry's `uses` the card is already exhausted by the replay. Moving the ground forces is a
 * board change with choices (from where, to which planets): a `play` once an entry can carry the choices of a
 * component it uses (see the test.todo).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:td';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['round'] };
