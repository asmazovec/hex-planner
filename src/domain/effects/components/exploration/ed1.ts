/**
 * Enigmatic Device, a frontier exploration card: "Place this card faceup in your play area. ACTION: You may spend 6
 * resource and purge this card to research 1 technology."
 *
 * Decided: `play`. The card is not discarded when explored but goes into the play area (LRR 35 note 2), so it is held
 * once gained. Its ACTION is a component action: six resources paid (its note: it cannot be played with fewer than six
 * available, so a payment short of six is warned of, shortResources), the card purged, and the technology the player
 * chose (`choices.technology`) researched as the Technology card researches (90.10: one already owned is warned of,
 * researchOwned). Not held, or purged already, it is warned of as any component is (componentNotHeld). Nothing is
 * waived.
 *
 */
import { componentsOf } from '../../../components';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'exploration:ed1';

/**
 * Pass 2: the cost (six resources, paid with the entry's `payment`) and the research are built. The card is held in
 * `Holdings.found` once gained, purged by the action (`playComponent`), and one never found or already purged is warned
 * of as not held.
 */

export const ability: Ability = {
  tier: 'play', rule: id,
  cost: { kind: 'resources', amount: 6 },
  choose: [{
    key: 'technology', kind: 'component', label: { ru: 'Технология', en: 'Technology' },
    options: ctx => componentsOf(ctx.pack).filter(def => def.kind === 'technology').map(def => def.id),
  }],
  holder: 'self',
  play: ctx => {
    const technology = ctx.choices.technology;
    return typeof technology === 'string' ? ctx.research(technology) : [];
  },
};
