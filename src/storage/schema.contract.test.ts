import { describe, expect, test } from 'vitest';
import type { Action, Expedition, Transaction, Turn } from '../game/actions';
import type { SavedGame, StartEdits } from '../game/save';
import type { AdjustmentDelta, CardEffects, StartHoldings, StatusSpend } from '../domain/types';
import { savedOf } from './legacySave';
import { sampleGame } from './fixture';
import { parseGame, savedSchema } from './schema';

/**
 * The schema strips what it does not list, so a field added to the kernel's types and forgotten there is lost on import
 * and on every reload. Each value below is typed `Required<...>`: a new optional field makes this file fail to compile
 * until it is filled here, and the round trip then fails until the schema lists it.
 */
const pay = { planets: ['a', 'b'], tradeGoods: 2 };
const units = { carrier: 1, fighter: 2 };
const structures = { pds: 1, spacedock: 1 };
const effects: Required<CardEffects> = {
  tokens: { tactic: 1, fleet: 1, strategy: 1 }, boughtTokens: 2, researched: ['technology:neuralmotivator'], specialties: ['newalbion'],
  systemId: '1,0', readied: ['a'], speaker: 'opp', freeSecondary: ['opp'], mecatol: true,
  production: { systemId: '1,0', units, ground: { a: { infantry: 1 } } }, structures: [{ kind: 'pds', planetId: 'a' }], payment: pay,
};
const spend: Required<StatusSpend> = { tactic: 1, fleet: 1, strategy: 1, tradeGoods: 1, resources: pay, influence: pay };
const delta: Required<AdjustmentDelta> = { tradeGoods: -1, commodities: 1, tactic: 1, fleet: 1, strategy: 1, vp: 1, units: { systemId: '1,0', units: { mech: -1 } }, ground: { a: { infantry: -1 } } };
const transaction: Required<Transaction> = {
  kind: 'transaction', with: 'p2',
  give: { tradeGoods: 1, commodities: 1, components: ['promissory:x'] }, get: { tradeGoods: 1, commodities: 1, components: ['actionCard:y'] },
};
const expedition: Required<Expedition> = { kind: 'expedition', slice: 'slice', payment: pay };
const common = {
  player: 'p2', phase: 'action' as const, status: 'planned' as const, acts: [transaction, expedition],
  used: [{ component: 'technology:c', choices: { system: '1,0', count: 3 } }],
  gains: ['actionCard:a'], spends: ['actionCard:b'], choices: { planet: 'a', amount: 2 },
};
const flight: Required<Extract<Action, { kind: 'tactical' }>['movement'][number]> = { from: { slot: '0,1' }, units, via: ['1,1'], pickupOf: '0,2', structures };
const landing: Required<Extract<Action, { kind: 'tactical' }>['invasion'][number]> = { planet: 'a', units: { infantry: 1 }, from: 'b', structures };
const tactical: Required<Extract<Action, { kind: 'tactical' }>> = {
  kind: 'tactical', system: '1,0', free: true, movement: [flight, { ...flight, from: { planet: 'a' } }], spaceCombat: { p2: { fighter: 1 } }, invasion: [landing],
  groundCombat: { a: { p2: { infantry: 1 } } }, production: { units, ground: { a: { infantry: 1 } }, shipsTo: '1,1', payment: pay },
  fleetRemovals: { fighter: 1 }, custodians: pay,
};
const turn = (id: string, action: Action): Turn => ({ ...common, id, action });
const nested = turn('free', { ...tactical, free: true });
const actions: Action[] = [
  tactical,
  { kind: 'strategic', card: 7, forToken: true, effects, nested: [nested] },
  { kind: 'secondary', card: 7, effects },
  { kind: 'component', component: 'technology:c', note: 'n', effects, payment: pay },
  { kind: 'pass' },
  { kind: 'status', tactic: 1, fleet: 1, strategy: 1, vp: 1, opponentVp: { p2: 1 }, scored: ['publicObjective:z'], spend },
  { kind: 'agenda', label: 'l', delta, choices: { outcome: 'for', elect: 3 } },
  { kind: 'correction', label: 'l', delta, purpose: 'losses' },
];
const turns = actions.map((action, i) => turn(`t${i}`, action));

const holdings: Required<StartHoldings> = {
  technologies: ['technology:a'], hand: ['actionCard:a'], relics: ['relic:a'], promissory: ['promissory:a'], leaders: { 'leader:a': 'purged' },
  breakthrough: 'exhausted', scored: ['publicObjective:a'], secrets: ['secretObjective:a'], found: ['exploration:a'],
};
const start: Required<StartEdits> = {
  points: { p1: 1, p2: 2 }, holdings: { p1: holdings, p2: holdings }, units: { '1,0': { p2: units } }, ground: { a: { p2: { infantry: 1 } } },
  control: { a: 'p2' }, docks: ['a'], pds: { a: 1 }, expedition: { slices: { slice: 'p2', free: null }, thundersEdgeSystem: '1,0' },
  fracture: { active: true, ingress: ['1,0'], seat: 2, tiles: { '9,9': 'fracture1' } },
};

function full(): Required<SavedGame> {
  const saved = savedOf(sampleGame());
  return {
    ...saved, name: 'name', start,
    table: { ...saved.table, players: saved.table.players.map(p => ({ ...p, setup: { technologies: ['technology:a'], structurePlanet: 'a' }, legacyId: p.legacyId ?? p.id })) },
    plans: [{ id: 'p', name: 'plan', rounds: [{ number: 1, strategyCard: 3, backupCard: 4, held: [1, 2], turns }] }],
    activePlanId: 'p',
  };
}

const roundTrip = (saved: SavedGame) => parseGame(JSON.parse(JSON.stringify(saved)));

describe('the save schema keeps every field of the kernel types', () => {
  test('a saved game with every optional field filled comes back unchanged', () => {
    const saved = full();
    const parsed = savedSchema.safeParse(JSON.parse(JSON.stringify(saved)));
    expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true);
    if (parsed.success) expect(parsed.data).toStrictEqual(saved);
  });

  test.each(turns.map(t => [t.action.kind, t] as const))('a turn of action %s keeps all of its fields', (_kind, one) => {
    const saved = full();
    saved.plans[0].rounds[0].turns = [one];
    const parsed = savedSchema.safeParse(JSON.parse(JSON.stringify(saved)));
    expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true);
    if (parsed.success) expect(parsed.data.plans[0].rounds[0].turns[0]).toStrictEqual(one);
  });

  test('a saved game reads as a game', () => {
    expect(roundTrip(full()).ok).toBe(true);
  });
});

describe('the old game and the saved game of the kernel', () => {
  test('writing a game, reading it and writing it again gives the same saved game', () => {
    const saved = savedOf(sampleGame());
    const parsed = roundTrip(saved);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(savedOf(parsed.game)).toEqual(saved);
  });
});
