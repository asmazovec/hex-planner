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
import { card } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { componentById } from '../../../components';
import factionTechCopied from '../../../rules/codes/factionTechCopied';
import techNotFromNeighbor from '../../../rules/codes/techNotFromNeighbor';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';
import { othersOf, technologiesOf } from '../../helpers/choices';

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
      options: ctx => [...new Set(othersOf(ctx).flatMap(other => technologiesOf(ctx, other)))]
        .filter(tech => !componentById(ctx.pack, tech)?.faction && !ctx.my.holds(tech)),
    },
  ],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const technology = String(ctx.choices.technology ?? '');
    const def = componentById(ctx.pack, technology);
    if (!def || def.kind !== 'technology') return [];
    const other = ctx.playerOf(String(ctx.choices.from ?? ''));
    const near = other !== undefined && other !== ctx.holder && ctx.neighbours(ctx.holder, other);
    if (!near || !ctx.of(other).holds(technology)) ctx.warn(violation(techNotFromNeighbor.code, { id: technology, name: def.name }));
    if (def.faction) ctx.warn(violation(factionTechCopied.code, { id: technology, name: def.name }));
    // Gaining is not researching (90.5): no prerequisites are asked.
    return ctx.my.holds(technology) ? [] : [card.gain(ctx.holder, technology)];
  },
};
