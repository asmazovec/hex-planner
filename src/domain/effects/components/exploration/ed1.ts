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
 * Pass 1: still the hint it is today; the card held, the payment of a component action and the research come in pass 2.
 */
import { componentsOf } from '../../../components';
import { researchTechnologies } from '../../../replay/research';
import type { ComponentEffect } from '../../types';

export const id = 'exploration:ed1';

/**
 * Pass 2: the cost (six resources, paid with the entry's `payment`) and the research are built. Not built: the card
 * held and purged. An exploration card has no place in `Holdings` (`HOLDING_FIELD` has no `exploration`), so a card
 * found is not held, one never found is not warned of, and the purge leaves nothing to remove.
 */
export const effect: ComponentEffect = {
  tier: 'play', rule: id,
  cost: { kind: 'resources', amount: 6 },
  choose: [{
    key: 'technology', kind: 'component', label: { ru: 'Технология', en: 'Technology' },
    options: ctx => componentsOf(ctx.pack).filter(def => def.kind === 'technology').map(def => def.id),
  }],
  play: turn => {
    const technology = turn.choices.technology;
    if (typeof technology === 'string') researchTechnologies(turn.game, turn.state, turn.shared, [technology], turn.pack, turn.warnings);
  },
};
