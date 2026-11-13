/**
 * Blood Ties (Winnu, faction ability): "You do not have to spend influence to remove the custodians token from Mecatol
 * Rex."
 *
 * Decided: a `passive` waiver. The first landing on Mecatol Rex warns `custodians` (54.1, 27.2) in the invasion step
 * while the six influence are not paid. It is lifted for the Winnu; the
 * token is still removed by the landing and the victory point still gained (27.3). Ruling (Winnu, Blood Ties 1): the
 * Winnu must still commit at least one ground force, which the landing is.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:blood_ties';

const RULE = 'You do not have to spend influence to remove the custodians token from Mecatol Rex';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [
    { code: 'custodians', rule: RULE },
  ],
};
