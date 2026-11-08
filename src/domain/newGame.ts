import { defaultLayout, slotKeyOf, templateOf } from './layouts';
import { seatSlots } from './mapBuilder';
import type { DataPack, ExpansionId, Game, MapLayout } from './types';

let counter = 0;
/** No browser or node API: an id only has to be unique within one user's local games. */
// TODO(P2-055) #ws:domain-purity #type:arch #size:s #purity — Date.now, Math.random и счётчик модуля в домене: генератор id передавать параметром, как newId в losses.ts
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${counter}`;
}

export { slotKeyOf };

export function createGame(
  input: { expansions: ExpansionId[]; playerCount: number; faction: string; layout?: MapLayout },
  pack: DataPack,
): Game {
  const faction = pack.factions[input.faction];
  const layout = input.layout ?? defaultLayout(input.playerCount, pack);
  const template = templateOf(input.playerCount, pack, layout);
  const map: Record<string, string> = {};
  for (const slot of template?.slots ?? []) if (slot.fixed) map[slotKeyOf(slot.q, slot.r)] = slot.fixed;
  const firstSeat = seatSlots(input.playerCount, pack, template?.layout ?? layout)[0];
  if (faction && firstSeat && !map[firstSeat]) map[firstSeat] = faction.gateTile ?? faction.homeTile;
  const planetControl: Game['planetControl'] = {};
  for (const planetId of pack.tiles[faction?.homeTile ?? '']?.planetIds ?? []) planetControl[planetId] = 'me';
  const planId = makeId('plan');
  return {
    id: makeId('game'),
    schemaVersion: 4,
    dataVersion: pack.version,
    expansions: [...input.expansions],
    playerCount: input.playerCount,
    layout: template?.layout ?? layout,
    faction: input.faction,
    seat: 1,
    color: 1,
    vp: 0,
    map,
    opponents: Array.from({ length: Math.max(0, input.playerCount - 1) }, (_, i) => ({ id: makeId('opponent'), faction: '', vp: 0, seat: i + 2, color: i + 2 })),
    upgrades: { me: [], opponents: {} },
    enemyUnits: {},
    enemyGround: {},
    planetControl,
    planetOwner: {},
    docks: pack.tiles[faction?.homeTile ?? '']?.planetIds.slice(0, 1) ?? [],
    pds: {},
    expedition: { slices: {}, thundersEdgeSystem: null },
    fracture: { active: false, ingress: [], seat: null },
    plans: [{ id: planId, name: 'Plan 1', rounds: [{ number: 1, strategyCard: null, backupCard: null, entries: [] }] }],
    activePlanId: planId,
  };
}
