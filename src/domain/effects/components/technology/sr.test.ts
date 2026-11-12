import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, HOME, quote, TARGET, warningsOf } from '../kit';
import { id } from './sr';

/** The card's action producing `unit` in `systemId`. */
const relay = (systemId: string, unit = 'destroyer') => componentAction(id, { choices: { systemId, unit } } as Partial<Entry>);
/** I hold the card and a space dock on h1, in the home system. */
const held = (entries: Entry[], technologies: string[] = [id]) =>
  bench({ faction: 'sol', expansions: ['pok'], start: { technologies }, entries, game: { docks: ['h1'], planetControl: { h1: 'me' } } });

describe('technology:sr Sling Relay', () => {
  // "ACTION: Exhaust this card to produce 1 ship in any system that contains one of your space docks."
  // Checks: the component action with a destroyer chosen for the home system, where my space dock stands, puts the
  // destroyer in its space area.
  // Why the check is redundant here: a ship is otherwise produced only in the Production step of a tactical action
  // (67.3); the card's action produces one by itself, as LRR 67.4 lets an ability do.
  test.fails('technology:sr its action puts the ship chosen in a system with my space dock', () => {
    const play = relay(HOME);
    const table = held([play]);
    quote(table.pack, id, 'produce 1 ship in any system that contains one of your space docks');
    expect(endOf(table).systems[HOME]).toMatchObject({ destroyer: 1 });
    expectNone(warningsOf(table, play), 'noProduction');
  });

  // "... in any system that contains one of your space docks."
  // Checks: the target holds no space dock of mine; the action is warned of, and the ship is placed all the same.
  // Why the check is NOT redundant here: the card names systems with a space dock only.
  test.fails('technology:sr a system without my space dock is warned of', () => {
    const play = relay(TARGET);
    const table = held([play]);
    expectStanding(warningsOf(table, play), 'noProduction');
    expect(endOf(table).systems[TARGET]).toMatchObject({ destroyer: 1 });
  });

  // "... produce 1 ship ..." Ruling (Sling Relay 1): "The produced unit must be paid for."
  // Checks: the destroyer (cost 1) produced with nothing paid is short of resources.
  // Why the check is NOT redundant here: the card lifts the tactical action, not the cost.
  test.fails('technology:sr the ship is paid for: produced with nothing paid it is short', () => {
    const play = relay(HOME);
    expectStanding(warningsOf(held([play]), play), 'shortResources');
  });

  // "Exhaust this card ..."
  // Checks: played twice in a round, the second action finds the card exhausted.
  // Why the check is NOT redundant here: the card is exhausted by its own action and readied only in the status phase.
  test('technology:sr played twice in a round: the second action finds it exhausted', () => {
    const again = relay(HOME);
    expectStanding(warningsOf(held([relay(HOME), again]), again), 'componentExhausted');
  });

  // Checks: not held, the action is warned of as a component the player does not have.
  test('technology:sr not held: its action is warned of', () => {
    const play = relay(HOME);
    expectStanding(warningsOf(held([play], []), play), 'componentNotHeld');
  });

  test.todo('technology:sr the payment of the ship: a component action has no payment of its own yet, so the test above can only see a shortfall once pass 2 gives it one');

  test.fails('technology:sr is a play effect', () => {
    const { pack } = held([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeDefined();
  });
});
