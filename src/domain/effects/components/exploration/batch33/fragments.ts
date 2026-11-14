/**
 * Shared by the three relic fragments (crf1, hrf1, irf1). Not a component file: it sits one folder deeper, where the
 * registry does not look.
 */
import relicFragmentsShort from '../../../../rules/codes/relicFragmentsShort';
import { violation } from '../../../../rules/registry';
import type { AbilityContext, Hooked } from '../../../../../game/abilities/types';
import type { ComponentEffect } from '../../../types';

/** The Unknown Relic Fragment "counts as a relic fragment of any type". */
const UNKNOWN = 'exploration:urf1';

/**
 * "ACTION: Purge 3 of your <type> relic fragments to gain 1 relic" (73.1): the fragments of the type held when the
 * action begins, the unknown ones standing for any type, must be three. The purge itself is the entry's `spends` and
 * the relic drawn its `gains`, as only the player knows which.
 */
const fragmentsPlay = (ctx: AbilityContext): [] => {
  // Purged by another component (Fabrication: 2 of a type for a relic, 1 for a command token) it is no action of its own: the three are its own action's.
  if (ctx.entry?.type !== 'component' || ctx.entry.componentId !== ctx.id) return [];
  const count = (card: string): number => {
    const hold = ctx.board.players[ctx.holder]?.cards[card];
    return hold && hold.state !== 'purged' ? hold.count : 0;
  };
  const held = count(ctx.id) + (ctx.id === UNKNOWN ? 0 : count(UNKNOWN));
  if (held < 3) ctx.warn(violation(relicFragmentsShort.code, { have: held }));
  return [];
};

/** The effect of a relic fragment: a played one that checks the three fragments of its type. */
export const fragmentEffect = (id: string): ComponentEffect => ({ tier: 'play', rule: id });

/** Its play, written for the kernel. */
export const fragmentAbility: Hooked = { holder: 'self', play: fragmentsPlay };
