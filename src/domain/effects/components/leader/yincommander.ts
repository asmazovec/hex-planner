/**
 * Brother Omar (Yin, commander): "At any time: This card satisfies a green technology prerequisite. When you
 * research a tech owned by another player, you may return 1 of your infantry to reinforcements to ignore its
 * prerequisites."
 *
 * Decided: a passive `modify` of the point `prerequisites`: while the commander is unlocked (in force) it covers one
 * green (biotic) symbol the owned technologies leave unmet. And a waiver of `prerequisitesMissing` (90.12) for a
 * technology another player owns: the warning is still made and listed, lifted by the commander. The infantry
 * returned is the player's own choice and is not tracked.
 */
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:yincommander';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  modify: { prerequisites: (value, ctx) => (ctx.missing?.biotic ? value - 1 : value) },
  permit: [{
    code: prerequisitesMissing.code,
    rule: 'When you research a tech owned by another player, you may return 1 of your infantry to reinforcements to ignore its prerequisites.',
    // Another player owns it: any player of the game but the one whose turn it is.
    when: (warning, ctx) => ctx.table.players.some(player => player.id !== ctx.actor && ctx.prior.of(player.id).holds(String(warning.params.id))),
  }],
};
