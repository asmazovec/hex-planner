import { describe, expect, test } from 'vitest';
import type { Entry, LeaderState } from '../../../types';
import { bench, endOf, expectStanding, expectWaived, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './mahactcommander';

/** Two tactical actions into the same system in one round: the second activates a system holding my token. */
const twice = (second: Entry, leaders: Record<string, LeaderState> = { [id]: 'unlocked' }, faction = 'mahact') =>
  ({ second, ...bench({ faction, expansions: ['pok'], start: { leaders }, entries: [tactical(NEAR), second] }) });

describe('leader:mahactcommander Il Na Viroset', () => {
  // "During your tactical actions: you can activate systems that contain your command tokens."
  // Checks: the second action into the system already holding my token names the commander; the warning that the
  // system holds my token is listed and lifted by Il Na Viroset.
  // Why the check is redundant here: LRR 89.1 says the active player must activate a system that does not contain
  // one of their command tokens, and the commander lets the Mahact player activate one that does.
  test('leader:mahactcommander lets a system with my token be activated: the warning is waived', () => {
    const table = twice(using(tactical(NEAR), id));
    quote(table.pack, id, 'you can activate systems that contain your command tokens');
    expectWaived(warningsOf(table, table.second), 'systemHasToken', id);
  });

  // "If you do, return both command tokens to your reinforcements and end your turn."
  // Checks: after that action neither token stays in the system.
  // Why the default count does not apply: an activation leaves its token in the system (89.1); this one returns it
  // and the token that was already there.
  test('leader:mahactcommander returns both tokens of that system to the reinforcements', () => {
    const table = twice(using(tactical(NEAR), id));
    expect(endOf(table).tokensOnMap).not.toContain(NEAR);
  });

  // LRR 89.1, as above.
  // Checks: the commander unlocked but not named: the second activation is warned of.
  // Why the check is NOT redundant here: using the commander ends the turn and returns the tokens, so it is a choice
  // the entry makes by naming it, not a standing permission.
  test('leader:mahactcommander not named, a system with my token is warned of', () => {
    const table = twice(tactical(NEAR));
    expectStanding(warningsOf(table, table.second), 'systemHasToken');
  });

  // LRR 51.6: a commander can be used only once unlocked.
  // Checks: named while locked, the commander lifts nothing.
  // Why the check is NOT redundant here: a locked commander is not held.
  test('leader:mahactcommander locked lifts nothing', () => {
    const table = twice(using(tactical(NEAR), id), {});
    const warnings = warningsOf(table, table.second);
    expectStanding(warnings, 'systemHasToken');
    expectStanding(warnings, 'componentNotHeld');
  });

  test.todo('leader:mahactcommander ends the turn: moves, landings and production of that action are warned of; no code yet');
});
