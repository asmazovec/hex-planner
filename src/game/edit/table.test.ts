/**
 * The table edits against the old edits of `Game` they replace: the saved game each makes is the one the old edit makes,
 * where the old model can say it. What the old model could not (any player leaving, the tablet moving, a sheet moving
 * with any player's faction) is tested on the saved game itself.
 */
import { playerOfKey } from '../../testing/old/game/keys';
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { LAYOUT_CHOICES, slotKeyOf } from '../../domain/layouts';
import { slotsFor } from '../../domain/mapBuilder';
import { changeLayout as oldChangeLayout, emptySlots as oldEmptySlots, freeSlots as oldFreeSlots, mapIsEmpty as oldMapIsEmpty, readyToPlay as oldReady, tilesLostByLayout as oldLost } from '../../testing/old/domain/mapBuilder';
import { withTeMecatol } from '../../testing/old/domain/mecatol';
import { createGame } from '../../testing/old/domain/newGame';
import { addPlayer as oldAdd, draftWithExpansions as oldDraft, removePlayer as oldRemove, setPlayerFaction as oldFaction, swapSeats as oldSwap, withSeatHomes } from '../../testing/old/domain/players';
import { countChangeEffect as oldCount, opponentHoldings as oldHoldings } from '../../testing/old/domain/players';
import { homeNotes as oldHomeNotes } from '../../testing/old/domain/strategy';
import { fractureSlots } from '../../domain/thundersEdge';
import { withFractureMoved } from '../../testing/old/domain/thundersEdge';
import type { ExpansionId, MapLayout } from '../../domain/types';
import type { Entry, Game } from '../../testing/old/domain/types';
import { gameOf, savedOf } from '../../testing/legacySave';
import type { SavedGame } from '../save';
import {
  addExpansion, addPlayer, boardHoldings, changeLayout, createSaved, draftWithExpansions, countChangeEffect, emptySlots, freeSlots, homeNotes, mapIsEmpty, readyToPlay, removePlayer, seatedPlayers, setFaction, setViewer, startedGame, swapSeats, tilesLostByLayout, withMap, withName, withTile,
} from './table';
import { initialBoard, startBoard } from '../setup';
import { withFractureActive, withFractureSeat } from './start';

const pack = loadPack(['pok', 'te']);
const counter = () => { let n = 0; return (prefix: string) => `${prefix}-${n++}`; };

/** The old game lists its players with mine first; the table of an edit keeps them by seat. */
const bySeat = (s: SavedGame): SavedGame['table'] => ({ ...s.table, players: [...s.table.players].sort((a, b) => a.seat - b.seat) });
const normal = (s: SavedGame) => ({ ...s, table: bySeat(s), plans: s.plans.map(p => ({ ...p, id: 'plan' })), activePlanId: 'plan' });
/** The player an old edit names by its place in the old list (mine first, then the opponents). */
const at = (s: SavedGame, index: number): string => s.table.players[index]?.id ?? '';
const expectSame = (made: SavedGame, expected: SavedGame) => expect(normal(made)).toEqual(normal(expected));

/** What the store did over the old game for a setup edit: the Fracture follows what the edit changed. */
const viaOld = (game: Game, edit: (g: Game) => Game, expansions = game.expansions): Game => {
  const p = loadPack(expansions);
  const next = edit(game);
  if (next === game) return game;
  const moved = withFractureMoved(game, next, p);
  const tiles = moved.fracture.active
    ? Object.fromEntries(fractureSlots(moved.fracture.seat, moved.playerCount, loadPack(moved.expansions), moved.layout).map(s => [slotKeyOf(s.q, s.r), s.tileId]))
    : {};
  const old = moved.fracture.tiles ?? {};
  const same = Object.keys(tiles).length === Object.keys(old).length && Object.entries(tiles).every(([slot, id]) => old[slot] === id);
  return same ? moved : { ...moved, fracture: { ...moved.fracture, tiles } };
};

/** A game of `count` players with the factions seated, an opponent holding units and planets, and a plan that names them. */
function played(count: number, factions: string[], expansions: ExpansionId[] = ['pok', 'te']): Game {
  const p = loadPack(expansions);
  let game = createGame({ expansions, playerCount: count, faction: '' }, p, counter());
  factions.forEach((faction, i) => { game = oldFaction(game, i, faction, p); });
  const [a, b] = [game.opponents[0]?.id ?? '', game.opponents[1]?.id ?? ''];
  const entry = (rest: object): Entry => ({ id: `e${Math.random()}`, phase: 'action', status: 'planned', ...rest } as Entry);
  const note = (id: string) => `promissory:ceasefire@${id}`;
  return {
    ...game,
    enemyUnits: { '1,-2': { [a]: { cruiser: 2 }, [b]: { carrier: 1 } } },
    enemyGround: { '25': { [a]: { infantry: 2 } } },
    planetControl: { ...game.planetControl, '25': 'enemy', '26': 'enemy' },
    planetOwner: { '25': a, '26': b },
    docks: ['25', '26'],
    pds: { '25': 1 },
    start: { ...game.start, opponents: { ...game.start.opponents, [b]: { ...game.start.opponents[b], promissory: [...(game.start.opponents[b]?.promissory ?? []), note(a)] } } },
    plans: [{
      id: 'plan-x', name: 'Plan 1',
      rounds: [{
        number: 1, strategyCard: 3, backupCard: 4,
        entries: [
          entry({ id: 'strat', type: 'strategic', card: 3, owner: a, gains: [note(a)], effects: { speaker: a, freeSecondary: [a, b] } }),
          entry({ id: 't1', type: 'tactical', systemId: '1,-2', moves: [{ from: '1,-2', units: { cruiser: 1 } }], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }),
          entry({ id: 't2', type: 'tactical', owner: b, systemId: '25', moves: [], landings: [{ planetId: '25', units: { infantry: 1 } }], production: {}, payment: { planets: ['mr'], tradeGoods: 0 } }),
          entry({ id: 'c1', type: 'component', note: 'x', componentId: note(a), acts: [{ kind: 'transaction', with: a, give: { components: [note(a), 'actionCard:x'] }, get: { components: [note(a)] } }] }),
          entry({ id: 'st', phase: 'status', type: 'statusTokens', tactic: 1, fleet: 1, strategy: 0, opponentVp: { [a]: 1, [b]: 2 }, spends: [note(a)] }),
        ],
      }],
    }],
    activePlanId: 'plan-x',
  };
}

describe('name and tiles', () => {
  const base = (): Game => createGame({ expansions: ['pok'], playerCount: 4, faction: 'sol' }, loadPack(['pok']), p => `${p}-1`);
  test('a name is trimmed, kept, and taken away by an empty one', () => {
    const g = base();
    const s = savedOf(g);
    expect(withName(s, '  Friday ')).toEqual(savedOf({ ...g, name: 'Friday' }));
    const named = withName(s, 'Friday');
    expect(withName(named, 'Friday ')).toBe(named);
    expect(withName(named, ' ')).toEqual(s);
    expect(withName(s, '')).toBe(s);
  });
  test('a tile is set on a slot and taken off it', () => {
    const g = base();
    const s = savedOf(g);
    const set = withTile(s, '1,-1', '26');
    expect(set).toEqual(savedOf({ ...g, map: { ...g.map, '1,-1': '26' } }));
    expect(withTile(set, '1,-1', '26')).toBe(set);
    expect(withTile(set, '1,-1', null)).toEqual(s);
    expect(withTile(s, '2,2', null)).toBe(s);
  });
});

describe('a new game', () => {
  test.each([
    [{ expansions: ['pok', 'te'] as ExpansionId[], playerCount: 6, faction: '' }],
    [{ expansions: ['pok'] as ExpansionId[], playerCount: 4, faction: 'sol' }],
    [{ expansions: ['pok', 'te'] as ExpansionId[], playerCount: 5, faction: 'creuss' }],
    [{ expansions: [] as ExpansionId[], playerCount: 3, faction: 'hacan' }],
    [{ expansions: ['pok', 'te'] as ExpansionId[], playerCount: 8, faction: 'arborec', layout: 'alternate' as MapLayout }],
  ])('%j, begun, is the saved game the old one makes', input => {
    const p = loadPack(input.expansions);
    expect(startedGame(createSaved(input, p, counter()))).toEqual(savedOf(createGame(input, p, counter())));
  });
  test('before it begins no sheet is written, for the player at the tablet no more than for the rest', () => {
    const made = createSaved({ expansions: ['pok'], playerCount: 4, faction: 'sol' }, loadPack(['pok']), counter());
    expect(made.start).toMatchObject({ placed: false, units: {}, ground: {}, control: {}, docks: [], pds: {} });
    expect(made.table.viewer).toBe('p1');
  });
});

describe('players', () => {
  const draft = (n = 4) => played(n, ['sol', 'hacan', 'arborec', 'creuss', 'mentak', 'saar'].slice(0, n));
  test.each([3, 4, 5, 6, 7, 8])('a player added to a game of %i is the old one added', n => {
    const g = draft(Math.min(n, 6));
    const expected = viaOld(g, x => oldAdd(x, pack, counter()));
    expectSame(addPlayer(savedOf(g)), savedOf(expected));
  });
  test('the pack maximum stops it', () => {
    const s = savedOf(draft(6));
    const full = addPlayer(addPlayer(s)); // 8 players
    expect(addPlayer(full)).toBe(full);
  });
  test.each([1, 2, 3])('the opponent %i leaves with their units, planets, notes and entries', index => {
    const g = draft(5);
    // The old edit left a transaction with the one who left standing, under their old id; the kernel takes it out with them.
    const expected = savedOf(viaOld(g, x => oldRemove(x, index, pack)));
    const seated = new Set(expected.table.players.map(p => p.id));
    const kept = (turn: SavedGame['plans'][number]['rounds'][number]['turns'][number]) => ({ ...turn, acts: turn.acts.filter(act => act.kind !== 'transaction' || seated.has(act.with)) });
    expectSame(removePlayer(savedOf(g), at(savedOf(g), index)), { ...expected, plans: expected.plans.map(plan => ({ ...plan, rounds: plan.rounds.map(round => ({ ...round, turns: round.turns.map(kept) })) })) });
  });
  test('the last three stay, and a player not at the table changes nothing', () => {
    const three = savedOf(draft(3));
    for (const { id } of three.table.players) expect(removePlayer(three, id)).toBe(three);
    const s = savedOf(draft(4));
    expect(removePlayer(s, 'p9')).toBe(s);
  });
  test('the faction of the player at the tablet set, and cleared, as the old edit of my faction', () => {
    const g = draft(4);
    for (const faction of ['winnu', 'jolnar', 'creuss', '']) {
      expectSame(setFaction(savedOf(g), at(savedOf(g), 0), faction), savedOf(viaOld(g, x => oldFaction(x, 0, faction, pack))));
    }
  });
  test.each([0, 1, 2, 3])('the faction a player has already changes nothing (player %i)', index => {
    const same = savedOf(draft(4));
    expect(setFaction(same, at(same, index), same.table.players[index].faction)).toBe(same);
  });
  test.each([[0, 1], [1, 3], [2, 0], [0, 3]])('seats %i and %i trade', (a, b) => {
    const g = draft(4);
    expectSame(swapSeats(savedOf(g), at(savedOf(g), a), at(savedOf(g), b)), savedOf(viaOld(g, x => oldSwap(x, a, b, pack))));
    const s = savedOf(g);
    expect(swapSeats(s, at(s, a), at(s, a))).toBe(s);
  });
  test('the Fracture seat goes with the count', () => {
    const g = viaOld({ ...draft(6), fracture: { active: true, ingress: [], seat: 6 } }, x => x);
    const g2 = { ...g };
    expectSame(removePlayer(savedOf(g2), at(savedOf(g2), 5)), savedOf(viaOld(g2, x => oldRemove(x, 5, pack))));
    void withFractureActive;
    void withFractureSeat;
  });
  test('systems of the Fracture that move with the count are followed by the units, the ingress and the plan', () => {
    const g0 = played(4, ['sol', 'hacan', 'arborec', 'creuss']);
    const [first] = fractureSlots(null, 4, pack, g0.layout);
    const at = slotKeyOf(first.q, first.r);
    const entries = g0.plans[0].rounds[0].entries.map(e => (e.id === 't1' && e.type === 'tactical' ? { ...e, systemId: at, moves: [{ from: at, units: { cruiser: 1 }, via: [at] }] } : e));
    const g = { ...g0, enemyUnits: { [at]: { [g0.opponents[0].id]: { cruiser: 1 } } }, fracture: { active: true, ingress: [at], seat: null }, plans: [{ ...g0.plans[0], rounds: [{ ...g0.plans[0].rounds[0], entries }] }] };
    expectSame(addPlayer(savedOf(g)), savedOf(viaOld(g, x => oldAdd(x, pack, counter()))));
    expectSame(changeLayout(savedOf(g), 'hyperlanes'), savedOf(viaOld(g, x => oldChangeLayout(x, 'hyperlanes', pack))));
  });
});

describe('layout and map', () => {
  const choices = Object.entries(LAYOUT_CHOICES).flatMap(([count, layouts]) => layouts.map(layout => [Number(count), layout] as const));
  test.each(choices)('%i players change to %s', (count, layout) => {
    const factions = ['sol', 'hacan', 'arborec', 'creuss', 'mentak', 'saar', 'winnu', 'yin'].slice(0, count);
    const p = loadPack(['pok', 'te']);
    let g = createGame({ expansions: ['pok', 'te'], playerCount: count, faction: '' }, p, counter());
    factions.forEach((f, i) => { g = oldFaction(g, i, f, p); });
    g = { ...g, map: { ...g.map, '1,-1': '26' } };
    for (const to of LAYOUT_CHOICES[count]) {
      expectSame(changeLayout(savedOf(g), to), savedOf(viaOld(g, x => oldChangeLayout(x, to, p))));
    }
    void layout;
  });
  test('a map string keeps the centre and the hyperlanes, and leaves homes to the factions', () => {
    const g = played(6, ['sol', 'hacan', 'arborec', 'creuss', 'mentak', 'saar']);
    const map = { '1,-1': '26', '2,-1': '27', '0,0': '99', '-1,-1': '28' };
    const old = (x: Game, input: Record<string, string>, layout?: MapLayout): Game => {
      const next = { ...input };
      delete next['0,0'];
      if (x.map['0,0']) next['0,0'] = x.map['0,0'];
      for (const slot of slotsFor(x.playerCount, pack, layout ?? x.layout)) if (slot.fixed && !next[slotKeyOf(slot.q, slot.r)]) next[slotKeyOf(slot.q, slot.r)] = slot.fixed;
      const nextLayout = layout ?? x.layout;
      const placed = withSeatHomes({ ...x, map: next, layout: nextLayout }, pack);
      const same = Object.keys(placed.map).length === Object.keys(x.map).length && Object.entries(placed.map).every(([k, v]) => x.map[k] === v);
      return same && nextLayout === x.layout ? x : placed;
    };
    expectSame(withMap(savedOf(g), map), savedOf(viaOld(g, x => old(x, map))));
    expectSame(withMap(savedOf(g), map, 'large'), savedOf(viaOld(g, x => old(x, map, 'large'))));
    const same = savedOf(g);
    expect(withMap(same, { ...g.map })).toBe(same);
  });
});

describe('expansions', () => {
  test('Thunder\'s Edge turned on for an open game moves Mecatol and what stands on it', () => {
    const g0 = played(4, ['sol', 'hacan', 'arborec', 'creuss'], ['pok']);
    const g = { ...g0, map: { ...g0.map, '0,0': '18' }, docks: ['mr'], pds: { mr: 1 }, planetControl: { ...g0.planetControl, mr: 'me' as const } };
    const te = (x: Game): Game => withTeMecatol({ ...x, expansions: ['pok', 'te'] });
    expectSame(addExpansion(savedOf(g), 'te'), savedOf(viaOld(g, te, ['pok'])));
    const s = savedOf(g);
    expect(addExpansion(s, 'pok')).toBe(s);
  });
  test('a draft under other expansions, as the old one makes it', () => {
    const g = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: '' }, pack, counter());
    let d = oldFaction(oldFaction(oldFaction(g, 0, 'sol', pack), 1, 'keleresa', pack), 3, 'hacan', pack);
    d = { ...d, map: { ...d.map, '1,-1': '26', '2,-1': '2000' } };
    // The same draft made by the edits of the table: no sheet is written in it until it begins.
    const made = [['p1', 'sol'], ['p2', 'keleresa'], ['p4', 'hacan']].reduce<SavedGame>((game, [player, faction]) => setFaction(game, player, faction), createSaved({ expansions: ['pok', 'te'], playerCount: 6 }, pack, counter()));
    const draft: SavedGame = { ...made, table: { ...made.table, map: { ...made.table.map, '1,-1': '26', '2,-1': '2000' } } };
    for (const expansions of [['pok'], [], ['te', 'pok']] as ExpansionId[][]) {
      const old = oldDraft(d, expansions, loadPack(expansions));
      const under = draftWithExpansions(draft, expansions);
      expect(under.start).toMatchObject({ placed: false, units: {}, ground: {}, control: {}, docks: [], pds: {} });
      // The old draft has my sheet written, as every old game has; the sheets apart, the two are the same.
      const sheetless = (s: SavedGame): SavedGame => ({ ...s, start: { ...s.start, placed: false, units: {}, ground: {}, control: {}, docks: [], pds: {} } });
      expectSame({ ...under, id: old.id }, sheetless(savedOf({ ...old, name: undefined } as Game)));
    }
    void gameOf;
  });
});

describe('the players are equal', () => {
  const gated = Object.values(pack.factions).find(f => f.gateTile !== undefined)!.id;
  /** A game being set up by the edits of the table themselves: a faction at each seat, the first seat at the tablet. */
  const seat = (factions: string[], expansions: ExpansionId[] = ['pok', 'te']): SavedGame =>
    factions.reduce<SavedGame>((game, faction, i) => (faction ? setFaction(game, `p${i + 1}`, faction) : game), createSaved({ expansions, playerCount: factions.length }, loadPack(expansions), counter()));
  const four = () => seat(['sol', 'hacan', 'arborec', 'mentak']);
  const factionsOf = (s: SavedGame) => seatedPlayers(s.table).map(p => [p.id, p.faction]);
  const onBoard = (s: SavedGame) => { const { systems, planets } = startBoard(s, loadPack(s.table.expansions)); return { systems, planets }; };
  const bySheets = (s: SavedGame) => { const { systems, planets } = initialBoard(s.table, loadPack(s.table.expansions)); return { systems, planets }; };

  test('any player may leave, the one at the tablet too: the first of the rest by seat sits at it', () => {
    const left = removePlayer(four(), 'p1');
    expect(factionsOf(left)).toEqual([['p1', 'hacan'], ['p2', 'arborec'], ['p3', 'mentak']]);
    expect(left.table.viewer).toBe('p1');
    // The mark at the tablet writes nothing into the rounds: a player who chose no card has no key there, whoever sits at the tablet.
    expect(four().plans[0].rounds[0].picks).toEqual({});
    expect(setViewer(four(), 'p3').plans[0].rounds[0].picks).toEqual({});
    const third = setViewer(four(), 'p3');
    expect(removePlayer(third, 'p3').table.viewer).toBe('p1');
  });

  test('the tablet follows its player when a player before them leaves', () => {
    const left = removePlayer(setViewer(four(), 'p3'), 'p2');
    expect(left.table.viewer).toBe('p2');
    expect(seatedPlayers(left.table).find(p => p.id === 'p2')?.faction).toBe('arborec');
  });

  test('the tablet is a mark on one player: it moves to any of them, and the rounds of the plan stay as they are', () => {
    const draft = four();
    const moved = setViewer(draft, 'p3');
    expect(moved.table.viewer).toBe('p3');
    expect(moved.table.players).toEqual(draft.table.players);
    expect(moved.start).toEqual(draft.start);
    expect(moved.plans).toBe(draft.plans);
    expect(setViewer(moved, 'p3')).toBe(moved);
    expect(setViewer(moved, 'p9')).toBe(moved);
  });

  test('the tablet stays with its player through a trade of seats', () => {
    const traded = swapSeats(setViewer(four(), 'p3'), 'p3', 'p1');
    expect(traded.table.viewer).toBe('p1');
    expect(seatedPlayers(traded.table)[0].faction).toBe('arborec');
  });

  test.each([
    [['sol', 'hacan', 'arborec', 'mentak']],
    [['sol', gated, 'hacan', 'arborec', 'mentak', 'saar']],
    [['letnev', 'nekro', 'naalu', 'muaat', 'empyrean']],
    [['sol', '', 'yssaril']],
    [['sol', 'hacan', 'arborec', gated, 'mentak', 'saar', 'winnu', 'yin']],
  ])('%j begin the same way: each stands at home with what the sheet gives, written into the start', factions => {
    const draft = seat(factions);
    expect(draft.start).toMatchObject({ placed: false, units: {}, ground: {}, control: {}, docks: [], pds: {} });
    const begun = startedGame(draft);
    expect(begun.start.placed).toBe(true);
    expect(onBoard(begun)).toEqual(bySheets(begun));
    expect(startedGame(begun)).toBe(begun);
    // Who sits at the tablet changes nothing on the board.
    expect(onBoard(startedGame(setViewer(draft, `p${factions.length}`)))).toEqual(onBoard(begun));
  });

  test.each(['p1', 'p2', 'p3', 'p4'])('a faction set for %s after the game began moves that player\'s sheet: the units, the structures and the home planets', player => {
    const draft = four();
    for (const faction of ['jolnar', gated, '']) {
      const after = setFaction(startedGame(draft), player, faction);
      const fresh = startedGame(setFaction(draft, player, faction));
      expect(after.table, faction).toEqual(fresh.table);
      // The order of the docks means nothing.
      const sorted = (s: SavedGame) => ({ ...s.start, docks: [...s.start.docks].sort() });
      expect(sorted(after), faction).toEqual(sorted(fresh));
    }
  });

  test('what was written by hand beside the sheet stays when the faction changes', () => {
    const begun = startedGame(four());
    const home = Object.keys(begun.start.units).find(slot => begun.start.units[slot].p2)!;
    const sheet = begun.start.units[home].p2;
    const more: SavedGame = { ...begun, start: { ...begun.start, units: { ...begun.start.units, [home]: { p2: { ...sheet, warsun: 1 } } } } };
    const changed = setFaction(more, 'p2', 'jolnar');
    const fresh = startedGame(setFaction(four(), 'p2', 'jolnar'));
    expect(changed.start.units[home].p2).toEqual({ ...fresh.start.units[home].p2, warsun: 1 });
  });

  test('a player leaves a game that began: the fleets of the rest stay at their homes, which move with the template', () => {
    const begun = startedGame(seat(['sol', 'hacan', 'arborec', 'mentak', 'saar', 'winnu']));
    for (const player of ['p1', 'p4']) {
      const left = removePlayer(begun, player);
      expect(onBoard(left), player).toEqual(bySheets(left));
    }
  });

  test('ready to play: every player has a faction, the one at the tablet like the rest', () => {
    const map = (s: SavedGame): SavedGame => ({ ...s, table: { ...s.table, map: { ...s.table.map, ...Object.fromEntries(freeSlots(s.table, pack).map(slot => [slot, '26'])) } } });
    expect(readyToPlay(map(four()).table, pack)).toBe(true);
    expect(readyToPlay(map(setFaction(four(), 'p3', '')).table, pack)).toBe(false);
    expect(readyToPlay(map(setFaction(four(), 'p1', '')).table, pack)).toBe(false);
  });
});

describe('what the map builder reads of the table, as the old builder reads it of the game', () => {
  const made = (count: number, factions: string[], tiles: Record<string, string> = {}): Game => {
    const p = loadPack(['pok', 'te']);
    let g = createGame({ expansions: ['pok', 'te'], playerCount: count, faction: '' }, p, counter());
    factions.forEach((f, i) => { g = oldFaction(g, i, f, p); });
    return { ...g, map: { ...g.map, ...tiles } };
  };
  const loadedPack = loadPack(['pok', 'te']);
  test.each([
    [4, ['sol', 'hacan', 'arborec', 'creuss'], {}],
    [6, ['sol', 'creuss', 'hacan', '', '', 'saar'], { '1,-1': '26', '2,-1': '27' }],
    [3, ['sol', '', 'yssaril'], { '1,-1': '26' }],
    [5, ['letnev', 'nekro', 'naalu', 'muaat', ''], {}],
  ])('%i players: free and empty slots, an empty map, readiness and the tiles a layout switch loses', (count, factions, tiles) => {
    const g = made(count, factions, tiles);
    const saved = savedOf(g);
    expect(freeSlots(saved.table, loadedPack)).toEqual(oldFreeSlots(g, loadedPack));
    expect(emptySlots(saved.table, loadedPack)).toEqual(oldEmptySlots(g, loadedPack));
    expect(mapIsEmpty(saved.table, loadedPack)).toBe(oldMapIsEmpty(g, loadedPack));
    expect(readyToPlay(saved.table, loadedPack)).toBe(oldReady(g, loadedPack));
    for (const n of [count - 1, count + 1]) expect(countChangeEffect(saved.table, n, loadedPack)).toEqual(oldCount(g, n, loadedPack));
    for (const o of g.opponents) expect(boardHoldings(saved.start, playerOfKey(saved.table, o.id)!)).toEqual(oldHoldings(g, o.id));
    expect(homeNotes(saved.table, loadedPack)).toEqual(oldHomeNotes(g, loadedPack));
    for (const layout of LAYOUT_CHOICES[count] ?? []) expect(tilesLostByLayout(saved, layout, loadedPack)).toBe(oldLost(g, layout, loadedPack));
  });
});
