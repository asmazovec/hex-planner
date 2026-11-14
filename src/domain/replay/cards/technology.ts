/**
 * Technology (LRR 91): the primary researches one technology free and a second for six resources, the secondary one for
 * four. A technology already owned is not researched again (90.10), so it costs nothing and is warned about. The
 * research itself, with its prerequisites, is `replay/research.ts`; here stand the card's limit and cost.
 *
 * A component that makes the secondary resolve as the primary (Brilliant) is asked at the point `researchAsPrimary`;
 * one that changes what a technology costs, at `researchCost` (`appliedFor`: a component the entry names counts too, Inheritance Systems).
 */
import { applied } from '../../effects/apply';
import { appliedFor } from '../../effects/entryApply';
import '../../effects/points/research';
import type { CardEntry } from '../../strategy';
import type { Shelf } from '../../shelf';
import type { CardHandler, CardWho } from './handler';

const SECOND_RESEARCH = 6;
const SECONDARY_RESEARCH = 4;

/** The technologies an entry researches, a unit upgrade being one of them. */
export const researchCount = (entry: CardEntry): number => entry.effects?.researched?.length ?? 0;

/** What is researched anew: technologies already held are not. */
const newResearch = (entry: CardEntry, held: Shelf): string[] =>
  (entry.effects?.researched ?? []).filter(id => !held.technologies.includes(id));

/** Whether the entry researches as the primary does: the primary itself, or a secondary a component turns into it. */
export const researchesAsPrimary = (entry: CardEntry, held: Shelf, who?: CardWho): boolean =>
  entry.type === 'strategic'
  || (who !== undefined && applied(who.pack, { holdings: held, faction: who.faction }, 'researchAsPrimary', 0, { faction: who.faction }).value > 0);

/** How many technologies the side researches. */
export const researchLimit = (entry: CardEntry, held?: Shelf, who?: CardWho): number =>
  (held ? researchesAsPrimary(entry, held, who) : entry.type === 'strategic') ? 2 : 1;

export const technology: CardHandler = {
  cost: (entry, held, who) => {
    const asPrimary = researchesAsPrimary(entry, held, who);
    const amount = newResearch(entry, held).reduce((sum, id, index) => {
      const base = asPrimary ? (index === 0 ? 0 : SECOND_RESEARCH) : SECONDARY_RESEARCH;
      return sum + (who ? appliedFor(who.pack, { holdings: held, faction: who.faction }, entry, 'researchCost', base, { technology: id, index }).value : base);
    }, 0);
    return { kind: 'resources', amount };
  },
};
