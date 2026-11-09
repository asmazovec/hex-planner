/**
 * LRR 16 Capacity. Source: tirules2 rules-reference/capacity.md.
 * Base pack: a carrier I has capacity 4 and moves 1; a cruiser I has capacity 0; a dreadnought I has capacity 1.
 */
import { describe, expect, test } from 'vitest';
import { boardSystemWarnings } from '../../replay';
import { codesOf, forecast, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();

describe('LRR 16 Capacity', () => {
  test('16.1 / 95: a ship transports fighters and ground forces up to its capacity', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1, infantry: 2, fighter: 2 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1, infantry: 2, fighter: 2 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toEqual([]);
  });

  test('16.1: transporting more than the capacity is warned about', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1, infantry: 3, fighter: 2 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1, infantry: 3, fighter: 2 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('capacityGroup');
  });

  test('16.2 / 16.3: fighters and ground forces in a space area beyond the ships\' capacity there are warned about', () => {
    // The dock that produces them keeps 3 fighters apart from the ships' capacity (Space Dock card, LRR 79): the 4th is over.
    const build = tactical(HOME, { production: { fighter: 4 } });
    const game = rulesGame({ units: { [HOME]: { cruiser: 1 } }, entries: [build], game: { docks: ['h1'] } });
    expect(codesOf(game, pack, build)).toContain('capacitySystem');
  });

  test('16.3: the fighters a carrier leaves behind, beyond the capacity left in that system, are warned about', () => {
    // The carrier flies off alone: the two fighters stay in the home system with a cruiser that carries nothing.
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1, cruiser: 1, fighter: 2 } }, entries: [move] });
    const warnings = forecast(game, pack).warnings[move.id] ?? [];
    expect(warnings.some(w => w.code === 'capacitySystem' && w.params.systemId === HOME)).toBe(true);
  });

  test.todo('16.3.1: the player chooses which excess units to remove — not modelled: the app only warns, the removal is entered by hand');

  test('16.3.2: ground forces on planets do not count against capacity', () => {
    const land = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 4 } }],
      landings: [{ planetId: 't1', units: { infantry: 4 } }],
      production: {},
    });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 4 } }, entries: [land] });
    expect(codesOf(game, pack, land)).not.toContain('capacitySystem');
  });

  test('16.3.3: capacity is not held during combat, but fighters left beyond it when the battle ends are warned about', () => {
    const battle = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, fighter: 3 } }], losses: { carrier: 1 } });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, fighter: 3 } }, entries: [battle] });
    expect(codesOf(game, pack, battle)).toContain('capacitySystem');
  });

  test('16.4: cargo is carried by the ships it travels with: one source\'s spare capacity does not carry another source\'s cargo', () => {
    const move = tactical(TARGET, { moves: [
      { from: NEAR, units: { carrier: 1 } },
      { from: HOME, units: { cruiser: 1, infantry: 2 }, via: [NEAR] },
    ] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1 }, [HOME]: { cruiser: 1, infantry: 2 } }, entries: [move] });
    const warnings = forecast(game, pack).warnings[move.id] ?? [];
    expect(warnings.some(w => w.code === 'capacityGroup' && w.params.from === HOME)).toBe(true);
    // Once in the active system the infantry are no longer tied to a ship: the carrier's capacity covers them there.
    expect(warnings.map(w => w.code)).not.toContain('capacitySystem');
  });

  test.todo('16 note 1: capacity is met before space cannon offense and space combat — not modelled: the app checks capacity once, after the whole action');
  test.todo('16 note 2: a carrier lost to space cannon offense makes capacity be met before combat — not modelled: space cannon is not rolled');
  test.todo('16 note 3: capacity is checked after the winner of the combat is known — not modelled: combat winners are not; see 16.3.3 for the check after losses');

  test('16 note 4: a ship cannot pick up more units from a planet than its capacity', () => {
    // The example of the note: a carrier with four fighters beside it and eight infantry on the planet.
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }, { from: 'h1', units: { infantry: 8 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1, fighter: 4 } }, entries: [move], game: { planetControl: { h1: 'me' } } });
    game.plans[0].rounds[0].entries.unshift({
      id: 'ground', phase: 'strategy', status: 'done', type: 'adjustment', label: 'setup', kind: 'setup', delta: { ground: { h1: { infantry: 8 } } },
    });
    expect(codesOf(game, pack, move)).toContain('capacityGroup');
  });

  test('16 note 4.2: the carrier may take its four fighters and leave all the infantry on the planet', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1, fighter: 4 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1, fighter: 4 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toEqual([]);
  });

  test('16 note 4.3: the carrier may take four infantry instead; the four fighters it leaves with no capacity are warned about', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }, { from: 'h1', units: { infantry: 4 } }] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1, fighter: 4 } }, entries: [move] });
    game.plans[0].rounds[0].entries.unshift({
      id: 'ground', phase: 'strategy', status: 'done', type: 'adjustment', label: 'setup', kind: 'setup', delta: { ground: { h1: { infantry: 8 } } },
    });
    const warnings = forecast(game, pack).warnings[move.id] ?? [];
    expect(warnings.map(w => w.code)).not.toContain('capacityGroup');
    expect(warnings.some(w => w.code === 'capacitySystem' && w.params.systemId === HOME)).toBe(true);
  });

  test('16.3 / 16.3.1: ground forces placed by hand in a system’s space beyond the ships’ capacity are warned about, for each player', () => {
    const over = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 5 } } });
    expect(boardSystemWarnings(over, forecast(over, pack).state, NEAR, pack).map(w => w.code)).toEqual(['capacitySystem']);
    const fits = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 4 } } });
    expect(boardSystemWarnings(fits, forecast(fits, pack).state, NEAR, pack)).toEqual([]);
  });

  test.todo('16 note 4.1, 4.4, 4.5: the rest of the example — the same two checks as notes 4.2 and 4.3');
  test.todo('16 note 4.6: the carrier cannot pick up all eight and drop the excess — covered by the note 4 test (capacityGroup)');
});
