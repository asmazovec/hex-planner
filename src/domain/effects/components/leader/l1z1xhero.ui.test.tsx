import { expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectShownStanding, showComponent, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, endOf, FAR, HOME, NEAR, quote } from '../kit';
import systemOccupied from '../../../rules/codes/systemOccupied';
import { id } from './l1z1xhero';

uiBench();

/** The empty systems are offered by their tile, in map order: NEAR, FAR, FARTHER. */
const chooseFar = () => userEvent.click(screen.getAllByRole('button', { name: 'r-empty' })[1]);

const table = (enemies: boolean) => {
  const hero = componentAction(id);
  return {
    hero,
    ...bench({
      faction: 'l1z1x', expansions: ['pok'], entries: [hero], start: { leaders: { [id]: 'unlocked' } },
      units: { [HOME]: { dreadnought: 2, carrier: 1 }, [NEAR]: { flagship: 1 } },
      game: enemies ? { opponents: [{ id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 }], enemyUnits: { [FAR]: { o1: { cruiser: 1 } } } } : {},
    }),
  };
};

// "ACTION: Choose 1 system that does not contain other players' ships. you may move your flagship and any number of
//  your dreadnoughts from other systems into the chosen system."
// Checks: in the editor of the hero's action I choose the far system; it is written into the entry's choices and the
// flagship and both dreadnoughts are in it afterwards.
// Why nothing is waived: the hero moves ships with no route and no move value (faction note 3).
test('leader:l1z1xhero the chosen system is written into the action and the ships are moved there', async () => {
  const board = table(false);
  quote(board.pack, id, 'Choose 1 system that does not contain other players');
  const live = showComponent(board, board.hero);
  await chooseFar();
  expect(live.entry().choices).toEqual({ system: FAR });
  expect(endOf({ pack: board.pack, game: live.game() }).systems[FAR]).toEqual({ dreadnought: 2, flagship: 1 });
});

// "Choose 1 system that does not contain other players' ships."
// Checks: choosing the system where a rival's cruiser stands shows the warning of an occupied system, standing.
// Why the check is NOT redundant here: the hero's own condition; nothing lifts it.
test('leader:l1z1xhero a system with other players\' ships is chosen and its warning stands', async () => {
  const board = table(true);
  showComponent(board, board.hero);
  await chooseFar();
  expectShownStanding(systemOccupied.code);
});
