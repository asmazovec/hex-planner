import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { tech } from '../../../rules/kit';
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, primary, quote } from '../kit';
import { id } from './schematics';

uiBench();

/** The check of prerequisites (LRR 90.12). */
const CODE = prerequisitesMissing.code;
const law = (): Entry => ({ ...adjust({}, 'strategy'), gains: [id] });

/** The warnings of my Technology entry researching War Sun with nothing else owned, while the opponent owns War Sun. */
const technology = (inPlay: boolean) => {
  const entry = primary(7, { researched: [tech('warsun')] });
  const table = bench({
    faction: 'sol', entries: inPlay ? [law(), entry] : [entry],
    game: { opponents: [{ id: 'x', faction: 'letnev', vp: 0, seat: 2, color: 2 }], start: { me: {}, opponents: { x: { technologies: [tech('warsun')] } } } },
  });
  return { table, live: showWarnings(table, entry) };
};

// "For: If any player owns a war sun technology, all players may ignore all prerequisites on war sun technologies."
// Checks: the war sun researched without prerequisites is shown in the allowed look, naming the law.
// Why the check is redundant here: another player owns a war sun technology, so the law lifts 90.8 for war suns.
test('agenda:schematics a war sun researched without prerequisites reads as allowed by Publicize Weapon Schematics', () => {
  const { table } = technology(true);
  quote(table.pack, id, 'all players may ignore all prerequisites on war sun technologies');
  expectShownWaived(CODE, 'Publicize Weapon Schematics');
});

// LRR 90.8: a technology's prerequisites must be owned.
// Checks: without the law the warning of the prerequisites stands on the screen.
// Why the check is NOT redundant here: the law is not in play.
test('agenda:schematics without the law the missing prerequisites stand', () => {
  technology(false);
  expectShownStanding(CODE);
});
