import type { DataPack, Game, Warning, WarningCode } from '../../domain/types';
import { groupOf, type Move } from '../plan/tactical';

/** The block of an editor where the thing a warning speaks of is set up. */
export type WarningPlace = 'route' | 'landing' | 'production' | 'payment' | 'tokens' | 'card' | 'system' | 'slice' | 'units' | 'action' | 'ready' | 'research';

// TODO(P2-381) #ws:ui-warnings #type:arch — место предупреждения выводится из кода таблицей в UI; брать шаг и место из доменного нарушения, таблицу удалить
const PLACES: Record<WarningCode, WarningPlace[]> = {
  shortResources: ['payment'],
  shortInfluence: ['payment'],
  shortTradeGoods: ['payment'],
  planetExhausted: ['payment'],
  capacityGroup: ['route'],
  speedShort: ['route'],
  routeBlocked: ['route'],
  sourceActivated: ['route'],
  // The result of the whole action, and said where the ships are chosen too. A card has only its production.
  capacitySystem: ['route', 'action', 'production'],
  fleetPool: ['route', 'action', 'production'],
  unitsMissing: ['route', 'units'],
  landingOverLimit: ['landing'],
  sliceTaken: ['slice'],
  shortStrategy: ['card'],
  primaryRepeated: ['card'],
  tokensOver: ['tokens'],
  poolNegative: ['tokens'],
  systemHasToken: ['system'],
  constructionUnits: ['production'],
  // command-tokens, round-flow, payment
  noReinforcements: ['tokens'],
  actionAfterPass: ['action'],
  passBeforeStrategy: ['action'],
  actionOutsidePhase: ['action'],
  planetNotControlled: ['payment'],
  readyNotControlled: ['card'],
  // strategy-cards
  foreignPrimary: ['card'],
  ownSecondary: ['card'],
  secondaryRepeated: ['card'],
  readyOverLimit: ['ready'],
  diplomacySystem: ['system'],
  researchOverLimit: ['research'],
  researchOwned: ['research'],
};

export const placesOf = (warning: Warning): WarningPlace[] => PLACES[warning.code];

export const limitsSystem = (warning: Warning): boolean => warning.code === 'capacitySystem' || warning.code === 'fleetPool';

/** Whether a warning speaks of the ships or the cargo of one source of a tactical action. */
export function ofSource(warning: Warning, game: Game, pack: DataPack, moves: Move[], source: string): boolean {
  if (warning.code === 'capacityGroup' || warning.code === 'speedShort' || warning.code === 'routeBlocked' || warning.code === 'sourceActivated') return warning.params.from === source;
  if (warning.code === 'unitsMissing') return groupOf(game, pack, moves, source).some(m => m.from === warning.params.where);
  return false;
}

export interface WarningPlacer {
  /** The warnings of a block, each given to that block once. */
  at: (place: WarningPlace, filter?: (warning: Warning) => boolean) => Warning[];
  /** What no block took because none of its blocks is on the screen; ask after all the blocks. */
  rest: () => Warning[];
}

/** Hands the warnings of an editor out to its blocks, and keeps what is left so that no warning gets lost. */
export function placeWarnings(warnings: Warning[]): WarningPlacer {
  const given = new Map<WarningPlace, Set<Warning>>();
  const placed = new Set<Warning>();
  return {
    at: (place, filter = () => true) => {
      const here = given.get(place) ?? new Set<Warning>();
      given.set(place, here);
      const list = warnings.filter(w => placesOf(w).includes(place) && !here.has(w) && filter(w));
      for (const warning of list) {
        here.add(warning);
        placed.add(warning);
      }
      return list;
    },
    rest: () => warnings.filter(w => !placed.has(w)),
  };
}
