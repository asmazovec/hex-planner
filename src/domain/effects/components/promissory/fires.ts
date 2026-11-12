/**
 * Fires of the Gashlai (Embers of Muaat, promissory note): "ACTION: Remove 1 token from the Muaat player's fleet pool
 * and return it to their reinforcements. Then, gain your war sun unit upgrade technology card. Then, return this card
 * to the Muaat Player."
 *
 * Decided: `play`. Played by a component action of the player holding the Muaat's note: the Muaat's fleet pool loses
 * a token, the player gains their own war sun upgrade (`upgradeTech(pack, faction, 'warsun')`), and the note goes
 * back to the Muaat (69.3, already replayed for every note that says so). A player who already owns their war sun
 * upgrade cannot play it (Muaat note 1): warned of as a technology gained twice. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:fires';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
