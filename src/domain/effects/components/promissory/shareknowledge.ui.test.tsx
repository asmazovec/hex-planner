import { expect, test } from 'vitest';
import { choose, showTurn, uiBench } from '../../../../ui/testing/effects';
import { componentById } from '../../../components';
import type { Opponent } from '../../../types';
import { bench, componentAction, endOf, quote } from '../kit';
import { id } from './shareknowledge';

uiBench();

const DEEPWROUGHT: Opponent = { id: 'o1', faction: 'deepwrought', vp: 0, seat: 2, color: 2 };
const NOTE = `${id}@o1`;
const GRAVITY_DRIVE = 'technology:gd';

// "gain 1 non-faction, non-unit upgrade technology that the Deepwrought player owns"
// Checks: the component action that plays the note offers the Deepwrought player's technology; I press it, the entry
// keeps it as the note's choice, and the technology is mine at the end of the plan.
// Why the check is redundant here: a technology otherwise comes by research; the note gives one the Deepwrought player
// owns, so the interface has to let the player name it.
test('promissory:shareknowledge offers the Deepwrought technologies and gives the one pressed', async () => {
  const entry = componentAction(NOTE);
  const table = bench({
    faction: 'letnev', expansions: ['pok', 'te'], entries: [entry],
    game: { opponents: [DEEPWROUGHT], start: { me: { promissory: [NOTE] }, opponents: { o1: { technologies: [GRAVITY_DRIVE] } } } },
  });
  quote(table.pack, id, 'gain 1 non-faction, non-unit upgrade technology that the Deepwrought player owns');
  const live = showTurn(table, entry);
  await choose(componentById(table.pack, GRAVITY_DRIVE)!.name, 'Technology of the Deepwrought player');
  expect((live.entry() as { choices?: unknown }).choices).toEqual({ technology: GRAVITY_DRIVE });
  expect(endOf({ pack: table.pack, game: live.game() }).holdings.technologies).toContain(GRAVITY_DRIVE);
});
