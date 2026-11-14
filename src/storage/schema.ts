import { z } from 'zod';
import { SAVE_FORMAT } from '../domain/types';
import type { Action, Turn } from '../game/actions';
import type { Round } from '../game/round';
import type { SavedGame } from '../game/save';

export { SAVE_FORMAT };
/** Counts the changes of the save within `SAVE_FORMAT`. Saves of the app before that format are not read. */
export const CURRENT_SCHEMA = 1;

const count = z.number().int().min(0);
const unitId = z.enum(['carrier', 'cruiser', 'destroyer', 'dreadnought', 'warsun', 'flagship', 'fighter', 'infantry', 'mech']);
const unitCounts = z.partialRecord(unitId, count);
const structureCounts = z.partialRecord(z.enum(['pds', 'spacedock']), count).optional();
/** An adjustment's change of units. */
const signedCounts = z.partialRecord(unitId, z.number().int());
const payment = z.object({ planets: z.array(z.string()), tradeGoods: count });
const status = z.enum(['planned', 'done', 'cancelled']);
const phase = z.enum(['strategy', 'action', 'status', 'agenda']);

/** Component ids: `<kind>:<source id>`. One the data no longer has is kept and passed over by the replay. */
const ids = z.array(z.string());
const choices = z.record(z.string(), z.union([z.string(), z.number()]));
const cardEffects = z.object({
    tokens: z.object({ tactic: z.number().int().optional(), fleet: z.number().int().optional(), strategy: z.number().int().optional() }).optional(),
    boughtTokens: count.optional(),
    researched: ids.optional(),
    specialties: ids.optional(),
    systemId: z.string().optional(),
    readied: z.array(z.string()).optional(),
    speaker: z.string().optional(),
    freeSecondary: z.array(z.string()).optional(),
    mecatol: z.boolean().optional(),
    production: z.object({ systemId: z.string(), units: unitCounts, ground: z.record(z.string(), unitCounts).optional() }).optional(),
    structures: z.array(z.object({ kind: z.enum(['pds', 'spacedock']), planetId: z.string() })).optional(),
    payment: payment.optional(),
});
const statusSpend = z.object({
  tactic: z.number().optional(), fleet: z.number().optional(), strategy: z.number().optional(), tradeGoods: z.number().optional(),
  resources: payment.optional(), influence: payment.optional(),
});
const goods = z.object({ tradeGoods: count.optional(), commodities: count.optional(), components: z.array(z.string()).optional() });
const adjustmentDelta = z.object({
  tradeGoods: z.number().optional(), commodities: z.number().optional(), tactic: z.number().optional(), fleet: z.number().optional(),
  strategy: z.number().optional(), vp: z.number().optional(),
  units: z.object({ systemId: z.string(), units: signedCounts }).optional(),
  ground: z.record(z.string(), signedCounts).optional(),
});
const place = z.union([z.object({ slot: z.string() }), z.object({ planet: z.string() })]);
const transaction = z.object({ kind: z.literal('transaction'), with: z.string(), give: goods, get: goods });
const expedition = z.object({ kind: z.literal('expedition'), slice: z.string().nullable(), payment });
const byPlayer = <T extends z.ZodType>(value: T) => z.record(z.string(), value);
const action: z.ZodType<Action> = z.lazy(() => z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('tactical'), system: z.string().nullable(), free: z.boolean().optional(),
    movement: z.array(z.object({ from: place, units: unitCounts, via: z.array(z.string()).optional(), pickupOf: z.string().optional(), structures: structureCounts })),
    spaceCombat: byPlayer(unitCounts).optional(),
    invasion: z.array(z.object({ planet: z.string(), units: unitCounts, from: z.string().optional(), structures: structureCounts })),
    groundCombat: z.record(z.string(), byPlayer(unitCounts)).optional(),
    production: z.object({ units: unitCounts, ground: z.record(z.string(), unitCounts).optional(), shipsTo: z.string().optional(), payment }).optional(),
    fleetRemovals: unitCounts.optional(), custodians: payment.optional(),
  }),
  z.object({ kind: z.literal('strategic'), card: z.number().int().optional(), forToken: z.boolean().optional(), effects: cardEffects.optional(), nested: z.array(turn).optional() }),
  z.object({ kind: z.literal('secondary'), card: z.number().int().optional(), effects: cardEffects.optional() }),
  z.object({ kind: z.literal('component'), component: z.string().optional(), note: z.string(), effects: cardEffects.optional(), payment: payment.optional() }),
  z.object({ kind: z.literal('pass') }),
  z.object({
    kind: z.literal('status'), tactic: z.number(), fleet: z.number(), strategy: z.number(), vp: z.number().optional(),
    opponentVp: byPlayer(z.number()).optional(), scored: ids.optional(), spend: statusSpend.optional(),
  }),
  z.object({ kind: z.literal('agenda'), label: z.string(), delta: adjustmentDelta, choices: choices.optional() }),
  z.object({ kind: z.literal('correction'), label: z.string(), delta: adjustmentDelta, purpose: z.enum(['losses', 'build', 'setup']).optional() }),
]));
const turn: z.ZodType<Turn> = z.lazy(() => z.object({
  id: z.string(), player: z.string(), phase: phase.optional(), status, action,
  acts: z.array(z.union([transaction, expedition])),
  used: z.array(z.object({ component: z.string(), choices: choices.optional() })),
  gains: ids.optional(), spends: ids.optional(), choices: choices.optional(),
}));
const round: z.ZodType<Round> = z.object({
  number: z.number().int(), strategyCard: z.number().nullable(), backupCard: z.number().nullable(), held: z.array(z.number().int()), turns: z.array(turn),
});

const startHoldings = z.object({
  technologies: ids.optional(), hand: ids.optional(), relics: ids.optional(), promissory: ids.optional(),
  leaders: z.record(z.string(), z.enum(['unlocked', 'exhausted', 'purged'])).optional(),
  breakthrough: z.enum(['held', 'exhausted']).optional(), scored: ids.optional(), secrets: ids.optional(), found: ids.optional(),
});

const setup = z.object({ technologies: ids.optional(), structurePlanet: z.string().optional() });
const table = z.object({
  id: z.string(), name: z.string(), expansions: z.array(z.enum(['pok', 'te'])),
  layout: z.enum(['standard', 'hyperlanes', 'alternate', 'large']), map: z.record(z.string(), z.string()),
  players: z.array(z.object({ id: z.string(), faction: z.string(), seat: z.number().int(), color: z.number().int(), setup, legacyId: z.string().optional() })),
  viewer: z.string(),
});
const start = z.object({
  points: z.record(z.string(), z.number()),
  holdings: z.record(z.string(), startHoldings),
  units: z.record(z.string(), z.record(z.string(), unitCounts)),
  ground: z.record(z.string(), z.record(z.string(), unitCounts)),
  control: z.record(z.string(), z.string()),
  docks: z.array(z.string()),
  pds: z.record(z.string(), count),
  expedition: z.object({ slices: z.record(z.string(), z.string().nullable()), thundersEdgeSystem: z.string().nullable() }),
  fracture: z.object({ active: z.boolean(), ingress: z.array(z.string()), seat: z.number().nullable(), tiles: z.record(z.string(), z.string()).optional() }),
});

export const savedSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  format: z.literal(SAVE_FORMAT),
  schemaVersion: z.number().int().min(1).max(CURRENT_SCHEMA),
  dataVersion: z.string(),
  table,
  start,
  plans: z.array(z.object({ id: z.string(), name: z.string(), rounds: z.array(round) })),
  activePlanId: z.string(),
}).superRefine((saved, ctx) => {
  // The seats are the players: one each, numbered from 1; a player outside the table (a stray of a scratch game) sits past the eighth.
  const seated = saved.table.players.filter(p => p.seat < 100);
  const taken = new Set<number>();
  saved.table.players.forEach((p, i) => {
    const path = ['table', 'players', i, 'seat'];
    if (p.seat < 100 && (p.seat < 1 || p.seat > seated.length)) ctx.addIssue({ code: 'custom', path, message: `seat ${p.seat} is outside 1..${seated.length}` });
    else if (taken.has(p.seat)) ctx.addIssue({ code: 'custom', path, message: `seat ${p.seat} is taken twice` });
    taken.add(p.seat);
  });
  if (!saved.table.players.some(p => p.id === saved.table.viewer)) ctx.addIssue({ code: 'custom', path: ['table', 'viewer'], message: 'the viewer is not a player' });
}) satisfies z.ZodType<SavedGame>;

/** The number of the format in a mark like `ti4-planner/3`; null for anything else. */
function formatNumber(mark: unknown): number | null {
  const [name] = SAVE_FORMAT.split('/');
  const found = typeof mark === 'string' && mark.startsWith(`${name}/`) ? /^\d+$/.exec(mark.slice(name.length + 1)) : null;
  return found ? Number(found[0]) : null;
}

export type ParsedSave =
  | { ok: true; saved: SavedGame }
  /** `oldFormat`: saved by the app before `SAVE_FORMAT`. `newerVersion`: a format or a schema this app does not know yet. */
  | { ok: false; kind: 'oldFormat' | 'newerVersion' | 'damaged'; reason: string };

/**
 * Reads what a save or a file holds as a game. Nothing is brought up from an earlier shape: an object without the
 * format mark, or with an earlier or unknown one, is of an earlier version of the app and is refused as such; a mark
 * with a later number is of a newer version. Never throws.
 */
export function parseSaved(raw: unknown): ParsedSave {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, kind: 'damaged', reason: 'not a game' };
  const { format, schemaVersion } = raw as { format?: unknown; schemaVersion?: unknown };
  if (format !== SAVE_FORMAT) {
    const [known, saved] = [formatNumber(SAVE_FORMAT), formatNumber(format)];
    if (known !== null && saved !== null && saved > known) return { ok: false, kind: 'newerVersion', reason: `format ${String(format)} is newer than ${SAVE_FORMAT}` };
    return { ok: false, kind: 'oldFormat', reason: 'saved by an earlier version of the app' };
  }
  if (typeof schemaVersion === 'number' && schemaVersion > CURRENT_SCHEMA) {
    return { ok: false, kind: 'newerVersion', reason: `schema ${schemaVersion} is newer than ${CURRENT_SCHEMA}` };
  }
  const parsed = savedSchema.safeParse(raw);
  if (parsed.success) return { ok: true, saved: parsed.data };
  const issue = parsed.error.issues[0];
  return { ok: false, kind: 'damaged', reason: issue ? `${issue.path.join('.') || 'game'}: ${issue.message}` : 'invalid save' };
}
