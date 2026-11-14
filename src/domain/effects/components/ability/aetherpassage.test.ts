import { describe, test } from 'vitest';
import type { Entry } from '../../../types';
import type { Player } from '../../../players';
import { bench, expectNone, expectStanding, expectWaived, HOME, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './aetherpassage';

const EMPYREAN: Player = { id: 'emp', faction: 'empyrean', vp: 0, seat: 2, color: 2 };
const LETNEV: Player = { id: 'let', faction: 'letnev', vp: 0, seat: 3, color: 3 };

/** My Sol cruiser flies from home to the target through the system next to it, where `owner`'s destroyer stands. */
const table = (move: Entry, owner = 'emp') => ({
  move,
  ...bench({
    faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, entries: [move],
    game: { opponents: [EMPYREAN, LETNEV], enemyUnits: { [NEAR]: { [owner]: { destroyer: 1 } } } },
  }),
});
const through = () => tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });

describe('ability:aetherpassage Aetherpassage', () => {
  // "After a player activates a system: You may allow that player to move their ships through systems that contain
  //  your ships."
  // Checks: my ships pass a system holding an Empyrean destroyer; the Empyrean player allows it, which my entry
  // names in «Used»; the warning that the route is blocked there is listed and lifted by Aetherpassage.
  // Why the check is redundant here: LRR 58.3.2 forbids moving through a system with another player's ships, and the
  // owner of those ships allows it by this ability.
  test('ability:aetherpassage named by the mover lifts the block of the Empyrean ships on the route', () => {
    const passage = table(using(through(), id));
    quote(passage.pack, id, 'You may allow that player to move their ships through systems that contain your ships.');
    expectWaived(warningsOf(passage, passage.move), 'routeBlocked', id);
  });

  // LRR 58.3.2: a ship cannot move through a system that contains another player's ships.
  // Checks: the Empyrean player did not allow it: the route is blocked.
  // Why the check is NOT redundant here: the ability is the Empyrean player's choice ("may"), made after the system
  // is activated; until the mover's entry names it, nothing was allowed.
  test('ability:aetherpassage not named, the Empyrean ships still block the route', () => {
    const passage = table(through());
    expectStanding(warningsOf(passage, passage.move), 'routeBlocked');
  });

  // "... through systems that contain your ships."
  // Checks: the ships on the route are the Letnev's: naming Aetherpassage lifts nothing.
  // Why the check is NOT redundant here: the Empyrean player can only allow passage through their own ships.
  test('ability:aetherpassage does not lift a block by another player\'s ships', () => {
    const passage = table(using(through(), id), 'let');
    expectStanding(warningsOf(passage, passage.move), 'routeBlocked');
  });

  // Checks: an ability of a faction sheet is not a card held: naming it is no breach of holding (22.1).
  test('ability:aetherpassage named by another player is no component not held', () => {
    const passage = table(using(through(), id));
    expectNone(warningsOf(passage, passage.move), 'componentNotHeld');
  });
});
