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
import '../../points/moments';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:shareknowledge';

const without = (list: string[], item: string): void => {
  const index = list.indexOf(item);
  if (index >= 0) list.splice(index, 1);
};

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
  play: ({ id: note, state, choices, held }) => {
    const technology = choices.technology;
    if (!held || technology === undefined) return;
    if (!state.holdings.technologies.includes(String(technology))) state.holdings.technologies.push(String(technology));
    (state.onCard ??= {})[note] = { technology: String(technology) };
  },
  onStatusEnd: ({ id: note, state, states }) => {
    const lent = state.onCard?.[note]?.technology;
    if (lent === undefined) return;
    without(state.holdings.technologies, lent);
    without(state.holdings.exhausted, lent);
    without(state.holdings.promissory, note);
    delete state.onCard![note];
    const owner = noteAddress(note);
    const back = owner === undefined ? undefined : states[owner]?.holdings;
    if (back && !back.promissory.includes(note)) back.promissory.push(note);
  },
};
