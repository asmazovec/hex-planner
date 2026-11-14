import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './metalivoidarmaments';

describe('relic:metalivoidarmaments Metali Void Armaments', () => {
  // "During the "Anti-Fighter Barrage" step of space combat, you may resolve ANTI-FIGHTER BARRAGE 6 (x3) against your
  //  opponent's units."
  // Checks: the relic is a hint in the block of the battle.
  // Why the check is NOT redundant here: there is no check to lift. Anti-Fighter Barrage is a roll of dice in space
  // combat; the plan simulates no combat and enters only the losses.
  test('relic:metalivoidarmaments is a reminder in the block of the battle', () => {
    const relic = bench({ faction: 'sol', expansions: ['te'], start: { relics: [id] } });
    quote(relic.pack, id, 'resolve ANTI-FIGHTER BARRAGE 6 (x3)');
    expect(effect(relic.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(hintsAt(relic.pack, endOf(relic), 'combat', ['me']).map(c => c.id)).toContain(id);
  });

  // Checks: a player who does not hold the relic is not reminded of it.
  // Why the check is NOT redundant here: the reminder belongs to the holder of the card only.
  test('relic:metalivoidarmaments is not shown to a player who does not hold it', () => {
    const none = bench({ faction: 'sol', expansions: ['te'] });
    expect(hintsAt(none.pack, endOf(none), 'combat', ['me']).map(c => c.id)).not.toContain(id);
  });
});
