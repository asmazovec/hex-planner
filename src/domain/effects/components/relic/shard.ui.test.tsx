import { expect, test } from 'vitest';
import { expectNotShown, showUses, uiBench } from '../../../../ui/testing/effects';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, endOf, quote } from '../kit';
import { id } from './shard';

uiBench();

// "When you gain this card, gain 1 victory point"
// Checks: an entry that gains the Shard shows no warning, and the plan counts 1 victory point from it.
// Why it is counted here: the points are the board's; the relic gives one by being gained.
test('relic:shard the entry that gains it is shown quietly and the plan counts the point', () => {
  const entry: Entry = { ...adjust({}), gains: [id] };
  const shard = bench({ faction: 'sol', expansions: ['pok'], start: {}, entries: [entry] });
  quote(shard.pack, id, 'When you gain this card, gain 1 victory point');
  const live = showUses(shard, entry);
  expectNotShown('componentNotHeld');
  expect(endOf({ pack: shard.pack, game: live.game() }).vp).toBe(1);
});
