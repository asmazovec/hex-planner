/** Each start edit against the old edit of `Game` it replaces: the saved game it makes is the one the old edit makes. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { setLeader, setStartHolding } from '../../domain/holdings';
import { createGame } from '../../domain/newGame';
import { placeStartUnits, setPlayerFaction } from '../../domain/players';
import { startingDocks, startingPds } from '../../domain/strategy';
import { fractureSlots } from '../../domain/thundersEdge';
import type { Game } from '../../domain/types';
import { gameOf, savedOf } from '../../testing/legacySave';
import { playerOfLegacy } from '../entry';
import type { SavedGame } from '../save';
import {
  withControl, withDock, withFractureActive, withFractureSeat, withGroundAt, withIngressToggled, withLeader, withPds, withSlice,
  withStartHolding, withThundersEdge, withUnitsAt,
} from './start';

const pack = loadPack(['pok', 'te']);
const factions = ['sol', 'creuss', 'hacan', 'arborec'];
const base = (): Game => {
  let n = 0;
  let game = createGame({ expansions: ['pok', 'te'], playerCount: 4, faction: '' }, pack, prefix => `${prefix}-${n++}`);
  factions.forEach((faction, i) => { game = setPlayerFaction(game, i, faction, pack); });
  return placeStartUnits(game, pack);
};
const [a, b] = [base(), base()];
void b;
const opp = a.opponents[0].id;
const kid = (saved: SavedGame, legacy: string): string => playerOfLegacy(saved.table, legacy)!;

/** Applies the old edit to the game and the new one to its saved game: the starts, and what the old model reads of the new one, agree. */
function pinned(old: (g: Game) => Game, next: (s: SavedGame) => SavedGame, from: Game = base()): SavedGame {
  const saved = savedOf(from);
  const expected = savedOf(old(from));
  const made = next(saved);
  expect(made.start).toEqual(expected.start);
  expect(made.table).toEqual(expected.table);
  return made;
}

const sol = (s: SavedGame, g: Game) => ({ me: kid(s, 'me'), opp: kid(s, g.opponents[0].id) });

describe('units and control', () => {
  const units = { cruiser: 2 };
  test('units in space and on a planet are set, merged per place, and an empty set removes them', () => {
    const g = base(); const s = savedOf(g); const { opp: o } = sol(s, g);
    const slot = '1,-2';
    const withUnits = pinned(x => ({ ...x, enemyUnits: { ...x.enemyUnits, [slot]: { ...x.enemyUnits[slot], [opp]: units } } }), x => withUnits_(x, slot, o));
    expect(withUnits.start.units[slot][o]).toEqual(units);
    pinned(x => x, x => withUnitsAt(withUnits_(x, slot, o), slot, o, {}));
    pinned(x => ({ ...x, enemyGround: { ...x.enemyGround, '25': { [opp]: { infantry: 3 } } } }), x => withGroundAt(x, '25', o, { infantry: 3 }));
    expect(withUnitsAt(s, slot, o, {})).toBe(s);
  });
  const withUnits_ = (s: SavedGame, slot: string, o: string) => withUnitsAt(s, slot, o, { cruiser: 2 });

  test('control of a planet by me, by another, and let go', () => {
    const g = base(); const s = savedOf(g); const { me, opp: o } = sol(s, g);
    pinned(x => ({ ...x, planetControl: { ...x.planetControl, '30': 'me' } }), x => withControl(x, '30', me));
    pinned(x => ({ ...x, planetControl: { ...x.planetControl, '30': 'enemy' }, planetOwner: { ...x.planetOwner, '30': opp } }), x => withControl(x, '30', o));
    const home = Object.keys(g.planetControl)[0];
    pinned(x => ({ ...x, planetControl: Object.fromEntries(Object.entries(x.planetControl).filter(([k]) => k !== home)) }), x => withControl(x, home, null));
  });
});

describe('docks and PDS', () => {
  test('a dock set and taken off, a PDS count, under an absent home planet too', () => {
    const g = base(); const planet = '25';
    pinned(x => ({ ...x, docks: [...x.docks, planet] }), x => withDock(x, planet, true));
    const home = startingDocks(g, pack)[0];
    pinned(x => ({ ...x, docks: x.docks.filter(id => id !== home) }), x => withDock(x, home, false));
    pinned(x => ({ ...x, pds: { ...startingPds(x, pack), [planet]: 2 } }), x => withPds(x, planet, 2));
    const s = savedOf(g);
    expect(withDock(s, home, true)).toBe(s);
    expect(withPds(s, planet, 0)).toBe(s);
  });
});

describe('holdings and leaders', () => {
  test('technologies, a relic, a breakthrough and a promissory note given to another player', () => {
    const g = base(); const s = savedOf(g); const { me, opp: o } = sol(s, g);
    for (const id of ['technology:ao', 'relic:crown_of_thalnos', 'breakthrough:x', 'actionCard:sabotage']) {
      pinned(x => setStartHolding(x, 'me', id, true), x => withStartHolding(x, me, id, true));
      pinned(x => setStartHolding(x, opp, id, true), x => withStartHolding(x, o, id, true));
    }
    const note = Object.values(g.start.me.promissory ?? [])[0] as string;
    pinned(x => setStartHolding(x, opp, note, true), x => withStartHolding(x, o, note, true));
    pinned(x => setStartHolding(x, 'me', note, false), x => withStartHolding(x, me, note, false));
    const lent = setStartHolding(g, opp, note, true);
    pinned(x => setStartHolding(x, opp, note, false), x => withStartHolding(x, o, note, false), lent);
  });
  test('a leader state set and cleared', () => {
    const g = base(); const s = savedOf(g); const { me } = sol(s, g);
    pinned(x => setLeader(x, 'me', 'leader:x', 'unlocked'), x => withLeader(x, me, 'leader:x', 'unlocked'));
    pinned(x => setLeader(x, 'me', 'leader:x', null), x => withLeader(x, me, 'leader:x', null));
  });
});

describe('expedition and the Fracture', () => {
  test('slices and the Thunder\'s Edge slot', () => {
    const g = base(); const s = savedOf(g); const { me } = sol(s, g);
    pinned(x => ({ ...x, expedition: { ...x.expedition, slices: { s1: 'me' } } }), x => withSlice(x, 's1', me));
    pinned(x => ({ ...x, expedition: { ...x.expedition, thundersEdgeSystem: '2,-1' } }), x => withThundersEdge(x, '2,-1'));
  });
  test('opening, moving and the ingress of the Fracture, with its tiles', () => {
    const open = (x: Game): Game => {
      const tiles = Object.fromEntries(fractureSlots(x.fracture.seat, x.playerCount, pack, x.layout).map(t => [`${t.q},${t.r}`, t.tileId]));
      return { ...x, fracture: { ...x.fracture, tiles } };
    };
    const opened = pinned(x => open({ ...x, fracture: { ...x.fracture, active: true } }), x => withFractureActive(x, true));
    expect(Object.keys(opened.start.fracture.tiles ?? {}).length).toBe(7);
    const g = base();
    const again = gameOf(opened);
    pinned(x => open({ ...x, fracture: { ...x.fracture, seat: 3 } }), x => withFractureSeat(x, 3), again);
    pinned(x => ({ ...x, fracture: { ...x.fracture, ingress: ['1,-1'] } }), x => withIngressToggled(x, '1,-1'), g);
  });
});
