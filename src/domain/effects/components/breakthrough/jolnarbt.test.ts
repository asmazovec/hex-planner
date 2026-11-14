import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, effect, expectStanding, expectWaived, quote, secondary, warningsOf } from '../kit';
import { id } from './jolnarbt';

/**
 * The Jol-Nar's Brilliant resolves the secondary of Technology as the primary: the first technology is free and the second
 * costs 6 resources, so every research here names two (both biotic, or both propulsion).
 */
const BIOTIC = ['technology:nm', 'technology:dxa'];
const PROPULSION = ['technology:gd', 'technology:amd'];

/** The secondary of Technology researches `technologies` (the second costs 6 resources) and pays by exhausting `planet` alone. */
const research = (technologies: string[], planet = 'h2'): Entry =>
  secondary(CARD.technology, { researched: technologies, payment: { planets: [planet], tradeGoods: 0 } });
/** Home Two has the biotic specialty here; the breakthrough is held unless `held` is false. */
const table = (entry: Entry, faction = 'jolnar', held = true) => ({
  entry,
  ...bench({
    faction, expansions: ['te'], start: held ? { breakthrough: 'held' } : {}, entries: [entry],
    edit: pack => { pack.planets.h2 = { ...pack.planets.h2, tech: ['biotic'] }; },
  }),
});

describe('breakthrough:jolnarbt Specialist Compounds', () => {
  // "When you research technology using the 'Technology' strategy card, you may exhaust a planet that has a technology
  //  specialty instead of spending resources; if you do, you must research a technology of that color."
  // Checks: the Jol-Nar research two biotic technologies and pay by exhausting Home Two (biotic specialty, 1
  // resource): the warning that 6 resources are not paid is listed and lifted by the breakthrough.
  // Why the check is redundant here: the planet is exhausted instead of spending resources, so the 6 resources of the
  // secondary (91) are not owed for this research.
  test('breakthrough:jolnarbt a planet with the matching specialty pays the research: the warning is waived', () => {
    const jolnar = table(research(BIOTIC));
    expectWaived(warningsOf(jolnar, jolnar.entry), 'shortResources', id);
  });

  // "... if you do, you must research a technology of that color."
  // Checks: Two propulsion technologies, the specialty biotic: the shortfall stands.
  // Why the check is NOT redundant here: the planet pays only for a technology of its own color.
  test('breakthrough:jolnarbt a technology of another colour is not paid by the planet', () => {
    const jolnar = table(research(PROPULSION));
    quote(jolnar.pack, id, 'you may exhaust a planet that has a technology specialty instead of spending resources');
    expectStanding(warningsOf(jolnar, jolnar.entry), 'shortResources');
  });

  // Checks: Infantry II, researched with a biotic one, is a unit upgrade, which has no color: the shortfall stands.
  // Why the check is NOT redundant here: unit upgrades have no color (90.7.2), so no specialty matches them
  // (tirules2, Jol-Nar, Specialized Compounds 1).
  test('breakthrough:jolnarbt a unit upgrade is not paid by the planet', () => {
    const jolnar = table(research(['technology:nm', 'technology:inf2']));
    expectStanding(warningsOf(jolnar, jolnar.entry), 'shortResources');
  });

  // Checks: Home One has no specialty: paying with it, the shortfall stands.
  // Why the check is NOT redundant here: only a planet that has a technology specialty can be exhausted instead.
  test('breakthrough:jolnarbt a planet without a specialty pays only its resources', () => {
    const jolnar = table(research(BIOTIC, 'h1'));
    expectStanding(warningsOf(jolnar, jolnar.entry), 'shortResources');
  });

  // Checks: the breakthrough not held, the shortfall stands.
  // Why the check is NOT redundant here: a breakthrough is in force only once held.
  test('breakthrough:jolnarbt not held: the shortfall stands', () => {
    const jolnar = table(research(BIOTIC), 'jolnar', false);
    expectStanding(warningsOf(jolnar, jolnar.entry), 'shortResources');
  });

  // Checks: another faction with its own breakthrough paying with the same planet: the shortfall stands.
  // Why the check is NOT redundant here: Specialist Compounds is the Jol-Nar's breakthrough.
  test('breakthrough:jolnarbt another faction: the shortfall stands', () => {
    const sol = table(research(BIOTIC), 'sol');
    expectStanding(warningsOf(sol, sol.entry), 'shortResources');
  });

  test('breakthrough:jolnarbt is a passive effect that waives the resources of the research', () => {
    const { pack } = table(research(BIOTIC));
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['shortResources']);
  });
});
