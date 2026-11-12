import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry, Opponent, StartHoldings } from '../../../types';
import { bench, effect, expectNone, expectStanding, expectWaived, quote, secondary, warningsOf } from '../kit';
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import { id } from './yincommander';

/** The check of prerequisites (LRR 90.12): a technology researched without them. */
const PREREQUISITES = prerequisitesMissing.code;

/** Instinct Training needs one green technology, Bioplasmosis two; the Yin seated on the bench own none. */
const ONE_GREEN = 'technology:it';
const TWO_GREEN = 'technology:bio';
const research = (technology: string): Entry =>
  secondary(CARD.technology, { researched: [technology], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

const table = (entries: Entry[], start: StartHoldings = { leaders: { [id]: 'unlocked' } }, rival: StartHoldings | null = null) =>
  bench({
    faction: 'yin', expansions: ['pok'], start, entries,
    game: rival ? { opponents: [RIVAL], start: { me: start, opponents: { o1: rival } } } : {},
  });

describe('leader:yincommander Brother Omar', () => {
  // "At any time: This card satisfies a green technology prerequisite."
  // Checks: with Brother Omar unlocked and no green technology, Instinct Training (one green) is researched with no
  // warning of prerequisites, while Bioplasmosis (two green) still lacks one and is warned of.
  // Why the check is redundant here: 90.12 asks one owned technology of the colour for each symbol; the commander
  // stands in for one green one. It is a `modify` of `prerequisites`: the check runs against one green less, nothing
  // is listed as waived.
  test('leader:yincommander satisfies one green prerequisite, and only one', () => {
    const one = research(ONE_GREEN);
    const two = research(TWO_GREEN);
    // Two boards: researching Instinct Training first would give the Yin a green technology of their own.
    const t = table([one]);
    const t2 = table([two]);
    quote(t.pack, id, 'This card satisfies a green technology prerequisite.');
    expectNone(warningsOf(t, one), PREREQUISITES);
    expectStanding(warningsOf(t2, two), PREREQUISITES);
  });

  // LRR 90.12: "a player must own one technology of the matching color for each prerequisite symbol on the technology
  //  card they wish to research."
  // Checks: a commander not unlocked satisfies nothing: the same research is warned of.
  // Why the check is NOT redundant here: a locked leader is not in force (51.5, `inForce`).
  test('leader:yincommander locked satisfies nothing: the research is warned of', () => {
    const one = research(ONE_GREEN);
    expectStanding(warningsOf(table([one], {}), one), PREREQUISITES);
  });

  // Checks: another faction without the commander is warned of the same research.
  // Why the check is NOT redundant here: the commander is the Yin's own, so the rule stands as written.
  test('leader:yincommander is the Yin\'s own: another faction is warned of the research', () => {
    const one = research(ONE_GREEN);
    const sol = bench({ faction: 'sol', entries: [one] });
    expectStanding(warningsOf(sol, one), PREREQUISITES);
  });

  // "When you research a tech owned by another player, you may return 1 of your infantry to reinforcements to ignore
  //  its prerequisites."
  // Checks: Bioplasmosis, owned by the Sol player, is researched with no green technology at all: the warning of
  // prerequisites is listed and lifted by the commander.
  // Why the check is redundant here: the card lets the Yin ignore every prerequisite of a technology another player
  // owns; the infantry it costs is the player's own choice and does not bring the rule back.
  test('leader:yincommander a technology another player owns is researched without its prerequisites: the warning is waived', () => {
    const two = research(TWO_GREEN);
    const t = table([two], { leaders: { [id]: 'unlocked' } }, { technologies: [TWO_GREEN] });
    quote(t.pack, id, 'When you research a tech owned by another player');
    expectWaived(warningsOf(t, two), PREREQUISITES, id);
  });

  // Checks: Bioplasmosis owned by nobody still lacks a green prerequisite beyond the one the commander gives.
  // Why the check is NOT redundant here: "owned by another player" is the condition of the second sentence.
  test('leader:yincommander a technology nobody else owns keeps its prerequisites', () => {
    const two = research(TWO_GREEN);
    const t = table([two], { leaders: { [id]: 'unlocked' } }, {});
    expectStanding(warningsOf(t, two), PREREQUISITES);
  });

  test.todo('leader:yincommander the infantry returned to the reinforcements: a research has no choice of which infantry, from where');

  test('leader:yincommander is a passive effect that modifies prerequisites and waives them for a technology another player owns', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.prerequisites).toBeTypeOf('function');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual([PREREQUISITES]);
  });
});
