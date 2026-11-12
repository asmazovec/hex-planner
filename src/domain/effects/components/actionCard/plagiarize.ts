/**
 * Plagiarize (action card). "ACTION: Spend 5 influence and choose a non-faction technology owned by 1 of your
 * neighbors. Gain that technology."
 *
 * Decided: a play effect of its component action, with the choices `technology` (the component id) and `from` (the
 * neighbour). The action pays 5 influence (`shortInfluence` when short; ruling 1: not playable with less than five
 * available) and the technology joins the owner's holdings with no prerequisite asked (ruling 2: gaining is not
 * researching). Two conditions of the text are checked, as new codes of the card's own rule:
 *   - `techNotFromNeighbor`: the chosen player is not a neighbour (LRR 60), or does not own the technology;
 *   - `factionTechCopied`: the technology is a faction technology.
 *
 * Pass 1: the hint it is today; the tests say what it must do. The component action has no payment yet.
 */
import { componentById } from '../../../components';
import { linksOf } from '../../../movement';
import { areNeighbors } from '../../../neighbors';
import factionTechCopied from '../../../rules/codes/factionTechCopied';
import techNotFromNeighbor from '../../../rules/codes/techNotFromNeighbor';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:plagiarize';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  cost: { kind: 'influence', amount: 5 },
  choose: [
    { key: 'from', kind: 'player' },
    {
      key: 'technology',
      kind: 'component',
      options: ctx => [...new Set(Object.values(ctx.shared.rivals ?? {}).flatMap(rival => rival.holdings.technologies))]
        .filter(tech => !componentById(ctx.pack, tech)?.faction && !ctx.state.holdings.technologies.includes(tech)),
    },
  ],
  play: ({ game, state, shared, states, choices, pack, warnings }) => {
    const technology = String(choices.technology ?? '');
    const def = componentById(pack, technology);
    if (!def || def.kind !== 'technology') return;
    const other = states[String(choices.from ?? '')];
    const near = other !== undefined && other !== state
      && areNeighbors(game, state, other, pack, linksOf(game, pack, { state, shared, during: 'neighbors' }));
    if (!near || !other.holdings.technologies.includes(technology)) warnings.push(violation(techNotFromNeighbor.code, { id: technology, name: def.name }));
    if (def.faction) warnings.push(violation(factionTechCopied.code, { id: technology, name: def.name }));
    // Gaining is not researching (90.5): no prerequisites are asked.
    if (!state.holdings.technologies.includes(technology)) state.holdings.technologies.push(technology);
  },
};
