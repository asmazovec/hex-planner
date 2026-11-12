import { expect, test } from 'vitest';
import { upgradeTech } from '../../../holdings';
import type { EntryBody, Opponent } from '../../../types';
import { play, showTurn, uiBench } from '../../../../ui/testing/effects';
import { bench, endOf, FAR, planned, quote } from '../kit';
import { id } from './fires';

uiBench();

const MUAAT: Opponent = { id: 'o1', faction: 'muaat', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@o1`;

// "ACTION: ... gain your war sun unit upgrade technology card."
// Checks: I name the Muaat's note in a component action and it gives Sol its war sun upgrade; the editor shows no warning.
// Why no check is lifted: the card gives the technology outright, so no prerequisite is asked.
test('promissory:fires played from the editor gives the war sun upgrade', async () => {
  const turn = planned({ type: 'component', note: '' } as EntryBody);
  const table = bench({ faction: 'sol', start: { promissory: [NOTE] }, entries: [turn], game: { opponents: [MUAAT], enemyUnits: { [FAR]: { o1: { carrier: 1 } } } } });
  quote(table.pack, id, 'gain your war sun unit upgrade technology card');
  const live = showTurn(table, turn);
  await play('Fires of the Gashlai');
  expect(live.entry().componentId).toBe(NOTE);
  expect(live.warnings()).toEqual([]);
  expect(endOf({ pack: table.pack, game: live.game() }).holdings.technologies).toContain(upgradeTech(table.pack, 'sol', 'warsun'));
});
