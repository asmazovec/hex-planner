import { z } from 'zod';
import type { Game } from '../domain/types';

export const CURRENT_SCHEMA = 4;

const count = z.number().int().min(0);
const unitId = z.enum(['carrier', 'cruiser', 'destroyer', 'dreadnought', 'warsun', 'flagship', 'fighter', 'infantry', 'mech']);
const unitCounts = z.partialRecord(unitId, count);
/** An adjustment's change of units. */
const signedCounts = z.partialRecord(unitId, z.number().int());
const payment = z.object({ planets: z.array(z.string()), tradeGoods: count });
const status = z.enum(['planned', 'done', 'cancelled']);
const phase = z.enum(['strategy', 'action', 'status', 'agenda']);

const base = { id: z.string(), phase, status };
const cardPlay = {
  upgrades: z.array(unitId).optional(),
  card: z.number().int().optional(),
  forToken: z.boolean().optional(),
  effects: z.object({
    tokens: z.object({ tactic: z.number().int().optional(), fleet: z.number().int().optional(), strategy: z.number().int().optional() }).optional(),
    boughtTokens: count.optional(),
    systemId: z.string().optional(),
    readied: z.array(z.string()).optional(),
    speaker: z.string().optional(),
    freeSecondary: z.array(z.string()).optional(),
    mecatol: z.boolean().optional(),
    production: z.object({ systemId: z.string(), units: unitCounts }).optional(),
    structures: z.array(z.object({ kind: z.enum(['pds', 'spacedock']), planetId: z.string() })).optional(),
    payment: payment.optional(),
  }).optional(),
};
const entrySchema = z.discriminatedUnion('type', [
  z.object({
    ...base, type: z.literal('tactical'), systemId: z.string().nullable(),
    moves: z.array(z.object({ from: z.string(), units: unitCounts })),
    landings: z.array(z.object({ planetId: z.string(), units: unitCounts })),
    production: unitCounts, payment, free: z.boolean().optional(), fromCard: z.string().optional(),
  }),
  z.object({ ...base, ...cardPlay, type: z.literal('strategic') }),
  z.object({ ...base, ...cardPlay, type: z.literal('secondary') }),
  z.object({ ...base, type: z.literal('component'), note: z.string() }),
  z.object({ ...base, type: z.literal('pass') }),
  z.object({ ...base, type: z.literal('expedition'), sliceId: z.string().nullable(), payment }),
  z.object({
    ...base, type: z.literal('adjustment'), label: z.string(), kind: z.enum(['losses', 'build', 'setup']).optional(),
    delta: z.object({
      tradeGoods: z.number().optional(), tactic: z.number().optional(), fleet: z.number().optional(),
      strategy: z.number().optional(), vp: z.number().optional(),
      units: z.object({ systemId: z.string(), units: signedCounts }).optional(),
      ground: z.record(z.string(), signedCounts).optional(),
    }),
  }),
  z.object({
    ...base, type: z.literal('statusTokens'), tactic: z.number(), fleet: z.number(), strategy: z.number(),
    vp: z.number().optional(), opponentVp: z.record(z.string(), z.number()).optional(),
  }),
]);

const control = z.enum(['me', 'enemy']);

export const gameSchema = z.object({
  id: z.string(),
  schemaVersion: z.number().int().min(1).max(CURRENT_SCHEMA),
  dataVersion: z.string(),
  expansions: z.array(z.enum(['pok', 'te'])),
  playerCount: z.number().int(),
  layout: z.enum(['standard', 'hyperlanes']).default('standard'),
  faction: z.string(),
  seat: z.number().int(),
  color: z.number().int(),
  vp: count,
  map: z.record(z.string(), z.string()),
  opponents: z.array(z.object({ id: z.string(), faction: z.string(), vp: z.number(), seat: z.number().int(), color: z.number().int() })),
  upgrades: z.object({ me: z.array(unitId), opponents: z.record(z.string(), z.array(unitId)) }),
  enemyUnits: z.record(z.string(), z.record(z.string(), unitCounts)),
  planetControl: z.record(z.string(), control),
  planetOwner: z.record(z.string(), z.string()),
  docks: z.array(z.string()),
  pds: z.record(z.string(), count),
  expedition: z.object({
    slices: z.record(z.string(), z.enum(['me', 'other']).nullable()),
    thundersEdgeSystem: z.string().nullable(),
  }),
  fracture: z.object({ active: z.boolean(), ingress: z.array(z.string()), seat: z.number().nullable().default(null) }),
  plans: z.array(z.object({
    id: z.string(), name: z.string(),
    rounds: z.array(z.object({
      number: z.number().int(), strategyCard: z.number().nullable(), backupCard: z.number().nullable(),
      entries: z.array(entrySchema),
    })),
  })),
  activePlanId: z.string(),
}) satisfies z.ZodType<Game>;

/** Games saved before seats existed: seats and colours go in list order, my faction first. */
function withSeats(doc: Record<string, unknown>): Record<string, unknown> {
  const opponents = doc.opponents as Record<string, unknown>[];
  return {
    ...doc,
    seat: doc.seat ?? 1,
    color: doc.color ?? 1,
    vp: doc.vp ?? 0,
    opponents: opponents.map((o, i) => ({ ...o, seat: o.seat ?? i + 2, color: o.color ?? i + 2 })),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Version 1 had opponents without ids and enemies without an owner: each opponent gets an id, and old enemy units and
 * enemy planets go to the first opponent. The ids are fixed by list position, since a migrated game is not written back
 * until its next edit and may be migrated again. A game with no opponents has nowhere to put old enemy units: they are
 * dropped.
 */
function withOwners(doc: Record<string, unknown>): Record<string, unknown> {
  const opponents = (doc.opponents as Record<string, unknown>[]).map((o, i) => ({ ...o, id: `opponent-${i + 1}` }));
  const first = opponents[0]?.id;
  const { enemyUnits, planetControl } = doc;
  const movedUnits = isRecord(enemyUnits) && first
    ? Object.fromEntries(Object.entries(enemyUnits).map(([slot, units]) => [slot, { [first]: units }]))
    : isRecord(enemyUnits) ? {} : enemyUnits;
  const planetOwner = isRecord(planetControl) && first
    ? Object.fromEntries(Object.keys(planetControl).filter(id => planetControl[id] === 'enemy').map(id => [id, first]))
    : {};
  return { ...doc, schemaVersion: 2, opponents, enemyUnits: movedUnits, planetOwner };
}

/** Brings a parsed file of an older schema up to CURRENT_SCHEMA, one version at a time. */
export function migrate(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  let doc = raw as Record<string, unknown>;
  // Version 0 files had the same shape; only the version marker changed.
  if (doc.schemaVersion === 0) doc = { ...doc, schemaVersion: 1 };
  if (!Array.isArray(doc.opponents)) return doc;
  doc = withSeats(doc);
  if (doc.schemaVersion === 1) doc = withOwners(doc);
  if (doc.schemaVersion === 2) doc = { ...doc, schemaVersion: 3, upgrades: { me: [], opponents: {} } };
  return doc.schemaVersion === 3 ? { ...doc, schemaVersion: 4, pds: {} } : doc;
}
