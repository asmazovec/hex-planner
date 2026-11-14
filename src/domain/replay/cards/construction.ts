/** Construction (LRR 24): structures on my planets; before Thunder's Edge the secondary leaves its token in the chosen system. */
import type { CardEntry } from '../../strategy';
import type { CardHandler, CardWho } from './handler';

/** One mech and one infantry placed instead of a PDS (Titans, Hecatoncheires): the units are not produced, so they cost nothing. */
const pairInsteadOfPds = (entry: CardEntry, who: CardWho): boolean => {
  const units = entry.effects?.production?.units ?? {};
  const kinds = Object.values(units).filter(n => Number(n) > 0);
  return who.faction === 'titans' && kinds.length === 2 && (units.mech ?? 0) > 0 && units.mech === units.infantry;
};

export const construction: CardHandler = {
  placesFree: pairInsteadOfPds,
};
