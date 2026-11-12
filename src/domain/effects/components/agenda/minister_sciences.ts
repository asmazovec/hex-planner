/**
 * Minister of Sciences (agenda): "The elected player gains this card. When the owner of this card resolves the
 * primary or secondary ability of the "Technology" strategy card, they do not need to spend resources to research
 * technology."
 *
 * A waiver: the resources Technology costs (91.2/91.3) are not owed by the owner, so a shortfall on a Technology
 * entry is lifted. Only Technology, only resources; the law is the elected player's only.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:minister_sciences';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
