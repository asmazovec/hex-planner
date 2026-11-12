import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showTactical, uiBench, use } from '../../../../ui/testing/effects';
import type { AnyWarningCode, Entry } from '../../../types';
import { bench, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './bastionbt';

uiBench();

/** The code pass 2 adds (LRR 68.2, step production); named as a plain string until it exists. */
const CODE = 'productionShipsAway' as AnyWarningCode;

/**
 * The carrier next to the target lands an infantry on t1 (my token and ground force there); then the home system
 * builds two cruisers placed in the target (`shipsTo`, the field pass 2 adds), and its tactical editor is shown.
 */
const placedAway = () => {
  const liberate = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });
  const move: Entry = Object.assign(tactical(HOME, { production: { cruiser: 2 } }), { shipsTo: TARGET });
  const table = bench({
    faction: 'bastion', expansions: ['pok', 'te'], start: { breakthrough: 'held' }, units: { [NEAR]: { carrier: 1, infantry: 1 } },
    game: { docks: ['h1'] }, entries: [liberate, move],
  });
  return { table, live: showTactical(table, move) };
};

// "When you produce ships, you may exhaust this card to place those ships in a system that contains 1 of your command
//  tokens, at least 1 of your ground forces, and no other player's ships."
// Checks: in the editor of the action that places the cruisers it built in the target, I choose The Icon in «Used»;
// it is named in the entry, and the warning that the ships leave the active system reads as allowed by The Icon.
// Why the check is redundant here: 68.2 keeps the ships in the active system; The Icon places them in a system with my
// token, my ground forces and no other ships, which the target is.
test.fails('breakthrough:bastionbt chosen in «Used», ships built are placed away from the active system, and the warning reads as allowed by The Icon', async () => {
  const { table, live } = placedAway();
  quote(table.pack, id, 'place those ships in a system that contains 1 of your command tokens, at least 1 of your ground forces');
  await use('The Icon');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived(CODE, 'The Icon');
});

// LRR 68.2: "When a player produces ships by using Production that player must place them in the active system."
// Checks: the same action without The Icon in «Used» shows the warning standing.
// Why the check is NOT redundant here: the card is used by exhausting it; not chosen, it lifts nothing.
test.fails('breakthrough:bastionbt not chosen, ships placed away from the active system show the warning standing', () => {
  placedAway();
  expectShownStanding(CODE);
});
