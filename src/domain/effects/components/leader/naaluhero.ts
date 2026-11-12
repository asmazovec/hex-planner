/**
 * The Oracle (Naalu Collective, hero): "At the end of the status phase: You may force each other player to give you 1
 * promissory note from their hand. If you do, purge this card."
 *
 * A hint at the status phase: each other player chooses the note they give, so the plan cannot pick it; the notes
 * received are entered by the player. Named in `uses`, the hero is purged as every hero is (51.12).
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:naaluhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['status'] };
