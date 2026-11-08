/**
 * LRR 78 Space Combat. Source: tirules2 rules-reference/space-combat.md.
 * The planner rolls no dice: the battle of a tactical action is what it cost me, `losses` in the active system's space
 * (taken after the moves, before the landing and production) and `groundLosses` on planets (taken after the landing).
 * The big hex records each tap through `withLoss`.
 */
import { describe, expect, test } from 'vitest';
import { lossesOf, withLoss } from '../../../ui/plan/tactical';
import type { Entry } from '../../types';
import { adjust, codesOf, forecast, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();
type Tactical = Extract<Entry, { type: 'tactical' }>;
const tap = (entry: Tactical, unit: Parameters<typeof withLoss>[1], planetId: string | null, amount: number): Tactical =>
  ({ ...entry, ...withLoss(entry, unit, planetId, amount) });

describe('LRR 78 Space Combat', () => {
  test.todo('78: a space combat happens when two players have ships in the active system — not modelled: whether a battle happens is the player\'s call, the battle block is always there');
  test.todo('78.1: with only the active player\'s ships, the combat step is skipped — not modelled: see 78');
  test.todo('78.2: "before combat" means right before Anti-Fighter Barrage — not modelled: timing windows are not planned');
  test.todo('78.2.1: in the first round, start of combat and start of round share a window — not modelled: timing windows are not planned');
  test.todo('78.2.2: in the last round, end of combat and end of round share a window — not modelled: timing windows are not planned');
  test.todo('78.3: Anti-Fighter Barrage in the first round only — not modelled: dice are not rolled in the planner');
  test.todo('78.3.1: combat ends at once if a side has no ships after the barrage — not modelled: combat rounds are not planned');
  test.todo('78.3.2: no barrage after the first round — not modelled: combat rounds are not planned');
  test.todo('78.3.3: the barrage step happens even without fighters — not modelled: combat rounds are not planned');
  test.todo('78.4: retreats are announced, defender first — not modelled: retreats are not planned');
  test.todo('78.4.1: a retreat happens later, in the Retreat step — not modelled: retreats are not planned');
  test.todo('78.4.2: if the defender announces a retreat, the attacker cannot — not modelled: retreats are not planned');
  test.todo('78.4.3: a retreat needs an eligible system — not modelled: retreats are not planned');
  test.todo('78.5: one combat die per ship, a hit on its combat value or more — not modelled: dice are not rolled in the planner');
  test.todo('78.5.1: a ship with several burst icons rolls a die for each — not modelled: dice are not rolled (dice counts are shown only)');
  test.todo('78.5.2: ships of different combat values roll apart — not modelled: dice are not rolled in the planner');
  test.todo('78.5.3: dice are rolled in order of combat value — not modelled: dice are not rolled in the planner');
  test.todo('78.5.4: the hits are counted for the Assign Hits step — not modelled: dice are not rolled in the planner');
  test.todo('78.5.5: rerolls come right after a player rolls — not modelled: dice are not rolled in the planner');
  test.todo('78.5.6: the attacker rolls before the defender — not modelled: dice are not rolled in the planner');

  test('78.6: each hit destroys one of the player\'s own ships in the active system', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 2, destroyer: 1 } }] }) as Tactical;
    const fought = tap(move, 'cruiser', null, -1);
    expect(fought.losses).toEqual({ cruiser: 1 });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 2, destroyer: 1 } }, entries: [fought] });
    expect(forecast(game, pack).state.systems[TARGET]).toEqual({ cruiser: 1, destroyer: 1 });
  });

  test('78.6: a loss of a ship that is not in the active system is warned about', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }], losses: { dreadnought: 1 } });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('unitsMissing');
  });

  test('78.6: ships that stood in the active system before the action can be lost too', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }], losses: { destroyer: 1 } });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 1 }, [TARGET]: { destroyer: 1 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toEqual([]);
    expect(forecast(game, pack).state.systems[TARGET]).toEqual({ cruiser: 1 });
  });

  test.todo('78.6.1: Sustain Damage cancels a hit before hits are assigned — not modelled: damage is not tracked');

  test('78.6.2: a destroyed unit leaves the board for good: it is gone in later rounds as well', () => {
    const fight = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 2 } }], losses: { cruiser: 1 } });
    const game = rulesGame({ units: { [NEAR]: { cruiser: 2 } }, rounds: [[fight], []] });
    expect(forecast(game, pack).state.systems[TARGET]).toEqual({ cruiser: 1 });
    expect(forecast(game, pack).state.systems[NEAR] ?? {}).toEqual({});
  });

  test('78.6.2: a lost unit given back returns to where it was: a lander tapped by mistake lands again', () => {
    const move = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't1', units: { infantry: 2 } }],
    }) as Tactical;
    const lost = tap(move, 'infantry', 't1', -1);
    // The big hex lists the loss where lossesOf puts it, and its button gives back from there.
    const [shown] = lossesOf(lost);
    const back = tap(lost, shown.unit, shown.planetId, 1);
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [back] });
    expect(forecast(game, pack).state.ground.t1).toEqual({ infantry: 2 });
    expect(forecast(game, pack).state.systems[TARGET]).toEqual({ carrier: 1 });
  });

  test('78.6.2: a ground force already on a planet that falls is removed after the landing', () => {
    const move = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
    }) as Tactical;
    const fought = tap(move, 'infantry', 't2', -1);
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [adjust({ ground: { t2: { infantry: 2 } } }, 'strategy'), fought],
      game: { planetControl: { t2: 'me' } },
    });
    const { state } = forecast(game, pack);
    expect(fought.groundLosses).toEqual({ t2: { infantry: 1 } });
    expect(state.ground.t2).toEqual({ infantry: 1 });
    expect(state.ground.t1).toEqual({ infantry: 1 });
  });

  test.todo('78.7: a player who announced a retreat must retreat — not modelled: retreats are not planned');
  test.todo('78.7.1: no retreat if the opponent has no ships left — not modelled: retreats are not planned');
  test.todo('78.7.2: retreating ships go to one adjacent system, leaving cargo that cannot follow — not modelled: retreats are not planned');
  test.todo('78.7.3: the retreat system must hold my units or planet and no other player\'s ships — not modelled: retreats are not planned');
  test.todo('78.7.4: a retreat places a command token in the system retreated to — not modelled: retreats are not planned');
  test.todo('78.8: combat rounds repeat from Announce Retreats while both sides have ships — not modelled: combat rounds are not planned');
  test.todo('78.9: combat ends when at most one player has ships — not modelled: combat rounds are not planned');
  test.todo('78.9.1: in the last round, end of combat and end of round share a window — not modelled: timing windows are not planned');
  test.todo('78.10: the player with ships left wins, or it is a draw — not modelled: combat outcomes are not tracked');

  test('78.10.1: after combat, fighters beyond the remaining ships\' capacity are warned about', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 2, fighter: 6 } }], losses: { carrier: 1 } });
    const game = rulesGame({ units: { [NEAR]: { carrier: 2, fighter: 6 } }, entries: [move] });
    expect(codesOf(game, pack, move)).toContain('capacitySystem');
  });

  test('78 note 1 / note 13: capacity is checked only after combat: fighters lost in battle bring the system back within it', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, fighter: 4 } }], losses: { fighter: 2 } });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, fighter: 4 }, [TARGET]: { fighter: 2 } }, entries: [move] });
    expect(codesOf(game, pack, move)).not.toContain('capacitySystem');
    expect(codesOf(game, pack, move)).not.toContain('capacityGroup');
  });

  test.todo('78 note 2: retreat into an asteroid field needs Antimass Deflectors — not modelled: retreats are not planned');
  test.todo('78 note 3: retreat into a supernova needs Magmus Reactor — not modelled: retreats are not planned');
  test.todo('78 note 4: no retreat into a nebula, except for the Empyrean — not modelled: retreats are not planned');
  test.todo('78 note 5: retreating from a gravity rift still rolls for it — not modelled: retreats are not planned');
  test.todo('78 note 6: retreating with only Fighter I removes them and places no token — not modelled: retreats are not planned');
  test.todo('78 note 7: Nav Suite does not ignore anomalies on a retreat — not modelled: retreats are not planned');
  test.todo('78 note 8: Dark Energy Tap allows retreat into an empty system — not modelled: retreats are not planned');
  test.todo('78 note 9: move value changes do not affect a retreat — not modelled: retreats are not planned');
  test.todo('78 note 10: a retreat may carry ground forces from controlled planets — not modelled: retreats are not planned');
  test.todo('78 note 11: units in space cannot be left behind with spare capacity — not modelled: retreats are not planned');
  test.todo('78 note 12: a retreat carries no more than the retreating capacity — not modelled: retreats are not planned');
  test.todo('78 note 14: a 0 on the d10 is a 10 — not modelled: dice are not rolled in the planner');
});
