import { describe, expect, test } from 'vitest';
import type { Act, AdjustmentDelta, CardEffects, EntryBody, Game, StartHoldings, StatusSpend } from '../domain/types';
import { sampleGame } from './fixture';
import { parseGame } from './schema';

/**
 * The schema strips what it does not list, so a field added to the domain types and forgotten there is lost on import
 * and on every reload (the technology specialties were). Each value below is typed `Required<...>`: a new optional field
 * makes this file fail to compile until it is filled here, and the round trip then fails until the schema lists it.
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
const acts: Act[] = [
  { kind: 'expedition', sliceId: 'slice', payment: pay },
  { kind: 'transaction', with: 'opp', give: { tradeGoods: 1, commodities: 1, components: ['promissory:x'] }, get: { tradeGoods: 1, commodities: 1, components: ['actionCard:y'] } },
];
type Variant<T extends EntryBody['type']> = Required<Extract<EntryBody, { type: T }>>;
const move: Required<Variant<'tactical'>['moves'][number]> = { from: '0,1', units, via: ['1,1'], pickupOf: '0,2', structures };
const landing: Required<Variant<'tactical'>['landings'][number]> = { planetId: 'a', units: { infantry: 1 }, from: 'b', structures };
const common = {
  phase: 'action' as const, status: 'planned' as const, owner: 'opp', gains: ['actionCard:a'], spends: ['actionCard:b'],
  uses: ['technology:c'], choices: { planet: 'a', amount: 2 }, useChoices: { 'technology:c': { system: '1,0', count: 3 } },
};

const tactical: Variant<'tactical'> = {
  ...common, type: 'tactical', systemId: '1,0', moves: [move], landings: [landing], production: units, payment: pay,
  losses: { fighter: 1 }, groundLosses: { a: { infantry: 1 } }, fleetRemovals: { fighter: 1 }, productionGround: { a: { infantry: 1 } },
  shipsTo: '1,1', custodiansPayment: pay, free: true, fromCard: 'card', acts,
};
const strategic: Variant<'strategic'> = { ...common, type: 'strategic', card: 7, forToken: true, effects, acts };
const secondary: Variant<'secondary'> = { ...common, type: 'secondary', card: 7, forToken: true, effects };
const component: Variant<'component'> = { ...common, type: 'component', componentId: 'technology:c', note: 'n', acts, effects, payment: pay };
const pass: Variant<'pass'> = { ...common, type: 'pass', acts };
const adjustment: Variant<'adjustment'> = { ...common, type: 'adjustment', label: 'l', delta, kind: 'losses', choices: { outcome: 'for', elect: 3 } };
const status: Variant<'statusTokens'> = { ...common, type: 'statusTokens', tactic: 1, fleet: 1, strategy: 1, vp: 1, opponentVp: { opp: 1 }, scored: ['publicObjective:z'], spend };

type Entry = Game['plans'][number]['rounds'][number]['entries'][number];
const entries: Entry[] = [tactical, strategic, secondary, component, pass, adjustment, status].map((body, i) => ({ ...body, id: `e${i}` }) as Entry);

const holdings: Required<StartHoldings> = {
  technologies: ['technology:a'], hand: ['actionCard:a'], relics: ['relic:a'], promissory: ['promissory:a'], leaders: { 'leader:a': 'purged' },
  breakthrough: 'exhausted', scored: ['publicObjective:a'], secrets: ['secretObjective:a'], found: ['exploration:a'],
};

function full(): Required<Game> {
  const game = sampleGame();
  return {
    ...game, name: 'name', enemyUnits: { '1,0': { opp: units } }, enemyGround: { a: { opp: { infantry: 1 } } },
    planetControl: { a: 'enemy' }, planetOwner: { a: 'opp' }, docks: ['a'], pds: { a: 1 },
    expedition: { slices: { slice: 'other' }, thundersEdgeSystem: '1,0' },
    fracture: { active: true, ingress: ['1,0'], seat: 2, tiles: { '9,9': 'fracture1' } },
    start: { me: holdings, opponents: { opp: holdings } },
    opponents: [{ id: 'opp', faction: 'f', vp: 1, seat: 2, color: 2 }],
    playerCount: 2, seat: 1,
    plans: [{ id: 'p', name: 'plan', rounds: [{ number: 1, strategyCard: 3, backupCard: 4, entries }] }],
    activePlanId: 'p',
  };
}

const roundTrip = (game: Game) => parseGame(JSON.parse(JSON.stringify(game)));

describe('the save schema keeps every field of the domain types', () => {
  test('a game with every optional field filled comes back unchanged', () => {
    const game = full();
    const parsed = roundTrip(game);
    expect(parsed.ok, parsed.ok ? '' : parsed.reason).toBe(true);
    if (parsed.ok) expect(parsed.game).toStrictEqual(game);
  });

  test.each(entries.map(entry => [entry.type, entry] as const))('an entry of type %s keeps all of its fields', (_type, entry) => {
    const game = full();
    game.plans[0].rounds[0].entries = [entry];
    const parsed = roundTrip(game);
    expect(parsed.ok, parsed.ok ? '' : parsed.reason).toBe(true);
    if (parsed.ok) expect(parsed.game.plans[0].rounds[0].entries[0]).toStrictEqual(entry);
  });
});
