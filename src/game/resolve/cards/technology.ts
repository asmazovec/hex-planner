/**
 * Technology (LRR 91): the primary researches one technology free and a second for six resources, the secondary one for
 * four. A technology already owned is not researched again (90.10), so it costs nothing and is warned about. The research
 * itself, with its prerequisites and specialties, is `resolve/research.ts`; here stand the card's limit and the token check.
 */
import { researchLimit } from '../../../domain/replay/cards/technology';
import { violation } from '../../../domain/rules/registry';
import { cardsOf } from '../../queries';
import { holderIn } from '../../abilities/registry';
import { warn } from '../context';
import { researchTechnologies } from '../research';
import type { CardRule } from './rule';

export const technology: CardRule = {
  apply: ({ ctx, effects, entry }) => {
    // Runs before this entry's research is added: what is held is what stood before.
    const held = cardsOf(ctx.board, ctx.player, 'technology').map(c => c.id);
    const count = (effects.researched ?? []).filter(id => !held.includes(id)).length;
    const faction = ctx.table.players.find(p => p.id === ctx.player)?.faction ?? '';
    const limit = researchLimit(entry, holderIn(ctx.table, ctx.board, ctx.player).holdings, { pack: ctx.pack, faction });
    researchTechnologies(ctx, effects.researched, effects.specialties);
    if (count > limit) warn(ctx, violation('researchOverLimit', { limit, count }));
  },
};
