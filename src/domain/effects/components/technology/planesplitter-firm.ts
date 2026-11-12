/**
 * Planesplitter (The Firmament, technology): "When you gain this card, put The Fracture into play. Flip this card if the
 * Obsidian faction is in play."
 *
 * A hint for the research. The Fracture is opened on the board of the game (`game.fracture`), not by the replay of a
 * plan, so the plan cannot open it from an entry; if it is open already the card does nothing (Firmament, Planesplitter
 * note 1). No check is lifted.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:planesplitter-firm';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['card'] };
