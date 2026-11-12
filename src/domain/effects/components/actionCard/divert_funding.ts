/**
 * Divert Funding (action card). "ACTION: Return a non-unit upgrade, non-faction technology that you own to your
 * technology deck. Then, research another technology."
 *
 * Decided: a play effect of its component action, with the choices `returned` and `researched` (component ids). The
 * returned technology leaves the owner's holdings, the researched one joins them. Checked:
 *   - `returnedTechInvalid` (new code, the card's own rule): the returned technology is a unit upgrade, a faction
 *     technology, or not owned (ruling 1: the card needs one such technology to be played);
 *   - `researchOwned` (90.10): the researched technology is already owned, the returned one among them (ruling 4).
 * The prerequisites of the research (ruling 2, the returned technology not counting) are not checked anywhere in the
 * replay yet (the `prerequisites` point is not asked), so they are a todo here.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import { componentById, componentsOf } from '../../../components';
import { researchTechnologies } from '../../../replay/research';
import returnedTechInvalid from '../../../rules/codes/returnedTechInvalid';
import { violation } from '../../../rules/registry';
import type { DataPack } from '../../../types';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:divert_funding';

/** A technology the card may return: not a unit upgrade, not a faction technology. */
const returnable = (pack: DataPack, tech: string): boolean => {
  const def = componentById(pack, tech);
  return def?.kind === 'technology' && !def.faction && pack.technologies[tech.slice('technology:'.length)]?.upgrade === undefined;
};

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'returned', kind: 'component', options: ctx => ctx.state.holdings.technologies.filter(tech => returnable(ctx.pack, tech)) },
    { key: 'researched', kind: 'component', options: ctx => componentsOf(ctx.pack).filter(def => def.kind === 'technology' && !ctx.state.holdings.technologies.includes(def.id)).map(def => def.id) },
  ],
  play: ({ game, state, shared, choices, pack, warnings }) => {
    const returned = String(choices.returned ?? '');
    const researched = String(choices.researched ?? '');
    const back = componentById(pack, returned);
    if (back) {
      if (!state.holdings.technologies.includes(returned) || !returnable(pack, returned)) warnings.push(violation(returnedTechInvalid.code, { id: returned, name: back.name }));
      // The returned technology goes back to the deck first, so the research cannot lean on it (ruling 2).
      state.holdings.technologies = state.holdings.technologies.filter(tech => tech !== returned);
      state.holdings.exhausted = state.holdings.exhausted.filter(tech => tech !== returned);
    }
    if (!researched) return;
    // Ruling 4: the researched technology is another one than the returned one.
    if (researched === returned && back) warnings.push(violation('researchOwned', { id: researched, name: back.name }));
    else researchTechnologies(game, state, shared, [researched], pack, warnings);
  },
};
