/**
 * Brother Omar (Yin, commander): "At any time: This card satisfies a green technology prerequisite. When you
 * research a tech owned by another player, you may return 1 of your infantry to reinforcements to ignore its
 * prerequisites."
 *
 * Pass 2: a `modify` of the point `prerequisites` (one green prerequisite satisfied while it is unlocked) and a
 * waiver of the new check of prerequisites (90.12) for a technology another player owns. Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:yincommander';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
