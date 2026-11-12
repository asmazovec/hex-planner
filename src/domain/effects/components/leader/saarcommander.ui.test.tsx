import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import type { LeaderState } from '../../../types';
import { bench, HOME, quote, tactical, TARGET } from '../kit';
import { id } from './saarcommander';

uiBench();

const table = (leaders: Record<string, LeaderState>) => {
  const build = tactical(TARGET, { production: { infantry: 2 }, productionGround: { h1: { infantry: 2 } } });
  return { build, table: bench({
    faction: 'saar', expansions: ['pok'], units: { [TARGET]: { carrier: 1 }, [HOME]: { cruiser: 1 } }, start: { leaders }, entries: [build],
    game: { docks: ['t1', 'h1'], planetControl: { t1: 'me' } },
  }) };
};

// "When you produce fighters or infantry: You may place each of those units at any of your space docks that are not
//  blockaded."
// Checks: infantry produced at t1 and placed on Home One, at my other dock: the placement warning is on the screen in
// the allowed look, naming Rowl Sarrig. (The shop of the big hex offers the planets of the active system only; pass 2
// lets it offer my other docks.)
// Why the check is redundant here: 68.3 binds produced ground forces to the producing dock's planet; the commander frees
// infantry to any of my docks.
test.fails('leader:saarcommander infantry placed at another dock read as allowed by Rowl Sarrig', () => {
  const saar = table({ [id]: 'unlocked' });
  quote(saar.table.pack, id, 'You may place each of those units at any of your space docks');
  showWarnings(saar.table, saar.build);
  expectShownWaived('productionPlace', 'Rowl Sarrig');
});

// LRR 68.3: produced ground forces go on the planet of the producing unit.
// Checks: the commander locked, the same placement shows its warning standing.
// Why the check is NOT redundant here: a locked commander is not in force.
test('leader:saarcommander locked, the infantry placed at another dock show the warning standing', () => {
  const saar = table({});
  showWarnings(saar.table, saar.build);
  expectShownStanding('productionPlace');
});
