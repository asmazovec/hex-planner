/**
 * Seize Artifact (action card, Prophecy of Kings): "ACTION: Choose 1 of your neighbors that has 1 or more relic
 * fragments. That player must give you 1 relic fragment of your choice."
 *
 * A hint: the text is shown in the block of its step (component, from the card's window), and nothing is counted or
 * lifted. A relic fragment is an exploration card, and no player's holdings keep exploration cards (as LRR 94.3 is
 * tested: relic fragments in a transaction are not modelled), so there is nothing to move from the neighbour to me.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:seize';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
