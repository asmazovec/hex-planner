import { expect, test } from 'vitest';
import { showUses, uiBench, use } from '../../../../ui/testing/effects';
import { adjust, bench, endOf, quote } from '../kit';
import { id } from './mawofworlds';

uiBench();

// "At the start of the agenda phase, you may purge this card and exhaust all of your planets to gain any 1 technology."
// Checks: I choose the Maw in «Used» of an entry of the agenda phase; it is named in the entry and the plan exhausts
// every planet I control.
// Why it is counted here: a play; the planets exhausted are the board's.
test('relic:mawofworlds chosen in «Used», every planet I control is exhausted', async () => {
  const entry = adjust({}, 'agenda');
  const maw = bench({
    faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries: [entry], game: { planetControl: { h1: 'me', h2: 'me', t1: 'me' } },
  });
  quote(maw.pack, id, 'you may purge this card and exhaust all of your planets to gain any 1 technology');
  const live = showUses(maw, entry);
  await use('Maw of Worlds');
  expect(live.entry().uses).toEqual([id]);
  expect([...endOf({ pack: maw.pack, game: live.game() }).exhausted].sort()).toEqual(['h1', 'h2', 't1']);
});
