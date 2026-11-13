/**
 * Starlancer (Mahact, mech):
 * After a player whose command token is in your fleet pool activates this system, you may spend their token from
 * your fleet pool to end their turn; they gain that token.
 *
 * A hint: it ends another player's turn in that player's turn, and the tokens in the fleet pool are not tracked by owner.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:mahact_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['activation'] };
