import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../types';
import { adjust, bench, effect, expectNone, expectStanding, expectWaived, quote, secondary, using, warningsOf } from '../kit';
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import { id } from './is';

/** The check of LRR 90.12, step `card` (src/domain/rules/codes/prerequisitesMissing.ts). */
const CODE = prerequisitesMissing.code;

/** Fleet Logistics needs two propulsion technologies (90.12); the L1Z1X research it with the Technology secondary. */
const FLEET_LOGISTICS = 'technology:fl';

/** The secondary of Technology for Fleet Logistics, paid with both home planets (4) and `tradeGoods`. */
const research = (tradeGoods: number) =>
  secondary(CARD.technology, { researched: [FLEET_LOGISTICS], payment: { planets: ['h1', 'h2'], tradeGoods } });

const table = (entries: Entry[], technologies: string[] = [id]) =>
  bench({ faction: 'l1z1x', start: { technologies }, entries: [adjust({ tradeGoods: 4 }), ...entries] });

describe('technology:is Inheritance Systems', () => {
  // "You may exhaust this card and spend 2 resources when you research a technology; ignore all of that technology's
  //  prerequisites."
  // Checks: Fleet Logistics is researched with no propulsion technology; the card is named in «Used» of the research
  // and lifts the prerequisites warning.
  // Why the check is redundant here: LRR 90.12 asks a player to own a technology of the matching colour for each
  // prerequisite, and the card says to ignore all of them.
  test('technology:is used for a research lifts the prerequisites warning', () => {
    const card = using(research(2), id);
    const l1z1x = table([card]);
    quote(l1z1x.pack, id, "ignore all of that technology's prerequisites");
    expectWaived(warningsOf(l1z1x, card), CODE, id);
  });

  // LRR 90.12: "To satisfy a technology's prerequisites, that player must own one technology of the matching color for
  //  each prerequisite symbol on the technology card they wish to research."
  // Checks: the card held but not used leaves the warning standing.
  // Why the check is NOT redundant here: the card says "you may exhaust"; not named, it was not used.
  test('technology:is held but not used leaves the prerequisites warning standing', () => {
    const card = research(0);
    expectStanding(warningsOf(table([card]), card), CODE);
  });

  // Checks: with two propulsion technologies owned there is nothing to ignore and no warning is made.
  test('technology:is a research whose prerequisites are met makes no warning', () => {
    const card = research(0);
    expectNone(warningsOf(table([card], [id, 'technology:amd', 'technology:gd']), card), CODE);
  });

  // "... and spend 2 resources ..." Faction note 1: "The two resources for Inheritance Systems must be paid in addition
  //  to and separately from any other costs paid to research the technology."
  // Checks: the research costs four, the card two more; four paid is short by two.
  // Why the check is NOT redundant here: the card lifts the prerequisites, not its own cost.
  test.fails('technology:is used costs two resources more than the research', () => {
    const card = using(research(0), id);
    const warnings = warningsOf(table([card]), card);
    expectStanding(warnings, 'shortResources');
    expect(warnings.find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 6, paid: 4 });
  });

  // "You may exhaust this card ..."
  // Checks: used twice in one round, the second use finds the card exhausted.
  // Why the check is NOT redundant here: an exhausted card cannot be exhausted again (LRR 34.4).
  test('technology:is is exhausted by its use', () => {
    const second = using(research(2), id);
    expectStanding(warningsOf(table([using(research(2), id), second]), second), 'componentExhausted');
  });

  // Checks: the second use, with the card already exhausted, does not lift the prerequisites.
  // Why the check is NOT redundant here: the card's ability needs it to be exhausted, which it cannot be again.
  test('technology:is already exhausted does not lift the prerequisites of a second research', () => {
    const second = using(secondary(CARD.technology, { researched: ['technology:dxa'], payment: { planets: [], tradeGoods: 0 } }), id);
    const l1z1x = bench({ faction: 'l1z1x', start: { technologies: [id] }, edit: pack => { pack.technologies.dxa = { ...pack.technologies.dxa, requires: { biotic: 1 } }; }, entries: [using(research(2), id), second] });
    expectStanding(warningsOf(l1z1x, second), CODE);
  });

  test('technology:is is a play effect that waives the prerequisites', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual([CODE]);
  });
});
