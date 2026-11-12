import { describe, expect, test } from 'vitest';
import { bench, effect, endOf, quote, TARGET, tactical, using } from '../kit';
import { id } from './emphidia';

const table = (entries: ReturnType<typeof tactical>[]) => bench({ faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries });

describe('relic:emphidia The Crown of Emphidia', () => {
  // "At the end of the status phase, if you control the "Tomb of Emphidia," you may purge this card to gain 1 victory
  //  point."
  // Checks: the relic is a reminder at the status step.
  // Why the check is redundant here: nothing is validated: the plan does not explore (the Tomb of Emphidia is an
  // exploration attachment it does not hold), and the point is entered with the status entry like any other point.
  test('relic:emphidia is a hint of the status step', () => {
    const { pack } = table([]);
    quote(pack, id, 'you may purge this card to gain 1 victory point');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status']);
  });

  // "After you perform a tactical action, you may exhaust this card to explore 1 planet you control."
  // Checks: the first ability, named in `uses` of the tactical action, exhausts the relic and leaves it held.
  // Why the check is NOT redundant here: the replay purges every relic whose text says "purge this card" when it is
  // played; this card says so only of its second ability, so exploring with it must not lose it.
  test.fails('relic:emphidia used after a tactical action is exhausted, not purged', () => {
    const move = using(tactical(TARGET), id);
    const end = endOf(table([move]));
    expect(end.holdings.relics).toContain(id);
    expect(end.holdings.exhausted).toContain(id);
  });
});
