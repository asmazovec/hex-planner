/**
 * The Helmsman, Dark Space Navigation (L1Z1X Mindnet, hero): "ACTION: Choose 1 system that does not contain other
 * players' ships. you may move your flagship and any number of your dreadnoughts from other systems into the chosen
 * system. Then, purge this card."
 *
 * Decided: a `play` of a component action with choices: the chosen system (`system`) and the ships taken to it
 * (`dreadnought@<slot>`, `flagship@<slot>`: how many from that system). The ships move straight there, with no route
 * and no move value (faction note 3), and only flagships and dreadnoughts move. A chosen system with other players'
 * ships is warned of. The replay already purges the hero. Pass 2 writes the move and the check.
 *
 * Pass 1: the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:l1z1xhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
