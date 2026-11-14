/**
 * What the kernel keeps of the old model's ids and entries: the old id of a player (`legacyId`), and the old entry a turn
 * is, for the checks that still read one (the components' conditions, the moments). Part of the kernel while the old
 * entries are read; the bridge from the old game is `fromLegacy.ts`.
 */
import type { Act, Entry, UnitCounts } from '../domain/types';
import type { Turn } from './actions';
import type { Place } from './events';
import type { PlayerId, Table } from './types';

/** The old id (`me` or an opponent id) of a player; the player's own id when the table did not come from an old game. */
export const legacyPlayer = (table: Table, player: PlayerId): string =>
  table.players.find(p => p.id === player)?.legacyId ?? player;

/** The player an old id stands for. */
export const playerOfLegacy = (table: Table, oldId: string): PlayerId | undefined =>
  table.players.find(p => (p.legacyId ?? p.id) === oldId)?.id;

/** The old entry a turn was made from, for the checks of the old code that read one. */
export function legacyEntry(table: Table, turn: Turn): Entry {
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
      } as Entry;
    }
    case 'strategic':
      return { ...common, phase: turn.phase ?? 'action', type: 'strategic', ...(action.card !== undefined ? { card: action.card } : {}), ...(action.forToken ? { forToken: true } : {}), ...(action.effects ? { effects: action.effects } : {}), ...acts(), ...choices } as Entry;
    case 'secondary':
      return { ...common, phase: turn.phase ?? 'action', type: 'secondary', ...(action.card !== undefined ? { card: action.card } : {}), ...(action.effects ? { effects: action.effects } : {}), ...choices } as Entry;
    case 'component':
      return { ...common, phase: turn.phase ?? 'action', type: 'component', note: action.note, ...(action.component !== undefined ? { componentId: action.component } : {}), ...(action.effects ? { effects: action.effects } : {}), ...(action.payment ? { payment: action.payment } : {}), ...acts(), ...choices } as Entry;
    case 'pass':
      return { ...common, phase: turn.phase ?? 'action', type: 'pass', ...acts(), ...choices } as Entry;
    case 'status':
      return {
        ...common, phase: turn.phase ?? 'status', type: 'statusTokens', tactic: action.tactic, fleet: action.fleet, strategy: action.strategy,
        ...(action.vp !== undefined ? { vp: action.vp } : {}),
        ...(action.opponentVp ? { opponentVp: Object.fromEntries(Object.entries(action.opponentVp).map(([id, n]) => [legacyPlayer(table, id), n])) } : {}),
        ...(action.scored ? { scored: action.scored } : {}), ...(action.spend ? { spend: action.spend } : {}), ...choices,
      } as Entry;
    case 'agenda':
      return { ...common, phase: turn.phase ?? 'agenda', type: 'adjustment', label: action.label, delta: action.delta, ...(action.choices ? { choices: action.choices } : {}) } as Entry;
    case 'correction':
      return { ...common, phase: turn.phase ?? 'action', type: 'adjustment', label: action.label, delta: action.delta, ...(action.purpose ? { kind: action.purpose } : {}) } as Entry;
  }
}
