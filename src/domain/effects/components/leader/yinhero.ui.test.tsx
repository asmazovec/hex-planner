import { expect, test } from 'vitest';
import { choose, play, showTurn, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, endOf, quote } from '../kit';
import { id } from './yinhero';

uiBench();

// "ACTION: Commit up to 3 infantry from your reinforcements to any non-home planets and resolve ground combats on
//  those planets."
// Checks: I play Dannel of the Tenth, choose Target One for the first infantry and Target Two for the second; the entry
// keeps both choices, and the board has the infantry on both planets, taken by the Yin.
// Why the check is redundant here: infantry otherwise reach a planet only by landing from a ship of the active
// system (89.4); the hero commits them from the reinforcements, so the interface has to let the player name the planets.
test('leader:yinhero the planets are chosen in the editor and the infantry stand on them', async () => {
  const turn = componentAction(undefined as unknown as string);
  const table = bench({ faction: 'yin', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [turn] });
  quote(table.pack, id, 'Commit up to 3 infantry from your reinforcements to any non-home planets');
  const live = showTurn(table, turn);
  await play('Dannel of the Tenth');
  await choose('Target One', 'Planet 1');
  await choose('Target Two', 'Planet 2');
  expect(live.entry().choices).toEqual({ planet: 't1', planet2: 't2' });
  const end = endOf({ pack: table.pack, game: live.game() });
  expect(end.ground.t1?.infantry).toBe(1);
  expect(end.ground.t2?.infantry).toBe(1);
  expect(end.control.t1).toBe('me');
});
