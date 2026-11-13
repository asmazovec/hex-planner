/**
 * Artuno the Betrayer (Nomad, agent): "When you gain trade goods from the supply: You may exhaust this card to place an
 * equal number of trade goods on this card. When this card readies, gain the trade goods on this card."
 *
 * A hint. Trade goods kept on a card are not a place the plan counts: the goods set aside and taken back at the Ready
 * Cards step are entered by hand. Exhausting the agent is what naming it in «Used» does already (51.4).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:nomadagentartuno';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
