import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, effect, endOf, quote } from '../kit';
import { id } from './heartofixth';

const table = () => bench({ faction: 'sol', expansions: ['te'], start: { relics: [id] } });

describe('relic:heartofixth Heart of Ixth', () => {
  // "After any die is rolled, you may exhaust this card to add or subtract 1 from its result."
  // Checks: the relic is a hint shown in the block of the battle while it is held ready.
  // Why the check is NOT redundant here: there is no check to lift. The plan rolls no dice; the battle is fought at
  // the table and only its losses are entered, so a changed result changes nothing the plan counts.
  test('relic:heartofixth is a reminder in the block of the battle', () => {
    const relic = table();
    quote(relic.pack, id, 'add or subtract 1 from its result');
    expect(effect(relic.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['combat'] });
    expect(hintsAt(relic.pack, endOf(relic), 'combat', ['me']).map(c => c.id)).toContain(id);
  });

  // "... you may exhaust this card ..."
  // Checks: the reminder is not shown at a step that rolls nothing, such as production.
  test('relic:heartofixth is not shown where no die is rolled', () => {
    const relic = table();
    expect(hintsAt(relic.pack, endOf(relic), 'production', ['me']).map(c => c.id)).not.toContain(id);
  });
});
