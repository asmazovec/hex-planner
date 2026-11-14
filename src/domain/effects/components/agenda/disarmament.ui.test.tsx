import { expect, test } from 'vitest';
import { choose, showComponent, uiBench } from '../../../../ui/testing/effects';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { adjust, bench, planned, quote } from '../kit';
import { id } from './disarmament';

uiBench();

// "Destroy each ground force on the elected planet."
// Checks: the editor of the component action of the directive offers the planets, and pressing one writes the elected
// planet into the entry's choices.
// Why the check is redundant here: there is no check; the directive destroys the ground forces on one planet, and the planet elected is what the
// plan has no other field for.
test('agenda:disarmament the editor asks for the elected planet and keeps it', async () => {
  const entry: Entry = planned({ type: 'component', componentId: id, note: '' } as EntryBody, 'agenda');
  const table = bench({ faction: 'sol', entries: [adjust({ ground: { h1: { infantry: 1 } } }), entry], game: { planetControl: { h1: 'me' } } });
  quote(table.pack, id, 'Destroy each ground force on the elected');
  const live = showComponent(table, entry);
  await choose('Home One');
  expect(live.entry().choices).toEqual({ planet: 'h1' });
});
