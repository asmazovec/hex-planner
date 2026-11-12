/**
 * Fealty Uplink (L1Z1X Mindnet, breakthrough): "When you gain control of a planet, place infantry from your
 * reinforcements equal to that planet's influence value on that planet."
 *
 * Decided: a passive change of the board. When the L1Z1X gain control of a planet, infantry equal to its influence
 * is placed on it from reinforcements (mandatory, faction note 2). Pass 2 needs the same point in `gainControl` as
 * Assimilate.
 *
 * Pass 1: the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:l1z1xbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
