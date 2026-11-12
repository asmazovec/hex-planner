/**
 * Terraform (Titans of Ul, promissory note): "ACTION: Attach this card to a non-home planet you control other than
 * Mecatol Rex. Its resource and influence values are each increased by 1, and it is treated as having all 3 planet
 * traits (cultural, hazardous, and industrial)."
 *
 * Decided: `play`. Played by a component action with the planet as its choice (`choices.planetId`), it attaches to that
 * planet (`GameState.attachments`), and from then on the planet is worth 1 more resource and 1 more influence wherever
 * a payment counts it. The traits are for exploration, which the plan does not count. Once played it is never returned
 * (Titans of Ul, Terraform note 1). Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:terraform';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
