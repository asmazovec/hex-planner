/**
 * Divert Funding (action card). "ACTION: Return a non-unit upgrade, non-faction technology that you own to your
 * technology deck. Then, research another technology."
 *
 * Decided: a play effect of its component action, with the choices `returned` and `researched` (component ids). The
 * returned technology leaves the owner's holdings, the researched one joins them. Checked:
 *   - `returnedTechInvalid` (new code, the card's own rule): the returned technology is a unit upgrade, a faction
 *     technology, or not owned (ruling 1: the card needs one such technology to be played);
 *   - `researchOwned` (90.10): the researched technology is already owned, the returned one among them (ruling 4).
 * The prerequisites of the research (ruling 2, the returned technology not counting) are not checked anywhere in the
 * replay yet (the `prerequisites` point is not asked), so they are a todo here.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:divert_funding';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
