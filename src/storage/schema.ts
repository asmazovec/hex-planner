import { z } from 'zod';
import { loadPack } from '../data/loadPack';
import { withoutRetiredLayout } from '../domain/retiredLayouts';
import type { Game } from '../domain/types';

export const CURRENT_SCHEMA = 6;

const count = z.number().int().min(0);
const unitId = z.enum(['carrier', 'cruiser', 'destroyer', 'dreadnought', 'warsun', 'flagship', 'fighter', 'infantry', 'mech']);
/** What an upgrade improves: a unit, or a structure (PDS II, Space Dock II). */
const upgradeId = z.enum([...unitId.options, 'pds', 'spacedock']);
const unitCounts = z.partialRecord(unitId, count);
/** An adjustment's change of units. */
const signedCounts = z.partialRecord(unitId, z.number().int());
const payment = z.object({ planets: z.array(z.string()), tradeGoods: count });
const status = z.enum(['planned', 'done', 'cancelled']);
const phase = z.enum(['strategy', 'action', 'status', 'agenda']);

const base = { id: z.string(), phase, status, owner: z.string().optional() };
const cardPlay = {
  upgrades: z.array(upgradeId).optional(),
  card: z.number().int().optional(),
  forToken: z.boolean().optional(),
  effects: z.object({
    tokens: z.object({ tactic: z.number().int().optional(), fleet: z.number().int().optional(), strategy: z.number().int().optional() }).optional(),
    boughtTokens: count.optional(),
    researched: count.optional(),
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
const goods = z.object({ tradeGoods: count.optional(), commodities: count.optional(), note: z.boolean().optional() });
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
  z.object({ ...base, type: z.literal('component'), note: z.string(), acts }),
  z.object({ ...base, type: z.literal('pass'), acts }),
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
  name: z.string().optional(),
  id: z.string(),
  schemaVersion: z.number().int().min(1).max(CURRENT_SCHEMA),
  dataVersion: z.string(),
  expansions: z.array(z.enum(['pok', 'te'])),
  playerCount: z.number().int(),
  layout: z.enum(['standard', 'hyperlanes', 'alternate', 'large']).default('standard'),
  faction: z.string(),
  seat: z.number().int(),
  color: z.number().int(),
  vp: count,
  map: z.record(z.string(), z.string()),
  opponents: z.array(z.object({ id: z.string(), faction: z.string(), vp: z.number(), seat: z.number().int(), color: z.number().int() })),
  upgrades: z.object({ me: z.array(upgradeId), opponents: z.record(z.string(), z.array(upgradeId)) }),
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
  fracture: z.object({ active: z.boolean(), ingress: z.array(z.string()), seat: z.number().nullable().default(null), tiles: z.record(z.string(), z.string()).optional() }),
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

/** A file can hold seats no game can: the first holder of a valid seat keeps it, everyone else takes the lowest free one. A seat that is no whole number is left for the schema to refuse. */
function withValidSeats(doc: Record<string, unknown>): Record<string, unknown> {
  const opponents = doc.opponents as Record<string, unknown>[];
  const seats = [doc.seat, ...opponents.map(o => o.seat)];
  if (!seats.every(Number.isInteger)) return doc;
  const taken = new Set<number>();
  const kept = (seats as number[]).map(seat => {
    if (seat < 1 || seat > seats.length || taken.has(seat)) return null;
    taken.add(seat);
    return seat;
  });
  if (!kept.includes(null)) return doc;
  const fixed = kept.map(seat => {
    if (seat !== null) return seat;
    let free = 1;
    while (taken.has(free)) free += 1;
    taken.add(free);
    return free;
  });
  return { ...doc, seat: fixed[0], opponents: opponents.map((o, i) => ({ ...o, seat: fixed[i + 1] })) };
}

/** The count of players is the opponents and me; a file that disagrees is corrected. A count that is no number is left for the schema to refuse. */
function withPlayerCount(doc: Record<string, unknown>): Record<string, unknown> {
  if (!Number.isInteger(doc.playerCount)) return doc;
  return { ...doc, playerCount: (doc.opponents as unknown[]).length + 1 };
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

/** Enemy infantry and mechs get a planet: the first of their system. Without a planet they stay in space. */
function withEnemyGround(doc: Record<string, unknown>): Record<string, unknown> {
  const { enemyUnits, map, expansions } = doc;
  if (!isRecord(enemyUnits) || !isRecord(map)) return { ...doc, enemyGround: {} };
  const pack = loadPack((Array.isArray(expansions) ? expansions : []).filter(e => e === 'pok' || e === 'te'));
  const enemyGround: Record<string, Record<string, Record<string, unknown>>> = {};
  const space = Object.fromEntries(Object.entries(enemyUnits).flatMap(([slot, byOwner]) => {
    const planet = pack.tiles[String(map[slot]).split('@')[0]]?.planetIds[0];
    if (!planet || !isRecord(byOwner)) return [[slot, byOwner]];
    const owners = Object.entries(byOwner).flatMap(([owner, units]) => {
      if (!isRecord(units)) return [[owner, units]];
      const { infantry, mech, ...ships } = units;
      const ground = { ...(infantry === undefined ? {} : { infantry }), ...(mech === undefined ? {} : { mech }) };
      if (Object.keys(ground).length > 0) (enemyGround[planet] ??= {})[owner] = ground;
      return Object.keys(ships).length > 0 ? [[owner, ships]] : [];
    });
    return owners.length > 0 ? [[slot, Object.fromEntries(owners)]] : [];
  }));
  return { ...doc, enemyUnits: space, enemyGround };
}

/**
 * Version 5 dropped the seven-player map without hyperlanes, which the rules do not have: such a game moves to the
 * rulebook's seven-player map (`withoutRetiredLayout`). A file the schema would refuse is left for it to refuse.
 */
function withRulebookLayout(doc: Record<string, unknown>): Record<string, unknown> {
  const next = { ...doc, schemaVersion: 5 };
  if (doc.playerCount !== 7 || (doc.layout !== undefined && doc.layout !== 'standard')) return next;
  const parsed = gameSchema.safeParse(next);
  if (!parsed.success) return next;
  return withoutRetiredLayout(parsed.data, loadPack(parsed.data.expansions)) as unknown as Record<string, unknown>;
}

/**
 * Version 6 makes an expedition an act of a turn: an expedition entry joins the turn of its owner right before it, with
 * nothing but other expeditions between, so the order of play stays what it was; Warfare's free tactical action belongs
 * to its card, so an expedition after it joins the card. A cancelled expedition, or one with no such turn, stays an entry.
 */
function withActs(doc: Record<string, unknown>): Record<string, unknown> {
  const turns = ['tactical', 'strategic', 'component', 'pass'];
  type Raw = Record<string, unknown>;
  const ownerOf = (e: Raw) => (typeof e.owner === 'string' ? e.owner : 'me');
  const plans = Array.isArray(doc.plans) ? doc.plans : [];
  return {
    ...doc, schemaVersion: 6,
    plans: plans.map((plan: Raw) => ({
      ...plan,
      rounds: (Array.isArray(plan.rounds) ? plan.rounds : []).map((round: Raw) => {
        const entries: Raw[] = (Array.isArray(round.entries) ? round.entries : []).map((e: Raw) => ({ ...e }));
        const partOfCard = (o: Raw) => o.type === 'tactical' && typeof o.fromCard === 'string';
        const kept = entries.filter((e, i) => {
          if (e.type !== 'expedition' || e.status === 'cancelled') return true;
          const host = entries.slice(0, i).reverse().find(o => o.type !== 'expedition' && !partOfCard(o));
          const joins = host !== undefined && turns.includes(host.type as string) && ownerOf(host) === ownerOf(e) && host.status !== 'cancelled'
            && entries.slice(entries.indexOf(host) + 1, i).every(o => o.type === 'expedition' || partOfCard(o));
          if (!host || !joins) return true;
          host.acts = [...(Array.isArray(host.acts) ? host.acts : []), { kind: 'expedition', sliceId: e.sliceId ?? null, payment: e.payment }];
          return false;
        });
        return { ...round, entries: kept };
      }),
    })),
  };
}

/** Brings a parsed file of an older schema up to CURRENT_SCHEMA, one version at a time. */
export function migrate(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  let doc = raw as Record<string, unknown>;
  // Version 0 files had the same shape; only the version marker changed.
  if (doc.schemaVersion === 0) doc = { ...doc, schemaVersion: 1 };
  if (!Array.isArray(doc.opponents)) return doc;
  doc = withPlayerCount(withValidSeats(withSeats(doc)));
  if (doc.schemaVersion === 1) doc = withOwners(doc);
  if (doc.schemaVersion === 2) doc = { ...doc, schemaVersion: 3, upgrades: { me: [], opponents: {} } };
  if (doc.schemaVersion === 3) doc = { ...doc, schemaVersion: 4, pds: {} };
  // Version 4 was saved for a while without this field.
  if (doc.schemaVersion === 4 && doc.enemyGround === undefined) doc = withEnemyGround(doc);
  if (doc.schemaVersion === 4) doc = withRulebookLayout(doc);
  if (doc.schemaVersion === 5) doc = withActs(doc);
  return doc;
}
