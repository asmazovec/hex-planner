/**
 * Dame Briar, Bastion Valiant (Last Bastion, agent): "When a player's unit is destroyed: You may exhaust this card to
 * galvanize another of that player's units in the destroyed unit's system."
 *
 * A hint: units are destroyed in combat (or by abilities the plan does not roll), and a galvanize token only adds dice.
 * Exhausting the agent is the common play of a leader named in `uses`; nothing of its own is counted or lifted.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:bastionagent';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
