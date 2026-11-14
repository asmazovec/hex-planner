/**
 * A read view of a turn for the rules and the components: what its action did, by the names the checks read
 * (`type`, `systemId`, `moves`, `landings`, `uses`, `gains`, `spends`, `componentId`, `card`). `factsOf` makes it
 * from a turn of the kernel; the old plans of the tests speak the same shape. `owner` is the old key of the player the
 * turn is expected of (the address a promissory note carries; absent for me), `id` is the turn's id.
 */
import type { Act, AdjustmentDelta, AdjustmentKind, CardEffects, CardPlay, EntryStatus, Payment, Phase, StatusSpend, StructureCounts, UnitCounts } from '../domain/types';
import type { Turn } from './actions';
import { legacyPlayer } from './entry';
import type { Place } from './events';
import type { Table } from './types';

/**
 * `systemId` is a map slot key. A tactical entry's `moves` carry units from `from`
 * (a slot key, or a planet id to pick ground forces up) into `systemId`. The route of a source is held by the move
 * whose `from` is that source: `via` lists the slots on the way, in flight order. A move with `pickupOf` takes units
 * on board on the way: it joins the group of that source slot.
 */
export type TurnBody = (
  | { type: 'tactical'; systemId: string | null;
      moves: { from: string; units: UnitCounts; via?: string[]; pickupOf?: string;
        /** Structures taken on board with the units: from a planet (`from` is its id) or from the space area of a system. The rules forbid it (85.3); a component may lift that. */ structures?: StructureCounts }[];
      landings: { planetId: string; units: UnitCounts;
        /** A planet the ground forces are committed from instead of the space area of the active system (49.2); a component may lift the warning. */ from?: string;
        /** Structures put on the planet from the space area of the active system, at the end of the action. */ structures?: StructureCounts }[];
      production: UnitCounts; payment: Payment;
      /** The six influence that remove the custodians token when the landing is the first on Mecatol Rex (27.2): planets exhausted, trade goods spent. */ custodiansPayment?: Payment;
      /** What the battle in the active system cost me: gone after the moves, before the landing and the production. */ losses?: UnitCounts;
      /** What the battle cost on planets, by planet id: gone after the landing. */ groundLosses?: Record<string, UnitCounts>;
      /** Ships I remove from the active system beyond my fleet pool (37.3): gone on arrival, or after the production if built then. */ fleetRemovals?: UnitCounts;
      /** Where the ground forces of `production` were bought, by planet id; what is not listed goes to the first planet I control. */ productionGround?: Record<string, UnitCounts>;
      /** The system the ships of `production` are placed in when it is not the active one (68.2 places them there; a component may lift the warning). */ shipsTo?: string;
      /** Warfare's primary in Thunder's Edge: no tactic token is spent and no command token goes down. */ free?: boolean;
      /** The id of the card entry that started this action: it goes when that entry goes. */ fromCard?: string; acts?: Act[] }
  | ({ type: 'strategic'; acts?: Act[] } & CardPlay)
  | ({ type: 'secondary' } & CardPlay)
  | { type: 'component';
      /** The component played: an action card leaves the hand, an agent is exhausted, a hero purged. Without it the action is only its note. */ componentId?: string;
      note: string;
      acts?: Act[];
      /** What the component produces, as a card's effects do: a hero or a technology that builds units (`production`, paid with `payment`). */ effects?: CardEffects;
      /** What the component costs when its effect declares a `cost`: the planets exhausted and the trade goods spent. */ payment?: Payment }
  | { type: 'pass'; acts?: Act[] }
  | { type: 'adjustment'; label: string; delta: AdjustmentDelta; kind?: AdjustmentKind;
      /** An agenda of the agenda phase: its outcome (`for` or `against`) and what was elected (`elect`: a planet id, a law id, `me` or an opponent id), the strategy card elected (`card`, its initiative as text or number). */ choices?: Record<string, string | number> }
  | { type: 'statusTokens'; tactic: number; fleet: number; strategy: number;
      /** My points gained this round. */ vp?: number;
      /** Rival id to the points they gained this round. */ opponentVp?: Record<string, number>;
      /** Objectives the owner scored, by component id: a secret one leaves the hand for the scored ones, a public one joins them. */ scored?: string[];
      /** What scoring them cost, when an objective is scored by spending (61.10): tokens from the pools, trade goods, planets paying resources or influence. */ spend?: StatusSpend }
) & {
  /** Components the owner of the entry gains with it, by id: drawn action cards, a relic, a note received. */
  gains?: string[];
  /** Components the owner loses with it, one copy each. */
  spends?: string[];
  /**
   * Components the owner uses with it, by id, that are neither its component action nor spent: an agent or a technology
   * exhausted, an ability invoked. Each is played as a component action plays its own (exhausted, purged, discarded),
   * and its waivers hold for this entry (src/domain/effects/waivers.ts).
   */
  uses?: string[];
  /**
   * What the player chose for the component the entry plays (its component action), by the names its effect asks for
   * (`Ability.choose`): a planet id, a system slot, a player (`me` or an opponent id), a unit type, a number.
   * On an entry with no component action it goes to the components it uses.
   */
  choices?: Record<string, string | number>;
  /** The same for a component named in `uses`, by component id; it wins over `choices`, and is the one the editor writes. */
  useChoices?: Record<string, Record<string, string | number>>;
};

export type TurnFacts = TurnBody & { id: string; phase: Phase; status: EntryStatus;
  /** The opponent this is expected of; without it the entry is mine. */ owner?: string };

/** A round as the rules read it: its card choices and its turns. */
export interface RoundFacts { number: number; strategyCard: number | null; backupCard: number | null; entries: TurnFacts[]; }

/** The facts of a turn: what its action did, in the shape the rules and the components read. */
export function factsOf(table: Table, turn: Turn): TurnFacts {
  const action = turn.action;
  const owner = legacyPlayer(table, turn.player);
  const slotOrPlanet = (at: Place): string => ('slot' in at ? at.slot : at.planet);
  const mine = (units: Record<string, UnitCounts> | undefined): UnitCounts | undefined => units?.[turn.player];
  const common = {
    id: turn.id, status: turn.status,
    ...(owner === 'me' ? {} : { owner }),
    ...(turn.gains ? { gains: turn.gains } : {}), ...(turn.spends ? { spends: turn.spends } : {}),
    ...(turn.used.length > 0 ? { uses: turn.used.map(u => u.component) } : {}),
    ...(turn.used.some(u => u.choices) ? { useChoices: Object.fromEntries(turn.used.flatMap(u => (u.choices ? [[u.component, u.choices]] : []))) } : {}),
  };
  const acts = (): { acts: Act[] } => ({
    acts: turn.acts.map((act): Act => (act.kind === 'transaction'
      ? { kind: 'transaction', with: legacyPlayer(table, act.with), give: act.give, get: act.get }
      : { kind: 'expedition', sliceId: act.slice, payment: act.payment })),
  });
  const choices = turn.choices ? { choices: turn.choices } : {};
  switch (action.kind) {
    case 'tactical': {
      const groundLosses = action.groundCombat
        ? Object.fromEntries(Object.entries(action.groundCombat).flatMap(([planet, by]) => (mine(by) ? [[planet, mine(by)!]] : [])))
        : undefined;
      const losses = mine(action.spaceCombat);
      return {
        ...common, phase: turn.phase ?? 'action', type: 'tactical',
        systemId: action.system,
        moves: action.movement.map(f => ({ from: slotOrPlanet(f.from), units: f.units, ...(f.via ? { via: f.via } : {}), ...(f.pickupOf ? { pickupOf: f.pickupOf } : {}), ...(f.structures ? { structures: f.structures } : {}) })),
        landings: action.invasion.map(l => ({ planetId: l.planet, units: l.units, ...(l.from ? { from: l.from } : {}), ...(l.structures ? { structures: l.structures } : {}) })),
        production: action.production?.units ?? {}, payment: action.production?.payment ?? { planets: [], tradeGoods: 0 },
        ...(action.custodians ? { custodiansPayment: action.custodians } : {}),
        ...(losses ? { losses } : {}), ...(groundLosses && Object.keys(groundLosses).length > 0 ? { groundLosses } : {}),
        ...(action.fleetRemovals ? { fleetRemovals: action.fleetRemovals } : {}),
        ...(action.production?.ground ? { productionGround: action.production.ground } : {}),
        ...(action.production?.shipsTo ? { shipsTo: action.production.shipsTo } : {}),
        ...(action.free ? { free: true } : {}),
        ...acts(), ...choices,
      } as TurnFacts;
    }
    case 'strategic':
      return { ...common, phase: turn.phase ?? 'action', type: 'strategic', ...(action.card !== undefined ? { card: action.card } : {}), ...(action.forToken ? { forToken: true } : {}), ...(action.effects ? { effects: action.effects } : {}), ...acts(), ...choices } as TurnFacts;
    case 'secondary':
      return { ...common, phase: turn.phase ?? 'action', type: 'secondary', ...(action.card !== undefined ? { card: action.card } : {}), ...(action.effects ? { effects: action.effects } : {}), ...choices } as TurnFacts;
    case 'component':
      return { ...common, phase: turn.phase ?? 'action', type: 'component', note: action.note, ...(action.component !== undefined ? { componentId: action.component } : {}), ...(action.effects ? { effects: action.effects } : {}), ...(action.payment ? { payment: action.payment } : {}), ...acts(), ...choices } as TurnFacts;
    case 'pass':
      return { ...common, phase: turn.phase ?? 'action', type: 'pass', ...acts(), ...choices } as TurnFacts;
    case 'status':
      return {
        ...common, phase: turn.phase ?? 'status', type: 'statusTokens', tactic: action.tactic, fleet: action.fleet, strategy: action.strategy,
        ...(action.vp !== undefined ? { vp: action.vp } : {}),
        ...(action.opponentVp ? { opponentVp: Object.fromEntries(Object.entries(action.opponentVp).map(([id, n]) => [legacyPlayer(table, id), n])) } : {}),
        ...(action.scored ? { scored: action.scored } : {}), ...(action.spend ? { spend: action.spend } : {}), ...choices,
      } as TurnFacts;
    case 'agenda':
      return { ...common, phase: turn.phase ?? 'agenda', type: 'adjustment', label: action.label, delta: action.delta, ...(action.choices ? { choices: action.choices } : {}) } as TurnFacts;
    case 'correction':
      return { ...common, phase: turn.phase ?? 'action', type: 'adjustment', label: action.label, delta: action.delta, ...(action.purpose ? { kind: action.purpose } : {}) } as TurnFacts;
  }
}
