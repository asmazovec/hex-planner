/**
 * Research Agreement (Universities of Jol-Nar, promissory note): "After the Jol-Nar player researches a technology that
 * is not a faction technology: Gain that technology. Then, return this card to the Jol-Nar player."
 *
 * A hint in the block of the strategy card, where research is entered. The trigger is the Jol-Nar player's research,
 * which the plan does not replay for an opponent (their strategy cards are not planned), so the gain cannot be made
 * for the holder. The holder enters it: the note in `spends`, the technology in `gains`. Gaining ignores prerequisites
 * (90.5) and the return to the Jol-Nar player (69.3) is done by the replay for every note whose text says so; the
 * Jol-Nar player cannot play their own note (69.2, `ownPromissory`). Nothing else is checked.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:ra';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['card'] };
