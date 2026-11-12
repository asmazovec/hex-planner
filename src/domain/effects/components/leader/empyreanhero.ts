/**
 * Conservator Procyon, Multiverse Shift (Empyrean, hero):
 * ACTION: Place 1 frontier token in each system that does not contain any planets and does not already have a
 * frontier token. Then, explore each frontier token that is in a system that contains 1 or more of your ships.
 * Then, purge this card.
 *
 * A hint: frontier tokens and exploration are not tracked by the plan; the replay already purges the hero when it is
 * played.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:empyreanhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
