/**
 * Circlet of the Void (relic): "Your units do not roll for gravity rifts, and you ignore the effects of all other
 * anomalies on movement. ACTION: Exhaust this card to explore a frontier token in a system that does not contain any
 * other players' ships."
 *
 * Decided (pass 2): passive, a waiver of `routeBlocked` where the system is an asteroid field, a supernova or a nebula
 * (not where other players' ships stand, not a hyperlane), and of `speedShort` where only the start in a nebula made
 * the ship short. The rift still adds 1 (Circlet note 3), and the relic works exhausted too (note 4). The action
 * explores, which the plan does not model. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'relic:circletofthevoid';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // A ship that starts in a nebula keeps its own move value (59.2 does not apply).
  modify: { nebulaStart: (_value, ctx) => ctx.speed },
};

export const ability: Hooked = {
  holder: 'self',
  permit: [{
    code: 'routeBlocked',
    rule: 'you ignore the effects of all other anomalies on movement',
    when: (warning, ctx) => ['asteroid', 'supernova', 'nebula'].includes(ctx.routeBlockKind(warning) ?? ''),
  }],
};
