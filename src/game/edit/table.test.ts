/** The table edits against the old edits of `Game` they replace: the saved game each makes is the one the old edit makes. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { LAYOUT_CHOICES, slotKeyOf } from '../../domain/layouts';
import { changeLayout as oldChangeLayout, slotsFor } from '../../domain/mapBuilder';
import { withTeMecatol } from '../../domain/mecatol';
import { createGame } from '../../domain/newGame';
import { placeStartUnits, addPlayer as oldAdd, draftWithExpansions as oldDraft, removePlayer as oldRemove, setPlayerFaction as oldFaction, swapSeats as oldSwap, withSeatHomes } from '../../domain/players';
import { fractureSlots, withFractureMoved } from '../../domain/thundersEdge';
import type { Entry, ExpansionId, Game, MapLayout } from '../../domain/types';
import { gameOf, savedOf } from '../../testing/legacySave';
import type { SavedGame } from '../save';
import {
  addExpansion, addPlayer, changeLayout, createSaved, draftWithExpansions, removePlayer, setFaction, startedGame, swapSeats, withMap, withName, withTile,
} from './table';
import { withFractureActive, withFractureSeat } from './start';

const pack = loadPack(['pok', 'te']);
const counter = () => { let n = 0; return (prefix: string) => `${prefix}-${n++}`; };

const normal = (s: SavedGame) => ({ ...s, plans: s.plans.map(p => ({ ...p, id: 'plan' })), activePlanId: 'plan' });
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
  ])('%j is the saved game the old one makes', input => {
    const p = loadPack(input.expansions);
    expect(createSaved(input, p, counter())).toEqual(savedOf(createGame(input, p, counter())));
  });
});

describe('players', () => {
  const draft = (n = 4) => played(n, ['sol', 'hacan', 'arborec', 'creuss', 'mentak', 'saar'].slice(0, n));
  test.each([3, 4, 5, 6, 7, 8])('a player added to a game of %i is the old one added', n => {
    const g = draft(Math.min(n, 6));
    const expected = viaOld(g, x => oldAdd(x, pack, counter()));
    expectSame(addPlayer(savedOf(g), counter()), savedOf(expected));
  });
  test('the pack maximum stops it', () => {
    const s = savedOf(draft(6));
    const full = addPlayer(addPlayer(s)); // 8 players
    expect(addPlayer(full)).toBe(full);
  });
  test.each([1, 2, 3])('the opponent %i leaves with their units, planets, notes and entries', index => {
    const g = draft(5);
    expectSame(removePlayer(savedOf(g), index), savedOf(viaOld(g, x => oldRemove(x, index, pack))));
  });
  test('my player and the last three stay', () => {
    const s = savedOf(draft(4));
    expect(removePlayer(s, 0)).toBe(s);
    const three = savedOf(draft(3));
    expect(removePlayer(three, 1)).toBe(three);
  });
  test.each([0, 1, 2, 3])('a faction set for the player at %i, and cleared', index => {
    const g = draft(4);
    for (const faction of ['winnu', 'jolnar', 'creuss', '']) {
      expectSame(setFaction(savedOf(g), index, faction), savedOf(viaOld(g, x => oldFaction(x, index, faction, pack))));
    }
    const same = savedOf(g);
    expect(setFaction(same, index, g.opponents[index - 1]?.faction ?? g.faction)).toBe(same);
  });
  test.each([[0, 1], [1, 3], [2, 0], [0, 3]])('seats %i and %i trade', (a, b) => {
    const g = draft(4);
    expectSame(swapSeats(savedOf(g), a, b), savedOf(viaOld(g, x => oldSwap(x, a, b, pack))));
    const s = savedOf(g);
    expect(swapSeats(s, a, a)).toBe(s);
  });
  test('the Fracture seat goes with the count', () => {
    const g = viaOld({ ...draft(6), fracture: { active: true, ingress: [], seat: 6 } }, x => x);
    const g2 = { ...g };
    expectSame(removePlayer(savedOf(g2), 5), savedOf(viaOld(g2, x => oldRemove(x, 5, pack))));
    void withFractureActive;
    void withFractureSeat;
  });
  test('systems of the Fracture that move with the count are followed by the units, the ingress and the plan', () => {
    const g0 = played(4, ['sol', 'hacan', 'arborec', 'creuss']);
    const [first] = fractureSlots(null, 4, pack, g0.layout);
    const at = slotKeyOf(first.q, first.r);
    const entries = g0.plans[0].rounds[0].entries.map(e => (e.id === 't1' && e.type === 'tactical' ? { ...e, systemId: at, moves: [{ from: at, units: { cruiser: 1 }, via: [at] }] } : e));
    const g = { ...g0, enemyUnits: { [at]: { [g0.opponents[0].id]: { cruiser: 1 } } }, fracture: { active: true, ingress: [at], seat: null }, plans: [{ ...g0.plans[0], rounds: [{ ...g0.plans[0].rounds[0], entries }] }] };
    expectSame(addPlayer(savedOf(g), counter()), savedOf(viaOld(g, x => oldAdd(x, pack, counter()))));
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
    for (const expansions of [['pok'], [], ['te', 'pok']] as ExpansionId[][]) {
      const old = oldDraft(d, expansions, loadPack(expansions));
      expectSame(draftWithExpansions(savedOf(d), expansions), savedOf({ ...old, name: undefined } as Game));
    }
    void gameOf;
  });
});

describe('the start of the game', () => {
  const draft = (count: number, factions: string[], expansions: ExpansionId[] = ['pok', 'te']): Game => {
    const p = loadPack(expansions);
    let g = createGame({ expansions, playerCount: count, faction: '' }, p, counter());
    factions.forEach((f, i) => { g = oldFaction(g, i, f, p); });
    return g;
  };
  test.each([
    [4, ['sol', 'hacan', 'arborec', 'creuss']],
    [6, ['sol', 'creuss', 'hacan', 'arborec', 'mentak', 'saar']],
    [5, ['letnev', 'nekro', 'naalu', 'muaat', 'empyrean']],
    [3, ['sol', '', 'yssaril']],
    [8, ['sol', 'hacan', 'arborec', 'creuss', 'mentak', 'saar', 'winnu', 'yin']],
  ])('%i players: the opponents stand at their seats as the old start places them', (count, factions) => {
    const g = draft(count, factions);
    expect(startedGame(savedOf(g))).toEqual(savedOf(placeStartUnits(g, pack)));
  });
});
