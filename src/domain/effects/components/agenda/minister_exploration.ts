/**
 * Minister of Exploration (agenda): "The elected player gains this card. When the owner of this card gains control
 * of a planet, they gain 1 trade good."
 *
 * Passive, needs a new point of the count: when the owner gains control of a planet (25, invasion 49.6) they gain 1
 * trade good. Pass 2: the step that sets control asks a point for the trade goods gained; the law is the elected
 * player's only.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:minister_exploration';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  modify: { tradeGoodsOnControl: value => value + 1 },
};
