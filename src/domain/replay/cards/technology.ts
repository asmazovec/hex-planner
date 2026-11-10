/**
 * Technology (LRR 91): the primary researches one technology free and a second for six resources, the secondary one for
 * four. A technology already owned is not researched again (90.10), so it costs nothing and is warned about.
 */
import { componentById } from '../../components';
import { violation } from '../../rules/registry';
import type { CardEntry } from '../../strategy';
import type { Holdings } from '../../types';
import type { CardHandler } from './handler';

const SECOND_RESEARCH = 6;
const SECONDARY_RESEARCH = 4;

/** The technologies an entry researches, a unit upgrade being one of them. */
export const researchCount = (entry: CardEntry): number => entry.effects?.researched?.length ?? 0;

/** What is researched anew: technologies already held are not. */
const newResearch = (entry: CardEntry, held: Holdings): number =>
  (entry.effects?.researched ?? []).filter(id => !held.technologies.includes(id)).length;

/** How many technologies the side researches. */
export const researchLimit = (entry: CardEntry): number => (entry.type === 'strategic' ? 2 : 1);

export const technology: CardHandler = {
  cost: (entry, held) => {
    const count = newResearch(entry, held);
    return { kind: 'resources', amount: entry.type === 'strategic' ? Math.max(0, count - 1) * SECOND_RESEARCH : count * SECONDARY_RESEARCH };
  },
  apply: ({ state, entry, pack, warnings }) => {
    // Runs before this entry's research is added: the holdings are those of before.
    for (const id of entry.effects?.researched ?? []) {
      if (state.holdings.technologies.includes(id)) warnings.push(violation('researchOwned', { id, name: componentById(pack, id)?.name ?? id }));
    }
    const count = newResearch(entry, state.holdings);
    const limit = researchLimit(entry);
    if (count > limit) warnings.push(violation('researchOverLimit', { limit, count }));
  },
};
