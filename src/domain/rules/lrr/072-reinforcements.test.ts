/** LRR 72 Reinforcements. Source: tirules2 rules-reference/reinforcements.md. */
import { describe, expect, test } from 'vitest';
import { codesOf, HOME, NEAR, rulesGame, rulesPack, tactical } from '../kit';

const atHome = { docks: ['h1'] };
const withLimits = rulesPack(p => {
  for (const [id, limit] of Object.entries({ carrier: 4, cruiser: 8, destroyer: 8, dreadnought: 5, warsun: 2, flagship: 1, mech: 4 })) {
    const def = p.units[id as keyof typeof p.units];
    if (def) def.limit = limit;
  }
});

describe('LRR 72 Reinforcements', () => {
  test('72.1 / 96.2: producing more ships than the reinforcements hold is warned about', () => {
    const build = tactical(HOME, { production: { dreadnought: 1 } });
    const game = rulesGame({ units: { [NEAR]: { dreadnought: 5 } }, entries: [build], game: atHome });
    expect(codesOf(game, withLimits, build)).toContain('reinforcementsOut');
  });

  test('72.1: up to the limit is allowed', () => {
    const build = tactical(HOME, { production: { dreadnought: 1 } });
    const game = rulesGame({ units: { [NEAR]: { dreadnought: 4 } }, entries: [build], game: atHome });
    expect(codesOf(game, withLimits, build)).not.toContain('reinforcementsOut');
  });

  test('72.1: a unit destroyed in battle goes back to reinforcements and can be produced again', () => {
    const fight = tactical(NEAR, { losses: { dreadnought: 1 } });
    const build = tactical(HOME, { production: { dreadnought: 1 } });
    const game = rulesGame({ units: { [NEAR]: { dreadnought: 5 } }, entries: [fight, build], game: atHome });
    expect(codesOf(game, withLimits, build)).not.toContain('reinforcementsOut');
  });

  test.todo('72 note 1: with none left, a unit may be taken from a system without my command token and placed instead — not modelled: the reinforcement limit itself is not checked (see 72.1)');
  test.todo('72 note 2: command tokens on the sheet are not in reinforcements — not modelled: the count of command tokens in reinforcements is not tracked');
  test.todo('72 note 3: captured units are in no player\'s reinforcements — not modelled: capture is not tracked');
});
