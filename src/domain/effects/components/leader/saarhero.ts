/**
 * Gurno Aggero, Armageddon Relay (Clan of Saar, hero): "ACTION: Choose 1 system that is adjacent to 1 of your space
 * docks. Destroy all other players' infantry and fighters in that system. Then, purge this card."
 *
 * Decided (pass 2 to build): a `play` effect of its component action with the choice `system`: every other player's
 * infantry and fighters in that system, in its space area and on its planets, are destroyed; mine stay. The replay
 * already purges a hero when it is played. A system that is not adjacent to one of my docks (a dock's own system is
 * not adjacent to itself, Saar note on the hero) is a breach still to be checked.
 *
 * Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:saarhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
