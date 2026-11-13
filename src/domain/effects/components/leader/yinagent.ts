/**
 * Brother Milor (Yin, agent): "After a player's unit is destroyed during combat: You may exhaust this card to
 * allow that player to place 2 fighters in the destroyed unit's system if it was a ship, or 2 infantry on its
 * planet if it was a ground force."
 *
 * A hint at combat: it answers a unit destroyed in combat, which the plan does not simulate; named in `uses` it is
 * exhausted as any agent.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:yinagent';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  hintAt: ['combat'],
};
