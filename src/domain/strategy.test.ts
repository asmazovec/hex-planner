import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from './newGame';
import { project, stateBeforeEntry } from './project';
import { withTeMecatol } from './mecatol';
import { cardChange, cardCost, cardsHeld, costsStrategyToken, freeTokens, hasChoices, homeSlot, plannedCard, primaryPlayed, withProduction, withStructure, withSystem, type CardEntry, withLeadershipTokens } from './strategy';
import type { CardEffects, Entry, EntryBody, ExpansionId, Game, UnitId, Warning } from './types';

const pack = loadPack(['pok', 'te']);
const HOME = '1,0';
const OTHER = '0,1';
const [JOL, NAR] = pack.tiles[pack.factions.jolnar.homeTile].planetIds;

function start(entries: Entry[], { players = 6, expansions = ['pok', 'te'] as ExpansionId[], extra = {} as Partial<Game> } = {}): Game {
  const game = createGame({ expansions, playerCount: players, faction: 'jolnar' }, pack);
  game.map = { [HOME]: pack.factions.jolnar.homeTile, [OTHER]: '25' };
  game.plans[0].rounds = [{ number: 1, strategyCard: null, backupCard: null, entries }];
  return Object.assign(game, extra);
}
let n = 0;
const play = (body: EntryBody & { type: 'strategic' | 'secondary' }, status: Entry['status'] = 'planned'): CardEntry =>
  ({ ...body, id: `c${++n}`, phase: 'action', status }) as CardEntry;
const primary = (card: number, effects?: CardEffects, status: Entry['status'] = 'planned') => play({ type: 'strategic', card, effects }, status);
const forToken = (card: number, effects?: CardEffects) => play({ type: 'strategic', card, forToken: true, effects });
const secondary = (card: number, effects?: CardEffects) => play({ type: 'secondary', card, effects });
const stateOf = (game: Game, filter: 'now' | 'forecast' = 'forecast') => project(game, game.plans[0], filter, pack);
const codes = (list: Warning[] | undefined) => (list ?? []).map(w => w.code);
const warningsOf = (game: Game, entry: Entry) => codes(stateOf(game).warningsByEntry[entry.id]);
const pay = (planets: string[], tradeGoods = 0) => ({ planets, tradeGoods });
const spendAll = (): Entry => ({ id: `s${++n}`, phase: 'action', status: 'planned', type: 'expedition', sliceId: null, payment: pay([JOL, NAR]) });
const emptyRound = (entries: Entry[], strategyCard: number | null = null, backupCard: number | null = null) =>
  ({ number: 1, strategyCard, backupCard, entries });

describe('the three modes', () => {
  test('a primary is free, a secondary and a primary for a token cost 1 strategy token', () => {
    expect(stateOf(start([primary(3)])).state.strategy).toBe(2);
    expect(stateOf(start([secondary(3)])).state.strategy).toBe(1);
    expect(stateOf(start([forToken(3)])).state.strategy).toBe(1);
  });

  test('a secondary can be played any number of times, and warns once the tokens run out', () => {
    const third = secondary(3);
    const game = start([secondary(3), secondary(3), third]);
    expect(stateOf(game).state.strategy).toBe(-1);
    expect(stateOf(game).warningsByEntry[third.id]).toEqual([{ code: 'shortStrategy', params: { have: 0 } }]);
  });

  test('Leadership\'s secondary spends no strategy token and never warns about one; for a token its primary does', () => {
    const none = secondary(1);
    const spent = start([{ id: 'zero', phase: 'action', status: 'planned', type: 'adjustment', label: '', delta: { strategy: -2 } }, none]);
    expect(stateOf(spent).state.strategy).toBe(0);
    expect(warningsOf(spent, none)).toEqual([]);
    expect(stateOf(start([forToken(1)])).state.strategy).toBe(1);
    expect(costsStrategyToken(none)).toBe(false);
  });

  test('a bare secondary is charged and its upgrades apply at no resource cost', () => {
    const bare = play({ type: 'secondary', upgrades: ['carrier'] });
    const { state, warningsByEntry } = stateOf(start([bare]));
    expect(state.strategy).toBe(1);
    expect(state.upgrades).toEqual(['carrier']);
    expect(warningsByEntry[bare.id]).toEqual([]);
    expect(costsStrategyToken(bare)).toBe(true);
  });

  test('a primary for a token behaves as a primary', () => {
    expect(stateOf(start([forToken(5)])).state.tradeGoods).toBe(3);
    expect(stateOf(start([secondary(5)])).state.tradeGoods).toBe(0);
  });
});

describe('now and forecast', () => {
  test('a planned card counts in the forecast only, a done one in both', () => {
    const planned = start([primary(5)]);
    expect(stateOf(planned, 'now').state.tradeGoods).toBe(0);
    expect(stateOf(planned).state.tradeGoods).toBe(3);
    expect(stateOf(start([primary(5, undefined, 'done')]), 'now').state.tradeGoods).toBe(3);
  });

  test('a cancelled entry counts nowhere', () => {
    expect(stateOf(start([primary(5, undefined, 'cancelled')])).state.tradeGoods).toBe(0);
  });
});

describe('the second primary', () => {
  test('warns at 6 players, where one card is held', () => {
    const first = primary(1);
    const second = primary(2);
    const game = start([first, second]);
    expect(warningsOf(game, first)).toEqual([]);
    expect(stateOf(game).warningsByEntry[second.id]).toEqual([{ code: 'primaryRepeated', params: { held: 1 } }]);
  });

  test('at 3 players the second is fine and the third warns', () => {
    const [first, second, third] = [primary(1), primary(2), primary(3)];
    const game = start([first, second, third], { players: 3 });
    expect(warningsOf(game, second)).toEqual([]);
    expect(warningsOf(game, third)).toEqual(['primaryRepeated']);
  });

  test('at 3 players the same card played twice warns, though two cards are held', () => {
    const again = primary(5);
    expect(warningsOf(start([primary(5), again], { players: 3 }), again)).toEqual(['primaryRepeated']);
  });

  test('a primary for a token is not a repeat, and the count starts anew each round', () => {
    const token = forToken(2);
    const game = start([primary(1), token]);
    expect(warningsOf(game, token)).toEqual([]);
    const later = primary(1);
    game.plans[0].rounds.push({ number: 2, strategyCard: null, backupCard: null, entries: [later] });
    expect(warningsOf(game, later)).toEqual([]);
  });

  test('now counts only what is done', () => {
    const second = primary(2, undefined, 'done');
    const game = start([primary(1), second]);
    expect(codes(stateOf(game, 'now').warningsByEntry[second.id])).toEqual([]);
  });

  test('cardsHeld: 2 at 3 and 4 players, 1 at 5 to 8', () => {
    expect([3, 4, 5, 6, 8].map(cardsHeld)).toEqual([2, 2, 1, 1, 1]);
  });

  test('the menu knows when the held primaries are played', () => {
    expect(primaryPlayed(emptyRound([primary(1)]), 6)).toBe(true);
    expect(primaryPlayed(emptyRound([forToken(1)]), 6)).toBe(false);
    expect(primaryPlayed(emptyRound([primary(1, undefined, 'cancelled')]), 6)).toBe(false);
    expect(primaryPlayed(emptyRound([primary(1)]), 3)).toBe(false);
    expect(primaryPlayed(emptyRound([primary(1), primary(2)]), 3)).toBe(true);
  });
});

describe('the planned card fills itself in', () => {
  test('one card at 6 players: the main one, never the backup', () => {
    expect(plannedCard(emptyRound([], 5, 2), 6)).toBe(5);
    expect(plannedCard(emptyRound([], null, 2), 6)).toBeUndefined();
    expect(plannedCard(emptyRound([primary(5)], 5, 2), 6)).toBeUndefined();
  });

  test('two cards at 3 players: the main one, then the other', () => {
    expect(plannedCard(emptyRound([], 5, 2), 3)).toBe(5);
    expect(plannedCard(emptyRound([primary(5)], 5, 2), 3)).toBe(2);
    expect(plannedCard(emptyRound([primary(5), primary(2)], 5, 2), 3)).toBeUndefined();
  });
});

describe('Leadership', () => {
  test('the distributed tokens count; bought ones cost influence through the payment', () => {
    const need = 3;
    const entry = primary(1, { tokens: { tactic: 2, fleet: 1, strategy: 1 }, boughtTokens: 1, payment: { planets: [], tradeGoods: need } });
    const earned = { id: 'tg', phase: 'action', status: 'planned', type: 'adjustment', label: '', delta: { tradeGoods: need } } as Entry;
    const { state, warningsByEntry } = stateOf(start([earned, entry]));
    expect([state.tactic, state.fleet, state.strategy]).toEqual([5, 4, 3]);
    expect(state.tradeGoods).toBe(0);
    expect(codes(warningsByEntry[entry.id])).toEqual([]);
  });

  test('short influence warns with what is owed', () => {
    const entry = secondary(1, { tokens: { fleet: 2 }, boughtTokens: 2, payment: pay([JOL]) });
    const { state, warningsByEntry } = stateOf(start([entry]));
    expect(state.fleet).toBe(5);
    expect(state.exhausted).toEqual([JOL]);
    expect(warningsByEntry[entry.id]).toEqual([{ code: 'shortInfluence', params: { needed: 6, paid: pack.planets[JOL].influence } }]);
  });

  test('the cost is in influence, 3 per bought token', () => {
    expect(cardCost(secondary(1, { boughtTokens: 2 }), 'jolnar', [], pack)).toEqual({ kind: 'influence', amount: 6 });
  });
});

describe('Diplomacy', () => {
  test('readies the chosen planets at that point of the replay; no token of mine goes down', () => {
    const { state } = stateOf(start([spendAll(), primary(2, { systemId: HOME, readied: [JOL] })]));
    expect(state.exhausted).toEqual([NAR]);
    expect(state.tokensOnMap).toEqual([]);
  });

  test('a planet readied can pay again later in the round without a warning', () => {
    const later = secondary(6, { production: { systemId: HOME, units: { carrier: 1 } }, payment: pay([JOL]) });
    const game = start([spendAll(), primary(2, { systemId: HOME, readied: [JOL] }), later]);
    expect(codes(stateOf(game).warningsByEntry[later.id])).not.toContain('planetExhausted');
    expect(stateOf(game).state.exhausted).toEqual([NAR, JOL]);
  });

  test('a secondary costs its token and readies too', () => {
    const { state } = stateOf(start([spendAll(), secondary(2, { readied: [JOL, NAR] })]));
    expect(state.exhausted).toEqual([]);
    expect(state.strategy).toBe(1);
  });
});

describe('Politics', () => {
  test('tracks nothing beyond the token: the speaker and the cards are shown only', () => {
    const { state } = stateOf(start([primary(3, { speaker: 'opponent-1' }), secondary(3)]));
    expect([state.tactic, state.fleet, state.strategy, state.tradeGoods, state.vp]).toEqual([3, 3, 1, 0, 0]);
  });
});

describe('Construction', () => {
  test('structures join the forecast and leave the game alone', () => {
    const game = start([primary(4, { structures: [{ kind: 'spacedock', planetId: JOL }, { kind: 'pds', planetId: NAR }, { kind: 'pds', planetId: NAR }] })], { extra: { docks: [] } });
    expect(stateOf(game).state.docks).toEqual([JOL]);
    expect(stateOf(game).state.pds[NAR]).toBe(2);
    expect(game.docks).toEqual([]);
    expect(stateOf(game, 'now').state.docks).toEqual([]);
  });

  test('the Thunder\'s Edge primary produces in a dock with payment, by the rules of tactical production', () => {
    const entry = primary(4, { production: { systemId: HOME, units: { cruiser: 1, infantry: 3 } }, payment: pay([NAR]) });
    const before = stateOf(start([])).state;
    const { state, warningsByEntry } = stateOf(start([entry]));
    expect(state.systems[HOME].cruiser).toBe((before.systems[HOME].cruiser ?? 0) + 1);
    expect(Object.values(state.ground).reduce((sum, units) => sum + (units.infantry ?? 0), 0)).toBe(3);
    expect(warningsByEntry[entry.id]).toContainEqual({ code: 'shortResources', params: { needed: 4, paid: pack.planets[NAR].resources } });
  });

  test('the fleet pool is checked as with tactical production', () => {
    const entry = primary(4, { production: { systemId: OTHER, units: { cruiser: 4 } } });
    expect(warningsOf(start([entry]), entry)).toContain('fleetPool');
  });

  test('before Thunder\'s Edge its secondary puts the token in the system; with it, no token goes down', () => {
    const entry = secondary(4, { systemId: OTHER });
    expect(stateOf(start([entry], { expansions: ['pok'] })).state.tokensOnMap).toEqual([OTHER]);
    expect(stateOf(start([entry])).state.tokensOnMap).toEqual([]);
  });

  test('later entries see a dock the entry built', () => {
    const later = primary(1);
    const game = start([primary(4, { structures: [{ kind: 'spacedock', planetId: JOL }] }), later], { extra: { docks: [] } });
    expect(stateBeforeEntry(game, game.plans[0], later.id, pack).docks).toEqual([JOL]);
  });
});

describe('Trade', () => {
  test('the primary gives 3 trade goods; choosing free players changes nothing else', () => {
    const { state } = stateOf(start([primary(5, { freeSecondary: ['opponent-1'] })]));
    expect(state.tradeGoods).toBe(3);
    expect(state.strategy).toBe(2);
  });
});

describe('Warfare', () => {
  const tactical = (free: boolean): Entry => ({
    id: `t${++n}`, phase: 'action', status: 'planned', type: 'tactical', systemId: OTHER,
    moves: [], landings: [], production: {}, payment: pay([]), ...(free ? { free: true } : {}),
  });

  test('a free tactical spends no tactic token and places no command token', () => {
    const { state } = stateOf(start([primary(6), tactical(true)]));
    expect(state.tactic).toBe(3);
    expect(state.tokensOnMap).toEqual([]);
    const paid = stateOf(start([tactical(false)])).state;
    expect(paid.tactic).toBe(2);
    expect(paid.tokensOnMap).toEqual([OTHER]);
  });

  test('before Thunder\'s Edge the primary lifts the token off the chosen system; the gained one is distributed', () => {
    const lift = primary(6, { systemId: OTHER, tokens: { fleet: 1 } });
    const { state } = stateOf(start([tactical(false), lift], { expansions: ['pok'] }));
    expect(state.tokensOnMap).toEqual([]);
    expect(state.fleet).toBe(4);
    expect(stateOf(start([tactical(false), lift])).state.tokensOnMap).toEqual([OTHER]);
    expect(stateOf(start([tactical(false), secondary(6, { systemId: OTHER })], { expansions: ['pok'] })).state.tokensOnMap).toEqual([OTHER]);
  });

  test('the secondary produces at home for a token and resources, and places no token', () => {
    const entry = secondary(6, { production: { systemId: HOME, units: { carrier: 1 } }, payment: pay([JOL, NAR]) });
    const { state } = stateOf(start([entry]));
    expect(state.strategy).toBe(1);
    expect(state.tokensOnMap).toEqual([]);
    expect(state.exhausted).toEqual([JOL, NAR]);
    expect(cardCost(entry, 'jolnar', [], pack)).toEqual({ kind: 'resources', amount: pack.units.carrier!.cost });
  });

  test('production at an off-map home lands on its planets, not at the gate', () => {
    const home = pack.factions.ghost.homeTile;
    const planet = pack.tiles[home].planetIds[0];
    const entry = secondary(6, { production: { systemId: home, units: { infantry: 2 } } });
    const { state } = stateOf(start([entry], { extra: { faction: 'ghost', map: { '2,2': pack.factions.ghost.gateTile! } } }));
    expect(state.ground[planet]?.infantry).toBe(2);
    expect(state.ground['2,2']).toBeUndefined();
  });

  test('ground units go to the planet they were bought on, and the rest to the first I control', () => {
    const entry = secondary(6, { production: { systemId: HOME, units: { infantry: 3 }, ground: { [NAR]: { infantry: 2 } } } });
    const { state } = stateOf(start([entry]));
    expect(state.ground[NAR]?.infantry).toBe(2);
    expect(state.ground[JOL]?.infantry).toBe(1);
  });

  test('the home slot is the home tile: found on the map, or by its own id when only the gate stands there', () => {
    expect(homeSlot(start([]), pack)).toBe(HOME);
    const creuss = start([], { extra: { faction: 'ghost', map: { '2,2': pack.factions.ghost.gateTile! } } });
    expect(homeSlot(creuss, pack)).toBe(pack.factions.ghost.homeTile);
    expect(homeSlot(start([], { extra: { map: {} } }), pack)).toBeNull();
  });
});

describe('Technology', () => {
  const research = (type: 'strategic' | 'secondary', upgrades: UnitId[], over: Partial<CardEntry> = {}): CardEntry =>
    ({ ...play({ type, card: 7 }), upgrades, ...over }) as CardEntry;

  test('a primary: the first upgrade is free, the second costs 6; for a token the same', () => {
    expect(cardCost(research('strategic', ['carrier']), 'jolnar', [], pack).amount).toBe(0);
    expect(cardCost(research('strategic', ['carrier', 'cruiser']), 'jolnar', [], pack)).toEqual({ kind: 'resources', amount: 6 });
    expect(cardCost(research('strategic', ['carrier', 'cruiser'], { forToken: true }), 'jolnar', [], pack).amount).toBe(6);
  });

  test('a secondary costs 4 per upgrade', () => {
    expect(cardCost(research('secondary', ['carrier', 'cruiser']), 'jolnar', [], pack)).toEqual({ kind: 'resources', amount: 8 });
  });

  test('upgrades apply, and short resources warn', () => {
    const entry = research('secondary', ['carrier']);
    const { state, warningsByEntry } = stateOf(start([entry]));
    expect(state.upgrades).toEqual(['carrier']);
    expect(warningsByEntry[entry.id]).toEqual([{ code: 'shortResources', params: { needed: 4, paid: 0 } }]);
  });

  test('without a card an entry\'s upgrades still apply and cost nothing, as saved before', () => {
    const entry = play({ type: 'strategic', upgrades: ['carrier'] });
    const { state, warningsByEntry } = stateOf(start([entry]));
    expect(state.upgrades).toEqual(['carrier']);
    expect(warningsByEntry[entry.id]).toEqual([]);
  });
});

describe('Imperial', () => {
  test('Mecatol Rex gives a point on the primary; otherwise a secret objective, shown only', () => {
    expect(stateOf(start([primary(8, { mecatol: true })])).state.vp).toBe(1);
    expect(stateOf(start([primary(8)])).state.vp).toBe(0);
    expect(stateOf(start([secondary(8)])).state.vp).toBe(0);
  });
});

describe('choices and changes', () => {
  test('a choice is anything recorded except an empty value', () => {
    const empty = primary(1, { tokens: { tactic: 0 }, boughtTokens: 0, readied: [], freeSecondary: [], structures: [], mecatol: false, payment: pay([]) });
    expect(hasChoices(empty, emptyRound([empty]))).toBe(false);
    for (const effects of [
      { tokens: { fleet: 1 } }, { boughtTokens: 1 }, { systemId: HOME }, { readied: [JOL] }, { speaker: 'a' }, { freeSecondary: ['a'] }, { mecatol: true },
      { production: { systemId: HOME, units: { carrier: 1 } } }, { structures: [{ kind: 'pds' as const, planetId: JOL }] },
    ]) {
      const entry = primary(1, effects);
      expect(hasChoices(entry, emptyRound([entry]))).toBe(true);
    }
    const upgraded = { ...primary(7), upgrades: ['carrier'] } as CardEntry;
    expect(hasChoices(upgraded, emptyRound([upgraded]))).toBe(true);
  });

  test('the free tactical it started is a choice', () => {
    const entry = primary(6);
    const free: Entry = { id: 'f', phase: 'action', status: 'planned', type: 'tactical', systemId: OTHER, moves: [], landings: [], production: {}, payment: pay([]), free: true, fromCard: entry.id };
    expect(hasChoices(entry, emptyRound([entry, free]))).toBe(true);
  });

  test('a change of cost pays automatically; a manual payment is left alone', () => {
    const before = stateOf(start([])).state;
    const entry = primary(1);
    const patch = cardChange(entry, { effects: { boughtTokens: 1 } }, before, 'jolnar', pack, false);
    expect(patch.effects).toMatchObject({ boughtTokens: 1 });
    expect(patch.effects?.payment?.planets.length).toBeGreaterThan(0);
    expect(cardChange(entry, { effects: { boughtTokens: 1 } }, before, 'jolnar', pack, true)).toEqual({ effects: { boughtTokens: 1 } });
  });

  test('a change that keeps the cost keeps the payment', () => {
    const entry = primary(1, { boughtTokens: 1, payment: pay([JOL]) });
    const patch = cardChange(entry, { effects: { boughtTokens: 1, tokens: { fleet: 1 }, payment: pay([JOL]) } }, stateOf(start([])).state, 'jolnar', pack, false);
    expect(patch.effects?.payment).toEqual(pay([JOL]));
  });

  test('withProduction adds and takes back, on the one system', () => {
    const one = withProduction({}, HOME, 'carrier', null, 1);
    expect(one).toEqual({ production: { systemId: HOME, units: { carrier: 1 } } });
    expect(withProduction(one, HOME, 'carrier', null, -1).production).toBeUndefined();
  });

  test('withProduction keeps ground units by planet and takes them back from there', () => {
    const two = withProduction(withProduction({}, HOME, 'infantry', NAR, 1), HOME, 'infantry', JOL, 1);
    expect(two.production).toEqual({ systemId: HOME, units: { infantry: 2 }, ground: { [NAR]: { infantry: 1 }, [JOL]: { infantry: 1 } } });
    expect(withProduction(two, HOME, 'infantry', NAR, -1).production).toEqual({ systemId: HOME, units: { infantry: 1 }, ground: { [JOL]: { infantry: 1 } } });
  });

  test('a new system clears only the base primary\'s readied planets, and the structures of Construction\'s secondary before Thunder\'s Edge', () => {
    const diplomacy = primary(2, { systemId: HOME, readied: [JOL] });
    expect(withSystem(diplomacy, OTHER, [])).toEqual({ systemId: OTHER });
    expect(withSystem(diplomacy, HOME, [])).toEqual({ systemId: HOME, readied: [JOL] });
    expect(withSystem(diplomacy, OTHER, ['pok'])).toEqual({ systemId: OTHER, readied: [JOL] });
    expect(withSystem(diplomacy, OTHER, ['pok', 'te'])).toEqual({ systemId: OTHER, readied: [JOL] });
    const built = { systemId: HOME, structures: [{ kind: 'pds' as const, planetId: JOL }] };
    expect(withSystem(secondary(4, built), OTHER, ['pok'])).toEqual({ systemId: OTHER });
    expect(withSystem(secondary(4, built), OTHER, ['pok', 'te'])).toEqual({ ...built, systemId: OTHER });
    expect(withSystem(primary(4, built), OTHER, ['pok'])).toEqual({ ...built, systemId: OTHER });
  });

  test('a Warfare rearrangement moves tokens with no net change, and a pool below zero warns without being stopped', () => {
    const fine = primary(6, { tokens: { tactic: -1, fleet: 1 } });
    const { state } = stateOf(start([fine]));
    expect([state.tactic, state.fleet, state.strategy]).toEqual([2, 4, 2]);
    expect(warningsOf(start([fine]), fine)).toEqual([]);
    const over = primary(6, { tokens: { strategy: -3, fleet: 3 } });
    const result = stateOf(start([over]));
    expect(result.state.strategy).toBe(-1);
    expect(result.warningsByEntry[over.id]).toEqual([{ code: 'poolNegative', params: { pool: 'strategy', have: -1 } }]);
  });

  test('freeTokens: what a card gives to distribute', () => {
    expect(freeTokens(primary(1, { boughtTokens: 2 }), ['pok', 'te'])).toBe(5);
    expect(freeTokens(secondary(1, { boughtTokens: 2 }), ['pok', 'te'])).toBe(2);
    expect(freeTokens(primary(6), ['pok', 'te'])).toBe(0);
    expect(freeTokens(primary(6), ['pok'])).toBe(1);
  });

  test('Leadership beyond its free tokens warns, naming how many, and still counts them', () => {
    const over = primary(1, { tokens: { tactic: 4 } });
    const { state, warningsByEntry } = stateOf(start([over]));
    expect(state.tactic).toBe(7);
    expect(warningsByEntry[over.id]).toEqual([{ code: 'tokensOver', params: { given: 4, free: 3 } }]);
    const within = primary(1, { tokens: { tactic: 3 } });
    expect(warningsOf(start([within]), within)).toEqual([]);
  });

  test('the status entry beyond 2 tokens warns and still counts them', () => {
    const status = (tactic: number): Entry => ({ id: `st${++n}`, phase: 'status', status: 'planned', type: 'statusTokens', tactic, fleet: 1, strategy: 0 });
    const over = status(2);
    const { state, warningsByEntry } = stateOf(start([over]));
    expect(state.tactic).toBe(5);
    expect(warningsByEntry[over.id]).toEqual([{ code: 'tokensOver', params: { given: 3, free: 2 } }]);
    const fine = status(1);
    expect(warningsOf(start([fine]), fine)).toEqual([]);
  });

  test('Thunder\'s Edge moves what a card names on Mecatol Rex to the new planet', () => {
    const card = primary(4, {
      readied: ['mr'], payment: pay(['mr', JOL]), structures: [{ kind: 'pds', planetId: 'mr' }],
      production: { systemId: '0,0', units: { infantry: 1 }, ground: { mr: { infantry: 1 } } },
    });
    const moved = withTeMecatol(start([card])).plans[0].rounds[0].entries[0] as CardEntry;
    expect(moved.effects).toMatchObject({
      readied: ['mrte'], payment: pay(['mrte', JOL]), structures: [{ kind: 'pds', planetId: 'mrte' }],
      production: { ground: { mrte: { infantry: 1 } } },
    });
    const bare = play({ type: 'secondary' });
    expect(withTeMecatol(start([bare])).plans[0].rounds[0].entries[0]).toEqual(bare);
  });

  test('withStructure adds and takes back one', () => {
    const two = withStructure(withStructure({}, 'pds', JOL, 1), 'pds', JOL, 1);
    expect(two.structures).toHaveLength(2);
    expect(withStructure(two, 'pds', JOL, -1).structures).toEqual([{ kind: 'pds', planetId: JOL }]);
    expect(withStructure(withStructure({}, 'pds', JOL, 1), 'pds', JOL, -1).structures).toBeUndefined();
  });
});

describe('Leadership as tapped', () => {
  test('buys only what goes beyond the free tokens', () => {
    expect(withLeadershipTokens({}, { tactic: 3 }, true).boughtTokens).toBeUndefined();
    expect(withLeadershipTokens({}, { tactic: 3, fleet: 2 }, true).boughtTokens).toBe(2);
    expect(withLeadershipTokens({}, { fleet: 2 }, false).boughtTokens).toBe(2);
    expect(withLeadershipTokens({ boughtTokens: 4 }, { tactic: 1 }, true).boughtTokens).toBeUndefined();
  });
});
