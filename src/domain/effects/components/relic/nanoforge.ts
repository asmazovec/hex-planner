/**
 * Nano-Forge (relic): "ACTION: Attach this card to a non-legendary, non-home planet you control, its resource and
 * influence values are increased by 2 and it is a legendary planet. This action cannot be performed once attached."
 *
 * Decided (pass 2): play (`choices.planetId` attaches it, in the shared `attachments`) and a modify of
 * `planetResources` and `planetInfluence` (+2) of the planet it is attached to; a target that is not mine, a home planet
 * or a legendary one is warned of, and so is a second play. Pass 1 keeps it the hint it is today.
 */
import { attachCard } from '../../../replay/invasion';
import { violation } from '../../../rules/registry';
import attachTarget from '../../../rules/codes/attachTarget';
import type { ComponentEffect } from '../../types';

export const id = 'relic:nanoforge';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  choose: [{ key: 'planetId', kind: 'planet' }],
  modify: {
    planetResources: (value, ctx) => (ctx.attached?.includes(id) ? value + 2 : value),
    planetInfluence: (value, ctx) => (ctx.attached?.includes(id) ? value + 2 : value),
  },
  play: ({ game, state, shared, pack, choices, warnings, held }) => {
    const planetId = String(choices.planetId ?? '');
    if (!held || !planetId) return;
    // "This action cannot be performed once attached."
    if (Object.values(shared.attachments ?? {}).some(list => list.includes(id))) {
      warnings.push(violation(attachTarget.code, { planetId }));
      return;
    }
    attachCard(game, { ...state, attachments: (shared.attachments ??= {}) }, planetId, id, pack, warnings, { notHome: true, notLegendary: true });
  },
};
