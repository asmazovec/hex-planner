import { expect, test } from 'vitest';
import { choose, play, showTurn, uiBench } from '../../../../ui/testing/effects';
import type { Entry, EntryBody, Opponent } from '../../../types';
import { bench, endOf, planned, quote } from '../kit';
import { id } from './deepwroughthero';

uiBench();

const GRAVITY_DRIVE = 'technology:gd';
const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

const table = (turn: Entry) => bench({
  faction: 'deepwrought', expansions: ['pok', 'te'], entries: [turn],
  start: { leaders: { [id]: 'unlocked' }, technologies: [GRAVITY_DRIVE] },
  game: { opponents: [RIVAL], start: { me: { leaders: { [id]: 'unlocked' }, technologies: [GRAVITY_DRIVE] }, opponents: { o1: { technologies: [GRAVITY_DRIVE] } } } },
});

// "ACTION: Purge this card and a non-unit upgrade technology you own or from your deck; then, purge all cards with the
//  same name owned by other players and in other players' decks."
// Checks: the player plays the hero in the component editor, names Gravity Drive among the technologies it offers, the
// entry keeps the choice, and the technology is gone from the Deepwrought player and from the rival.
// Why no check is lifted: purging a technology by a hero breaks no rule; the interface has to let the player name it.
test('leader:deepwroughthero the technology to purge is chosen in the editor and leaves every player', async () => {
  const turn = planned({ type: 'component', note: '' } as EntryBody);
  const deepwrought = table(turn);
  quote(deepwrought.pack, id, 'purge all cards with the same name owned by other players');
  const live = showTurn(deepwrought, turn);
  await play('Ta Zern');
  await choose('Gravity Drive');
  expect(live.entry().choices).toEqual({ technology: GRAVITY_DRIVE });
  const end = endOf({ pack: deepwrought.pack, game: live.game() });
  expect(end.holdings.technologies).not.toContain(GRAVITY_DRIVE);
  expect(end.rivals?.o1?.holdings.technologies).not.toContain(GRAVITY_DRIVE);
});
