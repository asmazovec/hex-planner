import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../replay/cards/ids';
import { bench, HOME, quote, secondary } from '../kit';
import { id } from './titans_mech';

uiBench();

const show = (faction: string) => {
  const units = { mech: 1, infantry: 1 };
  const entry = secondary(CARD.construction, { production: { systemId: HOME, units, ground: { h1: units } } });
  const table = bench({ faction, expansions: ['pok'], entries: [entry] });
  showWarnings(table, entry);
  return table;
};

// "DEPLOY: When you would place a PDS on a planet, you may place 1 mech and 1 infantry on that planet instead."
// Checks: Construction's secondary placing a mech and an infantry instead of a PDS shows its warning in the allowed
// look, naming Hecatoncheires.
// Why the check is redundant here: Construction places structures only (LRR 24), and the Titans' mech replaces a PDS.
test('mech:titans_mech a mech and an infantry instead of a PDS: the warning reads as allowed by Hecatoncheires', () => {
  const table = show('titans');
  quote(table.pack, id, 'place 1 mech and 1 infantry on that planet instead');
  expectShownWaived('constructionUnits', 'Hecatoncheires');
});

// Checks: for another faction the warning stands.
// Why the check is NOT redundant here: the deploy is printed on the Titans' mech alone.
test('mech:titans_mech another faction placing units by Construction is warned of', () => {
  show('sol');
  expectShownStanding('constructionUnits');
});

// The editor's own button is tested with the Construction card: src/ui/plan/editors/StrategyEditor.test.tsx, Titans.
