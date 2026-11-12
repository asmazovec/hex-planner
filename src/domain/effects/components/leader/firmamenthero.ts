/**
 * Sharsiss (The Firmament, hero): "ACTION: Place 1 of your plot cards in play with any other player's control token on
 * it. Then, you may place any player's control token on 1 of your in-play plot cards; one plot cannot have two of the
 * same player's tokens. Then, purge this card."
 *
 * A hint for the component action. Plot cards and the control tokens on them are not tracked, so nothing is counted;
 * the purge of the hero is what the replay already does when a hero is played.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:firmamenthero';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
