import { describe, expect, test } from 'vitest';
import { MECATOL_PLANET, MECATOL_PLANET_TE, MECATOL_TILE, MECATOL_TILE_TE } from '../../../mecatol';
import { linksOf, routeReach } from '../../../movement';
import type { Entry, Game } from '../../../types';
import { bench, type Bench, componentAction, effect, endOf, expectStanding, FAR, FARTHER, HOME, NEAR, quote, TARGET, warningsOf } from '../kit';
import { id } from './lgf';

/** An alpha wormhole next to home, Mecatol Rex at the far end of the row, four systems from it by its edges. */
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: MECATOL_TILE };
const table = (faction: string, entries: Entry[] = [], game: Partial<Game> = {}) =>
  bench({ faction, start: { technologies: [id] }, entries, game: { map: MAP, ...game } });
/** Where a ship of move 1 can still fly from the alpha wormhole, with Mecatol Rex as the active system. */
const reach = (winnu: Bench) => {
  const { game, pack } = winnu;
  const state = endOf(winnu);
  return routeReach(game, [NEAR], 1, FARTHER, pack, new Set(), { state, shared: state, links: linksOf(game, pack, { state, shared: state, during: 'tactical' }) });
};

describe('technology:lgf Lazax Gate Folding', () => {
  // "During your tactical actions, if you do not control Mecatol Rex, treat its system as if it has both an α and β
  //  wormhole."
  // Checks: from the system of an alpha wormhole a ship of move 1 reaches the Mecatol Rex system, which the wormhole
  // now joins (40.1, 101.1).
  // Why the default adjacency does not apply: Mecatol Rex has no wormhole of its own; the technology gives it both
  // while the Winnu do not control it. Nothing is warned of either way: a jump between marked systems is never warned
  // of, so the technology shows in where ships can fly. The route graph is given the player's links (`linksOf`, the `links` of the technology), which read the holdings and the control of the board.
  test('technology:lgf the Mecatol Rex system is reached through an alpha wormhole', () => {
    const winnu = table('winnu');
    quote(winnu.pack, id, 'if you do not control Mecatol Rex, treat its system as if it has both an');
    expect(reach(winnu).has(FARTHER)).toBe(true);
  });

  // LRR 40.1: two systems are adjacent if they share a side, and through matching wormholes (101.1).
  // Checks: another faction holding nothing of the kind does not reach Mecatol Rex from the wormhole.
  // Why the check is NOT redundant here: the technology is the Winnu's.
  test('technology:lgf is the Winnu\'s own: another faction does not reach Mecatol Rex through the wormhole', () => {
    expect(reach(table('sol')).has(FARTHER)).toBe(false);
  });

  // "... if you do not control Mecatol Rex ..."
  // Checks: the Winnu holding Mecatol Rex do not get its wormholes.
  // Why the check is NOT redundant here: the wormholes stand only while Mecatol Rex is not theirs.
  test('technology:lgf with Mecatol Rex controlled the system has no wormhole', () => {
    expect(reach(table('winnu', [], { planetControl: { [MECATOL_PLANET]: 'me' } })).has(FARTHER)).toBe(false);
  });

  // "ACTION: If you control Mecatol Rex, exhaust this card to place 1 infantry from your reinforcements on Mecatol Rex."
  // Checks: the component action of the technology with Mecatol Rex controlled places 1 infantry on it.
  // Why this is the component's own: no rule places ground forces outside production (67) and invasion (49).
  test('technology:lgf its ACTION places 1 infantry on Mecatol Rex the Winnu control', () => {
    const winnu = table('winnu', [componentAction(id)], { planetControl: { [MECATOL_PLANET]: 'me' } });
    expect(endOf(winnu).ground[MECATOL_PLANET]).toEqual({ infantry: 1 });
  });

  // Thunder's Edge: tile 112 with the planet `mrte` stands in the centre; it is Mecatol Rex all the same.
  test('technology:lgf with the Thunder\'s Edge Mecatol Rex controlled its ACTION is not warned of and places the infantry', () => {
    const action = componentAction(id);
    const winnu = table('winnu', [action], { map: { ...MAP, [FARTHER]: MECATOL_TILE_TE }, planetControl: { [MECATOL_PLANET_TE]: 'me' } });
    expect(warningsOf(winnu, action).filter(w => w.code === 'componentCondition')).toEqual([]);
    expect(endOf(winnu).ground[MECATOL_PLANET_TE]).toEqual({ infantry: 1 });
    expect(reach(winnu).has(FARTHER)).toBe(false);
  });

  // "If you control Mecatol Rex ..."
  // Checks: without Mecatol Rex the ACTION places nothing.
  // Why the check is NOT redundant here: the infantry goes only on a Mecatol Rex the player controls.
  test('technology:lgf its ACTION without Mecatol Rex places nothing', () => {
    expect(endOf(table('winnu', [componentAction(id)])).ground[MECATOL_PLANET]).toBeUndefined();
  });

  // "... exhaust this card ..." LRR 34.1.
  // Checks: a second ACTION in the same round finds the card exhausted.
  test('technology:lgf its ACTION exhausts the card: a second one in the round is warned of', () => {
    const again = componentAction(id);
    expectStanding(warningsOf(table('winnu', [componentAction(id), again], { planetControl: { [MECATOL_PLANET]: 'me' } }), again), 'componentExhausted');
  });

  test('technology:lgf is a play effect for its ACTION', () => {
    const { pack } = table('winnu');
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).nativePlay).toBeTypeOf('function');
  });
});
