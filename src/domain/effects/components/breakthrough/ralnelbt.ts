/**
 * Data Skimmer (Ral Nel Consortium, breakthrough): "During the action phase, if you have not passed, when other
 * players would discard action cards, they are placed on this card instead. When you pass, take 1 action card from
 * this card and discard the rest."
 *
 * Decided: a reminder of the round's flow (the pass). The cards other players discard are not known to the plan, and
 * the one taken when passing is entered by the player in «Taken and discarded» of the pass.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:ralnelbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['round'] };
