import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showTactical, uiBench } from '../../../../ui/testing/effects';
import { componentById } from '../../../components';
import type { AnyWarningCode, TileDef } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { adjust, bench, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './sardakkcommander';

uiBench();

const CODE = 'landingFromPlanet' as AnyWarningCode;
type Landing = Extract<EntryBody, { type: 'tactical' }>['landings'][number];

const NEAR_TILE: TileDef = { id: 'r-near', number: 'r-near', planetIds: ['n1'], kind: 'system', wormholes: [] };
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-near', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

/** Two infantry of mine stand on n1 "Near One", next to the target; `move` is the action into the target. */
const table = (faction: string, move: Entry) => bench({
  faction, expansions: ['pok'], start: { leaders: faction === 'sardakk' ? { [id]: 'unlocked' } : {} },
  entries: [adjust({ ground: { n1: { infantry: 2 } } }), move], game: { map: MAP },
  edit: pack => {
    pack.tiles['r-near'] = NEAR_TILE;
    pack.planets.n1 = { id: 'n1', name: 'Near One', resources: 1, influence: 1 };
  },
});
const committed = (): Entry => tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 }, from: 'n1' } as Landing] });

// "You can commit (move) up to 1 ground force from each planet in the active system and each planet in adjacent
//  systems that do not contain 1 of your command tokens."
// Checks: with no ship in the target, the landing on Target One offers the infantry of Near One; I press it, the
// landing is written with the planet it comes from, and the warning that it does not come from the space area reads
// as allowed by G'hom Sek'kus.
// Why the check is redundant here: LRR 49.2 commits only from the space area of the active system; the commander
// commits from planets of the adjacent systems, without a ship (G'hom Sek'kus ruling 2).
test('leader:sardakkcommander the landing offers a ground force of an adjacent planet, and the warning reads as allowed', async () => {
  const move = tactical(TARGET);
  const sardakk = table('sardakk', move);
  const live = showTactical(sardakk, move);
  const landing = within(screen.getByRole('group', { name: 'Landing on Target One' }));
  await userEvent.click(landing.getByRole('button', { name: 'Land one Infantry from Near One' }));
  expect(live.entry().landings).toEqual([{ planetId: 't1', units: { infantry: 1 }, from: 'n1' }]);
  expectShownWaived(CODE, componentById(sardakk.pack, id)!.name);
});

// Checks: a landing from n1 already entered shows its warning as allowed by the commander in the tactical editor.
// Why the check is redundant here: as above.
test('leader:sardakkcommander a landing from an adjacent planet shows its warning as allowed', () => {
  const move = committed();
  const sardakk = table('sardakk', move);
  quote(sardakk.pack, id, 'You can commit (move) up to 1 ground force from each planet in the active system');
  showTactical(sardakk, move);
  expectShownWaived(CODE, componentById(sardakk.pack, id)!.name);
});

// LRR 49.2: "If the active player has ground forces in the space area of the active system, that player may commit
//  any number of those ground forces to land on any of the planets in that system."
// Checks: the same landing of another faction shows its warning standing.
// Why the check is NOT redundant here: nothing of the Federation of Sol commits from planets.
test('leader:sardakkcommander another faction landing from an adjacent planet: the warning stands', () => {
  const move = committed();
  showTactical(table('sol', move), move);
  expectShownStanding(CODE);
});
