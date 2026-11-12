/**
 * Scuttle (action card, Prophecy of Kings): "ACTION: Choose 1 or 2 of your non-fighter ships on the game board and return
 * them to your reinforcements. Gain trade goods equal to the combined cost of those ships."
 *
 * A `play` effect of its component action. Choices, one key per ship type and system, `<unit>@<slot>`, with the number
 * returned: `{ 'carrier@0,0': 1, 'cruiser@0,0': 1 }`. The ships leave the board and the player gains their printed
 * costs in trade goods (LRR 26; a carrier 3 and a cruiser 2 give 5). A ship chosen where there is none is reported as
 * missing (`unitsMissing`) and gives nothing; more than two ships warns (a new code, see the report) and is returned
 * all the same. A fighter is no non-fighter ship and gives nothing (see the report).
 *
 * Pass 1: still the hint it is today; pass 2 writes `play`.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:scuttle';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
