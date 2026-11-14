/**
 * LRR 77 Space Cannon. Source: tirules2 rules-reference/space-cannon.md.
 * The planner rolls no dice: what space cannon destroys of mine is tapped as the action's losses, like a battle's.
 */
import { describe, expect, test } from 'vitest';
import { withLoss } from '../../../ui/plan/tactical';
import type { Entry } from '../../../testing/old/domain/types';
import { forecast, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();
type Tactical = Extract<Entry, { type: 'tactical' }>;

describe('LRR 77 Space Cannon', () => {
  test.todo('77: Space Cannon is used after the Move Ships substep and during invasion — not modelled: space cannon rolls are not planned');
  test.todo('77.1: a player need not be active to use Space Cannon — not modelled: space cannon rolls are not planned');
  test.todo('77.2: Space Cannon Offense goes clockwise from the active player for units in the active system — not modelled: space cannon rolls are not planned');
  test.todo('77.3: one die per unit with Space Cannon, a hit on its value or more — not modelled: dice are not rolled in the planner');
  test.todo('77.3.1: Space Cannon is printed among the unit\'s attributes — not modelled: shown only, PDS carry no statistics in the pack');
  test.todo('77.3.2: "Space Cannon X (xY)" rolls Y dice hitting on X — not modelled: dice are not rolled in the planner');
  test.todo('77.3.3: PDS II fire into adjacent systems — not modelled: space cannon rolls are not planned');
  test.todo('77.3.4: effects on combat rolls do not affect space cannon rolls — not modelled: dice are not rolled in the planner');
  test.todo('77.4: Space Cannon Offense happens even if no ships moved — not modelled: space cannon rolls are not planned');

  test('77.5: ships destroyed by Space Cannon Offense leave the active system before combat, landing and production', () => {
    const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, destroyer: 1 } }], losses: { destroyer: 1 } });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, destroyer: 1 } }, entries: [move] });
    expect(forecast(game, pack).state.systems[TARGET]).toEqual({ carrier: 1 });
  });

  test.todo('77.5.1: other players fire only at the active player\'s units — not modelled: space cannon rolls are not planned');
  test.todo('77.5.2: the active player picks one player with ships in the system as the target — not modelled: other players\' losses are not part of my action');
  test.todo('77.6: Space Cannon Defense fires at ground forces committed to a planet — not modelled: space cannon rolls are not planned');
  test.todo('77.7: one roll per unit on the invaded planet — not modelled: dice are not rolled in the planner');
  test.todo('77.7.1: Space Cannon is printed on faction sheets and technologies — not modelled: shown only');
  test.todo('77.7.2: "Space Cannon X (xY)" rolls Y dice hitting on X — not modelled: dice are not rolled in the planner');
  test.todo('77.7.3: effects on combat rolls do not affect space cannon rolls — not modelled: dice are not rolled in the planner');
  test.todo('77.7.4: adjacent-system Space Cannon does nothing in defense — not modelled: space cannon rolls are not planned');

  test('77.8: a committed ground force destroyed by Space Cannon Defense never lands', () => {
    const move = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't1', units: { infantry: 2 } }],
    }) as Tactical;
    const hit = { ...move, ...withLoss(move, 'infantry', 't1', -1) } as Tactical;
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [hit] }), pack);
    expect(state.ground.t1).toEqual({ infantry: 1 });
    expect(state.systems[TARGET]).toEqual({ carrier: 1 });
  });

  test('77.8: losing every committed ground force means the planet is not taken', () => {
    const move = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
    }) as Tactical;
    const hit = { ...move, ...withLoss(move, 'infantry', 't1', -1) } as Tactical;
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [hit] }), pack);
    expect(state.control.t1).toBeUndefined();
    expect(state.exhausted).not.toContain('t1');
  });

  test.todo('77.8.1: hits go only to units on the planet of the firing units — not modelled: dice are not rolled in the planner');
  test.todo('77 note 1: "Deep Space Cannon" is shorthand for adjacent-system Space Cannon — nothing to model');
  test.todo('77 note 2: Space Cannon Offense comes before combat, so destroyed fleets win no combat — not modelled: combat outcomes are not tracked');
  test.todo('77 note 3: a player using Space Cannon uses it with all eligible units — not modelled: space cannon rolls are not planned');
  test.todo('77 note 4: Sustain Damage can cancel a Space Cannon Offense hit — not modelled: damage is not tracked');
  test.todo('77 note 5: a committed mech can sustain against Space Cannon Defense — not modelled: damage is not tracked');
  test.todo('77 note 6: capacity is resolved between players\' Space Cannon rolls — not modelled: space cannon rolls are not planned');
  test.todo('77 note 7: Space Cannon hits cannot be assigned to one\'s own units — not modelled: space cannon rolls are not planned');
  test.todo('77 note 8: a 0 on the d10 is a 10 — not modelled: dice are not rolled in the planner');
});
