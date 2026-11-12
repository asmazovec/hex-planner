import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import type { ExtensionCode, Opponent } from '../../../types';
import { bench, quote, secondary } from '../kit';
import { id } from './yincommander';

uiBench();

/** The check of prerequisites pass 2 adds (LRR 90.12). */
const PREREQUISITES = 'researchPrerequisites' as ExtensionCode;
const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const research = () => secondary(CARD.technology, { researched: ['technology:bio'], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });

// "When you research a tech owned by another player, you may return 1 of your infantry to reinforcements to ignore its
//  prerequisites."
// Checks: the research of Bioplasmosis, which the Sol player owns, shows its warning of prerequisites in the allowed
// look, naming Brother Omar.
// Why the check is redundant here: the commander ignores the prerequisites of a technology another player owns.
test.fails('leader:yincommander the research of a technology another player owns shows its warning as allowed by Brother Omar', () => {
  const entry = research();
  const table = bench({
    faction: 'yin', expansions: ['pok'], entries: [entry],
    game: { opponents: [RIVAL], start: { me: { leaders: { [id]: 'unlocked' } }, opponents: { o1: { technologies: ['technology:bio'] } } } },
  });
  quote(table.pack, id, 'When you research a tech owned by another player');
  showWarnings(table, entry);
  expectShownWaived(PREREQUISITES, 'Brother Omar');
});

// LRR 90.12: a technology is researched with one owned technology of its colour per prerequisite symbol.
// Checks: the commander still locked, the same research shows the warning standing.
// Why the check is NOT redundant here: a locked leader is not in force.
test.fails('leader:yincommander locked, the warning of prerequisites stands', () => {
  const entry = research();
  const table = bench({
    faction: 'yin', expansions: ['pok'], entries: [entry],
    game: { opponents: [RIVAL], start: { me: {}, opponents: { o1: { technologies: ['technology:bio'] } } } },
  });
  showWarnings(table, entry);
  expectShownStanding(PREREQUISITES);
});
