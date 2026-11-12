/**
 * Terraform (Titans of Ul, promissory note): "ACTION: Attach this card to a non-home planet you control other than
 * Mecatol Rex. Its resource and influence values are each increased by 1, and it is treated as having all 3 planet
 * traits (cultural, hazardous, and industrial)."
 *
 * Decided: a passive effect with a `play` (the stacking of a planet's value reads `modify` of passive effects only). Played by a component action with the planet as its choice (`choices.planetId`), it attaches to that
 * planet (`GameState.attachments`), and from then on the planet is worth 1 more resource and 1 more influence wherever
 * a payment counts it. The traits are for exploration, which the plan does not count. Once played it is never returned
 * (Titans of Ul, Terraform note 1).
 */
import { attachCard } from '../../../replay/invasion';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:terraform';

const attached = (ctx: { attached?: readonly string[] }): boolean => ctx.attached?.some(card => card.startsWith(id)) ?? false;

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  choose: [{ key: 'planetId', kind: 'planet' }],
  // Asked for the planet it is attached to only: a note merely held changes nothing (`ctx.attached` names it).
  modify: {
    planetResources: (value, ctx) => (attached(ctx) ? value + 1 : value),
    planetInfluence: (value, ctx) => (attached(ctx) ? value + 1 : value),
  },
  play: ({ game, state, shared, id: played, choices, pack, warnings }) => {
    const planetId = String(choices.planetId ?? '');
    if (!planetId) return;
    const before = warnings.length;
    attachCard(game, state, planetId, played, pack, warnings, { notHome: true });
    const target = state.attachments?.[planetId] ?? [];
    // A target the card does not allow is warned of and gets no bonus: the card is taken off again.
    const refused = warnings.slice(before).some(w => w.code === 'attachTarget' && w.params.planetId === planetId);
    const cards = refused ? target.filter(card => card !== played) : target;
    if (state !== shared) delete state.attachments;
    const all = (shared.attachments ??= {});
    if (cards.length) all[planetId] = cards; else delete all[planetId];
  },
};
