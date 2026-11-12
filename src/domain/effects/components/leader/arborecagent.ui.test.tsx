import { expect, test } from 'vitest';
import { choose, expectNotShown, expectShownStanding, showComponent, uiBench } from '../../../../ui/testing/effects';
import type { AnyWarningCode } from '../../../types';
import { bench, componentAction, endOf, HOME, quote } from '../kit';
import { id } from './arborecagent';

uiBench();

const REPLACEMENT_COST = 'replacementCost' as AnyWarningCode;

/** Letani Ospha is played on the destroyer I have at home. */
const table = () => {
  const play = componentAction(id);
  return { play, ...bench({ faction: 'arborec', expansions: ['pok'], units: { [HOME]: { destroyer: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [play] }) };
};

// "ACTION: Exhaust this card and choose a player's non-fighter ship: that player may replace that ship with one from
//  their reinforcements that costs up to 2 more than the replaced ship."
// Checks: the editor of the action asks for the system, the ship replaced and the ship placed; a cruiser (1 more) is
// kept in the entry's choices, the destroyer is gone from the plan and the cruiser stands in its place, with no
// warning about the cost.
// Why the check is NOT redundant here: the interface has to let the player name both ships.
test('leader:arborecagent the ship replaced and the ship placed are chosen in the editor', async () => {
  const agent = table();
  quote(agent.pack, id, 'costs up to 2 more than the replaced ship');
  const live = showComponent(agent, agent.play);
  await choose(/Home/);
  await choose('Destroyer', 'Ship replaced');
  await choose('Cruiser', 'Ship placed');
  expect(live.entry().choices).toEqual({ systemId: HOME, ship: 'destroyer', replacement: 'cruiser' });
  expect(endOf({ pack: agent.pack, game: live.game() }).systems[HOME]).toEqual({ cruiser: 1 });
  expectNotShown(REPLACEMENT_COST);
});

// "... that costs up to 2 more than the replaced ship."
// Checks: choosing a dreadnought (3 more than the destroyer) shows the cost warning, standing.
// Why the check is NOT redundant here: the card's own limit is 2 more.
test('leader:arborecagent a replacement 3 dearer is shown with a standing warning', async () => {
  const agent = table();
  showComponent(agent, agent.play);
  await choose(/Home/);
  await choose('Destroyer', 'Ship replaced');
  await choose('Dreadnought', 'Ship placed');
  expectShownStanding(REPLACEMENT_COST);
});
