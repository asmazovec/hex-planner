import { type ExpansionId, type MapLayout, type DataPack, SAVE_FORMAT } from '../../../domain/types';
import type { Game } from './types';
import { type IdMaker, timeIdMaker, makeId } from '../../../domain/newGame';
import { defaultLayout, templateOf, slotKeyOf } from '../../../domain/layouts';
import { seatSlots } from '../../../domain/mapBuilder';
import { startStructures } from '../../../domain/startStructures';
import { startForFaction, genericNotes } from '../../../domain/holdings';

export function createGame(
  input: { expansions: ExpansionId[]; playerCount: number; faction: string; layout?: MapLayout },
  pack: DataPack,
  newId: IdMaker = timeIdMaker,
): Game {
  const faction = pack.factions[input.faction];
  const layout = input.layout ?? defaultLayout(input.playerCount, pack);
  const template = templateOf(input.playerCount, pack, layout);
  const map: Record<string, string> = {};
  for (const slot of template?.slots ?? []) if (slot.fixed) map[slotKeyOf(slot.q, slot.r)] = slot.fixed;
  const firstSeat = seatSlots(input.playerCount, pack, template?.layout ?? layout)[0];
  if (faction && firstSeat && !map[firstSeat]) map[firstSeat] = faction.gateTile ?? faction.homeTile;
  const start = startStructures(input.faction, pack);
  const planetControl: Game['planetControl'] = {};
  for (const planetId of pack.tiles[faction?.homeTile ?? '']?.planetIds ?? []) planetControl[planetId] = 'me';
  const planId = makeId('plan', newId);
  const gameId = makeId('game', newId);
  const opponents = Array.from({ length: Math.max(0, input.playerCount - 1) }, (_, i) => ({ id: makeId('opponent', newId), faction: '', vp: 0, seat: i + 2, color: i + 2 }));
  return {
    id: gameId,
    format: SAVE_FORMAT,
    schemaVersion: 1,
    dataVersion: pack.version,
    expansions: [...input.expansions],
    playerCount: input.playerCount,
    layout: template?.layout ?? layout,
    faction: input.faction,
    seat: 1,
    color: 1,
    vp: 0,
    map,
    opponents,
    // Every player begins with the generic notes of their colour (69); the faction brings its own.
    start: {
      me: startForFaction({ promissory: genericNotes(pack, 'me') }, '', input.faction, pack),
      opponents: Object.fromEntries(opponents.map(o => [o.id, { promissory: genericNotes(pack, o.id) }])),
    },
    enemyUnits: {},
    enemyGround: {},
    planetControl,
    planetOwner: {},
    docks: start.docks,
    pds: start.pds,
    expedition: { slices: {}, thundersEdgeSystem: null },
    fracture: { active: false, ingress: [], seat: null },
    plans: [{ id: planId, name: 'Plan 1', rounds: [{ number: 1, strategyCard: null, backupCard: null, entries: [] }] }],
    activePlanId: planId,
  };
}
