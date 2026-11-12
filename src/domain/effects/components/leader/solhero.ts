/**
 * Jace X, 4th Air Legion, Helio Command Array (Federation of Sol, hero): "ACTION: Remove each of your command tokens
 * from the game board and return them to your reinforcements. Then, purge this card."
 *
 * Pass 1: a hint. Decided: `play`. The component action takes every command token of the player off the board into
 * reinforcements (`tokensOnMap` emptied), so a system activated earlier this round may be activated again and ships may
 * leave it; the replay already purges a hero when it is played.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:solhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
