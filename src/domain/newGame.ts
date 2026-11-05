import type { DataPack, ExpansionId, Game } from './types';

let counter = 0;
/** No browser or node API: an id only has to be unique within one user's local games. */
function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${counter}`;
}

/** Slot key of a map position: `"<q>,<r>"`. */
export const slotKeyOf = (q: number, r: number): string => `${q},${r}`;

export function createGame(
  input: { expansions: ExpansionId[]; playerCount: number; faction: string },
  pack: DataPack,
): Game {
  const faction = pack.factions[input.faction];
  const template = pack.templates.find(t => t.playerCount === input.playerCount);
  const map: Record<string, string> = {};
  for (const slot of template?.slots ?? []) if (slot.fixed) map[slotKeyOf(slot.q, slot.r)] = slot.fixed;
  const planetControl: Game['planetControl'] = {};
  for (const planetId of pack.tiles[faction?.homeTile ?? '']?.planetIds ?? []) planetControl[planetId] = 'me';
  const planId = makeId('plan');
  return {
    id: makeId('game'),
    schemaVersion: 1,
    dataVersion: pack.version,
    expansions: [...input.expansions],
    playerCount: input.playerCount,
    faction: input.faction,
    map,
    opponents: Array.from({ length: Math.max(0, input.playerCount - 1) }, () => ({ faction: '', vp: 0 })),
    enemyUnits: {},
    planetControl,
    docks: pack.tiles[faction?.homeTile ?? '']?.planetIds.slice(0, 1) ?? [],
    expedition: { slices: {}, thundersEdgeSystem: null },
    fracture: { active: false, ingress: [], seat: null },
    plans: [{ id: planId, name: 'Plan 1', rounds: [{ number: 1, strategyCard: null, backupCard: null, entries: [] }] }],
    activePlanId: planId,
  };
}
