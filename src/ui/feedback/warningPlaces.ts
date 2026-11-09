import { RULES } from '../../domain/rules/registry';
import type { DataPack, Entry, Game, RuleStep, Warning, WarningCode } from '../../domain/types';
import { groupOf, sourcesOf, type Move } from '../plan/tactical';

/** The block of an editor where the thing a warning speaks of is set up. */
export type WarningPlace =
  | 'route' | 'cargo' | 'battle' | 'landing' | 'production' | 'payment' | 'tokens' | 'card' | 'system' | 'slice' | 'units' | 'action' | 'ready' | 'research' | 'deal';

/** Where the warnings of a step stand: the step of the domain decides the block, so a new rule needs no edit here. */
export const STEP_PLACES: Record<RuleStep, WarningPlace[]> = {
  round: ['action'],
  card: ['card'],
  activation: ['system'],
  movement: ['route'],
  transport: ['cargo'],
  combat: ['battle'],
  invasion: ['landing'],
  production: ['production'],
  payment: ['payment'],
  status: ['tokens'],
  expedition: ['slice'],
  transaction: ['deal'],
};

/**
 * Overrides of the step, only where one step speaks to more than one block: `code` at any step, `code@step` at that step.
 * The limits of the system are the result of the whole action, and are said where the ships are chosen too; a card has only its production.
 */
const PLACES: Partial<Record<WarningCode | `${WarningCode}@${RuleStep}`, WarningPlace[]>> = {
  capacitySystem: ['route', 'action', 'production'],
  fleetPool: ['route', 'action', 'production'],
  // A manual change of the units of a system.
  'unitsMissing@round': ['units'],
  'poolNegative@card': ['tokens'],
  constructionUnits: ['production'],
  readyOverLimit: ['ready'],
  diplomacySystem: ['system'],
  researchOverLimit: ['research'],
  researchOwned: ['research'],
  expeditionUnpaid: ['payment'],
  stationStructure: ['system'],
};

/** The step of a warning: its own, or that of its rule when it was written by hand. */
export const stepOf = (warning: Warning): RuleStep => warning.step ?? RULES[warning.code].step;

export const placesOf = (warning: Warning): WarningPlace[] =>
  PLACES[`${warning.code}@${stepOf(warning)}`] ?? PLACES[warning.code] ?? STEP_PLACES[stepOf(warning)];

/** Every place a warning can be given to, for the contract that each of them has a block. */
export const allPlaces = (): WarningPlace[] => [...new Set([...Object.values(STEP_PLACES), ...Object.values(PLACES)].flat())];

/** A limit of the whole system: it stands in the result of the action. */
export const limitsSystem = (warning: Warning): boolean => placesOf(warning).includes('action') && placesOf(warning).includes('route');

/** Whether a warning speaks of the ships or the cargo of one source of a tactical action. */
export function ofSource(warning: Warning, game: Game, pack: DataPack, moves: Move[], source: string): boolean {
  if (warning.code === 'unitsMissing') return groupOf(game, pack, moves, source).some(m => m.from === warning.params.where);
  const from = warning.place?.source ?? warning.params.from;
  return (stepOf(warning) === 'movement' || stepOf(warning) === 'transport') && !limitsSystem(warning) && from === source;
}

/** The source of a tactical action whose flight a warning speaks of, if it speaks of one. */
export function flightOf(warning: Warning, game: Game, pack: DataPack, entry: Entry): string | undefined {
  if (entry.type !== 'tactical') return undefined;
  return sourcesOf(game, pack, entry).find(source => ofSource(warning, game, pack, entry.moves, source));
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
