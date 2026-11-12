/**
 * Dark Whispers (Empyrean, ability):
 * During setup, take the additional Empyrean faction promissory note; you have 2 faction promissory notes
 *
 * A hint: the Empyrean player's two faction notes are already dealt at setup (`factionNotes`), so nothing is left to
 * count or check.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:dark_whispers';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
