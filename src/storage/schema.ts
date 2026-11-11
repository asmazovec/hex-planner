import { z } from 'zod';
import { SAVE_FORMAT, type Game } from '../domain/types';

export { SAVE_FORMAT };
/** Counts the changes of the save within `SAVE_FORMAT`. Saves of the app before that format are not read. */
export const CURRENT_SCHEMA = 1;

const count = z.number().int().min(0);
const unitId = z.enum(['carrier', 'cruiser', 'destroyer', 'dreadnought', 'warsun', 'flagship', 'fighter', 'infantry', 'mech']);
const unitCounts = z.partialRecord(unitId, count);
/** An adjustment's change of units. */
const signedCounts = z.partialRecord(unitId, z.number().int());
const payment = z.object({ planets: z.array(z.string()), tradeGoods: count });
const status = z.enum(['planned', 'done', 'cancelled']);
const phase = z.enum(['strategy', 'action', 'status', 'agenda']);

/** Component ids: `<kind>:<source id>`. One the data no longer has is kept and passed over by the replay. */
const ids = z.array(z.string());
const base = { id: z.string(), phase, status, owner: z.string().optional(), gains: ids.optional(), spends: ids.optional() };
const cardPlay = {
  card: z.number().int().optional(),
  forToken: z.boolean().optional(),
  effects: z.object({
    tokens: z.object({ tactic: z.number().int().optional(), fleet: z.number().int().optional(), strategy: z.number().int().optional() }).optional(),
    boughtTokens: count.optional(),
    researched: ids.optional(),
    systemId: z.string().optional(),
    readied: z.array(z.string()).optional(),
    speaker: z.string().optional(),
    freeSecondary: z.array(z.string()).optional(),
    mecatol: z.boolean().optional(),
    production: z.object({ systemId: z.string(), units: unitCounts, ground: z.record(z.string(), unitCounts).optional() }).optional(),
    structures: z.array(z.object({ kind: z.enum(['pds', 'spacedock']), planetId: z.string() })).optional(),
    payment: payment.optional(),
  }).optional(),
};
const goods = z.object({ tradeGoods: count.optional(), commodities: count.optional(), components: z.array(z.string()).optional() });
const act = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('expedition'), sliceId: z.string().nullable(), payment }),
  z.object({ kind: z.literal('transaction'), with: z.string(), give: goods, get: goods }),
]);
const acts = z.array(act).optional();
const entrySchema = z.discriminatedUnion('type', [
  z.object({
    ...base, type: z.literal('tactical'), systemId: z.string().nullable(),
    moves: z.array(z.object({ from: z.string(), units: unitCounts, via: z.array(z.string()).optional(), pickupOf: z.string().optional() })),
    landings: z.array(z.object({ planetId: z.string(), units: unitCounts })),
    production: unitCounts, losses: unitCounts.optional(), groundLosses: z.record(z.string(), unitCounts).optional(), fleetRemovals: unitCounts.optional(), productionGround: z.record(z.string(), unitCounts).optional(), payment, free: z.boolean().optional(), fromCard: z.string().optional(), acts,
  }),
  z.object({ ...base, ...cardPlay, type: z.literal('strategic'), acts }),
  z.object({ ...base, ...cardPlay, type: z.literal('secondary') }),
  z.object({ ...base, type: z.literal('component'), componentId: z.string().optional(), note: z.string(), choices: z.record(z.string(), z.union([z.string(), z.number()])).optional(), acts }),
  z.object({ ...base, type: z.literal('pass'), acts }),
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
    vp: z.number().optional(), opponentVp: z.record(z.string(), z.number()).optional(), scored: ids.optional(),
  }),
]);

const control = z.enum(['me', 'enemy']);
const startHoldings = z.object({
  technologies: ids.optional(), hand: ids.optional(), relics: ids.optional(), promissory: ids.optional(),
  leaders: z.record(z.string(), z.enum(['unlocked', 'exhausted', 'purged'])).optional(),
  breakthrough: z.enum(['held', 'exhausted']).optional(), scored: ids.optional(), secrets: ids.optional(),
});

export const gameSchema = z.object({
  name: z.string().optional(),
  id: z.string(),
  format: z.literal(SAVE_FORMAT),
  schemaVersion: z.number().int().min(1).max(CURRENT_SCHEMA),
  dataVersion: z.string(),
  expansions: z.array(z.enum(['pok', 'te'])),
  playerCount: z.number().int(),
  layout: z.enum(['standard', 'hyperlanes', 'alternate', 'large']),
  faction: z.string(),
  seat: z.number().int(),
  color: z.number().int(),
  vp: count,
  map: z.record(z.string(), z.string()),
  opponents: z.array(z.object({ id: z.string(), faction: z.string(), vp: z.number(), seat: z.number().int(), color: z.number().int() })),
  start: z.object({ me: startHoldings, opponents: z.record(z.string(), startHoldings) }),
  enemyUnits: z.record(z.string(), z.record(z.string(), unitCounts)),
  enemyGround: z.record(z.string(), z.record(z.string(), unitCounts)),
  planetControl: z.record(z.string(), control),
  planetOwner: z.record(z.string(), z.string()),
  docks: z.array(z.string()),
  pds: z.record(z.string(), count),
  expedition: z.object({
    slices: z.record(z.string(), z.enum(['me', 'other']).nullable()),
    thundersEdgeSystem: z.string().nullable(),
  }),
  fracture: z.object({ active: z.boolean(), ingress: z.array(z.string()), seat: z.number().nullable(), tiles: z.record(z.string(), z.string()).optional() }),
  plans: z.array(z.object({
    id: z.string(), name: z.string(),
    rounds: z.array(z.object({
      number: z.number().int(), strategyCard: z.number().nullable(), backupCard: z.number().nullable(),
      entries: z.array(entrySchema),
    })),
  })),
  activePlanId: z.string(),
}).superRefine((game, ctx) => {
  // The seats are the players: one each, numbered from 1, and as many as the game counts. A file that disagrees with
  // itself would seat two players on one home or leave a home with nobody.
  if (game.playerCount !== game.opponents.length + 1) {
    ctx.addIssue({ code: 'custom', path: ['playerCount'], message: `${game.playerCount} players, but ${game.opponents.length} opponents and me` });
  }
  const taken = new Set<number>();
  const seat = (value: number, path: (string | number)[]) => {
    if (value < 1 || value > game.playerCount) ctx.addIssue({ code: 'custom', path, message: `seat ${value} is outside 1..${game.playerCount}` });
    else if (taken.has(value)) ctx.addIssue({ code: 'custom', path, message: `seat ${value} is taken twice` });
    taken.add(value);
  };
  seat(game.seat, ['seat']);
  game.opponents.forEach((opponent, i) => seat(opponent.seat, ['opponents', i, 'seat']));
}) satisfies z.ZodType<Game>;

/** The number of the format in a mark like `ti4-planner/3`; null for anything else. */
function formatNumber(mark: unknown): number | null {
  const [name] = SAVE_FORMAT.split('/');
  const found = typeof mark === 'string' && mark.startsWith(`${name}/`) ? /^\d+$/.exec(mark.slice(name.length + 1)) : null;
  return found ? Number(found[0]) : null;
}

export type ParsedGame =
  | { ok: true; game: Game }
  /** `oldFormat`: saved by the app before `SAVE_FORMAT`. `newerVersion`: a format or a schema this app does not know yet. */
  | { ok: false; kind: 'oldFormat' | 'newerVersion' | 'damaged'; reason: string };

/**
 * Reads what a save or a file holds as a game. Nothing is brought up from an earlier shape: an object without the
 * format mark, or with an earlier or unknown one, is of an earlier version of the app and is refused as such; a mark
 * with a later number is of a newer version. Never throws.
 */
export function parseGame(raw: unknown): ParsedGame {
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
  const parsed = gameSchema.safeParse(raw);
  if (parsed.success) return { ok: true, game: parsed.data };
  const issue = parsed.error.issues[0];
  return { ok: false, kind: 'damaged', reason: issue ? `${issue.path.join('.') || 'game'}: ${issue.message}` : 'invalid save' };
}
