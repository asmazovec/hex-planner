/**
 * Technology (LRR 91): the primary researches one technology free and a second for six resources, the secondary one for
 * four. A technology already owned is not researched again (90.10), so it costs nothing and is warned about.
 */
import { violation } from '../../rules/registry';
import type { CardEntry } from '../../strategy';
import type { UnitId } from '../../types';
import type { CardHandler } from './handler';

const SECOND_RESEARCH = 6;
const SECONDARY_RESEARCH = 4;

/** The technologies an entry researches: ship upgrades and those only counted. */
export const researchCount = (entry: CardEntry): number => (entry.upgrades?.length ?? 0) + (entry.effects?.researched ?? 0);

/** What is researched anew: upgrades already owned are not. */
const newResearch = (entry: CardEntry, owned: UnitId[]): number =>
  (entry.upgrades ?? []).filter(id => !owned.includes(id)).length + (entry.effects?.researched ?? 0);

/** How many technologies the side researches. */
export const researchLimit = (entry: CardEntry): number => (entry.type === 'strategic' ? 2 : 1);

export const technology: CardHandler = {
  cost: (entry, owned) => {
    const count = newResearch(entry, owned);
    return { kind: 'resources', amount: entry.type === 'strategic' ? Math.max(0, count - 1) * SECOND_RESEARCH : count * SECONDARY_RESEARCH };
  },
  apply: ({ state, entry, warnings }) => {
    // Runs before this entry's upgrades are added: the state's upgrades are those owned before.
    for (const unit of entry.upgrades ?? []) if (state.upgrades.includes(unit)) warnings.push(violation('researchOwned', { unit }));
    const count = newResearch(entry, state.upgrades);
    const limit = researchLimit(entry);
    if (count > limit) warnings.push(violation('researchOverLimit', { limit, count }));
  },
};
