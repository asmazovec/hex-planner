import { z } from 'zod';
import type { Game } from '../domain/types';

export const CURRENT_SCHEMA = 1;

const count = z.number().int().min(0);
const unitId = z.enum(['carrier', 'cruiser', 'destroyer', 'dreadnought', 'warsun', 'flagship', 'fighter', 'infantry', 'mech']);
const unitCounts = z.partialRecord(unitId, count);
const payment = z.object({ planets: z.array(z.string()), tradeGoods: count });
const status = z.enum(['planned', 'done', 'cancelled']);
const phase = z.enum(['strategy', 'action', 'status', 'agenda']);

const base = { id: z.string(), phase, status };
const entrySchema = z.discriminatedUnion('type', [
  z.object({
    ...base, type: z.literal('tactical'), systemId: z.string().nullable(),
    moves: z.array(z.object({ from: z.string(), units: unitCounts })),
    landings: z.array(z.object({ planetId: z.string(), units: unitCounts })),
    production: unitCounts, payment,
  }),
  z.object({ ...base, type: z.literal('strategic') }),
  z.object({ ...base, type: z.literal('secondary') }),
  z.object({ ...base, type: z.literal('component'), note: z.string() }),
  z.object({ ...base, type: z.literal('pass') }),
  z.object({ ...base, type: z.literal('expedition'), sliceId: z.string().nullable(), payment }),
  z.object({
    ...base, type: z.literal('adjustment'), label: z.string(),
    delta: z.object({
      tradeGoods: z.number().optional(), tactic: z.number().optional(), fleet: z.number().optional(),
      strategy: z.number().optional(), vp: z.number().optional(),
      units: z.object({ systemId: z.string(), units: unitCounts }).optional(),
    }),
  }),
  z.object({ ...base, type: z.literal('statusTokens'), tactic: z.number(), fleet: z.number(), strategy: z.number() }),
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
  map: z.record(z.string(), z.string()),
  opponents: z.array(z.object({ faction: z.string(), vp: z.number() })),
  enemyUnits: z.record(z.string(), unitCounts),
  planetControl: z.record(z.string(), control),
  docks: z.array(z.string()),
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

/** Brings a parsed file of an older schema up to CURRENT_SCHEMA, one version at a time. */
export function migrate(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  let doc = raw as Record<string, unknown>;
  // Version 0 files had the same shape; only the version marker changed.
  if (doc.schemaVersion === 0) doc = { ...doc, schemaVersion: 1 };
  return doc;
}
