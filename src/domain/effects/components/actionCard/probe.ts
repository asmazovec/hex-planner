/**
 * Exploration Probe (action card, Prophecy of Kings): "ACTION: Explore a frontier token that is in or adjacent to a
 * system that contains 1 or more of your ships."
 *
 * A hint: the text is shown in the block of its step (component, from the card's window), and nothing is counted or
 * lifted. The plan does not replay exploration: frontier tokens are not on its board and the exploration card drawn
 * is no holding of a player (LRR 35, 38; a relic fragment is an exploration card). What the exploration gives (a
 * relic, trade goods) is entered in «Gained and discarded» by hand.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:probe';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
