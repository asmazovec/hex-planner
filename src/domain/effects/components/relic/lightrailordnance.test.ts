import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './lightrailordnance';

describe('relic:lightrailordnance Lightrail Ordnance', () => {
  // "Your space docks gain SPACE CANNON 5 (x2). You may use your space dock's SPACE CANNON against ships that are
  //  adjacent to their systems."
  // Checks: the relic is a hint in the block of the battle, where Space Cannon is fired.
  // Why the check is NOT redundant here: there is no check to lift. Space Cannon is a roll of dice (77) and the plan
  // checks neither who may fire nor at what range; it enters only what the battle cost.
  test('relic:lightrailordnance is a reminder in the block of the battle', () => {
    const relic = bench({ faction: 'sol', expansions: ['te'], start: { relics: [id] } });
    quote(relic.pack, id, 'Your space docks gain SPACE CANNON 5 (x2)');
    expect(effect(relic.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(hintsAt(relic.pack, endOf(relic), 'combat', ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a space dock with the relic produces as before: the relic changes no number of the count.
  // Why the check is NOT redundant here: Space Cannon is not Production; nothing of the dock's production changes.
  test('relic:lightrailordnance changes nothing of a space dock\'s production', () => {
    const relic = bench({ faction: 'sol', expansions: ['te'], start: { relics: [id] } });
    expect(effect(relic.pack, id).modify).toBeUndefined();
  });
});
