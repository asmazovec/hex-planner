import { describe, expect, test } from 'vitest';
import { bench, effect, quote } from '../kit';
import { id } from './munitions';

describe('ability:munitions Munitions Reserves', () => {
  // "At the start of each round of space combat: You may spend 2 trade goods to re-roll any number of your dice during
  //  that combat round."
  // Checks: the ability is a reminder of the combat step and changes nothing the plan counts.
  // Why nothing is validated here: the plan replays no rounds of combat and rolls no dice; the two trade goods are
  // spent inside a round it does not replay, and the player enters them as any change of trade goods.
  test('ability:munitions is a hint of the combat', () => {
    const { pack } = bench({ faction: 'letnev' });
    quote(pack, id, 'You may spend 2 trade goods to re-roll any number of your dice during that combat round.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
