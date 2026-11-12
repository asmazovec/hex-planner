/**
 * Plagiarize (action card). "ACTION: Spend 5 influence and choose a non-faction technology owned by 1 of your
 * neighbors. Gain that technology."
 *
 * Decided: a play effect of its component action, with the choices `technology` (the component id) and `from` (the
 * neighbour). The action pays 5 influence (`shortInfluence` when short; ruling 1: not playable with less than five
 * available) and the technology joins the owner's holdings with no prerequisite asked (ruling 2: gaining is not
 * researching). Two conditions of the text are checked, as new codes of the card's own rule:
 *   - `techNotFromNeighbor`: the chosen player is not a neighbour (LRR 60), or does not own the technology;
 *   - `factionTechCopied`: the technology is a faction technology.
 *
 * Pass 1: the hint it is today; the tests say what it must do. The component action has no payment yet.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:plagiarize';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
