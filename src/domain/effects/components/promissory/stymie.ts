/**
 * Stymie (Arborec promissory note): "After another player moves ships into a system that contains 1 or more of your
 * units: You may place 1 command token from that player's reinforcements in any non-home system. Then, return this card
 * to the Arborec player."
 *
 * A hint. It is played by whoever holds it, in another player's turn, and puts down a token of that other player: the
 * plan has no entry of the holder for that moment and keeps no tokens of the other players in their reinforcements. Its
 * return to the Arborec player (69.3) is the replay's own, as for every note whose text returns it.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:stymie';

export const ability: Ability = { holder: 'others', tier: 'hint', rule: id, hintAt: ['movement'] };
