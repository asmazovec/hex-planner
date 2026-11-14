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
import { componentById, noteAddress } from '../../../components';
import { upgradeTech } from '../../../holdings';
import { card, tokens } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/events';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:fires';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (!ctx.held) return [];
    const key = noteAddress(ctx.id);
    const owner = key === undefined ? undefined : ctx.playerOf(key);
    // The Muaat's own note is refused by 69.2 already; nothing is taken from them then.
    if (owner === ctx.holder) return [];
    const events: GameEvent[] = owner === undefined ? [] : [tokens(owner, { fleet: -1 })];
    const tech = upgradeTech(ctx.pack, ctx.my.faction, 'warsun');
    const def = tech === undefined ? undefined : componentById(ctx.pack, tech);
    if (tech === undefined || !def) return events;
    if (ctx.my.holds(tech)) {
      ctx.warn(violation('researchOwned', { id: tech, name: def.name }));
      return events;
    }
    return [...events, card.gain(ctx.holder, tech)];
  },
};
