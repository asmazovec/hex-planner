import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './terragenesis';

const titans = () => bench({ faction: 'titans', expansions: ['pok'] });

describe('ability:terragenesis Terragenesis', () => {
  // "After you explore a planet that does not have a sleeper token: You may place or move 1 sleeper token onto that planet."
  // Checks: the ability is a reminder in the invasion, where a planet is gained and then explored.
  // Why nothing is validated here: the plan counts neither exploration (the card drawn is another deck's) nor sleeper
  // tokens, so there is no board on which a token could be placed or moved, and no rule of the replay it lifts.
  test('ability:terragenesis is a hint of the invasion', () => {
    const { pack } = titans();
    quote(pack, id, 'You may place or move 1 sleeper token onto that planet');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['invasion']);
  });

  test.todo('ability:terragenesis places a sleeper token on the explored planet: the plan keeps no sleeper tokens and does not explore');
  test.todo('ability:terragenesis the reminder is shown in the invasion: hints of an ability are not shown yet (known limit of the foundation)');
});
