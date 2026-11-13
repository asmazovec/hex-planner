/** Research as the replay checks it: prerequisites, specialties, technologies that cannot be researched, and the points of the count. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../strategy';
import type { AnyWarningCode, Entry } from '../types';
import { bench, endOf, expectNone, expectStanding, NO_PAYMENT, primary, secondary, warningsOf, type BenchOptions } from '../effects/components/kit';
import { effectsOf } from '../effects/registry';
import type { ComponentEffect } from '../effects/types';

const MISSING = 'prerequisitesMissing' as AnyWarningCode;
const UNAVAILABLE = 'researchUnavailable' as AnyWarningCode;
const research = (...technologies: string[]): Entry => secondary(CARD.technology, { researched: technologies, payment: NO_PAYMENT });
const table = (entries: Entry[], options: Partial<BenchOptions> = {}) =>
  bench({ faction: 'sol', expansions: ['pok', 'te'], entries, ...options });
const missing = (made: ReturnType<typeof table>, entry: Entry) => warningsOf(made, entry).find(w => w.code === MISSING)?.params;

describe('research: prerequisites (LRR 90.12)', () => {
  // 90.12.
  test('90.12: a technology researched without the colour it asks is warned of, with the number missing', () => {
    const entry = research('technology:hm');
    const made = table([entry]);
    expectStanding(warningsOf(made, entry), MISSING);
    expect(missing(made, entry)).toMatchObject({ id: 'technology:hm', missing: 2 });
  });

  test('90.12: a technology of the colour per symbol covers the prerequisites', () => {
    const entry = research('technology:it');
    expectNone(warningsOf(table([entry], { start: { technologies: ['technology:nm'] } }), entry), MISSING);
  });

  test('90.12.2: a unit upgrade has no colour and covers nothing', () => {
    const entry = research('technology:dd2');
    const made = table([entry], { start: { technologies: ['technology:ps', 'technology:cv2'] } });
    expect(missing(made, entry)).toMatchObject({ missing: 1 });
  });

  test('90.12: the first technology of an entry meets the prerequisite of the second (a primary researches two)', () => {
    const entry = primary(CARD.technology, { researched: ['technology:nm', 'technology:it'] });
    expectNone(warningsOf(table([entry]), entry), MISSING);
  });

  test('90.12: a technology that asks nothing is never warned of', () => {
    const entry = research('technology:nm');
    expectNone(warningsOf(table([entry]), entry), MISSING);
  });

  test('90.5: a technology gained, not researched, ignores prerequisites', () => {
    const gain = { ...research(), gains: ['technology:hm'] } as Entry;
    expectNone(warningsOf(table([gain]), gain), MISSING);
  });

  test('90.12: the technology is researched all the same: the plan forbids nothing', () => {
    expect(endOf(table([research('technology:hm')])).holdings.technologies).toContain('technology:hm');
  });

  // 90.14.
  test('90.14: a planet with a technology specialty, exhausted, ignores one prerequisite of its colour', () => {
    const entry = secondary(CARD.technology, { researched: ['technology:it'], payment: NO_PAYMENT, specialties: ['h2'] });
    const made = table([entry], { edit: pack => { pack.planets.h2 = { ...pack.planets.h2, tech: ['biotic'] }; } });
    expectNone(warningsOf(made, entry), MISSING);
    expect(endOf(made).exhausted).toContain('h2');
  });

  test('90.14: a specialty of another colour ignores nothing', () => {
    const entry = secondary(CARD.technology, { researched: ['technology:it'], payment: NO_PAYMENT, specialties: ['h2'] });
    const made = table([entry], { edit: pack => { pack.planets.h2 = { ...pack.planets.h2, tech: ['warfare'] }; } });
    expectStanding(warningsOf(made, entry), MISSING);
  });

  test('90.15: a planet already exhausted cannot be used: it is warned of, and the prerequisite stands', () => {
    const entry = secondary(CARD.technology, { researched: ['technology:it'], payment: { planets: ['h2'], tradeGoods: 0 }, specialties: ['h2'] });
    const made = table([entry], { edit: pack => { pack.planets.h2 = { ...pack.planets.h2, tech: ['biotic'] }; } });
    expect(warningsOf(made, entry).map(w => w.code)).toContain('planetExhausted');
    expectStanding(warningsOf(made, entry), MISSING);
  });
});

describe('research: technologies that cannot be researched', () => {
  test('90.9: a technology whose text says it cannot be researched is warned of when researched, not when gained', () => {
    const entry = research('technology:planesplitter-obs');
    expectStanding(warningsOf(table([entry]), entry), UNAVAILABLE);
    const gain = { ...research(), gains: ['technology:planesplitter-obs'] } as Entry;
    expectNone(warningsOf(table([gain]), gain), UNAVAILABLE);
  });
});

describe('research: the points of the count', () => {
  /** A technology of the pack stands for a component with the passive effect under test. */
  const withEffect = (effect: ComponentEffect, entries: Entry[], options: Partial<BenchOptions> = {}) => {
    const made = table(entries, { ...options, start: { technologies: ['technology:gd'], ...options.start } });
    (effectsOf(made.pack) as Map<string, ComponentEffect>).set('technology:gd', effect);
    return made;
  };

  test('prerequisites: a passive effect lowers the count asked, and the check runs against the new number', () => {
    const entry = research('technology:hm');
    const lower: ComponentEffect = { tier: 'passive', rule: 'test', modify: { prerequisites: value => Math.max(0, value - 1) } };
    const made = withEffect(lower, [entry]);
    expect(missing(made, entry)).toMatchObject({ missing: 1 });
    const enough: ComponentEffect = { tier: 'passive', rule: 'test', modify: { prerequisites: () => 0 } };
    expectNone(warningsOf(withEffect(enough, [entry]), entry), MISSING);
  });

  test('prerequisites: the context says whether it is a unit upgrade and which colours are missing', () => {
    const seen: unknown[] = [];
    const spy: ComponentEffect = { tier: 'passive', rule: 'test', modify: { prerequisites: (value, ctx) => { seen.push(ctx); return value; } } };
    const entry = primary(CARD.technology, { researched: ['technology:hm', 'technology:dd2'] });
    const made = withEffect(spy, [entry]);
    warningsOf(made, entry);
    expect(seen).toContainEqual({ technology: 'technology:hm', upgrade: false, missing: { biotic: 2 } });
    expect(seen).toContainEqual({ technology: 'technology:dd2', upgrade: true, missing: { warfare: 2 } });
  });

  test('researchTokens: a research that gives tokens instead is not made, and its tokens are not over', () => {
    const instead: ComponentEffect = { tier: 'passive', rule: 'test', modify: { researchTokens: () => 3 } };
    const entry = primary(CARD.technology, { researched: ['technology:st'], tokens: { tactic: 3 } });
    const made = withEffect(instead, [entry]);
    expectNone(warningsOf(made, entry), 'tokensOver' as AnyWarningCode);
    expect(endOf(made).holdings.technologies).not.toContain('technology:st');
    expect(endOf(made).tactic).toBe(6);
  });

  test('researchAsPrimary: the secondary takes the primary\'s limit and cost', () => {
    const asPrimary: ComponentEffect = { tier: 'passive', rule: 'test', modify: { researchAsPrimary: () => 1 } };
    const entry = secondary(CARD.technology, { researched: ['technology:st', 'technology:nm'], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    const made = withEffect(asPrimary, [entry], { edit: pack => { pack.planets.h1 = { ...pack.planets.h1, resources: 5 }; } });
    expectNone(warningsOf(made, entry), 'researchOverLimit' as AnyWarningCode);
    expectNone(warningsOf(made, entry), 'shortResources' as AnyWarningCode);
  });

  test('researchCost: a passive effect changes what one technology costs', () => {
    const cheaper: ComponentEffect = { tier: 'passive', rule: 'test', modify: { researchCost: value => Math.max(0, value - 4) } };
    const entry = research('technology:st');
    expectNone(warningsOf(withEffect(cheaper, [entry]), entry), 'shortResources' as AnyWarningCode);
    expectStanding(warningsOf(table([entry]), entry), 'shortResources' as AnyWarningCode);
  });
});

describe('research: the player\'s own technology deck (LRR 90.10)', () => {
  test('90.10: a technology of another faction is warned of when researched, the own one is not', () => {
    const foreign = research('technology:l4');
    const own = research('technology:qdn');
    const made = table([foreign, own], { faction: 'hacan' });
    expectStanding(warningsOf(made, foreign), 'researchForeign' as AnyWarningCode);
    expectNone(warningsOf(made, own), 'researchForeign' as AnyWarningCode);
  });

  test('90.10: a technology of the Keleres sheet is the own of each variant', () => {
    const entry = research('technology:asn');
    for (const faction of ['keleresm', 'keleresx', 'keleresa']) {
      expectNone(warningsOf(table([entry], { faction }), entry), 'researchForeign' as AnyWarningCode);
    }
  });
});
