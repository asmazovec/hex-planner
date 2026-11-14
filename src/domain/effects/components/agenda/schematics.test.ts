import { describe, expect, test } from 'vitest';
import { tech } from '../../../rules/kit';
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import type { Entry } from '../../../types';
import { adjust, bench, effect, expectStanding, expectWaived, primary, quote, warningsOf } from '../kit';
import { id } from './schematics';

/** The check this law lifts: a technology researched without its prerequisites (LRR 90.12), the technology in its params (`id`). */
const CODE = prerequisitesMissing.code;
const WAR_SUN = tech('warsun');

const law = (): Entry => ({ ...adjust({}, 'strategy'), gains: [id] });

/** I research `technology` with Technology's primary, holding no technology at all; `rivalWarSun` gives the opponent a war sun. */
const research = (technology: string, inPlay: boolean, rivalWarSun: boolean) => {
  const entry = primary(7, { researched: [technology] });
  const table = bench({
    faction: 'sol', entries: inPlay ? [law(), entry] : [entry],
    game: {
      opponents: [{ id: 'x', faction: 'letnev', vp: 0, seat: 2, color: 2 }],
      start: { me: {}, opponents: { x: rivalWarSun ? { technologies: [WAR_SUN] } : {} } },
    },
  });
  return { entry, table, warnings: warningsOf(table, entry) };
};

describe('agenda:schematics Publicize Weapon Schematics', () => {
  // "For: If any player owns a war sun technology, all players may ignore all prerequisites on war sun technologies."
  // Checks: another player owns War Sun; I research War Sun with no technology at all, and the warning of the
  // missing prerequisites is listed and lifted by the law.
  // Why the check is redundant here: 90.8 asks a player to own the prerequisites of a technology; the law lets every
  // player ignore those of war sun technologies once anyone owns one.
  test('agenda:schematics lets me research a war sun without its prerequisites once another player owns one', () => {
    const { table, warnings } = research(WAR_SUN, true, true);
    quote(table.pack, id, 'If any player owns a war sun technology, all players may ignore all prerequisites on war sun technologies.');
    expectWaived(warnings, CODE, id);
  });

  // Publicize Weapon Schematics note 1: prerequisites are ignored only "from then on", once a player owns the upgrade.
  // Checks: nobody owns a war sun technology: my research of War Sun without prerequisites is warned of.
  // Why the check is NOT redundant here: the law's condition, "if any player owns a war sun technology", is not met.
  test('agenda:schematics with nobody owning a war sun the prerequisites stand', () => {
    expectStanding(research(WAR_SUN, true, false).warnings, CODE);
  });

  // LRR 90.8: a player must own the prerequisites of the technology they research.
  // Checks: without the law the war sun's prerequisites stand though another player owns one.
  // Why the check is NOT redundant here: the law is not in play.
  test('agenda:schematics not in play: the war sun\'s prerequisites stand', () => {
    expectStanding(research(WAR_SUN, false, true).warnings, CODE);
  });

  // Checks: Dreadnought II without its prerequisites is warned of with the law in play and a war sun owned.
  // Why the check is NOT redundant here: the law speaks of war sun technologies only.
  test('agenda:schematics leaves the prerequisites of other technologies standing', () => {
    expectStanding(research(tech('dreadnought'), true, true).warnings, CODE);
  });

  // "All war suns lose SUSTAIN DAMAGE." / "Against: Each player that owns a war sun technology discards all of their
  //  action cards."
  // Checks: the effect waives the prerequisites only; the loss of SUSTAIN DAMAGE is combat, which the plan does not
  // simulate, and the Against outcome is a directive the player enters as discards.
  test('agenda:schematics is a passive effect that waives the prerequisites of war suns', () => {
    const { table } = research(WAR_SUN, true, true);
    expect(effect(table.pack, id).tier).toBe('passive');
    expect(effect(table.pack, id).permit?.map(w => w.code)).toEqual([CODE]);
  });
});
