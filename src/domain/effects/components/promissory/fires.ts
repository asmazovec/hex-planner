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
import { componentById } from '../../../components';
import { noteOwner, upgradeTech } from '../../../holdings';
import { gain } from '../../../replay/holdings';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:fires';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ game, state, shared, states, pack, player, id: noteId, warnings, held }) => {
    if (!held) return;
    const owner = noteOwner(game, noteId, player);
    const muaat = owner === undefined ? undefined : states[owner];
    // The Muaat's own note is refused by 69.2 already; nothing is taken from them then.
    if (owner === player) return;
    if (muaat) muaat.fleet -= 1;
    const tech = upgradeTech(pack, game.faction, 'warsun');
    const def = tech === undefined ? undefined : componentById(pack, tech);
    if (tech === undefined || !def) return;
    if (state.holdings.technologies.includes(tech)) {
      warnings.push(violation('researchOwned', { id: tech, name: def.name }));
      return;
    }
    gain(state, shared, def);
  },
};
