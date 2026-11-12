import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, land, showFlight, showTactical, showUses, take, uiBench, use } from '../../../../ui/testing/effects';
import structureAboard from '../../../rules/codes/structureAboard';
import type { Entry, Game } from '../../../types';
import { bench, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, using } from '../kit';
import { id } from './nanolink';

uiBench();

const CODE = structureAboard.code;
const NOTE = `${id}@o1`;
const NEXT_DOOR: Record<string, string> = { [HOME]: 'r-home', [NEAR]: 'r-target', [TARGET]: 'r-empty', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
const table = (entries: Entry[]) => bench({
  faction: 'sol', expansions: ['te'], units: { [HOME]: { cruiser: 1 } }, entries, start: { promissory: [NOTE] },
  game: { opponents: [{ id: 'o1', faction: 'ralnel', vp: 0, seat: 2, color: 2 }], map: { ...NEXT_DOOR }, pds: { h1: 1 }, planetControl: { h1: 'me', t1: 'me' } } as Partial<Game>,
});
const empty = () => tactical(NEAR, { moves: [{ from: HOME, units: {} }] });

// "After you activate a system: You may move your structures from adjacent systems that do not contain your command
//  tokens onto planets you control in the active system."
// Checks: with the note named in the action, the source next door offers the PDS of Home One; I take it, it is
// written into the move, and the warning that structures do not move reads as allowed by Nano-Link Permit.
// Why the check is redundant here: LRR 85.3 forbids moving a structure, and the note moves it directly.
test('promissory:nanolink the PDS of an adjacent system is taken, and the warning reads as allowed by Nano-Link Permit', async () => {
  const move = using(empty(), NOTE);
  const live = showFlight(table([move]), move, HOME);
  await take('PDS', 'Home One');
  expect(live.entry().moves).toContainEqual({ from: 'h1', units: {}, structures: { pds: 1 } });
  expectShownWaived(CODE, 'Nano-Link Permit');
});

// LRR 85.3: "Structures cannot move or be transported."
// Checks: without the note the PDS is offered and taken all the same, since a warning forbids nothing; it stands.
// Why the check is NOT redundant here: the note is not played in this action.
test('promissory:nanolink not named, the PDS is still taken and its warning stands', async () => {
  const move = empty();
  const sol = table([move]);
  quote(sol.pack, id, 'You may move your structures from adjacent systems');
  const live = showFlight(sol, move, HOME);
  await take('PDS', 'Home One');
  expect(live.entry().moves).toContainEqual({ from: 'h1', units: {}, structures: { pds: 1 } });
  expectShownStanding(CODE);
});

// Checks: the note is chosen in «Used» of the action, and the moved structure's warning at once reads as allowed.
// Why the check is redundant here: naming the note is what plays it; from then on its waiver covers this action.
test('promissory:nanolink chosen in «Used», the moved structure is allowed by Nano-Link Permit', async () => {
  const move = tactical(NEAR, { moves: [{ from: 'h1', units: {}, structures: { pds: 1 } }], landings: [{ planetId: 't1', units: {}, structures: { pds: 1 } }] });
  const live = showUses(table([move]), move);
  expectShownStanding(CODE);
  await use('Nano-Link Permit');
  expect(live.entry().uses).toEqual([NOTE]);
  expectShownWaived(CODE, 'Nano-Link Permit');
});

// "... onto planets you control in the active system."
// Checks: in the tactical editor the landing offers the PDS that was moved in, and I put it on Target One.
// Why the check is redundant here: the note names its own destination, a planet of the active system I control.
test('promissory:nanolink the moved PDS is put on a planet of the active system in the landing', async () => {
  const move = using(tactical(NEAR, { moves: [{ from: 'h1', units: {}, structures: { pds: 1 } }] }), NOTE);
  const live = showTactical(table([move]), move);
  await land('PDS', 'Target One');
  expect(live.entry().landings).toEqual([{ planetId: 't1', units: {}, structures: { pds: 1 } }]);
  expectShownWaived(CODE, 'Nano-Link Permit');
});
