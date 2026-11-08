/** LRR 58 Movement. Source: tirules2 rules-reference/movement.md. */
import { describe, expect, test } from 'vitest';
import { routeReach } from '../../project';
import { CARD } from '../../strategy';
import type { Opponent } from '../../types';
import { codesOf, FACTION, FAR, FARTHER, forecast, HOME, NEAR, rulesGame, rulesPack, secondary, tactical, TARGET } from '../kit';

const pack = rulesPack();
const row = (tiles: Partial<Record<string, string>> = {}) =>
  ({ [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', ...tiles }) as Record<string, string>;
const rival: Opponent = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };

/** A cruiser flies from `from` along `via` into the active system. */
function flight(from: string, active: string, via: string[], map = row(), units = { cruiser: 1 }) {
  const action = tactical(active, { moves: [{ from, units, via }] });
  const game = rulesGame({ map, units: { [from]: units }, entries: [action] });
  return { game, codes: codesOf(game, pack, action) };
}

describe('LRR 58 Movement', () => {
  test.todo('58.1: tactical action movement — heading only');

  test('58.2: the move value comes from the faction\'s own ship when it has one', () => {
    const fast = rulesPack(p => {
      const base = p.units.cruiser!.levels!.one;
      p.factions[FACTION].ships = { cruiser: { one: { ...base, move: 3 } } };
    });
    const action = tactical(FAR, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR, TARGET] }] });
    const game = rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [action] });
    expect(codesOf(game, fast, action)).not.toContain('speedShort');
    expect(codesOf(game, pack, action)).toContain('speedShort');
  });

  test('58.3: any number of ships from several systems move into the active system', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }, { from: FAR, units: { destroyer: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1 }, [FAR]: { destroyer: 1 } }, entries: [action] });
    expect(forecast(game, pack).state.systems[TARGET]).toEqual({ cruiser: 1, destroyer: 1 });
    expect(codesOf(game, pack, action)).toEqual([]);
  });

  test('58.3.1: the ship ends its movement in the active system', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const game = rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [move] });
    const { state } = forecast(game, pack);
    expect(state.systems[TARGET]).toEqual({ cruiser: 1 });
    expect(state.systems[NEAR] ?? {}).toEqual({});
  });

  test('58.3.2: a ship cannot move through a system holding another player\'s ships', () => {
    const action = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const game = rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [action], game: { enemyUnits: { [NEAR]: { o1: { destroyer: 1 } } } } });
    expect(codesOf(game, pack, action)).toContain('routeBlocked');
  });

  test('58.3.2 (note 5): fighters alone block other players\' ships too', () => {
    const action = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const game = rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [action], game: { enemyUnits: { [NEAR]: { o1: { fighter: 2 } } } } });
    expect(codesOf(game, pack, action)).toContain('routeBlocked');
  });

  test('58.3.2: other players\' ground forces in space do not block a route', () => {
    const action = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const game = rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [action], game: { enemyUnits: { [NEAR]: { o1: { infantry: 2 } } } } });
    expect(codesOf(game, pack, action)).not.toContain('routeBlocked');
  });

  test('58.3.2: another player\'s ships in the active system do not block the move', () => {
    const action = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const game = rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [action], game: { enemyUnits: { [TARGET]: { o1: { destroyer: 1 } } } } });
    expect(codesOf(game, pack, action)).toEqual([]);
  });

  test('58.3.2: a drawn route that skips the system in between still passes through it, and is blocked by ships there', () => {
    // The only way from HOME to TARGET is through NEAR, whether the route names it or not.
    const action = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    const game = rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [action], game: { enemyUnits: { [NEAR]: { o1: { destroyer: 1 } } } } });
    expect(codesOf(game, pack, action)).toContain('routeBlocked');
  });

  test('58.3.2: ships an opponent\'s earlier action moved in block my route', () => {
    const theirs = tactical(NEAR, { moves: [{ from: FAR, units: { destroyer: 1 }, via: [TARGET] }] }, { owner: 'o1' });
    const mine = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const game = rulesGame({
      units: { [HOME]: { cruiser: 1 } }, entries: [theirs, mine],
      game: { opponents: [rival], enemyUnits: { [FAR]: { o1: { destroyer: 1 } } } },
    });
    expect(codesOf(game, pack, theirs)).toEqual([]);
    expect(codesOf(game, pack, mine)).toContain('routeBlocked');
  });

  test('58.3.2: ships an opponent\'s earlier action moved away no longer block my route', () => {
    const theirs = tactical(FAR, { moves: [{ from: NEAR, units: { destroyer: 1 }, via: [TARGET] }] }, { owner: 'o1' });
    const mine = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const game = rulesGame({
      units: { [HOME]: { cruiser: 1 } }, entries: [theirs, mine],
      game: { opponents: [rival], enemyUnits: { [NEAR]: { o1: { destroyer: 1 } } } },
    });
    expect(codesOf(game, pack, mine)).not.toContain('routeBlocked');
  });

  test('58.3.2: my ships block an opponent\'s route', () => {
    const theirs = tactical(HOME, { moves: [{ from: TARGET, units: { destroyer: 1 }, via: [NEAR] }] }, { owner: 'o1' });
    const game = rulesGame({
      units: { [NEAR]: { cruiser: 1 } }, entries: [theirs],
      game: { opponents: [rival], enemyUnits: { [TARGET]: { o1: { destroyer: 1 } } } },
    });
    expect(codesOf(game, pack, theirs)).toContain('routeBlocked');
  });

  test('58.3.2: the reach shown while drawing stops at ships an opponent\'s earlier action moved in', () => {
    const theirs = tactical(NEAR, { moves: [{ from: FAR, units: { destroyer: 1 }, via: [TARGET] }] }, { owner: 'o1' });
    const game = rulesGame({ entries: [theirs], game: { opponents: [rival], enemyUnits: { [FAR]: { o1: { destroyer: 1 } } } } });
    // routeReach reads the board from the game alone: the opponent's planned move does not reach it.
    expect(routeReach(game, [HOME], 2, FARTHER, pack).has(TARGET)).toBe(false);
  });

  test('58.3.3: a ship cannot move out of another system holding its own token', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1 } }, entries: [tactical(NEAR), move] });
    expect(codesOf(game, pack, move)).toContain('sourceActivated');
  });

  test('58.3.3: a token left by the Construction secondary before Thunder\'s Edge holds the ships there too', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1 } }, entries: [secondary(CARD.construction, { systemId: NEAR }), move] });
    expect(codesOf(game, pack, move)).toContain('sourceActivated');
  });

  test('58.3.3: a token of an earlier round is gone after its status phase and holds nothing', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1 } }, rounds: [[tactical(NEAR)], [move]] });
    expect(codesOf(game, pack, move)).not.toContain('sourceActivated');
  });

  test('58.3.3: an opponent\'s token does not hold my ships', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1 } }, entries: [tactical(NEAR, {}, { owner: 'o1' }), move], game: { opponents: [rival] } });
    expect(codesOf(game, pack, move)).not.toContain('sourceActivated');
  });

  test('58.3.4: a ship can move through systems holding its own token', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const game = rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [tactical(NEAR), move] });
    expect(codesOf(game, pack, move)).toEqual([]);
  });

  test('58.3.5: a ship can move out of the active system and back into it', () => {
    const game = rulesGame();
    expect(routeReach(game, [TARGET, FAR], 2, TARGET, pack).has(TARGET)).toBe(true);
  });

  test('58.3.5: a ship passing through the active system and back into it with move enough is not warned about', () => {
    // A cruiser II (move 3) from NEAR through TARGET to FAR and back into TARGET.
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 }, via: [TARGET, FAR] }] });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1 } }, entries: [move], game: { upgrades: { me: ['cruiser'], opponents: {} } } });
    expect(codesOf(game, pack, move)).toEqual([]);
  });

  test('58.3.6: the systems a ship enters cannot exceed its move value', () => {
    expect(flight(HOME, TARGET, [NEAR]).codes).not.toContain('speedShort');
    expect(flight(HOME, FAR, [NEAR, TARGET]).codes).toContain('speedShort');
  });

  test('58.3.6: each ship is held to its own move value, not the fleet\'s best', () => {
    const { codes } = flight(HOME, TARGET, [NEAR], row(), { cruiser: 1, carrier: 1 } as never);
    expect(codes).toContain('speedShort');
  });

  test('58.3.6: a step through a wormhole enters one system', () => {
    expect(flight(HOME, FARTHER, [], row({ [HOME]: 'r-alpha', [FARTHER]: 'r-alpha' }), { carrier: 1 } as never).codes).toEqual([]);
  });

  test('58.3.6: a route that goes the long way counts every system it enters', () => {
    // HOME to NEAR through the wormhole, FARTHER and back along the row is far longer than one step.
    const { codes } = flight(HOME, NEAR, [FARTHER, FAR, TARGET], row({ [HOME]: 'r-alpha', [FARTHER]: 'r-alpha' }));
    expect(codes).toContain('speedShort');
  });

  test('58.4: a moving ship with capacity transports ground forces and fighters, up to its capacity', () => {
    const fits = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2, fighter: 2 } }] });
    const over = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 3, fighter: 2 } }] });
    expect(codesOf(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2, fighter: 2 } }, entries: [fits] }), pack, fits)).toEqual([]);
    expect(codesOf(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 3, fighter: 2 } }, entries: [over] }), pack, over)).toContain('capacityGroup');
  });

  test('58.4: a ship with capacity cannot carry what another source system sends', () => {
    // Each source system carries its own cargo: the carrier from FAR does not take the infantry flying from NEAR.
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1, infantry: 1 } }, { from: FAR, units: { carrier: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1, infantry: 1 }, [FAR]: { carrier: 1 } }, entries: [action] });
    expect(codesOf(game, pack, action)).toContain('capacityGroup');
  });

  test('58.5: ships from all sources arrive together, and the fleet pool counts them all', () => {
    const action = tactical(TARGET, { moves: [{ from: NEAR, units: { destroyer: 2 } }, { from: FAR, units: { destroyer: 2 } }] });
    const game = rulesGame({ units: { [NEAR]: { destroyer: 2 }, [FAR]: { destroyer: 2 } }, entries: [action] });
    expect(codesOf(game, pack, action)).toContain('fleetPool');
  });

  test.todo('58.6: space cannon offense follows the move — not modelled: no space cannon');
  test.todo('58.7: ability movement — heading only');
  test.todo('58.8: an ability moving a unit outside the movement step follows its own text, not the move value — not modelled: ability movement goes in by hand as an adjustment');
  test.todo('58 note 1: a move modifier does nothing to an effect that moves a unit to an adjacent system — not modelled: ability movement goes in by hand');
  test.todo('58 note 2: an ability may move a ship out of a system with its token, but carries nothing from there unless it says so — not modelled: ability movement goes in by hand');
  test.todo('58 note 2.1: a retreat may carry units out of the active system — not modelled: no retreat');
  test.todo('58 note 3: a Fighter II cannot both fly and be picked up part way, as all ships move at once — not modelled: pickups of flying fighters are not told apart');

  test('58 note 4: a ship moves into the active system only: the systems it passes keep neither the ship nor a token', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const { state } = forecast(rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [move] }), pack);
    expect(state.tokensOnMap).toEqual([TARGET]);
    expect(state.systems[NEAR] ?? {}).toEqual({});
  });
});
