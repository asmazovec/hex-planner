/**
 * "ACTION: Place this card faceup in your play area and gain 1 non-faction, non-unit upgrade technology that the
 * Deepwrought player owns; place that technology on this card. Return that technology to the deck and this card to
 * the Deepwrought player at the end of the status phase."
 *
 * Pass 1: a hint. Pass 2: play, as a component action with the choice `technology`: the player gains that
 * technology until the end of the status phase, when it goes back with the note to the Deepwrought player.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:shareknowledge';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
