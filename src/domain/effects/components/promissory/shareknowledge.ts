/**
 * "ACTION: Place this card faceup in your play area and gain 1 non-faction, non-unit upgrade technology that the
 * Deepwrought player owns; place that technology on this card. Return that technology to the deck and this card to
 * the Deepwrought player at the end of the status phase."
 *
 * Decided: `play`, as a component action with the choice `technology`: the technology joins the player's holdings and is
 * written on the note (`GameState.onCard`); the note stays in play. The hook `onStatusEnd` (points/moments.ts) ends it
 * with the status phase: the technology leaves the holdings and the note goes back to the Deepwrought player. The
 * candidates offered are the Deepwrought player's non-faction, non-unit upgrade technologies; a value outside them is
 * taken as entered (no warning code says "not a technology this note gives" yet).
 */
import { componentById, noteAddress } from '../../../components';
import { card } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:shareknowledge';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'technology', kind: 'component', label: { ru: 'Технология игрока Deepwrought', en: 'Technology of the Deepwrought player' },
    options: ({ game, pack, shared, state, entry }) => {
      const named = entry.type === 'component' && entry.componentId?.startsWith(id) ? noteAddress(entry.componentId) : undefined;
      const owner = named ?? game.opponents.find(o => o.faction === 'deepwrought')?.id;
      const theirs = owner === undefined ? [] : (owner === 'me' ? shared : shared.rivals?.[owner])?.holdings.technologies ?? [];
      return theirs.filter(tech => {
        const def = componentById(pack, tech);
        return def !== undefined && !def.faction && def.detail?.type !== 'unitUpgrade' && !state.holdings.technologies.includes(tech);
      });
    },
  }],
};

/** The loan is made by the play and ends with the status phase, a hook of the kernel. */
export const ability: Hooked = {
  holder: 'anyone',
  play: ctx => {
    const technology = ctx.choices.technology;
    if (!ctx.held || technology === undefined) return [];
    const tech = String(technology);
    return [...(ctx.my.holds(tech) ? [] : [card.gain(ctx.holder, tech)]), { type: 'CardLoaded', player: ctx.holder, card: ctx.id, technology: tech }];
  },
  on: {
    onStatusEnd: ctx => {
      const lent = ctx.board.players[ctx.holder]?.cards[ctx.id]?.onCard?.technologies[0];
      if (lent === undefined) return;
      const owner = noteAddress(ctx.id);
      const back = owner === undefined ? undefined : ctx.playerOf(owner);
      return [
        card.lose(ctx.holder, lent),
        { type: 'CardUnloaded' as const, player: ctx.holder, card: ctx.id, technology: lent },
        card.lose(ctx.holder, ctx.id),
        ...(back !== undefined && !ctx.of(back).holds(ctx.id) ? [card.gain(back, ctx.id)] : []),
      ];
    },
  },
};
