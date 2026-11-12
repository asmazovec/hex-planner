/**
 * Mathis Mathinus, Imperial Seal (Winnu, hero): "ACTION: Perform the primary ability of any strategy card. Then,
 * choose any number of other players. Those players may perform the secondary ability of that strategy card. Then,
 * purge this card."
 *
 * Decided: `play` with waivers. The hero is named in `uses` of a strategic entry with the card it performs (the replay
 * purges it): the primary of a card the player does not hold is not warned of (`foreignPrimary`, 83.3), it is not
 * one more primary of the round (`primaryRepeated`), and it spends no strategy token. The other players' secondaries
 * are theirs (ruling 1: they still spend a token) and are not planned.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:winnuhero';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
