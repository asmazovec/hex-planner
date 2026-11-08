/** LRR 55 Mechs. Source: tirules2 rules-reference/mechs.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { factionSheet } from '../../factionSheet';
import { productionCost } from '../../project';
import { SHIP_KINDS } from '../../unitStats';
import { codesOf, FACTION, forecast, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pok = loadPack(['pok']);
/** The test board with the mech of Prophecy of Kings. */
const pack = rulesPack(p => {
  p.units.mech = structuredClone(pok.units.mech);
});

describe('LRR 55 Mechs', () => {
  test('55 (intro): mechs exist only with Prophecy of Kings', () => {
    expect(loadPack([]).units.mech).toBeUndefined();
    expect(loadPack(['te']).units.mech).toBeUndefined();
    expect(pok.units.mech).toBeDefined();
  });

  test('55.1: a mech is a ground force and is carried as one, filling one capacity', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, mech: 2, infantry: 2 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, mech: 2, infantry: 2 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toEqual([]);
    const over = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, mech: 3, infantry: 2 } }] });
    const overGame = rulesGame({ units: { [NEAR]: { carrier: 1, mech: 3, infantry: 2 } }, entries: [over] });
    expect(codesOf(overGame, pack, over)).toContain('capacityGroup');
  });

  test('55.1: a mech lands on a planet and takes it', () => {
    const land = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, mech: 1 } }],
      landings: [{ planetId: 't1', units: { mech: 1 } }],
    });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, mech: 1 } }, entries: [land] }), pack);
    expect(state.ground.t1).toEqual({ mech: 1 });
    expect(state.control.t1).toBe('me');
  });

  test('55.1: a mech does not count toward the fleet pool', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 3, mech: 4 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 3, mech: 4 } }, entries: [move] });
    expect(codesOf(game, pack, move)).not.toContain('fleetPool');
  });

  test('55.2: every faction has its mech card with Prophecy of Kings', () => {
    // The Naaz-Rokha Eidolon is listed by both of its faces, so a faction may show more than one entry.
    for (const faction of Object.values(pok.factions)) {
      if (!faction.sheet) continue;
      expect([faction.id, factionSheet(faction, ['pok']).mechs.length > 0]).toEqual([faction.id, true]);
    }
  });

  test('55.2: a mech is produced for the cost on its card', () => {
    expect(productionCost({ mech: 2 }, FACTION, [], pack)).toBe(4);
    for (const faction of Object.values(pok.factions)) {
      const [mech] = factionSheet(faction, ['pok']).mechs;
      if (mech?.cost == null) continue;
      expect([faction.id, productionCost({ mech: 1 }, faction.id, [], pok)]).toEqual([faction.id, mech.cost]);
    }
  });

  test.todo('55.3: Deploy abilities place a mech without producing it — not modelled: placed by hand as an adjustment');

  test('55.4: a mech card is no technology: mechs cannot be upgraded', () => {
    expect(SHIP_KINDS).not.toContain('mech');
  });

  test('55 note 1: what speaks of ground forces applies to mechs: a mech left in space with no ship is warned about', () => {
    const arrive = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, mech: 1 } }], landings: [] });
    const leave = tactical(NEAR, { moves: [{ from: TARGET, units: { carrier: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, mech: 1 } }, rounds: [[arrive], [leave]] });
    // The carrier leaves its mech behind in the space area of the target.
    expect(forecast(game, pack).state.systems[TARGET]).toEqual({ mech: 1 });
    expect(codesOf(game, pack, leave)).toContain('capacitySystem');
  });

  test.todo('55 note 2: notes on single mechs are on the faction pages — not modelled: mech abilities are shown, not applied');
});
