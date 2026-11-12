import { describe, expect, test } from 'vitest';
import { adjust, bench, effect, endOf, quote, using } from '../kit';
import { id } from './keleresheroodlynn';

describe('leader:keleresheroodlynn Odlynn Myrr', () => {
  // "After an agenda is revealed: You may cast up to 6 additional votes on this agenda. Predict aloud an outcome of
  //  this agenda. For each player that abstains or votes for another outcome, gain 1 trade good and 1 command token."
  // Checks: the hero is a reminder with no step: the agenda phase has none.
  // Why the check is NOT redundant here: nothing is validated, because votes are not counted and what it gains
  // depends on how the other players vote; the player enters the trade goods and tokens gained.
  test('leader:keleresheroodlynn is a hint without a step: votes are not counted', () => {
    const { pack } = bench({ faction: 'keleresx', expansions: ['pok'] });
    quote(pack, id, 'You may cast up to 6 additional votes on this agenda.');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });

  // "Then, purge this card." LRR 51.12.
  // Checks: named in `uses` of an agenda-phase entry, the hero is purged.
  // Why the check is NOT redundant here: the purge is the common rule of heroes.
  test('leader:keleresheroodlynn used in the agenda phase is purged', () => {
    const vote = using(adjust({}, 'agenda'), id);
    const table = bench({ faction: 'keleresx', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [vote] });
    expect(endOf(table).holdings.leaders[id]).toBe('purged');
  });
});
