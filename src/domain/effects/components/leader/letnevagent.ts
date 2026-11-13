/**
 * Viscount Unlenn (Barony of Letnev, agent): "At the start of a space combat round: You may exhaust this card to choose
 * 1 ship in the active system: that ship rolls 1 additional die during this combat round."
 *
 * A hint of the combat: one more die is nothing the plan counts. Naming the agent in an entry's «Used» exhausts it,
 * as for any agent, so a second use in the round is warned of by the replay itself.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:letnevagent';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
