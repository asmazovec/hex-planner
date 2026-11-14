import { expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { play, showTurn, uiBench } from '../../../../ui/testing/effects';
import type { Player } from '../../../players';
import { bench, componentAction, endOf, NEAR, quote } from '../kit';
import { id } from './saarhero';

uiBench();

const RIVAL: Player = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

// "ACTION: Choose 1 system that is adjacent to 1 of your space docks. Destroy all other players' infantry and
//  fighters in that system. Then, purge this card."
// Checks: I play Gurno Aggero in the component editor and choose the system next to my dock; the entry keeps the
// system and the opponent's fighters and infantry there are gone, its cruiser stays.
// Why it is counted here: the plan keeps every opponent's units; the hero removes some of them by its play.
test('leader:saarhero chosen in the editor, the opponent\'s infantry and fighters in the system are destroyed', async () => {
  const turn = componentAction(undefined as unknown as string);
  const table = bench({
    faction: 'saar', expansions: ['pok'], units: { [NEAR]: { carrier: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [turn],
    game: { docks: ['h1'], opponents: [RIVAL], enemyUnits: { [NEAR]: { [RIVAL.id]: { cruiser: 1, fighter: 2, infantry: 2 } } } },
  });
  quote(table.pack, id, "Destroy all other players' infantry and fighters in that system.");
  const live = showTurn(table, turn);
  await play('Gurno Aggero');
  // Two empty systems stand on the map (next to home and farther out): the first is the one next to home.
  await userEvent.click(screen.getAllByRole('button', { name: 'r-empty' })[0]);
  expect(live.entry().choices).toEqual({ system: NEAR });
  expect(endOf({ pack: table.pack, game: live.game() }).rivals?.[RIVAL.id]?.systems[NEAR]).toEqual({ cruiser: 1 });
});
